---
area: frontend
feature: tier-class
---

# 2티어 키타 킨타로 추가

## 개요
공식 2티어 페이지에 캐릭터 **키타 킨타로**를 추가했다. 이미지 폴더와 HTML 카드를 같이 넣어, 티어표와 커스텀 메이커 풀이 같은 정본을 쓰게 했다.

## 관련 커밋
- **pending** — `feat(tier-class): 2티어에 키타 킨타로 추가`

## 변경된 파일
- Modified: `tier-class/tier2.html`
- Added: `tier-image/2 tier/kita kintaro.jpg`

## 주요 구현
1. `tier-image/2 tier/`에 `kita kintaro.jpg` 추가
2. `tier2.html` 2병 구역에서 에이지 카드 다음에 키타 킨타로 카드 삽입
3. `img src`는 `../tier-image/2 tier/kita kintaro.jpg`로 HTML과 폴더를 맞춤

## 변경 전/후
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 2티어 병급 | 에이지가 해당 줄 끝 | 에이지 다음에 키타 킨타로 |
| 이미지 | 없음 | `2 tier/kita kintaro.jpg` |

## 테스트 체크리스트
1. `http://localhost:5000/tier-class/tier2.html` 에서 키타 킨타로 이미지·이름 표시
2. 이미지 404가 아닌지 확인
3. 커스텀 메이커를 새로고침해 풀에 키타 킨타로가 보이는지 확인

## 향후 개선 제안
- 칸(갑/을/병/정) 위치가 확정되면 카드 순서만 조정하면 됨 (폴더 이동 불필요)

---
문서 생성일: 2026-08-22
