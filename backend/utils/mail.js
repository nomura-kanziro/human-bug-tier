/**
 * 앱 메일 발송 (Gmail + 앱 비밀번호)
 * EMAIL_USER / EMAIL_APP_PASSWORD 미설정 시 hasEmailConfig() === false
 */
const nodemailer = require('nodemailer');
const dnsPromises = require('dns').promises;

const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;

const EMAIL_NOT_CONFIGURED_MSG =
  '이메일 발송 기능이 서버에 설정되어 있지 않습니다. 관리자에게 문의해주세요.';
const EMAIL_SEND_FAILED_MSG =
  '이메일 발송에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.';

// Google이 보여주는 'abcd efgh ijkl mnop' 형식 공백까지 제거 (그대로 붙여넣어도 동작하도록)
function getEmailPass() {
  return (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
}

function hasEmailConfig() {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = getEmailPass();
  return Boolean(user && pass);
}

function getEmailUser() {
  return (process.env.EMAIL_USER || '').trim();
}

let transporter = null;

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

async function createGmailTransport() {
  const common = {
    port: SMTP_PORT,
    secure: true,
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
    transporter = await createGmailTransport();
  }
  return transporter;
}

/**
 * @param {{ to: string, subject: string, html: string }} opts
 * @throws Error on SMTP failure
 */
async function sendAppMail({ to, subject, html }) {
  if (!hasEmailConfig()) {
    const err = new Error(EMAIL_NOT_CONFIGURED_MSG);
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const transport = await getTransporter();
  try {
    await transport.sendMail({
      from: `"휴먼버그티어" <${getEmailUser()}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // 연결 자체가 실패하면 캐시된 IP가 막혔을 수 있으므로 다음 요청에서 다시 조회하게 함
    if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNECTION') {
      transporter = null;
    }
    // Gmail 거부 사유(응답 코드) 로그로 원인 특정 (예: 낯선 IP 로그인 차단, 인증 실패 등)
    console.error(
      `✉️  Gmail 발송 실패 [responseCode=${err.responseCode || '-'}] [code=${err.code || '-'}]:`,
      err.response || err.message
    );
    throw err;
  }
}

/** 서버 기동 시 한 줄 안내 (시크릿 값 출력 금지) */
function logEmailConfigStatus() {
  if (hasEmailConfig()) {
    console.log('✉️  이메일 발송: 설정됨 (EMAIL_USER 존재)');
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
