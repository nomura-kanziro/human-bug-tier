"""Oracle 저장 층 테스트 — 실제 DB 없이 가짜 연결로 확인한다. (실제 Oracle 연결은 init_oracle.py 로 서버에서 확인한다.)"""
from __future__ import annotations

import threading
from contextlib import contextmanager

from app.guidans_Chat.database import OracleDatabase, OracleSettings, ensure_tables
from app.guidans_Chat.models import ORACLE_TABLES, ChatLog, ChatStat
from app.guidans_Chat.repository import ChatLogRepository, ChatStatRepository


class Cursor:
    def __init__(self, db):
        self.db = db
        self.description, self.rowcount, self._row = [], 1, (0,)

    def execute(self, sql, params=None):
        self.db.log.append((" ".join(sql.split()), params))
        if "user_tables" in sql:
            self._row = (1 if params["name"] in self.db.existing else 0,)

    def fetchone(self):
        return self._row

    def fetchall(self):
        return []

    def close(self):
        pass


class Conn:
    def __init__(self, db):
        self.db = db

    def cursor(self):
        return Cursor(self.db)

    def commit(self):
        self.db.log.append("commit")


class FakeDb:
    is_configured = True

    def __init__(self, existing=()):
        self.log, self.existing = [], set(existing)

    @contextmanager
    def connection(self):
        yield Conn(self)


def sqls(db):
    return [entry[0] for entry in db.log if isinstance(entry, tuple)]


def test_ensure_tables_creates_only_missing_tables():
    db = FakeDb(existing={"HBT_CHAT_STAT"})
    result = ensure_tables(db, ORACLE_TABLES)
    assert result == {"HBT_CHAT_STAT": "exists", "HBT_CHAT_LOG": "created"}
    created = [s for s in sqls(db) if s.startswith(("CREATE TABLE", "CREATE INDEX"))]
    assert len(created) == 2 and "HBT_CHAT_LOG" in created[0]     # 있는 테이블은 건드리지 않는다


def test_chat_repositories_use_bind_variables():
    db = FakeDb()
    ChatStatRepository(db).add(ChatStat("llm", "on", "none", 12, 3, 1, 250))
    ChatLogRepository(db).add(ChatLog("fallback", "질문?", "답변", retention_days=7))
    assert ChatLogRepository(db).purge_expired() == 1
    statements = sqls(db)
    assert all(":" in s for s in statements if s.startswith("INSERT"))
    assert not any("질문?" in s or "답변" in s for s in statements)    # 값은 SQL 문자열에 이어 붙이지 않는다
    assert any(s.startswith("DELETE FROM HBT_CHAT_LOG WHERE expires_at") for s in statements)


def make_service(monkeypatch, tmp_path, *, stats, chat, oracle):
    from app.config import load_settings
    from app.guidans_Chat.schema import ChatRequest
    from app.guidans_Chat.service.chat_service import GuideChatService

    monkeypatch.setenv("AI_LLM_PROVIDER", "none")
    monkeypatch.setenv("AI_VECTOR_ENABLED", "false")
    monkeypatch.setenv("AI_WARMUP", "false")
    monkeypatch.setenv("AI_STORE_STATS", "true" if stats else "false")
    monkeypatch.setenv("AI_STORE_CHAT", "true" if chat else "false")
    return GuideChatService(load_settings(), oracle=oracle), ChatRequest


def wait_store(service):
    for thread in threading.enumerate():
        if thread.name == "oracle-store":
            thread.join(5)


def test_default_stores_nothing(monkeypatch, tmp_path):
    db = FakeDb()
    service, Request = make_service(monkeypatch, tmp_path, stats=False, chat=False, oracle=db)
    service.ask(Request(message="안녕하세요"))
    wait_store(service)
    assert db.log == []
    assert service.oracle_info() == {"configured": True, "stats": False, "chat": False}


def test_stats_only_never_stores_text(monkeypatch, tmp_path):
    db = FakeDb()
    service, Request = make_service(monkeypatch, tmp_path, stats=True, chat=False, oracle=db)
    service.ask(Request(message="비밀 질문 내용"))
    wait_store(service)
    statements = sqls(db)
    assert len(statements) == 1 and statements[0].startswith("INSERT INTO HBT_CHAT_STAT")
    assert "비밀 질문 내용" not in str(db.log)


def test_chat_log_stored_when_enabled(monkeypatch, tmp_path):
    db = FakeDb()
    service, Request = make_service(monkeypatch, tmp_path, stats=False, chat=True, oracle=db)
    service.ask(Request(message="티어표 알려줘"))
    wait_store(service)
    statements = sqls(db)
    assert any(s.startswith("INSERT INTO HBT_CHAT_LOG") for s in statements)
    assert any(s.startswith("DELETE FROM HBT_CHAT_LOG") for s in statements)    # 첫 저장 때 만료 삭제도 한 번


def test_store_failure_does_not_break_answer(monkeypatch, tmp_path):
    class Broken(FakeDb):
        @contextmanager
        def connection(self):
            raise RuntimeError("db down")
            yield

    service, Request = make_service(monkeypatch, tmp_path, stats=True, chat=True, oracle=Broken())
    assert service.ask(Request(message="안녕하세요")).answer
    wait_store(service)


def test_not_configured_oracle_is_skipped(monkeypatch, tmp_path):
    db = OracleDatabase(OracleSettings(user="", password="", dsn=""))
    service, Request = make_service(monkeypatch, tmp_path, stats=True, chat=True, oracle=db)
    assert service.ask(Request(message="안녕하세요")).answer
    wait_store(service)
    assert service.oracle_info()["configured"] is False
