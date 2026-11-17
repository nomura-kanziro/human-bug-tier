---
area: frontend
feature: mobile
---

# 모바일 앱 뼈대 (`mobile/`, React Native · Expo SDK 58)

> 사용법·구조는 [`../../../mobile/README.md`](../../../mobile/README.md). 이 문서는 만든 이유와 판단, 확인 범위를 남긴다.

## 요청

창시자(2026-11-17): React Native 로 만들되 이 프로젝트 언어에 맞게, Android·iOS 통합 다운로드가 되게. 당장 다 만들지 말고 **뼈대 + 연결 + 상태 확인**까지. 모바일은 웹보다 가볍게(렉·지연 방지).

## 판단

| 질문 | 결정 | 이유 |
|---|---|---|
| 맨 React Native vs Expo | **Expo**(SDK 58, RN 0.88) | 한 코드로 Android·iOS 빌드(EAS Build — 클라우드에서 APK·AAB·IPA), Mac 없이 iOS 빌드 가능, 네이티브 폴더(`android/`·`ios/`)를 저장소에 두지 않아도 된다 |
| 언어 | **JavaScript** | 웹 프론트(`root-cloudflare/`)가 JS + React — 같은 사람이 같은 방식으로 고칠 수 있다(TypeScript 는 쓰지 않는다) |
| 서버 | 웹과 같은 `/api` | 앱 전용 서버·API 를 따로 두지 않는다. 기본 주소 `https://human-bug-tier.com`(Cloudflare Pages → Oracle) |
| 상태 확인 API | `GET /api/site/status` 신설 | `/health` 는 `/api` 밖이라 Pages 프록시를 지나지 못한다. 응답을 아주 작게(api·db·시각) |
| 화면 이동·상태 라이브러리 | 넣지 않음 | 뼈대 단계에 필요 없고 앱 무게만 는다. 기능 화면을 붙일 때 고른다 |

## 경량화

- 의존성 6개(expo · expo-constants · expo-status-bar · expo-build-properties · react · react-native).
- Hermes 바이트코드 번들 — 실측 Android 약 1.5MB(596개 모듈), iOS 약 1.5MB(598개 모듈).
- Android 릴리스: ProGuard + shrinkResources(`app.json` → `expo-build-properties`).
- 앱에 묶는 그림은 아이콘 하나(`assetBundlePatterns`). 캐릭터 이미지는 앱에 넣지 않는다.
- 요청은 동시에·8초 제한, 결과는 모아서 한 번에 그린다.

## 확인한 것

- `npx expo install --check` — 의존성 버전이 SDK 58 과 맞음.
- `npx expo export --platform android` · `--platform ios` — 번들 생성 성공.
- `src/api.js` 의 확인 로직을 Node 로 운영 주소에 실행 — 공지·AI(`gemma4:e4b` ON)·에이전트 봇 OK, `/api/site/status` 는 백엔드 미배포라 404(배포하면 정상). 없는 주소는 4항목 모두 "연결 실패".

## 못 한 것 · 다음

- 실제 기기·에뮬레이터 실행, EAS 빌드(Expo 계정·Apple 개발자 계정 필요).
- 다음 단계: 로그인(JWT 를 `expo-secure-store` 에) → 공식 티어표(목록은 `FlatList`, 작은 썸네일) → 게시판 보기 → 에이전트 봇(웹과 같은 NDJSON 스트림 — RN 의 fetch 스트리밍 지원을 먼저 확인).
