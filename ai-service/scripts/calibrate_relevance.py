"""범위 판단 기준(MIN_VECTOR_SIM) 점검 스크립트 — 질문별 벡터 최고 유사도·BM25 점수를 낮은 순으로 출력한다.

사용:  cd ai-service && .venv/Scripts/python scripts/calibrate_relevance.py
사이트 질문(이용법·규칙…)이 모두 기준 위, 범위 밖 질문이 모두 기준 아래에 있어야 한다. 지식 문서·임베딩 모델을 바꾼 뒤 돌려 본다.
(실제 Ollama·bge-m3 가 켜져 있어야 한다. 결과는 화면에만 출력한다.)
"""
from __future__ import annotations

import os
import sys
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
# ⚠ 서비스(uvicorn)가 쓰는 ChromaDB 폴더를 이 스크립트가 같이 열면 두 프로세스가 같은 파일을 만져 서비스가 죽을 수 있다(실제로 겪음).
# 그래서 스크립트는 따로 CHROMA_DIR(data/chroma-scripts)을 쓴다 — 처음 한 번 전체 임베딩(약 20초)이 더 걸린다.
os.environ.setdefault("CHROMA_DIR", str(Path(__file__).resolve().parent.parent / "data" / "chroma-scripts"))

from app.config import load_settings  # noqa: E402
from app.guidans_Chat.database import ChromaStore  # noqa: E402
from app.guidans_Chat.repository import KnowledgeVectorRepository  # noqa: E402
from app.guidans_Chat.service.chat_service import GuideChatService  # noqa: E402
from app.guidans_Chat.service.embeddings import make_embeddings  # noqa: E402
from app.guidans_Chat.service.graph import _INJECTION, MIN_LEXICAL_CLEAN, MIN_VECTOR_SIM  # noqa: E402
from app.guidans_Chat.service.retrieval import HybridSearcher  # noqa: E402
from scripts.eval_guide_chat import CASES  # noqa: E402

EXTRA = [
    ("범위밖", "점심 메뉴 추천해줘"), ("범위밖", "영화 추천해줘"), ("범위밖", "대통령이 누구야?"), ("범위밖", "로또 번호 알려줘"),
    ("범위밖", "주식 추천해줘"), ("범위밖", "오늘 몇 월 며칠이야?"), ("범위밖", "수학 문제 풀어줘"), ("범위밖", "연애 상담해줘"),
    ("이용법", "로그인 안 하면 뭐가 안 돼?"), ("이용법", "친구한테 내 티어표 링크 보내려면?"), ("이용법", "포인트 어떻게 모아?"),
    ("이용법", "이벤트는 뭐가 있어?"), ("이용법", "알림 끄는 법"), ("이용법", "신고는 어디서 해?"), ("이용법", "화면 어둡게 하고 싶어"),
    ("이용법", "홈 화면에 추가하는 법"), ("이용법", "비번 까먹었어"), ("이용법", "인증 메일이 안 와"), ("이용법", "AI 서버 OFF 가 뭐야?"),
    ("이용법", "버전 1.0.5 에서 뭐가 바뀌었어?"), ("이용법", "가챠 확률 알려줘"), ("이용법", "스트릭이 끊겼어"),
]


def main() -> None:
    s = replace(load_settings(), llm_provider="none", warmup=False)
    svc = GuideChatService(s)
    repo = KnowledgeVectorRepository(ChromaStore(s.chroma_dir, s.embed_model))
    h = HybridSearcher(svc.kb.retriever, repo, make_embeddings(s).embed_query)
    rows = []
    for tag, q in CASES + EXTRA:
        r = h.search(q, 5)
        rows.append((r.vector_best, r.lexical_clean, tag, q))
    print(f"MIN_VECTOR_SIM = {MIN_VECTOR_SIM} · MIN_LEXICAL_CLEAN = {MIN_LEXICAL_CLEAN}  (벡터 {svc.vector_info})")
    print("(왼쪽 숫자=벡터 유사도, 군말뺀bm25=벡터를 못 쓸 때의 기준 점수)")
    bad = 0
    for v, l, tag, q in sorted(rows):
        site = tag in ("이용법", "규칙", "티어")
        flag = ""
        if site and v < MIN_VECTOR_SIM:
            flag, bad = "  ← 사이트 질문인데 기준 미만(범위 밖으로 거절됨)", bad + 1
        if tag == "범위밖" and v >= MIN_VECTOR_SIM and not _INJECTION.search(q):   # 인젝션은 검색 전에 거절된다
            flag, bad = "  ← 범위 밖인데 기준 이상(통과됨)", bad + 1
        print(f"{v:.3f} 군말뺀bm25={l:5.1f} [{tag}] {q}{flag}")
    print(f"\n경계 문제 {bad}건")


if __name__ == "__main__":
    main()
