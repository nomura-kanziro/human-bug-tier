# RDMD/ai — AI 전용 서비스 기록

저장소 루트 **`ai-service/`**(Python FastAPI · LangChain · LangGraph · RAG)는 Express 와 분리된 **별도 서비스**라서, 서비스 자체의 기록은 이 폴더에 둔다.
같은 작업의 **화면·프록시 조각은 기존 규칙대로 `frontend/`·`backend/` 에 기록**하고 서로 링크한다(AI 기능 하나가 세 곳에 걸치므로 아래 표를 같이 본다).

| 조각 | 위치 | 요약 |
|------|------|------|
| **AI 서비스 자체** | [01-ai-service-record.md](./01-ai-service-record.md) | FastAPI · LangGraph 흐름 · RAG(마크다운 지식 + tiers.json, 한국어 BM25) · Claude(LangChain) · fallback · 랜덤 추천 질문 · 설계 판단 · 남은 일 |
| Express 프록시 | [`../backend/10-ai/01-ai-proxy-record.md`](../backend/10-ai/01-ai-proxy-record.md) | `/api/ai` — 입력 검사 · IP당 요청 제한 · 공유 키 · 장애 시 503 |
| 화면 | [`../frontend/15-ai/01-ai-helper-page-record.md`](../frontend/15-ai/01-ai-helper-page-record.md) | `/ai` 휴버봇 대화창 · 추천 질문 · 푸터/가이드 링크 |
| 기능 설명(what) | [`../features/ai-service.md`](../features/ai-service.md) | 구조·흐름·지식·설정·운영 배포 상태 |
| 서비스 README(how) | [`../../ai-service/README.md`](../../ai-service/README.md) | 실행·테스트·지식 고치기·운영 배포 절차 |
| 작업 규칙 | [`../../.agents/ai-service/skill.md`](../../.agents/ai-service/skill.md) | 모든 AI 공통 정본(Claude·Grok·Codex 팩은 복제본) |

## 기록 원칙 (AI 서비스 한정)

- 지식 문서(`ai-service/knowledge/*.md`)를 고친 커밋도 기록한다 — AI 답이 바뀌는 변경이다.
- 모델·프롬프트·검색 방식 변경은 **왜** 바꿨는지(답 품질 사례)를 남긴다.
- API 키·실제 대화 내용(개인정보)은 기록에 넣지 않는다.
