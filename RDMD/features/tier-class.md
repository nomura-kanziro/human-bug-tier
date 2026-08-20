# 공식 티어표 (tier-class)

휴먼버그대학교 캐릭터를 **1티어 ~ 9티어**로 나눈 정적 정보 페이지입니다.

## 위치

```
tier-class/
├── tier1.html … tier9.html
├── tier1.css  … tier9.css
└── README.md (있는 경우)
```

이미지 자산: `tier-image/1 tier/` ~ `9 tier/` 및 공용 로고 등.  
공식 1~9티어 페이지 카드는 **해당 티어 폴더의 이미지**와 연결한다.

## 기능

- 티어별 캐릭터 카드(이미지 + 이름)
- 메인 페이지 하단 티어 카드에서 각 페이지로 이동
- 헤더 사이드 메뉴「티어표」진입
- 커스텀 메이커 캐릭터 풀은 이 HTML을 파싱해 구성 (`loadCharactersFromTierClass`)

## 데이터 성격

- **DB 없음** — HTML/CSS 정적 페이지  
- 캐릭터 추가·수정은 파일 직접 편집  
- 커스텀 메이커는 이 페이지들을 파싱해 캐릭터 풀을 구성할 수 있음 (`loadCharactersFromTierClass` 등)

## 유지보수

### 캐릭터 추가

1. `tier-image/N tier/` 에 이미지 추가  
2. 해당 `tierN.html`에 같은 카드 마크업(이미지 경로 + 이름) 추가  
3. 커스텀 메이커를 새로고침해 풀에 보이는지 확인  

### 티어 이동 (승격·추락)

1. 이미지를 **출발 티어 폴더 → 도착 티어 폴더**로 옮긴다 (`git mv`)  
2. 출발 `tierN.html`에서 카드를 빼고, 도착 페이지의 갑/을/병(정) **지정 위치**에 넣는다  
3. `img src`가 새 폴더를 가리키는지 확인  

같은 티어 안 재배치는 HTML 카드 순서만 바꾼다. 폴더는 그대로 둔다.

### 스타일

- 공통 레이아웃은 `common.css` / `Header_Footer.css`  
- 티어 전용은 `tierN.css`  
- 과거 이슈: `body { text-align: center }` 로 인한 레이아웃 쏠림 → 제거됨 (information1 계열)

### 경로

- 하위 폴더이므로 header/footer 로드 시 `getBasePath()` 필수  
- 이미지 경로는 상대 또는 base 보정 규칙 준수  

## 권한

전원 열람 가능 (인증 불필요).
