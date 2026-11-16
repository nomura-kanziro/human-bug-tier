const mongoose = require('mongoose');

/* ====== AiTokenWallet 스키마 ======
 * "휴버토큰" 지갑 — 에이전트 봇에서 Claude 모델을 쓸 때 드는 AI 전용 포인트.
 * 행운 뽑기 포인트(LuckProfile.points)와는 완전히 다른 지갑이다(서로 바꿀 수 없다).
 *   - tokens      : 지금 가진 휴버토큰. 지갑이 처음 만들어질 때 기본 500 을 준다(utils/aiTokens.js DEFAULT_TOKENS).
 *   - freeDate    : 무료 엔진(Ollama) 하루 횟수를 센 날짜(KST 'YYYY-MM-DD'). 오늘과 다르면 freeCount 를 0 으로 본다.
 *   - freeCount   : 그 날짜에 무료 엔진으로 실행한 작업 수(하루 한도 FREE_DAILY_LIMIT).
 * 증감 내역은 AiTokenLog(원장)에 남는다. 유저 1명당 지갑 1개(unique).
 */
const aiTokenWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  tokens: { type: Number, default: 0 },
  freeDate: { type: String, default: '' },
  freeCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AiTokenWallet', aiTokenWalletSchema);
