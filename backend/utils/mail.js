/**
 * 앱 메일 발송
 * 1순위: Resend HTTPS API (RESEND_API_KEY 설정 시) — Render의 SMTP(465/587) 포트 차단과 무관하게 동작
 * 2순위: Gmail SMTP (로컬 등 SMTP가 열린 환경 대비 유지)
 * 두 방식 모두 미설정 시 hasEmailConfig() === false
 */
const nodemailer = require('nodemailer');
const dnsPromises = require('dns').promises;

const RESEND_API_URL = 'https://api.resend.com/emails';

const SMTP_HOST = 'smtp.gmail.com';
// Render 등 일부 호스팅이 465(SMTPS)를 막아둔 경우가 있어 587(STARTTLS)로 대체 시도
const SMTP_PORT_CANDIDATES = [
  { port: 465, secure: true },
  { port: 587, secure: false },
];
const CONNECTION_ERROR_CODES = new Set(['ESOCKET', 'ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED']);

const EMAIL_NOT_CONFIGURED_MSG =
  '이메일 발송 기능이 서버에 설정되어 있지 않습니다. 관리자에게 문의해주세요.';
const EMAIL_SEND_FAILED_MSG =
  '이메일 발송에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.';

// Google이 보여주는 'abcd efgh ijkl mnop' 형식 공백까지 제거 (그대로 붙여넣어도 동작하도록)
function getEmailPass() {
  return (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
}

function getEmailUser() {
  return (process.env.EMAIL_USER || '').trim();
}

function getResendApiKey() {
  return (process.env.RESEND_API_KEY || '').trim();
}

// Resend는 도메인 인증 전에는 발신자를 onboarding@resend.dev로만 허용함
function getResendFrom() {
  return (process.env.RESEND_FROM || '').trim() || 'onboarding@resend.dev';
}

function hasEmailConfig() {
  return Boolean(getResendApiKey()) || Boolean((process.env.EMAIL_USER || '').trim() && getEmailPass());
}

/** Render의 SMTP 포트 차단과 무관하게 동작하는 HTTPS 기반 발송 */
async function sendViaResend({ to, subject, html }) {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `휴먼버그티어 <${getResendFrom()}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const err = new Error(`Resend API ${response.status}: ${body}`);
    err.code = 'RESEND_API_ERROR';
    err.responseCode = response.status;
    throw err;
  }
}

let transporter = null;
let workingPortIndex = 0; // 마지막으로 연결에 성공한 포트 설정 인덱스 (다음에도 우선 시도)

/**
 * Nodemailer는 내부적으로 dns.resolve6도 시도해 IPv6 주소를 고르는데,
 * Render 등 IPv6 아웃바운드가 없는 환경에서는 ENETUNREACH가 난다.
 * IPv4 주소를 직접 조회해 host로 넘기고 TLS 검증용 SNI만 원래 도메인으로 유지한다.
 */
async function resolveSmtpIPv4() {
  try {
    const [ipv4] = await dnsPromises.resolve4(SMTP_HOST);
    if (ipv4) return ipv4;
  } catch (err) {
    console.warn(`✉️  resolve4 실패 (${err.code || err.message}) — lookup으로 재시도`);
  }

  try {
    const { address } = await dnsPromises.lookup(SMTP_HOST, { family: 4 });
    if (address) return address;
  } catch (err) {
    console.warn(`✉️  lookup(IPv4) 실패 (${err.code || err.message}) — 도메인으로 연결 시도`);
  }

  return null;
}

async function createGmailTransport(portConfig) {
  const common = {
    port: portConfig.port,
    secure: portConfig.secure,
    requireTLS: !portConfig.secure,
    auth: { user: getEmailUser(), pass: getEmailPass() },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  const ipv4 = await resolveSmtpIPv4();
  if (ipv4) {
    return nodemailer.createTransport({
      ...common,
      host: ipv4,
      tls: { servername: SMTP_HOST },
    });
  }

  return nodemailer.createTransport({ ...common, host: SMTP_HOST, family: 4 });
}

async function getTransporter() {
  if (!hasEmailConfig()) return null;
  if (!transporter) {
    transporter = await createGmailTransport(SMTP_PORT_CANDIDATES[workingPortIndex]);
  }
  return transporter;
}

/**
 * @param {{ to: string, subject: string, html: string }} opts
 * @throws Error on failure
 */
async function sendAppMail({ to, subject, html }) {
  if (!hasEmailConfig()) {
    const err = new Error(EMAIL_NOT_CONFIGURED_MSG);
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  // Resend(HTTPS)가 설정돼 있으면 우선 사용 — Render의 SMTP 포트 차단 영향 없음
  if (getResendApiKey()) {
    try {
      await sendViaResend({ to, subject, html });
      return;
    } catch (err) {
      console.error(
        `✉️  Resend 발송 실패 [responseCode=${err.responseCode || '-'}]:`,
        err.message
      );
      throw err;
    }
  }

  const mailOptions = {
    from: `"휴먼버그티어" <${getEmailUser()}>`,
    to,
    subject,
    html,
  };

  let lastErr;
  // 465가 방화벽에 막힌 호스팅에서는 587(STARTTLS)로 넘어가야 발송 가능
  for (let attempt = 0; attempt < SMTP_PORT_CANDIDATES.length; attempt += 1) {
    const portConfig = SMTP_PORT_CANDIDATES[workingPortIndex];
    try {
      const transport = await getTransporter();
      await transport.sendMail(mailOptions);
      return;
    } catch (err) {
      lastErr = err;
      console.error(
        `✉️  Gmail 발송 실패 [port=${portConfig.port}] [responseCode=${err.responseCode || '-'}] [code=${err.code || '-'}]:`,
        err.response || err.message
      );

      const isConnectionIssue = CONNECTION_ERROR_CODES.has(err.code);
      transporter = null;
      if (isConnectionIssue && attempt < SMTP_PORT_CANDIDATES.length - 1) {
        workingPortIndex = (workingPortIndex + 1) % SMTP_PORT_CANDIDATES.length;
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

/** 서버 기동 시 한 줄 안내 (시크릿 값 출력 금지) */
function logEmailConfigStatus() {
  if (hasEmailConfig()) {
    console.log(
      getResendApiKey()
        ? '✉️  이메일 발송: 설정됨 (Resend API)'
        : '✉️  이메일 발송: 설정됨 (Gmail SMTP)'
    );
    if (!(process.env.APP_URL || '').trim() && !(process.env.RENDER_EXTERNAL_URL || '').trim()) {
      console.warn(
        '⚠️  APP_URL 미설정 — 메일 링크는 요청 Host(x-forwarded-*)로 생성됩니다. Render에서는 APP_URL 설정을 권장합니다.'
      );
    }
  } else {
    console.warn(
      '⚠️  EMAIL_USER / EMAIL_APP_PASSWORD 미설정 — 가입 인증·아이디/비번 찾기 메일이 발송되지 않습니다. (가입은 즉시 인증 처리)'
    );
    console.warn(
      '⚠️  Render 배포: render.yaml의 sync: false는 값을 채워주지 않습니다. Render 대시보드 → 서비스 → Environment 탭에서 직접 입력하세요.'
    );
  }
}

module.exports = {
  hasEmailConfig,
  sendAppMail,
  logEmailConfigStatus,
  EMAIL_NOT_CONFIGURED_MSG,
  EMAIL_SEND_FAILED_MSG,
};
