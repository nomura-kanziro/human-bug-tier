"""OracleRepository — SQL 실행 공통 도우미. 테이블별 저장소는 이 클래스를 상속해 SQL 만 적는다.

규칙
- SQL 은 Oracle 문법 그대로 쓰고(ORM 없음), 값은 **항상 바인드 변수**(`:name`)로 넘긴다 — 문자열을 SQL 에 이어 붙이지 않는다(SQL 인젝션 방지).
- 읽기는 행을 `{컬럼명(소문자): 값}` 딕셔너리로 돌려준다. 쓰기(execute)는 끝나면 commit 한다.
- 어떤 SQL 이 어느 테이블을 건드리는지는 이 저장소 클래스 안에서만 안다 — 서비스는 SQL 을 모른다.
지금 가이드 챗봇에는 저장소가 없다(대화 비저장 정책). 저장이 필요해질 때 여기를 상속해 추가한다.
"""
from __future__ import annotations

from typing import Any, Mapping

from ..database import OracleDatabase


class OracleRepository:
    def __init__(self, db: OracleDatabase):
        self.db = db

    def fetch_all(self, sql: str, params: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
        with self.db.connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(sql, params or {})
                names = [col[0].lower() for col in cursor.description or []]
                return [dict(zip(names, row)) for row in cursor.fetchall()]
            finally:
                cursor.close()

    def fetch_one(self, sql: str, params: Mapping[str, Any] | None = None) -> dict[str, Any] | None:
        rows = self.fetch_all(sql, params)
        return rows[0] if rows else None

    def execute(self, sql: str, params: Mapping[str, Any] | None = None) -> int:
        """INSERT/UPDATE/DELETE 실행 후 commit. 영향 받은 행 수를 돌려준다."""
        with self.db.connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(sql, params or {})
                count = cursor.rowcount
                conn.commit()
                return count
            finally:
                cursor.close()
