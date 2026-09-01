---
area: backend
feature: auth
---

# 커밋 요약 — 이메일 발송 실패 시 시도한 provider 전부의 원인을 합쳐서 보여줌

## 개요

Resend를 Render에 등록했는데도 여전히 `ETIMEDOUT`(Gmail 에러)만 보인다는 제보가 왔다. 원인을 재현해보니 **Resend는 실제로 시도되고 있었지만, Resend 고유의 제약(도메인 미인증 시 계정 본인 이메일에만 발송 가능)으로 실패**하고 있었다 — 그런데 `sendAppMail()`이 "마지막으로 시도한 provider의 에러만" 던지는 구조라, Resend의 진짜(그리고 훨씬 더 실행 가능한) 실패 이유가 뒤이어 시도된 Gmail의 `ETIMEDOUT`에 완전히 가려져 있었다.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Modified: `backend/utils/mail.js` (`sendAppMail`, `sendViaResend`, `parseProviderErrorBody`)
- Modified: `DEPLOY.md`

## 주요 구현 내용

### 1. `sendAppMail()` — 실패한 provider 전부를 기록해서 합침

```js
const failures = [];
for (const provider of providers) {
  try {
    await provider.send({ to, subject, html });
    return;
  } catch (err) {
    lastErr = err;
    failures.push({ name: provider.name, detail: err.providerDetail || err.message });
  }
}

if (lastErr && failures.length > 1) {
  lastErr.providerDetail = failures.map((f) => `${f.name}: ${f.detail}`).join(' / ').slice(0, 900);
}
throw lastErr;
```

설정된 provider가 1개뿐이면(예: Gmail만) 기존과 동일하게 그 provider의 에러만 나온다. **2개 이상 설정돼서 전부 실패했을 때만** 합쳐진 메시지로 바뀐다 — 단일 provider 환경에서는 동작 변화 없음.

### 2. `sendViaResend()` — Brevo와 동일한 수준의 에러 파싱·힌트 추가

기존엔 Resend 에러 본문을 그대로(가공 없이) 메시지에 넣고 있었다. `parseProviderErrorBody()`(Brevo용으로 이미 있던 JSON 파서)를 Resend에도 재사용하도록 `code`뿐 아니라 `name` 필드도 인식하게 확장했고(Resend는 `{name, message}` 형태), 가장 흔한 실패 패턴(도메인 미인증 → 본인 이메일만 허용)을 감지해 힌트를 붙였다:

```js
if (response.status === 403 && /own email|verify a domain|testing emails/i.test(parsed || '')) {
  hint = `${parsed} | 도메인 미인증 Resend는 계정 가입 이메일로만 발송 가능 — resend.com에서 도메인을 인증하거나, 테스트는 가입한 이메일로`;
}
```

## 왜 이게 중요한가

`RESEND_API_KEY` 를 등록하는 것과 "임의의 수신자에게 보낼 수 있는 것"은 별개다. Resend는 **도메인을 인증하기 전까지는 그 Resend 계정으로 가입한 이메일에만** 보낼 수 있다(스팸 방지 정책). 아이디/비번 찾기는 정의상 "다른 사람(가입자)"에게 보내야 하므로, 도메인 인증 없이 API 키만 등록하면 겉보기엔 설정된 것 같아도 실제로는 절대 발송되지 않는다 — 이 문서와 에러 메시지로 그 사실을 바로 알 수 있게 했다.

## 테스트

`global.fetch`/`nodemailer` 를 모두 모킹해서 **세 provider가 전부 설정된 상태에서 셋 다 실패**하는 시나리오를 재현:
- Brevo → 403 `permission_denied`/`not yet activated`
- Resend → 403 `validation_error`/"own email address... verify a domain" (실제 Resend 샌드박스 제약 메시지 형태 그대로)
- Gmail → 465/587 둘 다 `ETIMEDOUT`

최종 에러의 `providerDetail`에 세 provider의 원인이 전부(각각의 힌트 포함) 순서대로 이어붙여지는 것을 확인. 기존 2-provider(성공 포함)·1-provider 단독 실패 테스트도 재실행해 회귀 없음 확인.

## 향후 개선 제안

- Resend 도메인 인증은 코드 밖의 일(resend.com에서 DNS 레코드 추가) — 계정 소유자가 직접 해야 함
- 만약 나중에 provider가 4개 이상으로 늘어나면 900자 캡을 넘을 수 있으니, 그때는 각 provider detail을 더 짧게 요약하거나 캡을 늘리는 걸 고려

---
문서 생성일: 2026-09-01
