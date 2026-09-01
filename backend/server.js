const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Render 등 IPv6 아웃바운드 미지원 환경에서 Gmail SMTP 접속 시 ENETUNREACH 방지
dns.setDefaultResultOrder('ipv4first');

// db 연결 함수 불러오기
const connectDB = require('./config/db');
const { seedAdmin } = require('./controllers/adminController');

// 환경변수 로드
// 1) 프로젝트 루트 .env (기본값)
// 2) backend/.env — 동일 키는 backend가 우선 (override: true)
//    ※ dotenv 기본은 이미 있는 키를 덮어쓰지 않음.
//       루트에 MONGO_URI= (빈 값)만 있으면 backend 값이 무시되어 DB 연결 실패함.
// 3) 셸/호스트가 이미 준 PORT·STATIC_ROOT·RENDER 는 파일보다 우선
//    (Render가 넣는 PORT, 로컬 STATIC_ROOT=root-render 검증)
const shellPort = process.env.PORT;
const shellStaticRoot = process.env.STATIC_ROOT;
const shellRender = process.env.RENDER;
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env'), override: true });
if (shellPort !== undefined) process.env.PORT = shellPort;
if (shellStaticRoot !== undefined) process.env.STATIC_ROOT = shellStaticRoot;
if (shellRender !== undefined) process.env.RENDER = shellRender;

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// 정적 프론트엔드 파일 서빙
// 이 서버를 실행하면 frontend + API가 모두 같은 포트(기본 5000)에서 제공됨.
//
// 로컬 / Cloudflare Tunnel:
//   ../root-cloudflare
// Render.com:
//   ../root-render  (`RENDER=true`)
// 강제: STATIC_ROOT=root-cloudflare | root-render
//
// 로컬 개발 추천 방법 (5000 통일):
//   cd backend
//   npm start
//   → http://localhost:5000 에서 전체 앱 (프론트 + API) 사용
function resolveStaticRoot() {
  const fromEnv = (process.env.STATIC_ROOT || '').trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(__dirname, '..', fromEnv);
  }
  if (process.env.RENDER === 'true') {
    return path.join(__dirname, '..', 'root-render');
  }
  return path.join(__dirname, '..', 'root-cloudflare');
}
const projectRoot = resolveStaticRoot();
if (!fs.existsSync(projectRoot)) {
  console.error('정적 프론트 폴더가 없습니다:', projectRoot);
}
app.use(express.static(projectRoot));

// 깔끔한 URL 대응 (예: /notice → notice.html, /api/* 는 제외)

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return next();

  const cleanPath = req.path.replace(/\/$/, '') || '/index';
  const htmlCandidate = path.join(projectRoot, `${cleanPath}.html`);

  if (fs.existsSync(htmlCandidate)) {
    return res.sendFile(htmlCandidate);
  }

  next();
});

// MongoDB 연결 (실패해도 서버는 계속 실행)
connectDB().then(async (connected) => {
  if (!connected) {
    console.log('ℹ️  DB 연결 없이 서버가 시작되었습니다.');
    return;
  }

  try {
    await seedAdmin();
  } catch (err) {
    console.error('관리자 계정 초기화 실패:', err.message);
  }
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(projectRoot, 'tier-image', 'logo.webp'));
});

// 헬스 체크 (DB 연결 상태 포함 — 시크릿 값은 노출하지 않음)
app.get('/health', (req, res) => {
  const { hasEmailConfig, getEmailProvider } = require('./utils/mail');
  const { getAppBaseUrl } = require('./utils/appUrl');
  const dbState = require('mongoose').connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }[dbState] || 'unknown';

  res.json({
    status: 'ok',
    db: dbStatus,
    emailConfigured: hasEmailConfig(),
    emailProvider: getEmailProvider(),
    // 실제로 메일 링크에 쓰일 base URL (APP_URL > RENDER_EXTERNAL_URL > 요청 Host 순)
    resolvedAppUrl: getAppBaseUrl(req),
    timestamp: new Date().toISOString(),
    youtubeSync: require('./utils/youtubeCommunitySync').getYoutubeSyncStatus(),
  });
});

const tierRoutes = require('./routes/tierRoutes');
const authRoutes = require('./routes/authRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const luckDrawRoutes = require('./routes/luckDrawRoutes');

app.use('/api/tierlists', tierRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/luck-draw', luckDrawRoutes);

app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`   Health check: /health`);
  console.log(`   정적 루트: ${projectRoot}`);
  try {
    require('./utils/mail').logEmailConfigStatus();
  } catch (e) {
    /* ignore */
  }
  console.log(`   프론트엔드: / (index.html) + /notice/notice.html 등`);
  try {
    require('./utils/youtubeCommunitySync').startYoutubeCommunitySyncScheduler();
  } catch (err) {
    console.error('유튜브 커뮤니티 동기화 스케줄러 시작 실패:', err.message);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});