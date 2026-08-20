/**
 * 앱 메일 발송 (Gmail + 앱 비밀번호)
 * EMAIL_USER / EMAIL_APP_PASSWORD 미설정 시 hasEmailConfig() === false
 */
const nodemailer = require('nodemailer');

const EMAIL_NOT_CONFIGURED_MSG =
  '이메일 발송 기능이 서버에 설정되어 있지 않습니다. 관리자에게 문의해주세요.';
const EMAIL_SEND_FAILED_MSG =
  '이메일 발송에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.';

function hasEmailConfig() {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_APP_PASSWORD || '').trim();
  return Boolean(user && pass);
}

function getEmailUser() {
  return (process.env.EMAIL_USER || '').trim();
}

let transporter = null;

function getTransporter() {
  if (!hasEmailConfig()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: getEmailUser(),
        pass: (process.env.EMAIL_APP_PASSWORD || '').trim(),
      },
    });
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

  const transport = getTransporter();
  await transport.sendMail({
    from: `"휴먼버그티어" <${getEmailUser()}>`,
    to,
    subject,
    html,
  });
}

/** 서버 기동 시 한 줄 안내 (시크릿 값 출력 금지) */
function logEmailConfigStatus() {
  if (hasEmailConfig()) {
    console.log('✉️  이메일 발송: 설정됨 (EMAIL_USER 존재)');
    if (!(process.env.APP_URL || '').trim()) {
      console.warn(
        '⚠️  APP_URL 미설정 — 메일 링크는 요청 Host(x-forwarded-*)로 생성됩니다. Render에서는 APP_URL 설정을 권장합니다.'
      );
    }
  } else {
    console.warn(
      '⚠️  EMAIL_USER / EMAIL_APP_PASSWORD 미설정 — 가입 인증·아이디/비번 찾기 메일이 발송되지 않습니다. (가입은 즉시 인증 처리)'
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
