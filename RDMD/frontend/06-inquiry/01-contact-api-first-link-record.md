---
source: RDMD/information13.md
legacy_id: information13
area: frontend
---

> **원본 일지**: `information13.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information13)

## 개요
Contact_us(문의하기) 페이지를 백엔드 Inquiry API와 1차 연동한 작업입니다. 문의 등록과 목록 조회를 서버 기반으로 전환했으며, 기존 `common-v2` 파일을 페이지 전용 구조로 정리했습니다.

---

## 관련 커밋
- **commit 5565dae**
  - 제목: `feat(Contact_us): 문의 페이지 프론트엔드 백엔드 1차 연동`

---

## 변경된 파일 목록 (프론트엔드)
- Renamed: `Contact_us/common-v2.css` → `Contact_us/contact_us.css`
- Renamed: `Contact_us/common-v2.js` → `Contact_us/contact_us.js`
- Modified: `Contact_us/contact_us.html` — 스크립트·스타일 경로 업데이트

---

## 주요 구현 내용

### 1. 파일 구조 정리
- 문의 페이지 전용 `contact_us.js` / `contact_us.css`로 분리
- `contact_us.html`에서 새 파일명 참조

### 2. 문의 등록 API 연동 (`addComment`)
- 로그인 사용자 정보를 포함해 `POST /api/inquiries` 호출
- 등록 성공 후 목록 자동 갱신

### 3. 문의 목록 API 연동 (`loadComments`)
- `GET /api/inquiries`로 전체 문의·답변 목록 조회
- MongoDB `_id` 기반으로 DOM 렌더링

### 4. 1차 연동 범위 (아직 로컬/미연동)
- 답변 등록·수정·삭제·신고 등은 이후 커밋에서 순차 API 연동 예정

---

## API 연동 요약
| 기능 | 메서드 | 엔드포인트 | 상태 |
|------|--------|------------|------|
| 문의 등록 | POST | `/api/inquiries` | ✅ 1차 완료 |
| 문의 목록 | GET | `/api/inquiries` | ✅ 1차 완료 |
| 답변/수정/삭제/신고 | - | - | ⏳ 이후 작업 |

---

## 테스트 체크리스트
1. 로그인 후 문의 작성이 DB에 저장되는지 확인
2. 페이지 새로고침 후 문의 목록이 API에서 불러와지는지 확인
3. 비로그인 시 문의 작성 제한 UI가 동작하는지 확인
4. `contact_us.html`에서 헤더·푸터가 정상 로드되는지 확인

---

## 향후 개선 제안
- 답변·수정·삭제·신고 전체 API 연동 (information15, 16에서 진행)
- 문의 페이지네이션 및 무한 스크롤
- 로딩/에러 상태 UI 통일

---

문서 생성일: 2026-06-15