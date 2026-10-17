"""Oracle 데이터베이스 연결 — python-oracledb(thin 모드: Oracle Client 설치 불필요).

ai-service 는 **MongoDB 를 쓰지 않는다.** DB 가 필요해지면 Oracle(Autonomous Database 등) SQL 만 쓴다.
지금 가이드 챗봇은 대화를 저장하지 않아 이 모듈을 부르는 곳이 없다 — 연결 준비만 해 둔 층이다.
설정이 없으면(`is_configured()` 가 False) 풀을 만들지 않고, 쓰려고 하면 분명한 오류를 낸다.

환경 변수(`ai-service/.env` 또는 서버 환경):
  ORACLE_USER / ORACLE_PASSWORD / ORACLE_DSN   (DSN 예: `호스트:1521/서비스명` 또는 tnsnames 별칭)
  ORACLE_WALLET_DIR / ORACLE_WALLET_PASSWORD   (Autonomous DB 지갑을 쓸 때)
  ORACLE_POOL_MIN / ORACLE_POOL_MAX            (기본 1 / 4 — 서버 메모리가 작다)
비밀번호·지갑은 절대 커밋하지 않는다(`.env` 는 gitignore).
"""
from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator


@dataclass(frozen=True)
class OracleSettings:
    user: str
    password: str
    dsn: str
    wallet_dir: str = ""
    wallet_password: str = ""
    pool_min: int = 1
    pool_max: int = 4

    @classmethod
    def from_env(cls) -> "OracleSettings":
        def number(key: str, default: int) -> int:
            try:
                return max(1, int(os.environ.get(key, default)))
            except ValueError:
                return default

        return cls(
            user=os.environ.get("ORACLE_USER", "").strip(),
            password=os.environ.get("ORACLE_PASSWORD", "").strip(),
            dsn=os.environ.get("ORACLE_DSN", "").strip(),
            wallet_dir=os.environ.get("ORACLE_WALLET_DIR", "").strip(),
            wallet_password=os.environ.get("ORACLE_WALLET_PASSWORD", "").strip(),
            pool_min=number("ORACLE_POOL_MIN", 1),
            pool_max=number("ORACLE_POOL_MAX", 4),
        )

    @property
    def is_configured(self) -> bool:
        return bool(self.user and self.password and self.dsn)


class OracleNotConfigured(RuntimeError):
    """ORACLE_USER / ORACLE_PASSWORD / ORACLE_DSN 가 비어 있는데 DB 를 쓰려 할 때."""


class OracleDatabase:
    """커넥션 풀을 처음 쓸 때 만들고(지연 생성), 연결은 `with db.connection() as conn:` 으로 빌려 쓴다."""

    def __init__(self, settings: OracleSettings | None = None):
        self.settings = settings or OracleSettings.from_env()
        self._pool = None
        self._lock = threading.Lock()

    @property
    def is_configured(self) -> bool:
        return self.settings.is_configured

    def _create_pool(self):
        if not self.settings.is_configured:
            raise OracleNotConfigured("ORACLE_USER / ORACLE_PASSWORD / ORACLE_DSN 가 설정되지 않았습니다.")
        import oracledb  # 설정이 있을 때만 불러온다

        kwargs = dict(
            user=self.settings.user,
            password=self.settings.password,
            dsn=self.settings.dsn,
            min=self.settings.pool_min,
            max=max(self.settings.pool_min, self.settings.pool_max),
        )
        if self.settings.wallet_dir:
            kwargs.update(config_dir=self.settings.wallet_dir, wallet_location=self.settings.wallet_dir)
            if self.settings.wallet_password:
                kwargs["wallet_password"] = self.settings.wallet_password
        return oracledb.create_pool(**kwargs)

    @contextmanager
    def connection(self) -> Iterator[object]:
        with self._lock:
            if self._pool is None:
                self._pool = self._create_pool()
            pool = self._pool
        conn = pool.acquire()
        try:
            yield conn
        finally:
            pool.release(conn)

    def close(self) -> None:
        with self._lock:
            pool, self._pool = self._pool, None
        if pool is not None:
            pool.close()
