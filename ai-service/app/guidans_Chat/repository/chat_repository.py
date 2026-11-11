"""채팅 저장소 — Oracle 에 통계·대화 원문을 넣고 오래된 원문을 지운다. SQL 은 여기서만 안다(항상 바인드 변수)."""
from __future__ import annotations

from ..models import ChatLog, ChatStat
from .base import OracleRepository


class ChatStatRepository(OracleRepository):
    def add(self, stat: ChatStat) -> None:
        self.execute(
            "INSERT INTO HBT_CHAT_STAT (answer_mode, ai, provider, question_len, source_count, character_count, latency_ms) "
            "VALUES (:answer_mode, :ai, :provider, :question_len, :source_count, :character_count, :latency_ms)",
            {
                "answer_mode": stat.mode, "ai": stat.ai, "provider": stat.provider, "question_len": stat.question_len,
                "source_count": stat.source_count, "character_count": stat.character_count, "latency_ms": stat.latency_ms,
            },
        )

    def daily_counts(self, days: int = 7) -> list[dict]:
        """최근 N일 날짜별 질문 수와 모드(llm/fallback/fixed)별 개수."""
        return self.fetch_all(
            "SELECT TRUNC(created_at) AS day, answer_mode, COUNT(*) AS cnt FROM HBT_CHAT_STAT "
            "WHERE created_at >= SYSTIMESTAMP - NUMTODSINTERVAL(:days, 'DAY') GROUP BY TRUNC(created_at), answer_mode ORDER BY day",
            {"days": days},
        )


class ChatLogRepository(OracleRepository):
    def add(self, log: ChatLog) -> None:
        self.execute(
            "INSERT INTO HBT_CHAT_LOG (expires_at, answer_mode, question, answer) "
            "VALUES (SYSTIMESTAMP + NUMTODSINTERVAL(:days, 'DAY'), :answer_mode, :question, :answer)",
            {"days": log.retention_days, "answer_mode": log.mode, "question": log.question, "answer": log.answer},
        )

    def purge_expired(self) -> int:
        """보관 기간이 지난 원문을 지운다. 지운 행 수를 돌려준다."""
        return self.execute("DELETE FROM HBT_CHAT_LOG WHERE expires_at < SYSTIMESTAMP")
