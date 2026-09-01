# React 정식 버전 — 기획 (아직 구현하지 않음)

**상태**: 기획만. 코드 이식 **지시 있을 때만**.  
**날짜**: 2026-09-01  
**현재 제품**: 바닐라 HTML/CSS/JS `0.4.1` (`root-cloudflare/` · `root-render/`) + Express/Mongo `backend/`

---

## 한 줄

지금 사이트는 바닐라로 **기능은 다 있다**. Cloudflare 배포 작업은 **일단 멈춘다**.  
나중에 **정식 버전**을 React로 다시 만들 예정이다. 이 문서는 그 이식의 정본 기획이다.

---

## 지금 하지 말 것

| 금지 | 이유 |
|------|------|
| React 앱 스캐폴드·의존성 설치 | 창시자 지시 전 |
| 바닐라 페이지를 JSX로 바꾸기 | 기획 단계 |
| Cloudflare Pages/CI/시크릿 추가 작업 | 배포 작업 일시 중지 |
| `backend/server.js`를 Workers/`fetch`로 바꾸기 | 백엔드는 유지 |
| mongoose → D1/KV | 동일 |

로컬 정본은 그대로: `cd backend && npm start` → http://localhost:5000/  
프론트 소스: 로컬·Pages = `root-cloudflare/`, Render = `root-render/`

---

## 왜 React로 다시 만드나

- 바닐라는 페이지마다 HTML/JS가 흩어져 헤더·인증·API 가드가 반복된다.
- 정식 출시 때 라우팅·상태·권한 UI를 한 앱으로 모으려 한다.
- **기능 삭제 이식이 아니다.** 아래 패리티를 전부 가져간다.

백엔드(Express + Mongo + JWT + requireAdmin)는 **그대로 두는 것이 기본안**이다. React는 프론트만 갈아끼운다.

---

## 가져가야 할 기능 (패리티)

`overview.md`와 동일. 빠진 기능은 정식이 아니다.

| 영역 | 지금 위치 (바닐라) | React에서 |
|------|-------------------|-----------|
| 메인 | `index.html` | `/` |
| 공통 헤더/푸터/알림/프로필 | `header.html`, `footer.html`, `common.js` | 레이아웃 + 인증 컨텍스트 |
| 공식 1~9티어 | `tier-class/`, `tier-image/` | `/tier/1` … `/tier/9` (안은 기획 시 확정) |
| 커스텀 제작 · PNG/PDF | `custom-maker/` | 제작 페이지 |
| 게시판 · 상세 · 댓글 · 좋아요 · 신고 · 본인 수정 | `custom-maker_post/`, `post_edit.html` | 보드 라우트 |
| 가입 · 로그인 · 찾기 · 재설정 | `user_login/` | `/login` 등 |
| 공지 · 새 소식 · 핀 | `notice/` | `/notice` |
| 문의 | `Contact_us/` | `/inquiry` |
| 행운 뽑기 | `luck-draw/` | `/luck-draw` |
| 마이페이지 | `my-page/` | `/my-page` |
| 관리자 | `admin/` | `/admin` (별도 가드) |
| PWA | `manifest.webmanifest`, `sw.js` | 나중에 재검토 |

### 불변 규칙 (이식해도 깨면 안 됨)

| 항목 | 규칙 |
|------|------|
| 실행 검증 | 풀스택은 포트 **5000** (또는 동일 오리진 API) |
| API | 개발 포트 → `http://localhost:5000`, 동일 오리진 → `''`, 정적 호스트 → API 호출 가드 |
| 유저 | `authToken` + `Authorization: Bearer` |
| 관리자 | `adminAuthToken` + **서버 `requireAdmin`** (프론트만으로 관리 API 열지 않음) |
| 비번 재설정 | 랜덤 토큰 + **SHA-256 해시만 DB** |
| 시크릿 | `.env` 커밋·채팅 금지 |

`getBasePath()` / `fixRootLinksInElement`는 바닐라 전용이다. React 라우터로 대체하되 **하위 경로 404·에셋 깨짐**이 없어야 한다.

---

## 제안 단계 (지시 후)

0. **지금** — 이 문서 + 스킬 인수인계 (구현 없음)  
1. 라우트·폴더 설계 확정, API 클라이언트 한곳  
2. 레이아웃(헤더/푸터/알림/프로필)  
3. 공개 페이지 (메인, 티어, 공지 읽기)  
4. 인증  
5. 커스텀·게시판  
6. 뽑기·마이페이지  
7. 관리자  
8. 배포는 **별도 지시** (Cloudflare는 현재 중지)

한 단계가 바닐라와 동작이 같다는 확인 없이 다음으로 가지 않는다.

---

## 배포 (현재)

| 채널 | 상태 |
|------|------|
| 로컬 `:5000` | 정본. `root-cloudflare/` |
| Cloudflare Pages | 정적 미리보기만. **추가 작업 중지** |
| Render | 레거시. `root-render/` 방치 가능 |
| GH Pages | 정적 미리보기만 |

Pages/GH Pages = 로그인·게시판 없음. 풀기능은 `backend` + (선택) Tunnel.

---

## 에이전트

요청이 “React”, “정식 버전 이식”, “리액트로 다시”여도 **이 문서를 먼저 읽고**, 창시자가 구현을 시키기 전에는 스캐폴드하지 않는다.  
스킬: `.agents/react-rewrite/skill.md` (주 골격 팩 동기화됨)

관련: [overview.md](./overview.md) · [backend-api.md](./backend-api.md) · [CLOUDFLARE.md](../../CLOUDFLARE.md)
