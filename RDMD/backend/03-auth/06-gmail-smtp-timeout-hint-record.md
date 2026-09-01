---
area: backend
feature: auth
---

# 커밋 요약 — Gmail SMTP `ETIMEDOUT` 원인 확인 및 진단 힌트 추가

## 개요

직전 커밋(05번, Brevo→Resend→Gmail 자동 대체)을 배포한 뒤, Brevo 실패 후 자동으로 넘어간 Gmail 단계에서 `ETIMEDOUT` 이 떴다. 조사 결과 **코드 문제가 아니라 Render(등 클라우드 호스팅)가 SMTP 아웃바운드 포트(465/587)를 통째로 막아두는 잘 알려진 제약**이었다 — 이 저장소 코드에도 이미 이 가능성을 전제로 한 주석(`server.js`의 IPv6 우회, `mail.js`의 465→587 재시도)이 있었을 정도로 예견돼 있던 상황.

Gmail은 SMTP 프로토콜 자체를 쓰기 때문에, 포트가 막힌 호스팅에서는 **재시도해도 절대 성공할 수 없다** — 유일한 실질 해결책은 HTTPS 기반 발송(Resend 또는 활성화된 Brevo)으로 가는 것.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Modified: `backend/utils/mail.js` (`sendViaGmail`)
- Modified: `DEPLOY.md`

## 주요 구현 내용

`sendViaGmail()` 이 465·587 두 포트 다 연결 자체에 실패(`ESOCKET`/`ETIMEDOUT`/`ECONNECTION`/`ECONNREFUSED`)했을 때, 최종 에러에 진단 힌트를 붙였다 — Brevo 403 에러에 이미 붙이던 `providerDetail` 패턴과 동일하게:

```js
if (lastErr && CONNECTION_ERROR_CODES.has(lastErr.code) && !lastErr.providerDetail) {
  lastErr.providerDetail =
    'SMTP 연결 자체가 안 됨 — Render 등 클라우드 호스팅이 SMTP 아웃바운드 포트(465/587)를 막아둔 경우 ' +
    'Gmail은 재시도해도 계속 실패합니다. HTTPS 기반인 Resend/Brevo API 사용을 권장';
}
```

`authController.js` 의 `emailFailDetail()` 이 이 `providerDetail`을 그대로 사용자 alert에 붙여주므로, 다음부터는 화면에 맨 `ETIMEDOUT` 만 뜨는 대신 원인과 해결 방향까지 바로 보인다.

## 테스트

`nodemailer` 를 모킹해서(`require.cache` 에 가짜 모듈 주입) `sendMail()` 이 항상 `ETIMEDOUT` 을 던지도록 만든 뒤 `sendAppMail()` 전체를 실행 — 465 → 587 순서대로 재시도하고, 둘 다 실패한 뒤 `providerDetail` 힌트가 정확히 붙어서 최종 에러로 나오는 것 확인.

## 향후 개선 제안

- 실제로 `RESEND_API_KEY` 를 Render에 등록하는 것은 코드 밖의 일 — 등록 후 `/health` 의 `emailProvider` 에 `resend` 가 추가로 뜨는지 확인 권장
- Brevo가 활성화되면 Brevo가 다시 최우선으로 쓰이므로 Gmail/Resend는 자연히 백업으로만 남음

---
문서 생성일: 2026-09-01
