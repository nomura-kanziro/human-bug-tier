"""Oracle 테이블 만들기 — 이미 있는 테이블은 건드리지 않는다(여러 번 실행해도 안전). 데이터는 절대 지우지 않는다."""
from __future__ import annotations

from typing import Iterable, Sequence

from .oracle import OracleDatabase


def ensure_tables(db: OracleDatabase, tables: Iterable[tuple[str, Sequence[str]]]) -> dict[str, str]:
    """(테이블 이름, DDL 문장들) 목록을 순서대로 확인해 없는 것만 만든다. {이름: 'created' | 'exists'} 를 돌려준다."""
    result: dict[str, str] = {}
    with db.connection() as conn:
        cursor = conn.cursor()
        try:
            for name, ddl in tables:
                cursor.execute("SELECT COUNT(*) FROM user_tables WHERE table_name = :name", {"name": name.upper()})
                if cursor.fetchone()[0]:
                    result[name] = "exists"
                    continue
                for statement in ddl:
                    cursor.execute(statement)
                result[name] = "created"
        finally:
            cursor.close()
    return result


def ping(db: OracleDatabase) -> str:
    """연결 확인 — 접속한 DB 사용자 이름을 돌려준다."""
    with db.connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT USER FROM dual")
            return cursor.fetchone()[0]
        finally:
            cursor.close()
