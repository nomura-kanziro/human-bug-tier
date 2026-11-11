"""Oracle 연결 확인 + 테이블 만들기. 서버(또는 PC)에서 ai-service/.env 의 ORACLE_* 를 채운 뒤 한 번 실행한다.

  python scripts/init_oracle.py          # 연결 확인 + 없는 테이블만 생성(이미 있으면 그대로)
  python scripts/init_oracle.py --check  # 연결만 확인하고 테이블은 만들지 않는다

비밀번호·지갑 경로는 출력하지 않는다.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import load_settings  # noqa: E402  (.env 를 읽어 환경 변수에 채운다)
from app.guidans_Chat.database import OracleDatabase, ensure_tables, ping  # noqa: E402
from app.guidans_Chat.models import ORACLE_TABLES  # noqa: E402


def main() -> int:
    load_settings()
    db = OracleDatabase()
    if not db.is_configured:
        print("ORACLE_USER / ORACLE_PASSWORD / ORACLE_DSN 가 비어 있습니다 (ai-service/.env 를 확인하세요).")
        return 2
    try:
        print(f"연결 성공 - DB 사용자: {ping(db)}")
        if "--check" in sys.argv:
            return 0
        for name, state in ensure_tables(db, ORACLE_TABLES).items():
            print(f"  {name}: {'새로 만듦' if state == 'created' else '이미 있음'}")
        return 0
    except Exception as err:  # noqa: BLE001
        print(f"실패: {type(err).__name__}: {err}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
