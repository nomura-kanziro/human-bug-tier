---
source: RDMD/information6.md
legacy_id: information6
area: frontend
---

> **원본 일지**: `information6.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 공지사항 섹션 및 상세 모달 프론트엔드 개선 내역

## 주요 변경 이력

### 1. 공지사항 상세 모달 기능 구현 (`7b9f102`)
- **common.js**
  - 공지사항 상세 모달(`showNoticeModal`, `closeNoticeModal`) 기능을 공통 스크립트로 이동 및 개선
  - 모달 데이터 구조를 객체로 통합, 하드코딩된 공지사항 예시 제공
  - 모달 열기/닫기 시 display 스타일 제어 방식으로 변경
- **common.css**
  - 공지사항 모달(`.notice-modal`, `.modal-content` 등) 스타일 추가
  - 전체 공지 보기 링크 색상 고정 및 hover 효과 통일
- **index.html**
  - 공지사항 상세 모달 구조를 기존 Tailwind 기반에서 커스텀 CSS 기반 구조로 변경
  - 모달 내 제목, 날짜, 본문, 닫기 버튼 등 세분화

### 2. 공지사항 섹션 UI 개선 (`760cc00`)
- **common.css**
  - 공지사항 헤더(`.notice-header`)와 상자(`.notice-grid`) 사이 여백 조정
  - `.notice-column-header`에 하단 마진 추가로 각 공지 카테고리 구분 강조
- **index.html**
  - 공지사항 카테고리(일반/이벤트) 헤더에 `.notice-column-header` 클래스 적용
  - 전체 공지 보기 링크를 버튼 스타일로 변환, 상하 간격 조정

## 작업 목적
- 공지사항 섹션의 시각적 완성도 및 가독성 향상
- 상세 모달 기능을 공통화하여 유지보수성 및 재사용성 강화
- 사용자 경험(UX) 개선: 공지 클릭 시 상세 내용 즉시 확인 가능

## 참고 커밋
- 7b9f10210afcd8a0dcd0e928b54b3eff08e81d1a
- 760cc00e2e0982327751db5f5bbc02f55f32e867

---

**요약:**
공지사항 영역의 레이아웃, 모달, 버튼, 간격 등 프론트엔드 구조를 대폭 개선하여, 정보 전달력과 사용성을 모두 높임.
