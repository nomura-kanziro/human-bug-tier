---
area: backend
feature: auth
---

# 커밋 요약 — 이메일 발송 provider 자동 대체(Brevo → Resend → Gmail)

## 개요

실제 배포 환경에서 아이디/비밀번호 찾기 메일이 안 나가는 문제를 조사했다. 로그에 남은 에러는:

```
BREVO_API_ERROR 403 permission_denied: Unable to send email. Your SMTP account is not yet
activated. Please contact us at contact@brevo.com to request activation
```

**결론: 코드 버그가 아니라 Brevo 계정 자체가 아직 트랜잭션(SMTP) 발송 승인이 안 된 상태.** Brevo는 신규 계정의 API 키가 유효해도, 스팸 방지를 위해 실제 발송 권한은 별도로 수동 승인한다 — 이건 코드로 우회할 수 없고 Brevo 고객지원(contact@brevo.com 또는 대시보드)에 활성화를 요청해야 한다.

다만 `backend/utils/mail.js` 를 살펴보니 **Brevo가 설정돼 있으면 Resend/Gmail 이 같이 설정돼 있어도 아예 시도조차 안 하고 바로 실패**하는 구조였다(우선순위 = "먼저 설정된 것 하나만 쓴다"). 그래서 Brevo 승인이 날 때까지 이메일 기능 전체가 막히는 게 불필요하게 취약했다 — 이 부분을 고쳤다.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Modified: `backend/utils/mail.js` (`sendAppMail`, `getEmailProvider`, `logEmailConfigStatus`)
- Modified: `backend/.env.example` (Brevo 섹션에 활성화 필요성 안내 추가)
- Modified: `DEPLOY.md` (Troubleshooting 섹션에 대체 발송 안내)
- Modified: `RDMD/features/auth.md`

## 주요 구현 내용

### 1. "먼저 설정된 것 하나만" → "설정된 것 전부 순서대로 시도"

```js
const providers = [];
if (getBrevoApiKey()) providers.push({ name: 'Brevo', send: sendViaBrevo });
if (getResendApiKey()) providers.push({ name: 'Resend', send: sendViaResend });
if (getEmailUser() && getEmailPass()) providers.push({ name: 'Gmail', send: sendViaGmail });

let lastErr;
for (const provider of providers) {
  try {
    await provider.send({ to, subject, html });
    return; // 성공하면 종료 — 이전에 실패한 게 있었다면 로그만 남김
  } catch (err) {
    lastErr = err; // 실패하면 다음 provider로 계속
  }
}
throw lastErr; // 전부 실패했을 때만 에러 (마지막 provider의 에러 그대로)
```

기존에 있던 Gmail 전용 포트(465↔587) 재시도 로직은 `sendViaGmail()` 로 그대로 분리해서 유지했다 — provider 간 대체와 Gmail 내부 포트 대체는 서로 다른 레이어라 섞지 않았다.

### 2. `/health`·기동 로그도 "전부 나열"로 변경

`getEmailProvider()` 가 이제 콤마로 구분된 리스트(예: `brevo,gmail-smtp`)를 반환한다. 하나만 보여주면 운영자가 "대체 수단이 있는지" 알 수 없어서, 설정된 것 전부를 노출하도록 바꿨다(시크릿 값은 여전히 노출 안 함 — provider 이름만).

### 3. 에러 상세는 그대로 유지 (프론트 호환)

`authController.js` 의 `emailFailDetail()` 은 `err.code`/`err.responseCode`/`err.providerDetail` 을 읽어 사용자에게 보여준다. 전부 실패했을 때 던지는 에러는 **마지막으로 시도한 provider의 에러 객체를 그대로** 사용하므로 이 계약이 깨지지 않는다.

## 테스트

`global.fetch` 를 모킹해서 두 시나리오를 재현:

1. Brevo가 정확히 사용자가 겪은 403 `permission_denied`/`not yet activated` 로 실패 → Resend가 설정돼 있으면 자동으로 Resend를 시도해 성공 (`sendAppMail` 이 resolve됨, 실제 네트워크 없이 로직만 검증)
2. Brevo만 설정돼 있고 그것마저 실패 → 기존과 동일하게 `BREVO_API_ERROR`/`403`/`providerDetail` 이 그대로 담긴 에러를 throw (프론트 alert 문구 회귀 없음 확인)

로컬 `backend/.env` 는 Gmail만 설정돼 있어 실제 배포 서버(Brevo 사용 추정)와 환경이 달라, 실제 네트워크 재현은 위 모킹 테스트로 대체했다.

## 향후 개선 제안

- Render 환경변수에 **`RESEND_API_KEY`(또는 Gmail)를 백업으로 같이 등록**해두면 Brevo 승인 대기 중에도 즉시 메일이 나간다 — 실제로 이걸 등록하는 건 Render 대시보드 작업이라 코드 밖의 일(이 문서에 안내만 남김)
- Brevo 활성화가 완료되면 원래대로 Brevo가 최우선으로 계속 쓰이고, 백업 provider는 Brevo가 다시 막힐 때만 조용히 대기 상태로 남음

---
문서 생성일: 2026-09-01
