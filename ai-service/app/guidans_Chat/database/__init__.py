"""데이터베이스 층 — Oracle 연결(python-oracledb). MongoDB 는 쓰지 않는다. 지금은 대화를 저장하지 않아 쓰는 곳이 없다."""
from .oracle import OracleDatabase, OracleNotConfigured, OracleSettings  # noqa: F401
