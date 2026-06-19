# Custom Maker (커스텀 티어 메이커)

사용자가 직접 티어를 구성하고, 다른 사용자와 공유할 수 있는 기능입니다.

## 주요 기능

### 1. 커스텀 티어 제작 (custom-maker.html)
- **드래그 앤 드롭**으로 캐릭터 배치
- 9개 티어 단계 지원 (1등급 ~ 9등급)
- 좌측 캐릭터 풀 ↔ 우측 티어 보드
- **초기화**, **다운로드** 기능

다운로드 지원 형식:
- PNG (html2canvas)
- PDF (jsPDF)

### 2. 커스텀 게시판 (custom-maker_post)
- 제작한 티어표 **업로드**
- 제목, 설명, 썸네일 자동 생성
- 다른 유저의 티어표 **구경 + 댓글**
- 좋아요, 신고 기능

### 3. 게시글 상세 (post_detail.html)
- 티어 구성 전체 보기
- 댓글 + 대댓글 작성
- 작성자 게시글 필터 (`@작성자` 검색)

## 작동 원리

### 드래그 앤 드롭
- HTML5 Drag & Drop API 사용
- `tierState` 객체로 현재 배치 상태 관리
- 캐릭터 이동 시 DOM 재렌더링

### 이미지/PDF 추출
```js
// html2canvas + jsPDF 조합
const canvas = await html2canvas(captureArea);
const imgData = canvas.toDataURL('image/png');
const pdf = new jsPDF();
pdf.addImage(imgData, 'PNG', ...);
```

### 업로드 시 처리
- `normalizeImgForBoard()`로 이미지 경로 정리
- `thumbnail` 자동 추출 (첫 번째 캐릭터)
- 백엔드에 `TierList` 문서로 저장

### 게시판 데이터 흐름
1. 제작 완료 → 업로드
2. `/api/tierlists` POST
3. 게시판 목록: GET `/api/tierlists`
4. 상세: GET `/api/tierlists/:id`
5. 댓글: `/api/tierlists/:id/comments`

## 파일 구조

```
custom-maker/
├── custom-maker.html / .js / .css     # 제작 화면
└── custom-maker_post/
    ├── custom-maker_post.html / .js   # 게시판 목록
    ├── post_detail.html / .js         # 상세 + 댓글
    └── ...
```

## 유지보수 가이드

### 새 캐릭터 추가 방법
1. `tier-image/` 폴더에 이미지 추가
2. tier-class HTML에 캐릭터 정보 추가 (또는 별도 데이터 소스)
3. `loadCharactersFromTierClass()`가 해당 페이지를 파싱하여 풀에 추가

### 이미지 경로 문제
- 저장된 데이터는 `/tier-image/xxx.png` 형식
- 실제 렌더링 시 `resolveAssetPath()` 또는 `getBasePath()` 적용
- GitHub Pages 배포 시 반드시 `getBasePath()` 확인

### 게시글 삭제 연쇄 처리
- 백엔드에서 게시글 삭제 시 댓글도 함께 삭제
- `deleteReportedPost` 참고

### 성능 고려사항
- 많은 캐릭터가 있는 경우 tier-list 렌더링 최적화 필요
- 현재는 DOM 직접 조작 방식

### 보안
- 업로드된 커스텀 게시글은 누구나 볼 수 있음 (공개)
- 신고 기능으로 `reported: true` 처리 후 관리자 확인

## 팁

- 제작 화면에서 **우클릭 메뉴** 또는 키보드 단축키 확장 가능
- PDF 다운로드 시 한글 폰트 이슈가 있으면 이미지로 대체
- 게시판 검색은 현재 클라이언트 필터링 + `?search=` 파라미터 지원

---

**관련 문서**
- 루트 [README.md](../README.md)
- [backend/README.md](../backend/README.md) (TierList 관련 API)
