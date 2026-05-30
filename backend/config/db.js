const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('⚠️  MONGO_URI 환경변수가 설정되지 않았습니다. DB 없이 서버를 시작합니다.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10초 내에 연결 안 되면 실패
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB 연결 성공');
    return true;
  } catch (err) {
    console.error('❌ MongoDB 연결 실패:', err.message);
    console.warn('⚠️  DB 연결 없이 서버를 계속 실행합니다. (개발 모드)');
    // 프로세스를 죽이지 않고 계속 진행 (서버는 켜지게 함)
    return false;
  }
};

// 연결 상태 모니터링
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB 연결이 끊어졌습니다.');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB 에러:', err.message);
});

module.exports = connectDB;