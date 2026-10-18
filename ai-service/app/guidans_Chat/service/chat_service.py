"""GuideChatService — 가이드 챗봇의 진입 서비스. 라우터는 이 클래스만 부른다.

준비물을 한 묶음으로 들고 있다가 reload() 때 통째로 바꾼다(요청 중에도 안전하게 교체):
  지식 베이스(마크다운 + tiers.json) → ChromaDB 벡터 색인(bge-m3 임베딩, 바뀐 조각만 다시) → 하이브리드 검색기
  → LangGraph 그래프(생성 모델: 기본 Ollama gemma4:12b)
벡터 색인을 못 만들면(Ollama 꺼짐·bge-m3 없음 등) 예외 대신 BM25 만으로 계속한다 — /reload 로 다시 시도할 수 있다.
Oracle(SQL)은 쓰지 않는다 — 대화는 저장하지 않는 정책이라 그 층은 아직 연결하지 않았다.
"""
from __future__ import annotations

import logging
import threading

from ...config import Settings
from ..database import ChromaStore
from ..models import KnowledgeChunk
from ..repository import KnowledgeVectorRepository
from ..schema import ChatRequest, ChatResponse
from .embeddings import make_embeddings
from .graph import build_graph
from .knowledge import KnowledgeBase, build_knowledge_base
from .llm import make_llm
from .llm_status import LlmStatus
from .questions import random_questions
from .retrieval import HybridSearcher

log = logging.getLogger("ai-service.guidans_chat")


class GuideChatService:
    def __init__(self, settings: Settings, *, store: ChromaStore | None = None, embeddings=None):
        """store/embeddings 는 테스트에서 가짜를 꽂을 때만 넘긴다."""
        self.settings = settings
        self._lock = threading.Lock()
        self._store_override = store
        self._embeddings_override = embeddings
        self.kb: KnowledgeBase | None = None
        self._graph = None
        self.llm_status = LlmStatus(settings)     # AI 서버(Ollama) ON/OFF
        self.vector_info: dict = {"enabled": settings.vector_enabled, "ready": False}
        self.reload()

    # ------------------------------------------------------------------ 준비
    def _build_vector_index(self, kb: KnowledgeBase):
        """ChromaDB 색인을 맞추고 (검색기에 쓸 저장소, 질문 임베딩 함수)를 돌려준다. 실패하면 (None, None)."""
        s = self.settings
        info: dict = {"enabled": s.vector_enabled, "ready": False, "embed_model": s.embed_model}
        if not s.vector_enabled:
            self.vector_info = info
            return None, None
        try:
            store = self._store_override or ChromaStore(s.chroma_dir, s.embed_model)
            embeddings = self._embeddings_override or make_embeddings(s)
            repo = KnowledgeVectorRepository(store)
            chunks = [KnowledgeChunk.from_parts(d.page_content, d.metadata) for d in kb.documents]
            result = repo.sync(chunks, embeddings.embed_documents)
            info.update(ready=True, chunks=repo.count(), **result)
            self.vector_info = info
            log.info("벡터 색인: 전체 %d · 새로 %d · 삭제 %d (%s)", result["total"], result["added"], result["removed"], s.embed_model)
            return repo, embeddings.embed_query
        except Exception as err:  # noqa: BLE001 — 벡터를 못 쓰면 BM25 만으로 계속한다
            info["error"] = type(err).__name__
            self.vector_info = info
            log.warning("벡터 색인 실패, BM25 만 사용: %s", type(err).__name__)
            return None, None

    def reload(self) -> None:
        s = self.settings
        kb = build_knowledge_base(s.knowledge_dir, s.tiers_json, k=s.top_k)
        repo, embed_query = self._build_vector_index(kb)
        # 임베딩도 Ollama 로 하므로, provider 가 ollama 이고 꺼져 있으면 벡터 검색을 시도조차 하지 않는다
        vec_gate = self.llm_status.is_on if s.llm_provider == "ollama" else None
        searcher = HybridSearcher(kb.retriever, repo, embed_query, available=vec_gate)
        graph = build_graph(kb, make_llm(s), top_k=s.top_k, history_turns=s.history_turns, searcher=searcher, gate=self.llm_status)
        with self._lock:
            self.kb, self._graph = kb, graph
        self._warm_up()
        log.info("지식 베이스 로드: 문서 %d개, 캐릭터 %d명, 생성 모델 %s, 벡터 %s", len(kb.documents), len(kb.characters.characters),
                 f"{s.llm_provider}:{s.model}" if s.llm_enabled else "없음(문서 답)", "사용" if repo else "미사용(BM25)")

    def _warm_up(self) -> None:
        """Ollama 는 모델을 처음 부를 때 GPU 에 올리느라 20초쯤 걸린다 — 서비스가 뜰 때 미리 불러 첫 질문이 느리지 않게 한다.
        뒤에서(데몬 스레드) 하고 실패해도 무시한다. LLM 이 Ollama 가 아니면 하지 않는다."""
        s = self.settings
        if s.llm_provider != "ollama" or not s.warmup:
            return

        def run():
            try:
                make_llm(s).invoke("안녕")
                make_embeddings(s).embed_query("안녕")
                log.info("모델 워밍업 완료")
            except Exception as err:  # noqa: BLE001
                log.info("모델 워밍업 건너뜀: %s", type(err).__name__)

        threading.Thread(target=run, name="ollama-warmup", daemon=True).start()

    # ------------------------------------------------------------------ 조회
    def stats(self) -> dict:
        kb, s = self.kb, self.settings
        return {
            "documents": len(kb.documents) if kb else 0,
            "characters": len(kb.characters.characters) if kb else 0,
            "llm": s.llm_enabled,
            "provider": s.llm_provider,
            "ai": self.llm_status.get().label,
            "model": s.model if s.llm_enabled else None,
            "vector": self.vector_info,
        }

    def status_info(self) -> dict:
        """화면의 ON/OFF 알림용. 켜져 있는지 확인(10초 기억)해서 돌려준다."""
        st = self.llm_status.get()
        s = self.settings
        return {
            "ai": st.label,
            "reason": st.reason,
            "provider": s.llm_provider,
            "model": s.model if s.llm_enabled else None,
            "vector_ready": bool(self.vector_info.get("ready")),
            "documents": len(self.kb.documents) if self.kb else 0,
        }

    def questions(self, count: int = 3) -> list[str]:
        return random_questions(self.kb, count)

    def ask(self, body: ChatRequest) -> ChatResponse:
        """질문 하나를 처리한다(LLM 호출이 블로킹이라 라우터가 스레드풀에서 부른다)."""
        state = {"question": body.message.strip(), "history": [t.model_dump() for t in body.history]}
        with self._lock:
            graph = self._graph
        result = graph.invoke(state)
        return ChatResponse(
            answer=result.get("answer", ""),
            mode=result.get("mode", "fallback"),
            sources=result.get("sources", []),
            characters=[{"name": c.plain_name, "tier": c.tier, "grade": c.grade} for c in result.get("characters", [])],
            ai="on" if self.llm_status.get().on else "off",
        )
