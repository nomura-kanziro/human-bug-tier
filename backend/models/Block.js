const mongoose = require('mongoose');

/* ====== Block 스키마 ======
 * 관리자가 특정 유저 아이디 또는 IP를 일정 기간 차단할 때 생성되는 레코드.
 * 게시판/댓글/문의 등에서 신고가 누적된 사용자를 관리자가 수동으로 차단할 때 사용된다.
 */
const blockSchema = new mongoose.Schema({
  // 차단 대상 값. type이 'userId'면 닉네임/아이디, 'ip'면 IP 문자열이 들어간다.
  value: { type: String, required: true, trim: true },
  // 차단 기준 종류. 기본값은 'userId'(계정 단위 차단), IP 차단도 지원.
  type: { type: String, enum: ['userId', 'ip'], default: 'userId' },
  // 관리자가 입력하는 차단 사유(선택 입력, 미입력 시 빈 문자열).
  reason: { type: String, default: '' },
  // 차단 기간(일). 최소 1일 ~ 최대 9999일(사실상 영구 차단도 가능하게 넉넉히 열어둠).
  durationDays: { type: Number, required: true, min: 1, max: 9999 },
  // 차단 시작 시각. 기본값은 생성 시점(Date.now)이며, 아래 expiresAt 계산의 기준이 된다.
  blockedAt: { type: Date, default: Date.now },
  // 차단 만료 시각(blockedAt + durationDays로 컨트롤러에서 계산해 저장).
  // 만료 여부 판정(현재 시각과 비교)에 사용되는 값이라 required.
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// value(차단 대상)당 하나의 차단 레코드만 존재하도록 unique 인덱스.
// 동일 유저/IP에 대한 차단이 중복 생성되지 않게 막고, 값으로 바로 조회할 수 있게 한다.
blockSchema.index({ value: 1 }, { unique: true });

const Block = mongoose.model('Block', blockSchema);
module.exports = Block;