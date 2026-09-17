---
area: frontend
feature: custom-maker
---

# 커스텀 메이커 티어표 꾸미기

## 개요

커스텀 티어 제작 화면의 테이블이 기본 검정+골드만 반복돼 수수한 문제를 보완한다. 액션바 맨 앞 **꾸미기** 한 버튼으로 테두리 색·배경 이펙트를 고르고, 등급마다 다른 테마를 둘 수 있다. 설정은 PNG/PDF 캡처와 게시글(`tierData.style.byGrade`)에 함께 남는다.

## 변경된 파일

- `root-render/custom-maker/custom-maker.html` / `post_edit.html`
- `root-render/custom-maker/custom-maker.js` / `custom-maker.css`
- `root-render/custom-maker/custom-maker_post/post_detail.html` / `post_detail.js`
- `root-render/custom-maker/README.md`
- `RDMD/features/custom-maker.md`

백엔드 스키마 변경 없음. `TierList.tierData`가 자유 Object라 `style.byGrade`를 그대로 저장한다.

## 구현

- 버튼 위치: 티어 테이블 바로 아래 액션바 **맨 앞** (미리보기와 같은 시선)
- 패널: 테이블과 액션바 사이. 캡처 영역 밖
- 적용 범위: 이 등급만 / 모든 등급 / 등급마다 다른 테마
- **원래 상태로 돌려놓기**: 1~9등급 꾸미기를 전부 지우고 처음 골드·이펙트 없음으로 복원. 이 등급만 기본값은 현재 등급만
- 빠른 테마 10종, 테두리 스와치 + 직접 색, 배경 이펙트 10종
- 화이트리스트 hex·effect만 허용. 예전 글은 style 없어도 기본 골드로 연다
- localStorage `customMakerTierStyle` (배치 초기화와 별개)

## 테스트

1. `/custom-maker/custom-maker.html` → 꾸미기 → 테두리/이펙트 미리보기
2. 이전/다음 티어 전환 시 등급별 스타일 유지
3. PNG/PDF에 테두리·배경이 찍히는지
4. 업로드 후 상세에서 같은 꾸밈이 보이는지
5. 본인 글 수정에서 꾸밈이 복원·재저장되는지
