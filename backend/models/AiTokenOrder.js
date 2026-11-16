const mongoose = require('mongoose');

/* ====== AiTokenOrder 스키마 ======
 * 휴버토큰 충전 신청. 사이트에 결제 대행(PG)이 없어서 "신청 → 관리자가 입금·후원을 확인하고 승인 → 적립" 순서로 처리한다.
 *   kind    : 'purchase'(토큰 묶음 구매 신청) | 'sponsor'(후원했으니 토큰을 달라는 신청)
 *   packId  : 구매 신청일 때 고른 묶음(utils/aiTokens.js TOKEN_PACKS). 후원 신청은 빈 값.
 *   tokens  : 적립할 토큰 수. 구매는 묶음의 값, 후원은 관리자가 승인할 때 정한다(신청 시 0).
 *   price   : 구매 묶음의 가격(원). 후원은 신청자가 적은 금액(참고용).
 *   memo    : 신청자가 적는 확인용 한 줄(입금자명·후원 닉네임 등). 계좌번호·카드번호 같은 결제 정보는 받지 않는다.
 *   status  : pending → approved | rejected. 승인되는 순간 토큰이 적립되고 원장(AiTokenLog)에 남는다.
 */
const aiTokenOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, default: '' },
  kind: { type: String, enum: ['purchase', 'sponsor'], required: true },
  packId: { type: String, default: '' },
  tokens: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  memo: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
  processedBy: { type: String, default: '' },
  processedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

aiTokenOrderSchema.index({ status: 1, createdAt: -1 });
aiTokenOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AiTokenOrder', aiTokenOrderSchema);
