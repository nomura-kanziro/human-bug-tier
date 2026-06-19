# RDMD - 개발 기록 일지

RDMD(RD + MD)는 **휴버대 티어표** 프로젝트의 개발 과정을 기록한 문서 저장소입니다.

주요 커밋 작업을 체계적으로 정리하여, 프론트엔드와 백엔드 변경 사항을 분리해서 기록합니다.

## 📌 목적
- 커밋 단위로 작업 내용을 빠르게 파악
- 프론트엔드와 백엔드 변경을 명확히 구분
- 향후 유지보수 및 팀원 온보딩에 활용

## 📁 파일 구성

- **프론트엔드 기록**: `informationN.md` (1 ~ 29)
- **백엔드 기록**: `backend_N.md` (0 ~ 14, 25 ~ 29)

> 번호가 일치하는 파일(`information25.md` ↔ `backend_25.md`)은 **같은 커밋 작업**을 프론트/백으로 나눠 기록한 것입니다.

---

## 기록 일지 분류

### 1. 초기 구조 및 공통 기능 (information1 ~ information10 / backend_0 ~ backend_10)

**주요 주제**: 프로젝트 초기 세팅, 공통 헤더/푸터, 경로 처리, 기본 CRUD

#### 프론트엔드
- `information1.md`: Header/Footer 공통화, `getBasePath()` 경로 자동 보정, 이벤트 처리 개선
- `information2~5.md`: 기본 페이지 구조 정리, CSS 분리, 티어 페이지 초기 작업
- `information10.md`: 커스텀 메이커 초기 구조 및 게시판 연동 준비

#### 백엔드
- `backend_0.md`: Node.js 기본 환경, Express + Mongoose 세팅 가이드
- `backend_1~5.md`: TierList 모델, 기본 CRUD, DB 연결
- `backend_10.md`: TierList 삭제·신고·좋아요 기능 확장

---

### 2. 인증 시스템 (Auth)

**주요 주제**: 회원가입, 로그인, JWT, 비밀번호 재설정

#### 프론트엔드
- `information23.md`: 로그인·회원가입·비밀번호 재설정 프론트 연동
- `information25.md`: 비밀번호 재설정 페이지 개선 (랜덤 토큰 방식, `auth_api.js` 추가)

#### 백엔드
- `backend_23.md` / `backend_25.md`: `authController.js`에서 JWT 대신 안전한 랜덤 토큰 + SHA256 해시 사용, `appUrl.js` 유틸 추가, `validate-reset-token` / `reset-password` API 구현

---

### 3. 공지사항 및 알림 시스템

**주요 주제**: 공지 작성, 분류(전체 공지 / 새 소식), 핀 기능, 알림

#### 프론트엔드
- `information10~12.md` 부근: notice 폴더 구조 완성, 공지 목록/상세 페이지 개발
- `information18~19.md`: 알림 기능 UI 연동

#### 백엔드
- `backend_10~12.md`: Notice 모델 및 컨트롤러, 카테고리 분리
- Notification 관련 라우트 및 서비스 로직

---

### 4. 커스텀 메이커 및 게시판 (Custom Maker + Tier Posts)

**주요 주제**: 티어 제작, 업로드, 댓글, 좋아요, 신고

#### 프론트엔드
- `information15~20.md`: 커스텀 메이커 게시판, `post_detail` 상세 페이지 (티어 렌더링, 댓글 CRUD, 신고, 좋아요)
- `information26.md`: 관리자에서 커스텀 게시글/댓글 표시 문제 수정

#### 백엔드
- `backend_10.md`, `backend_15~20.md`: TierList / TierPostComment 모델 확장 (신고, 좋아요, 댓글 연쇄 삭제)
- `backend_26.md`: tier-reports 조회용 API 일부 인증 완화 (조회용)

---

### 5. 관리자 시스템 및 신고 관리 (Admin)

**주요 주제**: 관리자 로그인, 댓글/문의/신고 관리, 차단

#### 프론트엔드
- `information24.md`: 관리자 JWT 로그인 + 티어 신고 관리 UI
- `information26.md`: 어드민 커스텀 메이커 표시 문제 수정 + `admin_api.js` 분리
- `information29.md`: 관리자 댓글/공지 관리 페이지 UI 강화 (필터 색상 통일, 헤더 적용)

#### 백엔드
- `backend_14.md`: adminTierReportController (신고된 게시글/댓글 조회·해제·삭제)
- `backend_24.md`, `backend_26.md`: admin 라우트 보호 강화
- `backend_28.md`: `requireAdmin` 미들웨어 도입 및 전면 적용

---

### 6. 배포 및 환경 통합 (Deploy - GitHub Pages + Render)

**주요 주제**: 경로 문제 해결, API 베이스 통일, Render 배포 준비

#### 프론트엔드
- `information27.md`: `getBasePath()` 개선, `fixRootLinksInElement` 추가, header/footer 404 해결, 상대 경로 정리, GitHub Pages 서브패스 대응
- `information28.md`: API Base 로직 통합 (`get*ApiBase()`)

#### 백엔드
- `backend_27.md`: `render.yaml`, `DEPLOY.md`, `backend/.env.example` 작성, `server.js` 정적 파일 서빙 + clean URL 미들웨어 강화, `appUrl.js` 연동
- `backend_25.md`: 배포 환경에서의 절대 링크 생성 지원

---

### 7. 최근 작업 정리 (information25 ~ 29 / backend_25 ~ 29)

| 번호 | 프론트엔드 (information) | 백엔드 (backend_) | 주요 내용 |
|------|---------------------------|-------------------|----------|
| 25   | 비밀번호 재설정 페이지, auth_api.js | 랜덤 토큰 방식 + appUrl 유틸 | 보안 강화 |
| 26   | admin_api.js, 커스텀 표시 문제 수정 | tier-reports 라우트 일부 조정 | 관리자 연동 |
| 27   | getBasePath + fixRootLinks, 상대경로 정리 | render.yaml, server.js 정적 서빙, DEPLOY.md | GH Pages + Render 대응 |
| 28   | - (주로 백엔드) | requireAdmin 미들웨어, 모든 관리자 라우트 보호 | 보안 |
| 29   | 댓글/공지 관리 UI 강화 (CSS 색상, getAdminAuthHeaders) | (직접 변경 적음, 이전 미들웨어 기반) | 관리자 UX 개선 |

---

## 사용 방법

- 특정 기능의 변경 이력을 찾고 싶을 때 → 해당 번호 파일 확인
- 프론트만 보고 싶으면 `informationN.md`
- 백엔드만 보고 싶으면 `backend_N.md`
- 같은 번호 파일을 함께 보면 전체 작업 흐름 파악 가능

---

## 참고
- 이 기록들은 실제 커밋 메시지와 변경 파일을 기반으로 작성되었습니다.
- 15~24번 구간은 초기 작업이 1~14번에 집중되어 있으며, 25번부터는 별도 큰 주제로 재정리되었습니다.
- 더 자세한 내용은 각 `.md` 파일 본문을 참고하세요.

**마지막 업데이트**: 2026-06-20
