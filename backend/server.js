const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// db 연결 함수 불러오기
const connectDB = require('./config/db');
const { seedAdmin } = require('./controllers/adminController');

// 환경변수 로드
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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

// 테스트용 라우트
app.get('/', (req, res) => {
  res.json({ message: 'human-bug-tier 백엔드 서버가 정상 실행 중입니다.' });
});

// 헬스 체크 (DB 연결 상태 포함)
app.get('/health', (req, res) => {
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

const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));

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

app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`   Health check: /health`);
  console.log(`   프론트엔드 예시: /notice/notice.html`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});