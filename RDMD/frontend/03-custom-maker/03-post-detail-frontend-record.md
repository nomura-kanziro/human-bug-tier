---
source: RDMD/information9.md
legacy_id: information9
area: frontend
---

> **원본 일지**: `information9.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커스텀 메이커 게시판 상세 페이지(포스트 상세) 프론트엔드 작업 내역

## 주요 변경 파일
- custom-maker/custom-maker_post/post_detail.html
- custom-maker/custom-maker_post/post_detail.css
- custom-maker/custom-maker_post/post_detail.js

---

## 작업 요약

### 1. 상세 페이지 레이아웃 및 구조 구현
- 게시글 상세 페이지(post_detail.html) 신규 작성
  - 헤더/푸터 공통 영역 동적 로드
  - 게시글 프로필, 제목, 메타 정보(작성자, 날짜, 조회, 추천, 댓글) 표시
  - 티어 테이블(갑급/을급/병급/정급) 영역 마크업 및 샘플 데이터 배치
  - 추천/공유/이벤트 버튼 및 댓글 영역(입력/목록) 포함

### 2. 스타일링
- post_detail.css 신규 작성
  - 프로필, 제목, 메타, 버튼, 댓글 등 상세 페이지 전용 스타일 분리
  - 반응형, 다크/라이트 혼합, 버튼/링크/통계 등 세부 디자인 적용

### 3. 상세 페이지 동작 구현 (post_detail.js)
- 더미 데이터 기반 게시글 정보 렌더링
- 티어별 캐릭터 샘플 표시(향후 실제 데이터 연동 예정)
- 추천/공유/이벤트 버튼 클릭 시 안내 메시지
- 댓글 입력/등록(임시), 댓글 영역 스크롤 이동 등 기본 동작 구현
- 유저 관련 게시글 보기, 댓글 카운트 등 추후 확장 고려한 구조

---

## 작업 목적
- 커스텀 메이커 게시판의 "상세 보기" 페이지 프론트엔드 구조 완성
- 추후 백엔드 연동 및 기능 확장(추천, 댓글, 공유 등) 기반 마련
- UI/UX 일관성 및 유지보수성 강화

---

**요약:**
게시판 상세(포스트) 페이지의 레이아웃, 스타일, 기본 동작을 완성하여, 사용자와 관리자가 상세 정보를 직관적으로 확인하고 상호작용할 수 있도록 준비함.

## 추가 수정 (커밋: 819b2a5)

### 요약
- `post_detail.html`의 댓글 입력을 `<textarea>`에서 contenteditable한 `<div class="comment-input-box">`로 변경
- `post_detail.css`에 `.comment-input-box` 관련 스타일 추가 및 placeholder/focus 스타일 정의
- `post_detail.js`에서 댓글 읽기/등록 로직을 `value` 접근에서 `innerText`/`innerHTML`로 변경하여 contenteditable을 지원

### 변경 파일 및 주요 내용
- `custom-maker/custom-maker_post/post_detail.html`
  - 댓글 입력창을 textarea에서 contenteditable div로 교체하여 더 자유로운 편집 경험 제공

- `custom-maker/custom-maker_post/post_detail.css`
  - `.comment-input-box` 스타일 추가: 높이(min/max), 패딩, 테두리, 배경, 텍스트, placeholder, focus 스타일 포함
  - 기존 textarea 규칙 제거 및 contenteditable 요소에 맞춘 스타일 정리

- `custom-maker/custom-maker_post/post_detail.js`
  - 댓글 제출 함수(`submitComment`)가 contenteditable 요소의 `innerText`를 읽고, 등록 후 `innerHTML = ''`로 초기화하도록 변경
  - 입력값 유효성 검사 및 사용자 안내 메시지 유지

### 목적 및 영향
- contenteditable 방식으로 입력 UX 향상: 임의 HTML/줄바꿈 처리, 복사·붙여넣기 동작이 자연스러워짐
- CSS/JS 동시 변경으로 기존 textarea 기반 로직과 스타일 충돌을 방지하고 일관된 동작 확보
- 향후 리치 텍스트 확장(간단한 서식, 이미지 첨부 등)으로 확장하기 쉬운 기반 마련

---

이 변경사항도 문서에 반영해 두었으니 필요하면 더 자세한 diff 요약(라인 단위) 또는 커밋 해시 링크 형식으로 정리해 드리겠습니다.

## 추가 수정 (커밋: 120e986)

### 요약
- `Contact_us` 페이지의 입력창 스타일 정리 및 UI 간격 조정 작업을 수행
- 중복/충돌하던 규칙을 제거하고, contenteditable 기반 입력 흐름으로 일관화

### 변경 파일 및 주요 내용
- `Contact_us/common-v2.css`
  - `.comment-input-box` 스타일을 정리하여 배경을 흰색(#ffffff), 텍스트는 검정(#111), 테두리 통일(3px solid #111)
  - placeholder, focus 상태 스타일 추가
  - reply/edit/action 관련 중복 규칙 제거하고 해당 박스는 입력창 높이(min/max-height)만 제어하도록 변경
  - 입력창과 제출 버튼 사이의 시각적 간격(margin) 10px 적용
  - 여러 섹션(댓글 목록, 답변 박스 등) 스타일을 정리해 일관성 향상

- `Contact_us/common-v2.js`
  - 폼 렌더링에서 `<textarea>`를 contenteditable `.comment-input-box`로 변경하여 편집 체험을 통일
  - 입력/등록 함수들(`addComment`, `submitReply`, `submitEdit`, 등)에서 `value` 대신 `innerText`/`innerHTML`을 사용하도록 변경
  - 동적으로 생성되는 답변/수정 상자 역시 contenteditable 요소로 생성하도록 수정
  - 기존 textarea 전용 보정 로직(Enter 처리 등)은 제거되거나 contenteditable용으로 대체

### 목적 및 영향
- Contact_us의 입력 UX를 contenteditable로 통일하여 복사·붙여넣기, 줄바꿈 처리를 자연스럽게 지원
- 스타일 중복을 제거해 유지보수성이 향상되고, 입력창/버튼 간격 조정으로 가독성 및 입력 편의성이 개선됨
- JS/HTML/CSS를 함께 변경해 기존 textarea 기반 로직과의 불일치 문제를 해결함

---

필요하면 이 섹션을 더 축약하거나, 각 변경 파일의 주요 diff(핵심 라인)만 뽑아 추가로 넣어드리겠습니다.
