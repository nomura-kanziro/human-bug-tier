# 행운 뽑기 (luck-draw)

**오늘의 행운 티어** 뽑기. 확률·횟수 제한·저장은 전부 서버가 전담한다.  
기획 원본: [`../luck-draw-기획서.md`](../luck-draw-기획서.md) (횟수/쿨다운 정책은 이후 대화로 조정됨 — 최신 기준은 이 문서)

## 파일

| 파일 | 역할 |
|------|------|
| `luck-draw.html` | 탭 2개(`#daily` 완성 / `#random` 준비 중) |
| `luck-draw.css` | 페이지 전용 스타일. `common.css` 미수정 |
| `luck-draw.js` | 탭 전환, 뽑기 버튼, 쿨다운 카운트다운, 결과/기록 렌더 |
| `luck-draw-api.js` | `getApiBase()`/`getAuthHeaders()` 재사용 API 래퍼 |

## 권한 · 횟수 제한

| 동작 | 비로그인 | 로그인 |
|------|:---:|:---:|
| 확률표 열람 | O | O |
| 뽑기 실행 | O (체크만, `saved:false`) | O (저장) |
| 하루 최대 횟수 | **24시간에 1회** (프론트 안내만) | **20회** (서버 강제) |
| 뽑기 간 대기 | 없음 | **3분** (서버 강제, 429) |
| 오늘 결과·내 기록 조회 | X | O |

- 회원 제한(20회/3분 쿨다운)은 `backend/controllers/luckDrawController.js` 가 DB로 강제한다(`429 { limitReached }` / `429 { cooldown }`).
- **게스트 24시간 제한은 서버가 강제하지 않는다.** 게스트는 계정이 없어 서버가 신원을 구분할 방법이 없기 때문에, 프론트 `localStorage`(`luckDrawGuestState`)에 마지막 체크 시각을 저장해 안내만 한다. 버튼을 누르면 alert로 "로그인하면 더 뽑을 수 있다 / 24시간 후 재시도"를 안내하고 **서버 호출은 하지 않는다**. `localStorage` 를 지우거나 다른 브라우저를 쓰면 우회 가능 — 의도된 동작(게스트 결과는 애초에 신뢰·저장 대상이 아님).
- 게스트 결과는 여전히 **DB에 저장되지 않는다.**

## API

`backend/routes/luckDrawRoutes.js` · 상세: [`../RDMD/features/luck-draw.md`](../RDMD/features/luck-draw.md)

| 메서드 | 경로 | 권한 |
|--------|------|------|
| GET | `/api/luck-draw/config` | 공개 (optionalAuth) — `dailyLimit`, `cooldownSec` 포함 |
| POST | `/api/luck-draw/daily` | optionalAuth — 회원 한도 초과 시 429 |
| GET | `/api/luck-draw/today` | requireAuth — 오늘 횟수/쿨다운 잔여/마지막 결과 |
| GET | `/api/luck-draw/history?page=1` | requireAuth |

## 체크리스트 (수동 테스트)

```
1. 비로그인 → 뽑기 → 결과 표시 + "저장되지 않았습니다" 배지
2. 비로그인 재클릭(24시간 이내) → alert만 뜨고 API 호출 없음 (네트워크 탭 확인)
3. 로그인 → 뽑기 → 결과 + DB 저장, 버튼이 "다음 뽑기까지 mm:ss" 카운트다운으로 비활성화
4. 3분 내 재클릭 → 429(cooldown), 카운트다운 유지
5. 3분 후 → 버튼 자동 재활성화, 다시 뽑기 가능
6. (테스트용 시드) 20회 채운 뒤 재요청 → 429(limitReached), "내일 다시 도전" 문구로 버튼 비활성화
7. GitHub Pages(GITHUB_STATIC) → 뽑기 버튼 비활성화 + 안내 문구
```

## 하지 않은 것 (2차 이후)

- 랜덤 뽑기(`mode: random_char`)
- 천장(pity), 보관함 UI, 관리자 확률·횟수 조정 UI
- 게스트 서버 측 rate limit(IP 기반 등) — 필요해지면 별도 논의

`.claude/skills/luck-draw/SKILL.md`, `.agents/luck-draw/skill.md` 참고.
