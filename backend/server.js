// ========================================================
// server.js - 백엔드 진입점 (Express 앱 부트스트랩)
// ========================================================
// 이 파일 하나가 이 프로젝트의 "풀스택 서버"이다.
//   1. 환경변수(.env) 로드
//   2. Express 앱 생성 + 전역 미들웨어(CORS, JSON 파서) 등록
//   3. 프론트엔드 정적 파일 서빙 (root-cloudflare 또는 root-render)
//   4. MongoDB 연결 (실패해도 서버는 계속 뜸 — DB 없는 개발도 가능)
//   5. /api/* 라우터 등록
//   6. 전역 에러 핸들러 + 포트 리슨 + 프로세스 레벨 예외 처리
// 즉, `npm start`로 이 파일을 실행하면 프론트(정적 HTML/CSS/JS)와
// 백엔드 API가 동일 포트(기본 5000)에서 함께 서비스된다.
// ========================================================
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Render 등 IPv6 아웃바운드 미지원 환경에서 Gmail SMTP 접속 시 ENETUNREACH 방지
// (Node 18+ 기본 DNS 조회 순서가 IPv6 우선이라, IPv6 라우팅이 안 되는 호스팅에서
//  SMTP 서버 접속 시 연결 실패가 나는 문제를 막기 위해 IPv4를 먼저 시도하게 강제한다)
dns.setDefaultResultOrder('ipv4first');

// db 연결 함수 불러오기
const connectDB = require('./config/db');
const { seedAdmin } = require('./controllers/adminController');

// ====== 환경변수 로드 ======
// 1) 프로젝트 루트 .env (기본값)
// 2) backend/.env — 동일 키는 backend가 우선 (override: true)
//    ※ dotenv 기본은 이미 있는 키를 덮어쓰지 않음.
//       루트에 MONGO_URI= (빈 값)만 있으면 backend 값이 무시되어 DB 연결 실패함.
// 3) 셸/호스트가 이미 준 PORT·STATIC_ROOT·RENDER 는 파일보다 우선
//    (Render가 넣는 PORT, 로컬 STATIC_ROOT=root-render 검증)
// dotenv.config()를 두 번 부르기 전에, 셸/호스팅 플랫폼(Render 등)이
// 이미 주입해 둔 값을 먼저 백업해 둔다. 아래에서 .env 파일들을 읽은 뒤
// 이 값들로 다시 덮어써서 "호스팅 환경변수가 파일보다 항상 우선"하게 만든다.
const shellPort = process.env.PORT;
const shellStaticRoot = process.env.STATIC_ROOT;
const shellRender = process.env.RENDER;
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env'), override: true });
if (shellPort !== undefined) process.env.PORT = shellPort;
if (shellStaticRoot !== undefined) process.env.STATIC_ROOT = shellStaticRoot;
if (shellRender !== undefined) process.env.RENDER = shellRender;

const app = express();

// 모든 오리진에서의 요청을 허용 (프론트가 같은 서버에서 서빙되긴 하지만,
// GitHub Pages 정적 미리보기 등 다른 오리진에서 API를 호출하는 경우도 있어 전역 허용)
app.use(cors());
// JSON 바디 파서 — 티어 데이터(캐릭터 배치 정보) 등 페이로드가 커질 수 있어 기본 100kb보다 넉넉한 2mb로 상향
app.use(express.json({ limit: '2mb' }));

const { getTierMediaDir } = require('./utils/tierMediaDir');

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

// ====== API는 정적 파일보다 먼저 ======
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
    resolvedAppUrl: getAppBaseUrl(req),
    timestamp: new Date().toISOString(),
    youtubeSync: require('./utils/youtubeCommunitySync').getYoutubeSyncStatus(),
  });
});

// 에디터/브라우저 확장 프로그램이 치는 주소. 우리 API가 아님 — 콘솔 404만 막음
app.use('/api/ext', (req, res) => {
  res.status(204).end();
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

app.use('/api', (req, res) => {
  res.status(404).json({
    error: '없는 API입니다.',
    path: req.originalUrl,
    method: req.method,
  });
});

// express.static: projectRoot 아래 파일들(HTML/CSS/JS/이미지 등)을 URL 경로 그대로 서빙.
app.use(express.static(projectRoot));

// 깔끔한 URL 대응 (예: /notice → notice.html, /api/* 는 제외)
// express.static은 정확한 파일 경로가 있어야만 응답하므로, 확장자 없는 주소
// (/notice, /admin/login 등)로 접속했을 때 대응하는 .html 파일이 있으면 대신 그 파일을 내려준다.
// - GET/HEAD 요청만 대상 (POST 등 API 호출은 건드리지 않음)
// - /api/로 시작하면 무조건 건너뛰어 아래 라우터들이 처리하도록 함
// - 매칭되는 .html이 없으면 next()로 넘겨 최종적으로 404 처리
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

// ====== MongoDB 연결 (실패해도 서버는 계속 실행) ======
// DB 연결을 기다리지 않고 서버를 먼저 띄운 뒤 비동기로 연결을 시도한다.
// 연결에 성공하면 seedAdmin()으로 .env의 ADMIN_INPUT_ID/PW 기준 관리자 계정을
// (없을 때만) 자동 생성한다. DB가 없어도 정적 페이지·헬스체크 등은 계속 동작.
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
  const candidates = [
    path.join(projectRoot, getTierMediaDir(), 'logo.webp'),
    path.join(projectRoot, 'tier-media', 'logo.webp'),
    path.join(projectRoot, 'tier-image', 'logo.webp'),
    path.join(__dirname, '..', 'root-render', 'tier-media', 'logo.webp'),
    path.join(__dirname, '..', 'root-cloudflare', 'tier-image', 'logo.webp'),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) {
    res.status(204).end();
    return;
  }
  res.type('image/webp');
  res.sendFile(file);
});

// 전역 에러 핸들러 — 인자가 4개(err 포함)인 미들웨어는 Express가 에러 핸들러로 인식한다.
// 위의 라우터/미들웨어 어디선가 next(err)로 넘기거나 동기 코드에서 예외가 던져지면 여기로 모여
// 스택 트레이스를 서버 로그에만 남기고, 클라이언트에는 상세 내용 없이 500만 응답한다.
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// ====== 서버 기동 ======
// PORT 환경변수가 없으면 로컬 기본값 5000 사용 (Render는 자체 PORT를 주입함)
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
    // 서버 기동 시 유튜브 커뮤니티 게시물 자동 동기화 스케줄러를 시작 (주기적으로 새 글을 공지/새소식으로 반영)
    require('./utils/youtubeCommunitySync').startYoutubeCommunitySyncScheduler();
  } catch (err) {
    console.error('유튜브 커뮤니티 동기화 스케줄러 시작 실패:', err.message);
  }
});

// ====== 프로세스 레벨 안전망 ======
// async 함수 안에서 await 없이 던져진(catch 안 된) Promise 거부를 여기서 최소한 로그로 남긴다.
// 서버를 죽이지는 않음 (연결 하나 실패했다고 전체 서비스를 내릴 필요는 없음).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// 완전히 잡히지 않은 동기 예외 — 이 경우는 프로세스 상태가 불안정할 수 있으므로
// 서버 소켓을 정리(close)한 뒤 프로세스를 종료한다 (Render 등 플랫폼이 자동으로 재시작해줌).
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});