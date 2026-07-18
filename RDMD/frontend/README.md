# RDMD / frontend — 프론트엔드 작업 기록

프론트엔드 커밋·작업 상세 일지입니다.  
기능별 폴더 + 순서 번호 + `*-record.md` 파일명으로 관리합니다.

- 일부 파일 상단 YAML의 `legacy_id` 는 옛 번호 체계 참고용 (루트 `information*.md` 는 **삭제됨**)
- 백엔드 일지: [`../backend/README.md`](../backend/README.md) (기능 폴더 + `*-record.md`)
- RDMD 전체 소개: [`../README.md`](../README.md)

## 폴더 구조 (번호 = 기능 대역 순서)

```
RDMD/frontend/
├── README.md
├── 01-common/           # 공통 UI · JWT 유틸 · 전역 변경
├── 02-tier-class/       # 공식 티어 페이지 (인덱스 기록)
├── 03-custom-maker/     # 제작 · 게시판 · 상세 · 업로드
├── 04-notice/           # 공지 · 새 소식
├── 05-auth/             # 로그인 · 가입 · 비번 재설정
├── 06-inquiry/          # 문의하기 (Contact_us)
├── 07-admin/            # 관리자 UI · 신고 · 차단
├── 08-notifications/    # 헤더 알림 (교차 참조)
└── 09-deploy-path/      # getBasePath · API Base · 배포 경로
```

파일명 규칙: `{순서}-{기능키워드}-record.md`

---

## 01-common

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-header-footer-getbasepath-record.md](./01-common/01-header-footer-getbasepath-record.md) | 1 | Header/Footer, getBasePath, 이벤트 |
| [02-project-structure-overview-record.md](./01-common/02-project-structure-overview-record.md) | 2 | 프로젝트 구조·기능 스냅샷 |
| [03-misc-feature-changelog-record.md](./01-common/03-misc-feature-changelog-record.md) | 5 | 기능 추가·수정 요약 |
| [04-jwt-auth-utils-commonjs-record.md](./01-common/04-jwt-auth-utils-commonjs-record.md) | 22 | common.js JWT 유틸·로그아웃 |

## 02-tier-class

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-tier-pages-layout-index-record.md](./02-tier-class/01-tier-pages-layout-index-record.md) | 1 (교차) | 티어 페이지 레이아웃 관련 인덱스 |

## 03-custom-maker

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-maker-page-complete-record.md](./03-custom-maker/01-maker-page-complete-record.md) | 4 | 제작 페이지 완료 |
| [02-board-frontend-record.md](./03-custom-maker/02-board-frontend-record.md) | 8 | 게시판 프론트 |
| [03-post-detail-frontend-record.md](./03-custom-maker/03-post-detail-frontend-record.md) | 9 | 포스트 상세 프론트 |
| [04-board-api-search-report-record.md](./03-custom-maker/04-board-api-search-report-record.md) | 19 | 게시판 API·검색·신고 |
| [05-post-detail-comments-likes-record.md](./03-custom-maker/05-post-detail-comments-likes-record.md) | 20 | 상세·댓글·좋아요 |
| [06-maker-upload-to-board-record.md](./03-custom-maker/06-maker-upload-to-board-record.md) | 21 | 제작→게시판 업로드 |

## 04-notice

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-notice-modal-frontend-record.md](./04-notice/01-notice-modal-frontend-record.md) | 6 | 공지 섹션·모달 |
| [02-notice-folder-pages-record.md](./04-notice/02-notice-folder-pages-record.md) | 10 | notice 폴더·페이지 |
| [03-notice-system-integration-record.md](./04-notice/03-notice-system-integration-record.md) | 18 | 공지 시스템 연동·상세 |

## 05-auth

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-login-signup-find-pages-record.md](./05-auth/01-login-signup-find-pages-record.md) | 11 | 로그인/가입/찾기 페이지 |
| [02-login-api-profile-ui-record.md](./05-auth/02-login-api-profile-ui-record.md) | 12 | 로그인 API·프로필 UI |
| [03-user-auth-jwt-frontend-record.md](./05-auth/03-user-auth-jwt-frontend-record.md) | 23 | 유저 인증 프론트 API |
| [04-password-reset-frontend-record.md](./05-auth/04-password-reset-frontend-record.md) | 25 | 비밀번호 재설정 |

## 06-inquiry

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-contact-api-first-link-record.md](./06-inquiry/01-contact-api-first-link-record.md) | 13 | Contact 1차 API 연동 |
| [02-inquiry-edit-delete-report-record.md](./06-inquiry/02-inquiry-edit-delete-report-record.md) | 15 | 수정·삭제·신고 |
| [03-answers-report-ui-record.md](./06-inquiry/03-answers-report-ui-record.md) | 16 | 답변·신고 UI |

## 07-admin

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-comment-management-ui-record.md](./07-admin/01-comment-management-ui-record.md) | 3 | 댓글 관리 UX |
| [02-comment-detail-filters-block-record.md](./07-admin/02-comment-detail-filters-block-record.md) | 7 | 상세·필터·차단 |
| [03-admin-login-frontend-record.md](./07-admin/03-admin-login-frontend-record.md) | 14 | 관리자 로그인 |
| [04-comment-user-block-api-ui-record.md](./07-admin/04-comment-user-block-api-ui-record.md) | 17 | 유저·차단 API UI |
| [05-jwt-login-tier-report-ui-record.md](./07-admin/05-jwt-login-tier-report-ui-record.md) | 24 | JWT + 티어 신고 UI |
| [06-admin-api-custom-display-fix-record.md](./07-admin/06-admin-api-custom-display-fix-record.md) | 26 | admin_api · 표시 수정 |
| [07-auth-middleware-admin-routes-record.md](./07-admin/07-auth-middleware-admin-routes-record.md) | 28 | requireAdmin 연동 노트 |
| [08-comment-notice-ui-polish-record.md](./07-admin/08-comment-notice-ui-polish-record.md) | 29 | 댓글/공지 관리 UI 강화 |

## 08-notifications

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-header-notification-ui-index-record.md](./08-notifications/01-header-notification-ui-index-record.md) | cross-ref | 헤더 알림 UI 인덱스 |

## 09-deploy-path

| 파일 | legacy | 요약 |
|------|--------|------|
| [01-getbasepath-api-base-deploy-frontend-record.md](./09-deploy-path/01-getbasepath-api-base-deploy-frontend-record.md) | 27 | 경로·API Base·배포 프론트 |

---

## informationN → 새 경로

| N | 경로 |
|---|------|
| 1 | `01-common/01-header-footer-getbasepath-record.md` (+ tier-class 교차) |
| 2 | `01-common/02-project-structure-overview-record.md` |
| 3 | `07-admin/01-comment-management-ui-record.md` |
| 4 | `03-custom-maker/01-maker-page-complete-record.md` |
| 5 | `01-common/03-misc-feature-changelog-record.md` |
| 6 | `04-notice/01-notice-modal-frontend-record.md` |
| 7 | `07-admin/02-comment-detail-filters-block-record.md` |
| 8 | `03-custom-maker/02-board-frontend-record.md` |
| 9 | `03-custom-maker/03-post-detail-frontend-record.md` |
| 10 | `04-notice/02-notice-folder-pages-record.md` |
| 11 | `05-auth/01-login-signup-find-pages-record.md` |
| 12 | `05-auth/02-login-api-profile-ui-record.md` |
| 13 | `06-inquiry/01-contact-api-first-link-record.md` |
| 14 | `07-admin/03-admin-login-frontend-record.md` |
| 15 | `06-inquiry/02-inquiry-edit-delete-report-record.md` |
| 16 | `06-inquiry/03-answers-report-ui-record.md` |
| 17 | `07-admin/04-comment-user-block-api-ui-record.md` |
| 18 | `04-notice/03-notice-system-integration-record.md` |
| 19 | `03-custom-maker/04-board-api-search-report-record.md` |
| 20 | `03-custom-maker/05-post-detail-comments-likes-record.md` |
| 21 | `03-custom-maker/06-maker-upload-to-board-record.md` |
| 22 | `01-common/04-jwt-auth-utils-commonjs-record.md` |
| 23 | `05-auth/03-user-auth-jwt-frontend-record.md` |
| 24 | `07-admin/05-jwt-login-tier-report-ui-record.md` |
| 25 | `05-auth/04-password-reset-frontend-record.md` |
| 26 | `07-admin/06-admin-api-custom-display-fix-record.md` |
| 27 | `09-deploy-path/01-getbasepath-api-base-deploy-frontend-record.md` |
| 28 | `07-admin/07-auth-middleware-admin-routes-record.md` |
| 29 | `07-admin/08-comment-notice-ui-polish-record.md` |

---

## 새 프론트 기록 추가

1. 기능 폴더 선택 (없으면 `10-…` 추가 후 이 README 갱신)
2. 폴더 안 다음 번호: `NN-키워드-record.md`
3. 상단 YAML 예:

```yaml
---
source: (optional commit note)
area: frontend
---
```

4. 본문 템플릿: [`../guides/rdmd-writing.md`](../guides/rdmd-writing.md)  
5. 큰 변경이면 [`../summary/work-history.md`](../summary/work-history.md) · 이 README 표 한 줄 갱신
