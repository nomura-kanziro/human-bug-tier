---
source: RDMD/backend/backend_0.md
legacy_id: backend_0
area: backend
---

> **원본 일지**: `backend_0.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
1. 먼저 알아야 할 것들
받아야 할 엔피엠 패키지 (backend 폴더 안에서 설치)

express — 웹 서버 프레임워크 (필수)
mongoose — 몽고디비 연결 + 스키마 관리 (필수)
dotenv — .env 파일로 환경변수 관리 (필수)
cors — 프론트(로컬)와 백엔드 간 통신 허용 (필수, 나중에 배포하면 도메인 제한)

나중에 필요해지면 추가:

multer (이미지 업로드)
jsonwebtoken (로그인 토큰)
bcryptjs (비밀번호 암호화)

브이코드 확장 프로그램 추천

Thunder Client — API 테스트 (포스트맨 대신 최고)
MongoDB — 몽고디비 직접 쿼리/확인
Node.js Extension Pack — 노드제이에스 개발 지원
DotENV — .env 파일 색상/자동완성
ESLint + Prettier — 코드 정리 (선택)

2. 파일 및 폴더 구조 
backend/
├── package.json              ← 이미 생성됨
├── server.js                 ← 메인 서버 진입점 (여기서 앱 시작)
├── .env                      ← 환경변수 (몽고디비 주소, 포트 등) ← 절대 깃에 올리지 말 것
├── .gitignore                ← node_modules, .env 무시 설정
├── config/
│   └── db.js                 ← 몽고디비 연결 함수 (connectDB)
├── models/
│   └── TierList.js           ← 티어리스트 스키마/모델 (나중에 만듦)
│   └── User.js               ← 사용자 스키마 (인증 필요할 때)
├── controllers/
│   └── tierListController.js ← 실제 로직 함수 (saveTierList, getTierList 등)
├── routes/
│   └── tierListRoutes.js     ← 라우트 정의 (/api/tierlists GET, POST 등)
└── middleware/               ← 인증 미들웨어 (필요할 때 추가)