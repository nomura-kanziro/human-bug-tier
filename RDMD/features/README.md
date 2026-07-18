# 기능 설명 (Features)

휴버대 티어표의 **구성 기능**을 영역별로 설명합니다.  
모듈 폴더의 README와 연동되어 있으며, 온보딩·유지보수 시 이 폴더부터 읽으면 됩니다.

## 문서 목록

| 문서 | 설명 |
|------|------|
| [overview.md](./overview.md) | 전체 기능 맵 · 폴더 대응 · 사용자 여정 |
| [common-infra.md](./common-infra.md) | common.js, Header/Footer, 경로·API Base |
| [tier-class.md](./tier-class.md) | 공식 1~9 티어표 |
| [custom-maker.md](./custom-maker.md) | 커스텀 제작 · 게시판 · 댓글 |
| [auth.md](./auth.md) | 회원가입 · 로그인 · 비번 재설정 |
| [notice.md](./notice.md) | 공지 · 새 소식 · 핀 |
| [inquiry.md](./inquiry.md) | 문의하기 · 답변 · 신고 |
| [admin.md](./admin.md) | 관리자 로그인 · 통합 관리 |
| [notifications.md](./notifications.md) | 알림 시스템 |
| [backend-api.md](./backend-api.md) | API 그룹 · 모델 · 미들웨어 |

## 모듈 README (코드 옆 문서)

| 기능 | 경로 |
|------|------|
| 관리자 | [`admin/README.md`](../../admin/README.md) |
| 백엔드 | [`backend/README.md`](../../backend/README.md) |
| 커스텀 메이커 | [`custom-maker/README.md`](../../custom-maker/README.md) |
| 인증 | [`user_login/README.md`](../../user_login/README.md) |
| 공지 | [`notice/README.md`](../../notice/README.md) |
| 문의 | [`Contact_us/README.md`](../../Contact_us/README.md) |

## 읽는 순서 추천

1. **overview** → 전체 그림  
2. **common-infra** → 모든 페이지 공통 규칙  
3. 담당 기능 문서 (auth / custom-maker / admin 등)  
4. **backend-api** → API·권한 확인  
5. 필요 시 [`../guides/`](../guides/README.md) 가이드라인
