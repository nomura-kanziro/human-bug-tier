"""Oracle 층 테스트 — 실제 DB 없이 가짜 연결로 확인한다. (실제 Oracle 연결은 시험하지 못했다.)"""
from __future__ import annotations

from contextlib import contextmanager

import pytest

from app.guidans_Chat.database import OracleDatabase, OracleNotConfigured, OracleSettings
from app.guidans_Chat.repository import OracleRepository


class FakeCursor:
    def __init__(self, rows, columns, log):
        self._rows, self.description, self.log, self.rowcount = rows, [(c,) for c in columns], log, 3

    def execute(self, sql, params):
        self.log.append((sql, params))

    def fetchall(self):
        return self._rows

    def close(self):
        self.log.append("cursor-closed")


class FakeConn:
    def __init__(self, rows, columns, log):
        self.rows, self.columns, self.log = rows, columns, log

    def cursor(self):
        return FakeCursor(self.rows, self.columns, self.log)

    def commit(self):
        self.log.append("commit")


class FakeDb:
    def __init__(self, rows=(), columns=()):
        self.log = []
        self.rows, self.columns = list(rows), list(columns)

    @contextmanager
    def connection(self):
        yield FakeConn(self.rows, self.columns, self.log)


def test_settings_from_env(monkeypatch):
    for key in ("ORACLE_USER", "ORACLE_PASSWORD", "ORACLE_DSN"):
        monkeypatch.delenv(key, raising=False)
    assert not OracleSettings.from_env().is_configured
    monkeypatch.setenv("ORACLE_USER", "u")
    monkeypatch.setenv("ORACLE_PASSWORD", "p")
    monkeypatch.setenv("ORACLE_DSN", "host:1521/svc")
    monkeypatch.setenv("ORACLE_POOL_MAX", "not-a-number")
    s = OracleSettings.from_env()
    assert s.is_configured and s.pool_min == 1 and s.pool_max == 4  # 잘못된 숫자는 기본값


def test_database_without_settings_fails_clearly():
    db = OracleDatabase(OracleSettings(user="", password="", dsn=""))
    assert not db.is_configured
    with pytest.raises(OracleNotConfigured):
        with db.connection():
            pass


def test_repository_fetch_and_execute_use_bind_variables():
    db = FakeDb(rows=[(1, "가이드")], columns=["ID", "NAME"])
    repo = OracleRepository(db)
    rows = repo.fetch_all("SELECT id, name FROM demo WHERE id = :id", {"id": 1})
    assert rows == [{"id": 1, "name": "가이드"}]
    assert repo.fetch_one("SELECT 1 FROM dual") == {"id": 1, "name": "가이드"}
    assert repo.execute("DELETE FROM demo WHERE id = :id", {"id": 1}) == 3
    assert ("DELETE FROM demo WHERE id = :id", {"id": 1}) in db.log and "commit" in db.log
    assert db.log.count("cursor-closed") == 3
