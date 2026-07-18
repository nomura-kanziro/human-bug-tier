---
source: RDMD/information2.md
legacy_id: information2
area: frontend
---

> **원본 일지**: `information2.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
```markdown
# 휴버대 티어표 (Human Bug Tier)

> 휴먼버그대학교 티어표 사이트 - 문의사항 & 관리자 시스템

## 📌 프로젝트 개요
- **Contact_us** 페이지: 로그인 기반 문의사항 작성 및 댓글/답변 시스템
- **Admin** 페이지: 전체 댓글 관리 + 상세 관리 페이지
- **주요 기술**: HTML, CSS, Vanilla JS, localStorage (Node.js Express 백엔드 준비 완료)

---

## ✨ 주요 기능 (최신 업데이트)

### 1. Contact_us 페이지 (일반 사용자)
- 로그인 시 프로필 + 제목 + 내용 작성 가능
- 로그아웃 상태에서도 댓글 목록은 항상 볼 수 있음
- 댓글 기능: 답변, 신고(4가지 사유 + 기타), 수정, 삭제
- 답변 기능: 답변 작성, 답변의 답변, 수정, 삭제, 신고
- **답변 토글**: "답변 보기 (n개)" 버튼으로 접기/펼치기
- Enter 키로 줄바꿈 정상 지원 (`\n` → `<br>` 변환)

### 2. Admin 댓글 관리 페이지 (`comment-management.html`)
- **파란색 네비게이션 바** (댓글 탐색 기능)
  - 전체 댓글 (기본)
  - 일반유저 댓글
  - 관리자 댓글
  - 신고한 댓글
- **검색 기능**
  - 작성자 ID 또는 내용 검색 (실시간 + 검색 버튼)
- **신고 사유 필터**
  - 없음 / 도배 및 테러행위 / 비방 및 모욕행위 / 광고형 댓글 / 기타
- 상세 버튼 + 삭제 버튼 + 신고 느낌표 표시
- 차단 IP/ID 관리 기능 유지

### 3. Admin 댓글 상세 페이지 (`comment-detail.html`)
- 원본 댓글 상세 정보 표시
- **답변 탐색 기능** (파란 네비게이션 바)
  - 전체 답변 / 신고된 답변
- 답변 내용 검색
- 신고 사유별 필터
- **답변 토글**: "📬 답변 보기 (n개)" 버튼
- 답변 삭제 + 신고 느낌표 클릭 시 팝업 (클릭 유지 + 바깥 클릭/더블클릭으로 닫기)
- 전체 댓글 삭제 버튼

---

## 📁 주요 파일 구조

```
admin/comments/
├── comment-management.html          # 전체 댓글 관리
├── comment-management.js
├── comment-detail.html              # 댓글 상세 + 답변 관리
├── comment-detail.js
├── comment-management.css (또는 common-v2.css)
└── ...

Contact_us/
├── index.html
├── common-v2.js
├── common-v2.css
```

---

## 🚀 사용 방법

1. **로그인** → 프로필 아이콘(👑) 클릭 → 관리하기
2. **comment-management.html**에서 필터와 검색으로 원하는 댓글 찾기
3. **상세 버튼** 클릭 → comment-detail.html에서 답변 관리
4. **Contact_us**에서 일반 사용자용 댓글/답변 작성

---

## 기술 특징

- `common.js` 기반 경로 자동 보정 (admin/comments 지원)
- localStorage 기반 데이터 영속성
- 동적 DOM 렌더링 + 이벤트 위임
- Enter 키 줄바꿈 완전 지원 (`nl2br`)
- 답변/필터/토글 상태 유지 로직
- 모바일까지 고려한 반응형 UI

---

## 향후 계획 (TODO)

- Node.js Express + DB 연동 (localStorage → 백엔드)
- 이미지 업로드 지원
- 페이지네이션
- 알림 시스템

---

**개발자**: nomura (프론트/백엔드 개발자 역할)  
**최종 업데이트**: 2026년 5월 13일
