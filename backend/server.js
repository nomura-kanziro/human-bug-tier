const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// db 연결 함수 불러오기
const connectDB = require('./config/db');

// 환경변수 로드
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB 연결 (실패해도 서버는 계속 실행)
connectDB().then((connected) => {
  if (!connected) {
    console.log('ℹ️  DB 연결 없이 서버가 시작되었습니다.');
  }
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

// 기본 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - Health check: http://localhost:${PORT}/health`);
});

// 프로세스 레벨 에러 핸들링
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// 기존 코드 위쪽에 (dotenv.config() 이후쯤)
const tierRoutes = require('./routes/tierRoutes');

// 미들웨어 아래쪽에 라우터 연결
app.use('/api/tierlists', tierRoutes);

// 상단 require 부분에 추가
const authRoutes = require('./routes/authRoutes');

// 미들웨어 아래쪽에 추가
app.use('/api/auth', authRoutes);