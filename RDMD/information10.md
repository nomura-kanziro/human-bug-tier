# 커밋 835762b - Notice 폴더 구조 완성 및 공지사항 페이지 개발

## 📅 커밋 정보
- **커밋 ID**: 835762b74dfb6c99551dbdbd8af5ab10d073d325
- **작성자**: nomura
- **날짜**: Sat Jun 6 23:44:41 2026 +0900
- **주제**: notice 폴더 구조 완성 및 공지사항 페이지 개발

---

## 🎯 작업 목표
공지사항 관련 페이지의 완전한 구조를 구축하고, 전체 공지와 새 소식을 분리한 UI를 구현하여 사용자에게 더 나은 정보 분류 및 접근성 제공

---

## 📝 주요 변경사항

### 1. `common.js` 경로 보정 추가
```javascript
// getBasePath() 함수에 notice 폴더 경로 추가
if (path.includes('/tier-class/') || path.includes('/tier-class\\') || 
    path.includes('/Contact_us/') || path.includes('/Contact_us\\') ||
    path.includes('/custom-maker/') || path.includes('/custom-maker\\') ||
    path.includes('/notice/') || path.includes('/notice\\') ||
    path.includes('/all_notices/') || path.includes('/all_notices\\') ||
    path.includes('/news/') || path.includes('/news\\')
  ) {
  return '../../';
}
```
- **목적**: `/notice/` 폴더 하위 페이지에서 `header.html`, `footer.html` 동적 로드 경로 자동 보정
- **효과**: 공지사항 페이지들에서 공통 헤더/푸터 정상 표시

### 2. `index.html` 공지사항 섹션 업데이트
```html
<!-- 공지 보기 링크 수정 -->
<a href="/notice/notice.html" class="text-sm text-zinc-500 hover:text-black">
  전체 공지 보기 →
</a>

<!-- 공지사항 헤더 이름 변경 -->
<span class="font-semibold text-lg">전체 공지</span>  <!-- 기존: "일반 공지" -->
<span class="font-semibold text-lg">새 소식</span>    <!-- 기존: "이벤트 공지" -->
```
- 공지사항 페이지로의 네비게이션 링크 활성화
- 공지 카테고리명 명확화

### 3. 신규 파일: `notice/notice.html`
**목적**: 공지사항 메인 페이지 (전체 공지 & 새 소식 2단 분류)

**구조**:
- 좌측: "전체 공지" 섹션 (최근 2개 공지)
- 우측: "새 소식" 섹션 (최근 2개 뉴스)
- 각 섹션별 "모두 보기" 링크 연결

**링크**:
- 전체 공지 → `all_notices.html`
- 새 소식 → `news.html`

### 4. 신규 파일: `notice/all_notices.html`
**목적**: 전체 공지 목록 페이지

**포함 내용**:
- 4개의 샘플 공지 항목
- 제목, 설명, 날짜 표시
- 페이지네이션 UI (1/6)
- "공지사항 메인으로" 뒤로가기 링크

### 5. 신규 파일: `notice/news.html`
**목적**: 새 소식 목록 페이지

**포함 내용**:
- 5개의 샘플 뉴스 항목 (이벤트 & 업데이트)
- 제목, 설명, 날짜 표시
- 페이지네이션 UI (1/4)
- "공지사항 메인으로" 뒤로가기 링크

### 6. 신규 파일: `notice/notice.css`
**스타일 규칙**:
```css
/* 레이아웃 */
.notice-page { max-width: 1200px; padding: 60px 20px; }
.notice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }

/* 반응형 (900px 이하 1단 레이아웃) */
@media (max-width: 900px) {
  .notice-grid { grid-template-columns: 1fr; }
}

/* 공지 항목 */
.notice-item { padding-bottom: 20px; border-bottom: 1px solid #f0f0f0; }
.notice-link { font-weight: 500; color: #111; text-decoration: none; }
.notice-link:hover { text-decoration: underline; }

/* 텍스트 */
.notice-desc { font-size: 15px; color: #555; line-height: 1.5; }
.notice-date { font-size: 13px; color: #999; }

/* "모두 보기" 링크 */
.notice-more { margin-top: 24px; color: #2563eb; text-decoration: none; }
```

---

## 🔄 네비게이션 흐름

```
index.html (메인 페이지)
  ↓
  "전체 공지 보기 →" 클릭
  ↓
notice/notice.html (공지사항 메인)
  ├─ "문서 59개 모두 보기 →" 
  │   ↓ notice/all_notices.html (전체 공지 목록)
  │
  └─ "문서 21개 모두 보기 →"
      ↓ notice/news.html (새 소식 목록)

(all_notices.html, news.html에서)
  "← 공지사항 메인으로" → notice.html로 복귀
```

---

## ✨ 기술 특징

### 동적 헤더/푸터 로드
- `common.js`의 `loadCommon()` 함수가 `getBasePath()`를 통해 경로 자동 보정
- `/notice/` 폴더 내 페이지들도 `../header.html`, `../footer.html` 정상 로드

### 반응형 디자인
- **PC** (900px 초과): 2단 그리드 (전체 공지 / 새 소식 나란히)
- **모바일** (900px 이하): 1단 레이아웃 (순차 표시)

### 확장 가능한 구조
- 각 공지 페이지는 샘플 데이터로 구성
- 실제 데이터는 백엔드 API나 JSON 파일로 대체 가능
- 페이지네이션 UI 미리 구현 (현재는 "1/6", "1/4" 정적 표시)

---

## 🎨 UX 개선사항

1. **공지 분류 명확화**: "일반 공지" → "전체 공지", "이벤트 공지" → "새 소식"
2. **네비게이션 개선**: 메인 → 공지 메인 → 세부 목록 → 메인 (명확한 경로)
3. **모바일 최적화**: 반응형 그리드로 작은 화면에서도 가독성 보장
4. **대량 공지 지원**: 페이지네이션 구조로 확장 시 대량의 공지 처리 가능

---

## 📦 파일 구조

```
human_bug_tier/
├── index.html (수정)
├── common.js (수정)
├── notice/
│   ├── notice.html (신규)
│   ├── all_notices.html (신규)
│   ├── news.html (신규)
│   └── notice.css (신규)
└── ...
```

---

## 🔍 검증 사항

✅ `notice/notice.html` 접근 시 헤더/푸터 정상 로드
✅ `all_notices.html`, `news.html` 뒤로가기 링크 정상 작동
✅ 모바일 화면(900px 이하)에서 1단 레이아웃 적용
✅ 공지 항목 클릭 시 링크 정상 작동
✅ CSS 스타일 충돌 없음

---

## 💡 향후 개선 계획

1. **데이터 동적화**: JSON API 또는 백엔드 연동으로 공지 데이터 로드
2. **페이지네이션 기능**: 실제 페이지 이동 구현
3. **상세 공지 페이지**: 공지 제목 클릭 시 상세 내용 표시
4. **검색 기능**: 공지 제목/내용 검색
5. **필터링**: 카테고리, 날짜 범위별 필터링
6. **관리자 기능**: 공지 작성/수정/삭제 (관리자 로그인 후)

---

## 📌 추가 커밋: 공지 목록 UI 개선 (commit: dadb2d9)

### 커밋 개요
- **커밋 ID (요약)**: dadb2d9e1fb18dad756a19f61de72bf911496f5d
- **주제**: 공지 목록 UI 개선 및 전체/새소식 목록 페이지 스타일 정리

### 주요 변경사항 요약
- `notice/notice.css`의 구조 및 스타일 전면 개편
  - `.notice-header`에 마진/정렬 추가로 제목과 뒤로가기 사이 여백 확보
  - `.notice-full-list`를 카드형 리스트로 전환하고 항목간 gap 및 카드 패딩을 조정하여 리스트를 더 컴팩트하게 표현
  - `.notice-item`에 배경, 테두리, border-radius, box-shadow 적용 및 `white-space: pre-wrap`, `word-break: break-word` 적용으로 긴 텍스트의 가독성 보장
  - 일부 페이지(전체/새소식)에서 `notice.css`를 직접 로드하도록 링크 경로 조정

- HTML 변경
  - `notice/all_notices.html`, `notice/news.html`에서 `notice.css`를 로드하도록 수정 또는 새로 추가됨

### 변경 파일 (요약)
- Modified: `notice/notice.css` (레이아웃·간격·카드스타일 조정)
- Modified/Added: `notice/all_notices.html`, `notice/news.html` (스타일시트 링크 정리 및 카드형 리스트 구조)

### 검증 체크리스트
1. `notice/notice.html` 열기 → 공지 메인 레이아웃(전체/새소식)이 정상 표시되는지 확인
2. `notice/all_notices.html` / `notice/news.html` 열기 → 각 항목이 카드형으로 보이고, 항목간 간격이 적용되었는지 확인
3. 긴 본문을 가진 공지에서 줄바꿈/단어 분할 처리로 내용이 잘리지 않는지 확인
4. 창 크기를 줄여 모바일 레이아웃(1단)으로 자연스럽게 전환되는지 확인

### 비고 / 권장 개선
- 카드 패딩과 글자 크기 조정으로 항목 높이를 크게 줄였음. 너무 빡빡하면 가독성이 떨어질 수 있으니 필요 시 `padding`/`line-height`를 소폭 늘리길 권장.
- 이후 단계: 공지 데이터를 JSON/API로 전환하고 목록과 상세 페이지를 동적으로 연동할 것.
