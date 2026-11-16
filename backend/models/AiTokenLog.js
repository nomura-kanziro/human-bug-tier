const mongoose = require('mongoose');

/* ====== AiTokenLog 스키마 ======
 * 휴버토큰(AiTokenWallet.tokens) 증감 원장. 토큰이 바뀔 때마다 1건씩 남긴다(utils/aiTokens.js 한 곳을 거친다).
 *   signup_grant  지갑이 처음 만들어질 때의 기본 지급(+500)
 *   agent_run     에이전트 봇에서 Claude 모델 사용(−)
 *   refund        작업 실패·AI 해설 실패 시 환불(+)
 *   purchase      구매 신청을 관리자가 승인(+)
 *   sponsor       후원 확인을 관리자가 승인(+)
 *   admin_grant   관리자가 직접 지급·회수(±)
 * 대화 내용은 남기지 않는다 — detail 에는 "어떤 작업 · 어떤 모델 · effort" 같은 한 줄만 들어간다.
 */
const aiTokenLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: {
    type: String,
    enum: ['signup_grant', 'agent_run', 'refund', 'purchase', 'sponsor', 'admin_grant'],
    required: true,
  },
  delta: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  detail: { type: String, default: '' },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  timestamps: true,
});

aiTokenLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AiTokenLog', aiTokenLogSchema);
