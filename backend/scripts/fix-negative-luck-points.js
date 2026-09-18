// ========================================================
// scripts/fix-negative-luck-points.js — LuckProfile.points 음수 보정
// ========================================================
// 컨트롤러에 0 하한(floor) 로직을 넣기 전에 이미 마이너스로 쌓인 기존 유저
// 포인트를 한 번만 0으로 올려주는 일회성 스크립트.
//   실행: node scripts/fix-negative-luck-points.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const LuckProfile = require('../models/LuckProfile');

async function run() {
  const connected = await connectDB();
  if (!connected) {
    console.error('DB 연결 실패 — MONGO_URI 확인 필요');
    process.exit(1);
  }

  const result = await LuckProfile.updateMany(
    { points: { $lt: 0 } },
    { $set: { points: 0 } },
  );

  console.log(`points < 0 인 프로필 ${result.matchedCount}건 중 ${result.modifiedCount}건을 0으로 보정했습니다.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
