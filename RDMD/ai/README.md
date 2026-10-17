# RDMD/ai — AI 전용 서비스 기록

저장소 루트 **`ai-service/`**(Python FastAPI · LangChain · LangGraph · RAG)와, 그것을 부르는 Express 프록시(`backend/routes/aiRoutes.js`)·화면(`root-cloudflare/src/pages/AiHelper.jsx`) 작업을 한 곳에 기록한다.
AI 기능은 프론트·백엔드에 걸쳐 있지만 **독립 서비스**라서 `frontend/`·`backend/` 와 따로 둔다.

| 파일 | 요약 |
|------|------|
| [01-ai-service-record.md](./01-ai-service-record.md) | AI 전용 서비스 신설 — `/ai` 휴버봇 챗봇 + 랜덤 추천 질문 3개, LangGraph 흐름, RAG(마크다운 지식 + tiers.json, 한국어 BM25), Claude(LangChain), Express 프록시(요청 제한·키), fallback |

기능 설명: [`../features/ai-service.md`](../features/ai-service.md) · 서비스 README: [`../../ai-service/README.md`](../../ai-service/README.md)

## 기록 원칙 (AI 서비스 한정)

- 지식 문서(`ai-service/knowledge/*.md`)를 고친 커밋도 기록한다 — AI 답이 바뀌는 변경이다.
- 모델·프롬프트·검색 방식 변경은 **왜** 바꿨는지(답 품질 사례)를 남긴다.
- API 키·실제 대화 내용(개인정보)은 기록에 넣지 않는다.
