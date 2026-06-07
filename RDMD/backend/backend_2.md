# Backend 작업 로그 — backend_2

## 개요
이 문서는 최근 백엔드 관련 커밋(티어리스트 API 추가)에 대한 요약입니다. 핵심은 Mongoose 모델(TierList), 컨트롤러, 라우트의 추가 및 서버(`server.js`)에 라우터 연결을 수행한 내용입니다.

---

## 관련 커밋 (요약)
- commit: 675a158a47e5c79efe54b46d868012a8ce3df4cb
  - 제목: feat(api): 티어리스트 CRUD 시작 — 모델, 컨트롤러, 라우트 및 서버 연결 추가
  - 작성자: nomura
  - 날짜: 2026-06-08 (커밋 메타는 저장소참조)

---

## 변경된 파일
- Added: `backend/models/TierList.js`
  - Mongoose 스키마 정의: title, description, tierData(Object), author, isPublic, tags, likeCount
  - timestamps 활성화 (createdAt, updatedAt)

- Added: `backend/controllers/tierController.js`
  - `getAllTierLists` : DB에서 모든 티어리스트 조회, 최신순 정렬
  - `createTierList` : 요청 바디로 티어리스트 생성 (기본값 포함)

- Added: `backend/routes/tierRoutes.js`
  - GET `/api/tierlists` → `getAllTierLists`
  - POST `/api/tierlists` → `createTierList`

- Modified: `backend/server.js`
  - `app.use('/api/tierlists', tierRoutes)` 추가로 라우터 연결
  - 기존 헬스체크 및 에러 핸들러 유지

---

## 기술적 설명
- 데이터 모델
  - `tierData` 필드는 유연한 구조를 위해 `Object`로 설정됨. 프론트에서 S/A/B 같은 키와 항목 배열을 담아 전송하는 구조를 기대함.
  - `tags`는 문자열 배열로 저장되어 검색/필터링 용도로 사용 가능.

- 컨트롤러
  - 최소한의 에러 핸들링(try/catch)이 적용되어 있으며, 입력 유효성(예: title 존재 여부, tierData 필요성)은 컨트롤러에서 강화 가능.

- 라우팅
  - 라우터가 `/api/tierlists`에 마운트되므로 클라이언트는 REST 엔드포인트를 통해 티어리스트를 생성/조회할 수 있음.

---

## 빠른 테스트 가이드 (개발 환경)
1. `.env`에 MongoDB 연결 문자열(`MONGODB_URI`)을 설정하고, `backend` 폴더에서 의존성 설치:

```powershell
cd backend
npm install
```

2. 서버 시작 (개발):

```powershell
npm run dev
# 또는
node server.js
```

3. 헬스 체크: GET http://localhost:5000/health → JSON 응답 확인
4. 엔드포인트 테스트 (예: curl 또는 Postman/Thunder Client)
   - GET 모든 항목 조회
     GET http://localhost:5000/api/tierlists
   - POST 새 항목 생성
     POST http://localhost:5000/api/tierlists
     Content-Type: application/json
     Body 예시:
     {
       "title": "테스트 티어리스트",
       "description": "샘플 설명",
       "tierData": {"S": ["캐릭터A"], "A": ["캐릭터B"]},
       "author": "tester",
       "isPublic": true,
       "tags": ["예시","테스트"]
     }

---

## 제안된 개선/다음 작업
1. 입력 유효성 강화: `createTierList`에서 `title`과 `tierData` 필수 검사 및 반환 에러 메시지 표준화
2. 인증 추가: 작성자(author)를 JWT 기반 사용자 정보로 연동하여 권한 제어(수정/삭제 권한 등) 구현
3. 페이징/필터링: `getAllTierLists`에 `limit`, `page`, `tags`, `author` 필터 지원 추가
4. 테스트 추가: Jest + Supertest로 기본 API 테스트(생성/조회/에러 케이스)
5. API 문서: 간단한 OpenAPI(Swagger) 스펙 추가

---

문서 생성일: 2026-06-08
