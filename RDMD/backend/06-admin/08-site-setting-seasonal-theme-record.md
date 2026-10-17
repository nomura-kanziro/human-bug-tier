---
area: backend
feature: admin
---

# 사이트 운영 설정(SiteSetting) + 이벤트 디자인(계절 배경) API

## 관련 커밋

- `93170c6` (2026-10-17) feat(event-design): 관리자 "이벤트 디자인 적용" — 할로윈·크리스마스 사이트 배경 on/off(한 번에 하나만)
- 프론트·디자인 상세: [`../../frontend/07-admin/13-event-design-record.md`](../../frontend/07-admin/13-event-design-record.md)

## 구성

| 파일 | 내용 |
|---|---|
| `models/SiteSetting.js` | 키-값 한 문서씩(`key` unique, `value` Mixed, `updatedBy`). 지금 쓰는 키는 `seasonalTheme` 하나 |
| `controllers/siteSettingController.js` | `getSiteSettings`(조회, 메모리 캐시) · `setSeasonalTheme`(변경) |
| `routes/siteRoutes.js` + `server.js` | `GET /api/site/settings` — **공개**(`Cache-Control: no-store`) |
| `routes/adminRoutes.js` | `POST /api/admin/site/seasonal-theme` — `requireAdmin` |

## 동작

- 값은 `none` | `halloween` | `christmas` **하나**만 저장한다 → 동시에 두 배경이 켜질 수 없고, 할로윈이 켜진 상태에서 크리스마스를 켜면 값이 바뀌면서 할로윈은 자연히 꺼진다. 허용 외 값은 400.
- 방문자마다 DB 를 읽지 않도록 **프로세스 메모리에 캐시**하고 변경 시 캐시도 갱신한다. 서버 프로세스가 1개(pm2 `instances 1`)라는 전제 — 여러 프로세스로 늘리면 캐시가 어긋나므로 그때는 캐시를 걷어야 한다.
- 조회 실패·DB 미연결 시에도 사이트가 깨지지 않게 `none` 으로 답한다. 변경은 DB 미연결이면 503.
- **서버 재시작이 필요하다**(새 라우트). 로컬에서 재시작 전에 켜 보면 "없는 API입니다" 가 나온다.
- 운영 값은 관리자 화면에서만 바꾼다(배포가 값을 바꾸지 않음).

## 확인

- 컨트롤러를 가짜 저장소로: 처음 none → 할로윈 → 크리스마스(할로윈 자동 해제) → none, 허용 외 값 400.
