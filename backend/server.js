const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// db 연결 함수 불러오기
const connectDB = require('./config/db');
const { seedAdmin } = require('./controllers/adminController');

// 환경변수 로드
// 1) 프로젝트 루트 .env (기본값)
// 2) backend/.env — 동일 키는 backend가 우선 (override: true)
//    ※ dotenv 기본은 이미 있는 키를 덮어쓰지 않음.
//       루트에 MONGO_URI= (빈 값)만 있으면 backend 값이 무시되어 DB 연결 실패함.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();

app.use(cors());
app.use(express.json());

// 정적 프론트엔드 파일 서빙 (루트의 index.html, 하위 폴더, 에셋 등)
// 이 서버를 실행하면 frontend + API가 모두 같은 포트(기본 5000)에서 제공됨.
// 
// 로컬 개발 추천 방법 (5000 통일):
//   cd backend
//   npm start
//   → http://localhost:5000 에서 전체 앱 (프론트 + API) 사용
// 
// npx serve . 는 비추천 (주요 개발 방법으로):
//   - 5000으로 실행하면 백엔드와 포트 충돌
//   - 별도 포트(예: 3000)로 하면 API는 localhost:5000을 바라보게 되지만,
//     백엔드 기능(클린 URL, /health 등)을 잃고 두 프로세스를 관리해야 함
//   - 프로젝트는 백엔드가 프론트를 함께 서빙하는 구조로 설계됨
const projectRoot = path.join(__dirname, '..');
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
  res.sendFile(path.join(__dirname, '..', 'tier-image', 'logo.webp'));
});

// 헬스 체크 (DB 연결 상태 포함 — 시크릿 값은 노출하지 않음)
app.get('/health', (req, res) => {
  const { hasEmailConfig } = require('./utils/mail');
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
    appUrlConfigured: Boolean((process.env.APP_URL || '').trim()),
    timestamp: new Date().toISOString(),
  });
});

const tierRoutes = require('./routes/tierRoutes');
const authRoutes = require('./routes/authRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/tierlists', tierRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`   Health check: /health`);
  try {
    require('./utils/mail').logEmailConfigStatus();
  } catch (e) {
    /* ignore */
  }
  console.log(`   프론트엔드: / (index.html) + /notice/notice.html 등`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});