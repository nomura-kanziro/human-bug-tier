---
area: backend
feature: auth
---

# 기록 — 인증 메일 공용 템플릿 (회원가입 · 아이디 찾기 · 비밀번호 재설정)

## 요청

> 회원가입이나 아이디/비밀번호 찾기 메일 내용이 부실하다 — 예시 이미지대로 바꾸고, 맨 아래 구분선 다음 한 칸 띄워
> "본 메일은 발신전용 메일입니다. 이메일 수신 설정은 … 알림설정을 이용해주시길 바랍니다." 를 넣어 달라.

## 관련 커밋

| 커밋 | 날짜 | 내용 |
|---|---|---|
| `d549b2c` | 09-29 | feat(auth) — 3종 메일을 예시문 템플릿으로 통일(로고·안내·문의 링크·발신전용 문구) |
| `917e9de` | 09-29 | 로고를 움직이는 GIF(`human_bug_eyes_icon.gif`)로, 회색 배경·테두리 제거 — **git 메시지 제목이 비어 `Co-Authored-By` 줄만 남은 커밋**(올바른 메시지: `style(auth): 인증 메일 로고를 움직이는 GIF(human_bug_eyes_icon)로 바꾸고 회색 배경·테두리 제거`, `commit_history` 340번) |
| `3ab8238` | 09-29 | fix(auth) — 발신전용 문구 "카카오디벨로퍼스" → "휴먼버그대학교" |
| (서버 설정) | 09-29 | 운영 `APP_URL` → `https://human-bug-tier.com` — 메일 링크·로고가 정식 주소로 나감 |

## 파일

- `backend/utils/mailTemplate.js` (신규) — `buildAppMailHtml({ appUrl, title, message, bodyHtml, button, note })`, `escapeHtml()`
- `backend/controllers/authController.js` — `register`(가입 인증), `findId`, `forgotPassword` 가 위 함수로 HTML 을 만든다

## 모양

로고 → 제목 → "항상 human-bug-tier를 이용해 주셔서 감사합니다." → 안내 문구 → 파란 버튼 → 버튼 아래 안내
→ "도움이 필요하시거나 문의 사항이 있으시면 고객지원 이메일로 연락해 주세요:" + `<APP_URL>/inquiry` + 카카오톡 오픈채팅 링크 → "감사합니다."
→ 구분선 → 빈 줄 → 발신전용 안내.

| 메일 | 제목 | 버튼(링크) | 버튼 아래 |
|---|---|---|---|
| 회원가입 | 회원가입 인증 | 계정 인증하기 (`/api/auth/verify/<토큰>`) | 이 인증 링크는 1시간 동안만 유효합니다. |
| 아이디 찾기 | 아이디 찾기 — "회원님의 아이디는 **닉네임** 입니다." | 로그인하러 가기 (`/login`) | 본인이 요청하지 않았다면 무시 |
| 비밀번호 재설정 | 비밀번호 재설정 | 비밀번호 재설정하기 (`/user_login/reset_password.html?token=…` → 프론트가 `/reset-password` 로) | 1시간 유효 + 본인 요청 아니면 무시 |

설계:
- 메일 앱은 `<style>`·flex 를 제대로 지원하지 않아 **표(table) 레이아웃 + 인라인 스타일만** 쓴다.
- 로고는 Outlook 등이 webp 를 못 열어 GIF/PNG. 처음 `logo2.png`(정적 PNG) → 요청으로 `human_bug_eyes_icon.gif`(400×400, 약 1.2 MB — 늦게 뜰 수 있고 Outlook 데스크톱은 첫 장면만).
- 처음엔 예시처럼 회색 배경(#f2f2f2)·남색 테두리 카드였고, 요청으로 흰 배경·테두리 없음으로 바꿨다(아이디 상자 테두리 포함). 구분선은 유지.
- 메일 안에서는 상대경로가 안 되므로 로고·링크를 `getAppBaseUrl(req)`(=`APP_URL`) 기준 절대 주소로 만든다.
- 아이디 찾기의 닉네임은 이전엔 HTML 에 그대로 넣었는데, 이번에 `escapeHtml` 로 감쌌다.
- 문의 링크의 카카오톡 오픈채팅 주소(`open.kakao.com/o/sX6H0F7h`)는 창시자 예시 이미지에 있던 값이다(저장소 다른 곳에는 없음).

## 진행 중 있었던 일

- 첫 구현 후 **운영 서버에 배포하지 않은 채** 보고해, 창시자가 받은 메일이 예전 모양이었다 → 배포.
  이후에도 예전 메일이 보였던 것은 배포 전에 보낸 메일이었다(nginx 기록상 배포 뒤 가입 요청 0건). 로컬 서버도 예전 코드로 켜져 있었다.
- `hbt-tier.duckdns.org` 가 일부 환경에서 "차단됨"으로 떠서, 서버 `APP_URL` 을 정식 주소 `https://human-bug-tier.com` 으로 바꿨다(인증 링크 `/api/auth/verify/…` 는 Pages Function 이 서버로 넘긴다).

## 확인

- 헤드리스 Chrome 으로 3종 HTML 렌더링 캡처(예시 이미지와 같은 구성, 닉네임에 태그를 넣어도 글자로 표시).
- 운영 서버에서 템플릿으로 만든 HTML 에 로고·버튼·문의 링크 2개·발신전용 문구 포함, duckdns 주소 없음.
- `human-bug-tier.com` 에서 인증 링크(가짜 토큰 → 서버의 "만료/유효하지 않음" 응답)·로고 GIF·`/login`·`/inquiry`·재설정 링크 정상.
- **실제 수신 메일로는 확인하지 못했다**(창시자가 직접 받아 보는 것으로 확인).

## 함께 바로잡은 문서 (2026-10-02)

- 가입 메일 발송 순서: `RDMD/features/auth.md`·인증 스킬·`.env.example` 주석이 "Gmail 먼저(기본 on)"로 남아 있었는데, 2026-09-10 `1c7f473` 부터 기본은 Brevo→Resend→Gmail 표준 순서이고 `SIGNUP_MAIL_SKIP_API=true` 일 때만 Gmail 우선이다. 모두 정정.
