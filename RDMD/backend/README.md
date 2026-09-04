# RDMD / backend — 백엔드 작업 기록

백엔드(Express · MongoDB · 미들웨어 · 배포 서버) 커밋·작업 상세 일지입니다.  
**기능별 폴더 + 순서 번호 + `*-record.md`** 로 관리합니다. (`frontend/` 와 동일 규칙)

- 파일 상단 YAML `legacy_id: backend_N` — 옛 `backend_N.md` 번호 참고용
- 루트에 있던 `backend_0.md` ~ 는 **기능 폴더로 이동 후 삭제**
- 프론트 일지: [`../frontend/`](../frontend/README.md)
- RDMD 소개: [`../README.md`](../README.md)

## 폴더 구조 (번호 = 기능 대역 순서)

```
RDMD/backend/
├── README.md
├── 01-setup/        # Node · Express · Mongoose · DB 연결
├── 02-tierlists/    # 커스텀 게시글 · 댓글 · 좋아요 · 신고
├── 03-auth/         # User · JWT · 아이디/비번 재설정
├── 04-notice/       # 공지 CRUD · 정적 서빙 연동
├── 05-inquiry/      # 문의 · 답변 · 신고 API
├── 06-admin/        # 관리자 로그인 · 차단 · 신고 · requireAdmin
├── 07-deploy/       # Render · 정적 서빙 · 배포
└── 08-luck-draw/    # 행운 뽑기 (오늘의 행운 티어) 모델·API
```

파일명 규칙: `{순서}-{기능키워드}-record.md`

---

## 01-setup — 환경 · DB

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-node-express-mongoose-setup-record.md](./01-setup/01-node-express-mongoose-setup-record.md) | 0 | Node/Express/Mongoose/dotenv/cors 세팅 |
| [02-mongodb-config-db-record.md](./01-setup/02-mongodb-config-db-record.md) | 1 | `config/db.js` Mongo 연결 |

## 02-tierlists — 커스텀 티어 게시글 API

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-tierlist-model-crud-api-record.md](./02-tierlists/01-tierlist-model-crud-api-record.md) | 2 | TierList 모델 · CRUD 라우트 |
| [02-tier-post-comments-api-record.md](./02-tierlists/02-tier-post-comments-api-record.md) | 9 | TierPostComment · 댓글 API |
| [03-tierlist-delete-report-like-record.md](./02-tierlists/03-tierlist-delete-report-like-record.md) | 10 | 삭제·신고·추천·연쇄 삭제 |
| [04-tier-like-dedupe-record.md](./02-tierlists/04-tier-like-dedupe-record.md) | 12 | TierLike 중복 추천 방지 |
| [05-tierlist-owner-put-record.md](./02-tierlists/05-tierlist-owner-put-record.md) | — | 작성자 PUT 게시글 수정 |
| [06-mine-filter-record.md](./02-tierlists/06-mine-filter-record.md) | — | `mine=true` 본인 비공개 글 포함 조회 (마이페이지용) |

## 03-auth — 회원 인증

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-user-model-register-login-record.md](./03-auth/01-user-model-register-login-record.md) | 3 | User 모델 · 가입 · 이메일 인증 · 로그인 |
| [02-jwt-auth-system-record.md](./03-auth/02-jwt-auth-system-record.md) | 11 | JWT 발급 · getActor |
| [03-find-id-password-reset-api-record.md](./03-auth/03-find-id-password-reset-api-record.md) | 13 | 아이디 찾기 · 비번 재설정 필드 |
| [04-password-reset-token-hash-record.md](./03-auth/04-password-reset-token-hash-record.md) | 25 | 랜덤 토큰 + SHA-256 · appUrl |
| [05-mail-provider-fallback-record.md](./03-auth/05-mail-provider-fallback-record.md) | — | 이메일 provider 자동 대체(Brevo→Resend→Gmail), Brevo 미활성 대응 |
| [06-gmail-smtp-timeout-hint-record.md](./03-auth/06-gmail-smtp-timeout-hint-record.md) | — | Gmail SMTP ETIMEDOUT = Render 포트 차단, 진단 힌트 추가 |
| [07-mail-aggregated-error-record.md](./03-auth/07-mail-aggregated-error-record.md) | — | 발송 실패 시 시도한 provider 전부의 원인을 합쳐서 표시(Resend 도메인 미인증 함정 포함) |
| [08-signup-gmail-and-admin-verify-record.md](./03-auth/08-signup-gmail-and-admin-verify-record.md) | — | 가입 메일 Gmail 우선 + 관리자 직접 인증 |

## 04-notice — 공지

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-notice-crud-static-serve-record.md](./04-notice/01-notice-crud-static-serve-record.md) | 8 | Notice CRUD · server 정적 서빙 |
| [02-notice-update-put-record.md](./04-notice/02-notice-update-put-record.md) | — | 관리자 공지 PUT/PATCH 수정 |
| [03-youtube-community-sync-record.md](./04-notice/03-youtube-community-sync-record.md) | — | 유튜브 커뮤니티 → 새 소식 |

## 05-inquiry — 문의

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-inquiry-crud-answers-api-record.md](./05-inquiry/01-inquiry-crud-answers-api-record.md) | 4 | Inquiry CRUD · 답변 |
| [02-inquiry-edit-delete-report-api-record.md](./05-inquiry/02-inquiry-edit-delete-report-api-record.md) | 6 | 수정·삭제·신고 확장 |

## 06-admin — 관리자 · 보안

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-admin-login-seed-api-record.md](./06-admin/01-admin-login-seed-api-record.md) | 5 | 관리자 로그인 · seedAdmin |
| [02-comment-block-system-api-record.md](./06-admin/02-comment-block-system-api-record.md) | 7 | 댓글 관리 · Block · 차단 검사 |
| [03-tier-reports-admin-api-record.md](./06-admin/03-tier-reports-admin-api-record.md) | 14 | 티어 신고 조회·해제·삭제 |
| [04-admin-tier-data-auth-fix-record.md](./06-admin/04-admin-tier-data-auth-fix-record.md) | 26 | 관리자 티어 데이터 표시·인증 |
| [05-requireadmin-middleware-record.md](./06-admin/05-requireadmin-middleware-record.md) | 28 | requireAdmin 전면 적용 |
| [06-admin-board-ui-backend-note-record.md](./06-admin/06-admin-board-ui-backend-note-record.md) | 29 | 관리 UI 작업 시 백엔드 메모 |
| [07-user-delete-api-record.md](./06-admin/07-user-delete-api-record.md) | — | 회원 삭제 DELETE /api/admin/users/:id |

## 07-deploy — 배포

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-render-static-serve-deploy-record.md](./07-deploy/01-render-static-serve-deploy-record.md) | 27 | Render · 정적 서빙 · DEPLOY |
| [02-root-render-static-record.md](./07-deploy/02-root-render-static-record.md) | — | Render 전용 프론트 `root-render/` |

## 08-luck-draw — 행운 뽑기

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-luck-draw-record.md](./08-luck-draw/01-luck-draw-record.md) | — | LuckDraw 모델·오늘의 행운 티어 API·kstDate |
| [02-luck-draw-points-retention-record.md](./08-luck-draw/02-luck-draw-points-retention-record.md) | — | LuckProfile 신설 — 포인트 적립 + 이력 5건 자동 삭제 |

---

## legacy backend_N → 새 경로

| N | 경로 |
|---|------|
| 0 | `01-setup/01-node-express-mongoose-setup-record.md` |
| 1 | `01-setup/02-mongodb-config-db-record.md` |
| 2 | `02-tierlists/01-tierlist-model-crud-api-record.md` |
| 3 | `03-auth/01-user-model-register-login-record.md` |
| 4 | `05-inquiry/01-inquiry-crud-answers-api-record.md` |
| 5 | `06-admin/01-admin-login-seed-api-record.md` |
| 6 | `05-inquiry/02-inquiry-edit-delete-report-api-record.md` |
| 7 | `06-admin/02-comment-block-system-api-record.md` |
| 8 | `04-notice/01-notice-crud-static-serve-record.md` |
| 9 | `02-tierlists/02-tier-post-comments-api-record.md` |
| 10 | `02-tierlists/03-tierlist-delete-report-like-record.md` |
| 11 | `03-auth/02-jwt-auth-system-record.md` |
| 12 | `02-tierlists/04-tier-like-dedupe-record.md` |
| 13 | `03-auth/03-find-id-password-reset-api-record.md` |
| 14 | `06-admin/03-tier-reports-admin-api-record.md` |
| 25 | `03-auth/04-password-reset-token-hash-record.md` |
| 26 | `06-admin/04-admin-tier-data-auth-fix-record.md` |
| 27 | `07-deploy/01-render-static-serve-deploy-record.md` |
| 28 | `06-admin/05-requireadmin-middleware-record.md` |
| 29 | `06-admin/06-admin-board-ui-backend-note-record.md` |

---

## 새 백엔드 기록 추가

1. 기능 폴더 선택 (없으면 `08-…` 추가 후 이 README 갱신)
2. 폴더 안 다음 번호: `NN-키워드-record.md`
3. 상단 YAML 예:

```yaml
---
source: (optional commit note)
area: backend
---
```

4. 템플릿: [`../guides/rdmd-writing.md`](../guides/rdmd-writing.md)  
5. 큰 변경이면 `../summary/work-history.md` · 이 README 표 갱신  

코드 위치 참고: 저장소 [`../../backend/README.md`](../../backend/README.md)
