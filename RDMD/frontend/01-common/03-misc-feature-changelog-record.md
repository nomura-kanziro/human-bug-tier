---
source: RDMD/information5.md
legacy_id: information5
area: frontend
---

> **원본 일지**: `information5.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
(GitHub Copilot)

# 변경 사항 요약 (추가된 기능 및 수정된 이유)
======================================

## 추가된 기능
----------
- **공통 로직 분리 (d:\human_bug_tier\common.js)**
  - header.html / footer.html을 동적으로 불러와 각 페이지에서 재사용하도록 구현.
  - 경로 자동 보정(getBasePath)으로 하위 폴더에서 리소스(이미지/헤더/푸터) 경로 문제 해결.
  - 공지사항 모달(showNoticeModal / closeNoticeModal) 추가 — 간단한 하드코딩 공지 데이터로 상세 보기 제공.
  - 헤더 이벤트 자동 부착(attachHeaderEvents): 로고 클릭 → 홈 이동, 햄버거 열기/닫기 연결.
  - 푸터 '문의하기' 링크 자동 보정(fixFooterLinks).
  - 관리자/사용자 프로필 아이콘 렌더링(renderUserProfile) 및 어드민 모달(showAdminModal, logoutAdmin) 추가.
  - 모바일 사이드 메뉴 드롭다운 토글(initSideMenuDropdowns) 구현 — 클릭으로 서브메뉴 확장/축소.

- **헤더/푸터 템플릿 분리**
  - header.html: 로고 텍스트를 span으로 감싸 가독성 및 스타일 제어 용이화.
  - footer.html: 푸터 텍스트 분리.

- **스타일 개선 (d:\human_bug_tier\Header_Footer.css, common.css)**
  - .logo-text 스타일 추가로 로고 옆 텍스트 강조.
  - 사이드 메뉴 레이아웃/애니메이션, 드롭다운 동작 보완.
  - Quick-nav, notice 섹션 등 UI 강화 및 반응형 보완.

## 수정된 이유 (핵심)
----------------
- **경로 문제 해결**
  - 하위 폴더에서 header/footer, 이미지 로딩 시 404 발생을 방지하기 위해 getBasePath로 base 경로를 계산하고 fetch / 이미지 src / 링크를 보정하도록 변경.
- **중복 및 수동 관리 감소**
  - header/footer를 각 HTML에 복붙하지 않고 공통 파일로 관리하여 유지보수 용이성 향상.
- **UX 향상**
  - 공지 상세 모달, 프로필 모달, 사이드 메뉴 드롭다운 등으로 사용자 상호작용(모바일 포함)을 개선.
- **운영 편의성**
  - 로컬스토리지 기반의 관리자 표시 및 빠른 관리자 페이지 접근(댓글 관리 버튼) 추가로 운영자 작업 효율화.

## 파일별 변경 요약
---------------
- **common.js**
  - getBasePath: tier-class, custom-maker, Contact_us 등 폴더 처리 추가.
  - loadCommon: header/footer fetch, 이벤트 부착, 이미지/링크 보정, 프로필/사이드메뉴 초기화 호출 추가.
  - attachHeaderEvents, fixImagePaths, fixFooterLinks, showNoticeModal 등 다수 함수 추가.
  - renderUserProfile 및 어드민 모달(관리자 표시) 추가.
  - initSideMenuDropdowns로 모바일 사이드 메뉴 토글 처리.
- **header.html**
  - 로고 텍스트 <span class="logo-text">추가 및 내비게이션 구조 정리.
- **Header_Footer.css**
  - .logo-text, 사이드메뉴, 드롭다운, 푸터 스타일 보강.
- **\human_bug_tier\index.html, common.css**
  - Quick-nav, 공지사항, 티어 카드 등 UI 요소 정비 및 스타일 적용.

## 알려진 주의점(권장 추가 수정)
-------------------------
- common.js 내부에 getAdminInfo(), logoutAdmin() 같은 중복 함수 정의가 있음 — 중복 제거 권장.
- fallbackLoadHeaderFooter에서 호출하는 renderAdminProfile()는 정의되어 있지 않음 → renderUserProfile로 통일 필요.
- footer / contact 경로 대소문자( Contact_us ) 일관성 확인 필요 (운영 환경에 따라 경로 민감).
- CSS의 .fot-text font-weight: 2000 은 유효 범위 초과 — 적절한 값(700~900)으로 수정 권장.

원하면 중복 함수 정리 및 renderAdminProfile → renderUserProfile 통일하는 패치 제공 가능.