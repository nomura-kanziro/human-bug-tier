---
area: backend
feature: auth
---

# 사이트 전용 SMTP(Oracle Email Delivery) 발송 — 개인 Gmail 주소 숨김

## 요청

> 수신용 메일이 내 전용 이메일(개인 Gmail)로 나가는데, 사이트 전용 주소로 보내고 개인 주소는 가리고 싶다.
> 제약: Brevo·Resend 제외, 새 Gmail 계정 만들기 금지, Gmail 설정 건드리기 금지, 사용자 수작업 최소.

## 관련 커밋

- `0d35b80` (2026-10-03) feat(mail): 사이트 전용 SMTP(Oracle Email Delivery) 발송 추가 — 사이트 도메인 주소로 발송, 개인 Gmail 주소 숨김

## 선택한 방식

| 검토 | 결과 |
|---|---|
| Gmail "다른 주소로 보내기"/별칭 | 제외(Gmail 설정을 건드리지 않는다는 제약) |
| Brevo · Resend | 제외(사용자 지시) |
| 서버에 직접 메일 서버 | **불가** — Oracle VM 은 25번 포트 아웃바운드가 막혀 있고 PTR(역방향 DNS)도 없어 받는 쪽이 스팸 처리 |
| **Oracle Cloud Email Delivery(도쿄 `ap-tokyo-1`)** | 채택 — 이미 쓰는 Oracle 계정, SMTP 587(STARTTLS), 사이트 도메인(`human-bug-tier.com`)을 발신 도메인으로 인증 |

도메인 인증은 DNS 에 **DKIM CNAME** 과 **SPF**(`include:ap.rp.oracleemaildelivery.com`)를 추가해 통과시켰다. SMTP 자격 증명은 Oracle 콘솔에서 만들었고(생성 직후 약 1분은 535 로 거절 — 반영 지연), **값은 서버 `.env` 에만** 있다.

## 코드 (`backend/utils/mail.js`)

- 새 발송 방식 **사이트 SMTP** 를 `sendAppMail` 체인의 **맨 앞**에 둔다: 사이트 SMTP → Brevo → Resend → Gmail(앞 방식이 실패하면 다음으로 넘어가는 기존 동작 유지, 코드는 지우지 않음).
- `SMTP_HOST` · `SMTP_USER` · `SMTP_PASS` · `MAIL_FROM_ADDRESS` 가 **모두** 있어야 켜진다(`getSiteSmtpConfig`). `MAIL_FROM_ADDRESS` 가 이메일 형식이 아니면 끈 것으로 본다(오타로 엉뚱한 주소가 찍히는 것 방지). `SMTP_PORT` 기본 587.
- `sendViaSiteSmtp`: nodemailer 풀 연결을 재사용하고, 실패하면 풀을 버려 다음 시도가 새로 연결한다.
- `/health` 의 `emailProvider` 가 `site-smtp,gmail-smtp` 로 보인다.
- 환경 변수는 `backend/.env.example` 에 주석으로 문서화(값 없음).

## 확인

- 운영 서버에서 시험 메일이 사이트 주소로 도착함을 확인했다.
- 메일 본문 모양(공용 템플릿)은 [10-mail-template-record.md](./10-mail-template-record.md).

## 알려진 점

- 사이트 SMTP 가 장애일 때만 Gmail 이 대신 나가며, 이때는 개인 Gmail 주소가 보낸 사람으로 보인다(체인의 마지막 안전망으로 유지).
- Oracle Email Delivery 는 승인된 발신자·도메인만 쓸 수 있다.
