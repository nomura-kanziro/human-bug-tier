# 전체 기능 맵

> ⛔ **2026-09-19 창시자 지시 — 프론트 작업은 `root-cloudflare/`(React)에만 한다.**  
> `root-render/`(바닐라, Render)는 **베타 버전에서 업데이트 종료 → 수정 금지**(보관용).  
> `backend/` 는 공용 API 서버라 계속 작업한다. 정본: [`../../.agents/common-rules.md`](../../.agents/common-rules.md) ０항  
> React 이식 현황: [react-rewrite.md](./react-rewrite.md) — 바닐라 기능 100% 반영 완료.

## 서비스 한눈에

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html (메인)                        │
│  퀵 카드(섹션 스크롤) · 공지 · 메이커/뽑기 미리보기 · 공식 티어표 │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
     ┌───────▼───────┐            ┌───────▼────────┐
     │  tier-class/  │            │ custom-maker/  │
     │  공식 티어표  │            │ 제작 + 게시판  │
     └───────────────┘            └───────┬────────┘
                                          │
                                  post_detail (댓글·좋아요·신고)
             │
     ┌───────┴────────┬──────────────┬─────────────┐
     │ user_login/    │ notice/      │ Contact_us/  │
     │ 회원·인증      │ 공지·소식    │ 문의         │
     └───────┬────────┴──────┬───────┴──────┬──────┘
             │               │              │
             └───────────────┼──────────────┘
                             ▼
                    ┌────────────────┐
                    │  admin/        │
                    │  통합 관리     │
                    └───────┬────────┘
                            ▼
                    ┌────────────────┐
                    │ backend/       │
                    │ Express+Mongo  │
                    └────────────────┘
```

## 폴더 ↔ 기능 대응

| 폴더 / 파일 | 기능 | 주요 사용자 |
|-------------|------|-------------|
| `root-render/index.html` | 홈(퀵 스크롤·메이커/뽑기 위젯·공식 티어표·공지) | 전체 |
| `root-cloudflare/` header/footer/`common.js` | 공통 UI·경로·인증 헤더·알림 | 전체 |
| `root-cloudflare/tier-class/` | 공식 1~9티어 캐릭터 목록 | 방문자 |
| `root-cloudflare/tier-image/` | 캐릭터·로고 이미지 자산 | (에셋) |
| `root-cloudflare/custom-maker/` | 티어 제작, PNG/PDF, 본인 글 수정 | 회원·방문자 |
| `root-cloudflare/custom-maker/custom-maker_post/` | 게시판·상세·댓글·수정 진입 | 회원 |
| `root-cloudflare/user_login/` | 가입·로그인·찾기·재설정 | 방문자→회원 |
| `root-cloudflare/notice/` | 공지 목록·상세 | 전체 / 작성은 Admin |
| `root-cloudflare/Contact_us/` | 문의 등록·조회 | 전체 / 답변 Admin |
| `root-cloudflare/luck-draw/` | 오늘의 행운 티어 뽑기 | 방문자(체크)·회원(저장) |
| `root-cloudflare/my-page/` | 내 게시글·뽑기 활동 요약 | 회원 |
| `root-cloudflare/admin/` | 관리자 로그인·대시보드 | Admin |
| `backend/` | API + 정적 서빙 | 서버 |
| `ai-service/` | **AI 전용 서비스**(Python FastAPI · LangChain · LangGraph · RAG) — `/ai` 휴버봇 답변·추천 질문. Express `/api/ai` 뒤에서만 호출 — [ai-service.md](./ai-service.md) | 방문자(AI 도우미) |
| `root-cloudflare/src/pages/Guide.jsx` + `GuideMode.jsx` | 가이드 페이지(`/guide`) + 게임식 가이드 모드 | 방문자 |
| `RDMD/` | 개발 기록·가이드·기능 문서 | 개발자 |

## 사용자 여정 (시연 흐름)

1. **메인** → 퀵 카드로 섹션 이동, 공지·메이커 미리보기·행운 위젯, 공식 티어표 카드  
2. **공식 티어표** → 캐릭터·이미지 열람  
3. **커스텀 메이커** → 드래그(또는 모바일 탭)로 배치, 풀이 보이면 ▲▼로 티어표/풀 끝 이동 → PNG/PDF 저장  
4. **(로그인)** → 게시판 업로드 · 댓글 · 좋아요 · **본인 글 수정**  
5. **문의하기** → 관리자 답변 대기  
6. **관리자** → 공지 작성·수정·핀, 문의 답변, 신고·차단 처리  

로컬 전체 체험: `cd backend && npm start` → `http://localhost:5000/`

## 권한 요약

| 동작 | 비로그인 | 일반 회원 | 관리자 |
|------|:--------:|:---------:|:------:|
| 공식 티어 열람 | O | O | O |
| 커스텀 제작·다운로드 | O | O | O |
| 게시글 작성·댓글·좋아요 | - | O | O |
| 본인 게시글 수정 | - | O | O |
| 공지 읽기 | O | O | O |
| 공지 작성·수정·핀·삭제 | - | - | O |
| 문의 작성 | O | O | O |
| 문의 답변·삭제 | - | - | O |
| 오늘의 행운 티어 뽑기(체크) | O | O | O |
| 오늘의 행운 티어 결과 저장·기록 조회 | - | O | O |
| 마이페이지(내 게시글·뽑기 집계) | - | O | O |
| 신고 처리·차단 | - | - | O |
| 관리 대시보드 | - | - | O |

## 실행 환경별 기능

| 환경 | 정적 UI | API(로그인·게시판 등) |
|------|:-------:|:---------------------:|
| `backend` :5000 (권장) | O | O |
| 로컬 정적 포트(5500 등) + backend 5000 | O | O (API Base 자동) |
| 정식 주소 `https://human-bug-tier.com` (Cloudflare Pages, 현재 운영) | O | O (`/api` 를 Oracle 서버로 프록시) |
| Oracle Cloud 서버 직접 `https://hbt-tier.duckdns.org` | O | O (운영자 확인용 — 회원에게 안내하지 않음) |
| Cloudflare Pages `human-bug-tier.pages.dev` | O | O (Pages Function 이 `/api` 를 Oracle 로 프록시 — 함수 배포 후) |
| Render.com (레거시, 베타 종료) | O | O |
| GitHub Pages | O (미리보기) | X (`GITHUB_STATIC`) |

## AI 전용 서비스 (2026-10-18~)

```
브라우저 /ai ─▶ backend /api/ai (검사·요청 제한) ─▶ ai-service (FastAPI :8000, 내부 전용)
                                                     ├ LangGraph 흐름(analyze → retrieve → generate)
                                                     ├ RAG: ai-service/knowledge/*.md + tiers.json (BM25)
                                                     └ Claude(LangChain) — 키 없으면 문서 답
```

사이트 기능·규칙을 바꾸면 **`ai-service/knowledge/*.md` 도 같이 고친다**(AI 가 옛 규칙을 답하지 않게). 상세 [ai-service.md](./ai-service.md).

## 다음 문서

- [common-infra.md](./common-infra.md) — 경로·공통 스크립트  
- [backend-api.md](./backend-api.md) — API 전체 맵  
- [ai-service.md](./ai-service.md) — AI 도우미 · AI 전용 서비스  
- [../summary/work-history.md](../summary/work-history.md) — 작업 이력  
