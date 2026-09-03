// ========================================================
// config/db.js - MongoDB 연결 설정
// ========================================================
// server.js가 기동 직후 이 모듈의 connectDB()를 호출한다.
// 이 프로젝트는 "DB 연결 실패 = 서버 전체 중단"이 아니라, 연결에 실패해도
// false를 반환해 서버는 계속 켜진 채로 두는 방식을 택하고 있다.
// (정적 프론트 서빙·헬스체크 등은 DB 없이도 동작해야 하기 때문)
// ========================================================
const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  // MONGO_URI가 아예 없으면 연결 시도조차 하지 않고 바로 포기 (개발 환경에서 흔한 케이스)
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
// mongoose.connection은 전역 싱글턴 커넥션이라, 최초 연결(connectDB) 이후
// 네트워크 문제 등으로 끊기거나 에러가 나면 이 리스너들이 콘솔에 로그만 남긴다.
// (재연결 로직은 mongoose 드라이버 자체 기본 동작에 맡기고 있고, 여기서 별도 재시도는 하지 않음)
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB 연결이 끊어졌습니다.');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB 에러:', err.message);
});

module.exports = connectDB;