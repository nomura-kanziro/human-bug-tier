// README 캡처 전용 안전장치 — `node -r docs/readme/tools/guard-env.js server.js` 로만 쓴다.
// server.js 는 backend/.env 를 override:true 로 읽으므로 MONGO_URI 를 셸에서 넘겨도 운영 DB 로 붙는다.
// 그래서 .env 읽기를 막고, 로컬 임시 Mongo 가 아니면 연결 자체를 거부한다. 메일·유튜브 동기화도 끈다.
const path = require('path');

const backend = path.resolve(__dirname, '../../../backend');
const dotenv = require(path.join(backend, 'node_modules/dotenv'));
const mongoose = require(path.join(backend, 'node_modules/mongoose'));

const DEMO_URI = 'mongodb://127.0.0.1:27099/hbt_readme_demo';

dotenv.config = () => ({ parsed: {} });

for (const key of [
  'EMAIL_USER', 'EMAIL_APP_PASSWORD', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
  'BREVO_API_KEY', 'RESEND_API_KEY', 'APP_URL',
]) delete process.env[key];

Object.assign(process.env, {
  MONGO_URI: DEMO_URI,
  ADMIN_INPUT_ID: 'demo-admin',
  ADMIN_INPUT_PW: 'demo-admin-pass!',
  ADMIN_NAME: '관리자',
  JWT_SECRET: 'readme-capture-only',
  AI_SERVICE_KEY: 'readme-capture-only',
  YOUTUBE_POSTS_SYNC_ENABLED: 'false',
  PORT: '5077',
});

const realConnect = mongoose.connect.bind(mongoose);
mongoose.connect = (uri, ...rest) => {
  if (uri !== DEMO_URI) throw new Error('README 캡처는 로컬 임시 Mongo 에만 연결합니다.');
  return realConnect(uri, ...rest);
};

console.log('[guard-env] 로컬 임시 Mongo 전용으로 실행합니다.');
