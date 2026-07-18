# 공식 티어표 (tier-class)

휴먼버그대학교 캐릭터를 **1티어 ~ 9티어**로 나눈 정적 정보 페이지입니다.

## 위치

```
tier-class/
├── tier1.html … tier9.html
├── tier1.css  … tier9.css
└── README.md (있는 경우)
```

이미지 자산: `tier-image/1 tier/` ~ `5 tier/` 및 공용 로고 등.

## 기능

- 티어별 캐릭터 카드(이미지 + 이름)
- 메인 페이지 하단 티어 카드에서 각 페이지로 이동
- 헤더 사이드 메뉴「티어표」진입

## 데이터 성격

- **DB 없음** — HTML/CSS 정적 페이지  
- 캐릭터 추가·수정은 파일 직접 편집  
- 커스텀 메이커는 이 페이지들을 파싱해 캐릭터 풀을 구성할 수 있음 (`loadCharactersFromTierClass` 등)

## 유지보수

### 캐릭터 추가

1. `tier-image/` 적절한 티어 폴더에 이미지 추가  
2. 해당 `tierN.html`에 카드 마크업 추가  
3. 커스텀 메이커 풀에 반영되는지 확인  

### 스타일

- 공통 레이아웃은 `common.css` / `Header_Footer.css`  
- 티어 전용은 `tierN.css`  
- 과거 이슈: `body { text-align: center }` 로 인한 레이아웃 쏠림 → 제거됨 (information1 계열)

### 경로

- 하위 폴더이므로 header/footer 로드 시 `getBasePath()` 필수  
- 이미지 경로는 상대 또는 base 보정 규칙 준수  

## 권한

전원 열람 가능 (인증 불필요).
