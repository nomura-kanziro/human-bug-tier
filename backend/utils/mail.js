/**
 * 앱 메일 발송
 * 1순위: Brevo HTTPS API (BREVO_API_KEY 설정 시) — 발신자 이메일 1개만 클릭 인증하면 도메인 없이도 임의 수신자에게 발송 가능
 * 2순위: Resend HTTPS API (RESEND_API_KEY 설정 시) — 도메인 미인증 시 계정 소유자 본인에게만 발송 가능
 * 3순위: Gmail SMTP (로컬 등 SMTP가 열린 환경 대비 유지)
 * 세 방식 모두 미설정 시 hasEmailConfig() === false
 */
const nodemailer = require('nodemailer');
const dnsPromises = require('dns').promises;

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDERS_URL = 'https://api.brevo.com/v3/senders';
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

function sanitizeSecret(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, '');
}

function getResendApiKey() {
  return sanitizeSecret(process.env.RESEND_API_KEY);
}

// Resend는 도메인 인증 전에는 발신자를 onboarding@resend.dev로만 허용함
function getResendFrom() {
  return (process.env.RESEND_FROM || '').trim() || 'onboarding@resend.dev';
}

function getBrevoApiKey() {
  return sanitizeSecret(process.env.BREVO_API_KEY);
}

function getBrevoFrom() {
  return (process.env.BREVO_FROM || '').trim() || getEmailUser();
}

function brevoHeaders() {
  return {
    'api-key': getBrevoApiKey(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function parseProviderErrorBody(body) {
  const raw = String(body || '').replace(/\s+/g, ' ').trim();
  try {
    const parsed = JSON.parse(body);
    // Brevo는 code, Resend는 name — 둘 다 지원
    const codeLike = parsed.code || parsed.name;
    const parts = [codeLike, parsed.message].filter(Boolean);
    if (parts.length) return parts.join(': ').slice(0, 220);
  } catch (_) {
    /* 본문이 JSON이 아니면 원문 일부를 사용 */
  }
  return raw.slice(0, 220);
}

function brevoApiError(status, body) {
  const parsed = parseProviderErrorBody(body);
  const err = new Error(`Brevo API ${status}: ${parsed || body}`);
  err.code = 'BREVO_API_ERROR';
  err.responseCode = status;
  let hint = parsed;
  if (status === 403) {
    const lower = (parsed || '').toLowerCase();
    if (/activat|permission_denied|smtp account|not yet/i.test(lower)) {
      hint = `${parsed} | Brevo 트랜잭션(SMTP) 미활성 — 대시보드 고객지원에서 활성화 요청`;
    } else {
      hint = `${parsed} | 발신자 미인증 가능 — Senders에서 인증 후 BREVO_FROM을 그 메일과 맞출 것`;
    }
  }
  err.providerDetail = String(hint || '').slice(0, 280);
  return err;
}

async function resolveBrevoSender() {
  const preferred = getBrevoFrom().toLowerCase();
  const response = await fetch(BREVO_SENDERS_URL, { headers: brevoHeaders() });
  const body = await response.text().catch(() => '');
  if (!response.ok) throw brevoApiError(response.status, body);

  let senders = [];
  try {
    senders = JSON.parse(body).senders || [];
  } catch (_) {
    senders = [];
  }

  const active = senders.filter((s) => s && s.active && s.email);
  if (!active.length) {
    const err = new Error('Brevo에 인증된 발신자가 없습니다.');
    err.code = 'BREVO_SENDER_NOT_VERIFIED';
    err.responseCode = 403;
    err.providerDetail =
      'Senders, domains & IPs에서 발신 이메일을 추가하고 받은 인증 코드를 입력하세요';
    throw err;
  }

  const matched = preferred
    ? active.find((s) => String(s.email).toLowerCase() === preferred)
    : null;
  const chosen = matched || active[0];
  if (preferred && !matched) {
    console.warn(
      `✉️  BREVO_FROM이 인증된 발신자가 아니라 인증된 주소(${chosen.email})로 보냅니다`
    );
  }
  return { id: chosen.id };
}

function hasEmailConfig() {
  return (
    Boolean(getBrevoApiKey()) ||
    Boolean(getResendApiKey()) ||
    Boolean((process.env.EMAIL_USER || '').trim() && getEmailPass())
  );
}

/**
 * /health 진단용 — 시크릿 값 없이 어느 발송 경로(들)가 활성인지만 노출.
 * sendAppMail() 이 우선순위대로 전부 시도하므로, 설정된 방식을 전부 콤마로 나열한다
 * (첫 방식 하나만 보여주면 "대체 방식이 있는지"를 운영자가 알 수 없음).
 */
function getEmailProvider() {
  const providers = [];
  if (getBrevoApiKey()) providers.push('brevo');
  if (getResendApiKey()) providers.push('resend');
  if ((process.env.EMAIL_USER || '').trim() && getEmailPass()) providers.push('gmail-smtp');
  return providers.length ? providers.join(',') : 'none';
}

/** 도메인 없이 발신자 이메일 1개만 인증하면 임의 수신자에게 발송 가능 */
async function sendViaBrevo({ to, subject, html }) {
  const sender = await resolveBrevoSender();
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: brevoHeaders(),
    body: JSON.stringify({
      sender: { id: sender.id },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw brevoApiError(response.status, body);
  }
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
    const parsed = parseProviderErrorBody(body);
    const err = new Error(`Resend API ${response.status}: ${parsed || body}`);
    err.code = 'RESEND_API_ERROR';
    err.responseCode = response.status;

    let hint = parsed;
    if (response.status === 403 && /own email|verify a domain|testing emails/i.test(parsed || '')) {
      hint = `${parsed} | 도메인 미인증 Resend는 계정 가입 이메일로만 발송 가능 — resend.com에서 도메인을 인증하거나, 테스트는 가입한 이메일로`;
    }
    err.providerDetail = String(hint || '').slice(0, 280);
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

async function sendViaGmail({ to, subject, html }) {
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

  // 465·587 둘 다 연결 자체가 안 됐다면(타임아웃 등) 계정 설정 문제가 아니라
  // 호스팅이 SMTP 아웃바운드 포트를 막아둔 것일 가능성이 높다 — Render 등 클라우드 호스팅에서 흔함.
  if (lastErr && CONNECTION_ERROR_CODES.has(lastErr.code) && !lastErr.providerDetail) {
    lastErr.providerDetail =
      'SMTP 연결 자체가 안 됨 — Render 등 클라우드 호스팅이 SMTP 아웃바운드 포트(465/587)를 막아둔 경우 Gmail은 재시도해도 계속 실패합니다. HTTPS 기반인 Resend/Brevo API 사용을 권장';
  }

  throw lastErr;
}

/**
 * 우선순위대로(Brevo → Resend → Gmail) **설정된 모든 방식**을 순서대로 시도한다.
 * 앞선 방식이 계정 미활성·발신자 미인증 등 그 서비스만의 문제로 막혀 있어도,
 * 다른 방식이 설정돼 있으면 그걸로 계속 발송을 시도한다(단일 장애점 방지).
 * @param {{ to: string, subject: string, html: string }} opts
 * @throws Error 마지막으로 시도한 방식의 에러 (모두 실패했거나 설정된 방식이 없을 때)
 */
async function sendAppMail({ to, subject, html }) {
  if (!hasEmailConfig()) {
    const err = new Error(EMAIL_NOT_CONFIGURED_MSG);
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const providers = [];
  if (getBrevoApiKey()) providers.push({ name: 'Brevo', send: sendViaBrevo });
  if (getResendApiKey()) providers.push({ name: 'Resend', send: sendViaResend });
  if (getEmailUser() && getEmailPass()) providers.push({ name: 'Gmail', send: sendViaGmail });

  let lastErr;
  const failures = []; // 전부 실패했을 때, "마지막 것만" 보여주면 중간에 실패한 provider의 진짜 원인이 묻힌다.
  for (let i = 0; i < providers.length; i += 1) {
    const provider = providers[i];
    try {
      await provider.send({ to, subject, html });
      if (failures.length) {
        console.warn(`✉️  ${provider.name} 로 대체 발송 성공 (이전 실패: ${failures.map((f) => f.name).join(', ')})`);
      }
      return;
    } catch (err) {
      lastErr = err;
      failures.push({ name: provider.name, detail: err.providerDetail || err.message });
      console.error(
        `✉️  ${provider.name} 발송 실패 [responseCode=${err.responseCode || '-'}]:`,
        err.message
      );
      const hasMoreProviders = i < providers.length - 1;
      if (hasMoreProviders) {
        console.warn(`✉️  다음 발송 방식으로 대체 시도합니다 (${providers[i + 1].name})`);
      }
    }
  }

  // 설정된 게 여러 개인데 전부 실패했다면, 마지막(보통 Gmail)의 에러만 보여주는 대신
  // 각 provider가 왜 실패했는지 전부 이어붙인다 — 예: Resend가 "본인 이메일만 가능"으로 막혔는데
  // Gmail의 ETIMEDOUT 뒤에 가려서 정작 고쳐야 할 원인을 못 보는 걸 방지.
  if (lastErr && failures.length > 1) {
    lastErr.providerDetail = failures.map((f) => `${f.name}: ${f.detail}`).join(' / ').slice(0, 900);
  }

  throw lastErr;
}

const PROVIDER_DISPLAY_NAMES = { brevo: 'Brevo API', resend: 'Resend API', 'gmail-smtp': 'Gmail SMTP' };

/** 서버 기동 시 한 줄 안내 (시크릿 값 출력 금지) */
function logEmailConfigStatus() {
  if (hasEmailConfig()) {
    const providerNames = getEmailProvider()
      .split(',')
      .map((p) => PROVIDER_DISPLAY_NAMES[p] || p)
      .join(' → ');
    console.log(`✉️  이메일 발송: 설정됨 (${providerNames})`);
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
  getEmailProvider,
  sendAppMail,
  logEmailConfigStatus,
  EMAIL_NOT_CONFIGURED_MSG,
  EMAIL_SEND_FAILED_MSG,
};
