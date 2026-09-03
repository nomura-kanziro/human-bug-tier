const mongoose = require('mongoose');

/* ====== User 스키마 ======
 * 일반 회원 계정. 관리자 계정(Admin.js)과는 완전히 분리된 별도 컬렉션/로그인 체계이며,
 * 프론트에서도 authToken(회원)과 adminAuthToken(관리자)을 서로 다른 저장소 키로 관리한다.
 */
const userSchema = new mongoose.Schema({
  // 로그인 아이디 역할. lowercase로 정규화해 대소문자 차이로 중복 가입/조회 실패가
  // 생기지 않게 하고, unique 인덱스로 동일 이메일 중복 가입을 DB 레벨에서 차단.
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  // 해시된 비밀번호(컨트롤러에서 해시 후 저장). 평문 저장 금지.
  password: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    required: true,
    trim: true
  },
  // 가입 당시 IP(악용/신고 대응, 관리자 차단 기능에서 IP 기준 차단 시 참고용).
  ip: {
    type: String,
    default: 'unknown'
  },
  // 이메일 인증 완료 여부. 회원가입 직후 false로 시작해 verificationToken 검증 성공 시 true로 전환.
  isVerified: {
    type: Boolean,
    default: false
  },
  // 이메일 인증용 토큰. authController에서 JWT(1시간 만료)를 그대로 저장했다가
  // 이메일 링크 클릭 시 해당 JWT를 검증 + DB에 저장된 값과 대조하는 방식으로 쓰인다.
  // (아래 resetPasswordToken과 달리 해시하지 않고 원본 토큰 문자열을 그대로 저장)
  verificationToken: String,
  verificationTokenExpires: Date,
  // 비밀번호 재설정 토큰. CLAUDE.md 방침대로 랜덤 토큰 원본은 이메일로만 전달하고,
  // DB에는 SHA-256 해시값만 저장한다(authController.hashResetToken).
  // 재설정 요청 시 사용자가 이메일에서 받은 원본 토큰을 다시 해시해 이 값과 비교하므로,
  // DB가 유출되더라도 원본 토큰(=비밀번호 재설정 권한)을 복구할 수 없다.
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // 헤더 알림의 카테고리별 수신 on/off 설정. Admin.notificationSettings와 동일한 구조로
  // 맞춰, notificationService가 회원/관리자를 구분하지 않고 같은 로직으로 설정을 조회한다.
  notificationSettings: {
    enabled: { type: Boolean, default: true },     // 전체 알림 on/off
    tierBoard: { type: Boolean, default: true },    // 커스텀 티어 게시판 관련 알림
    inquiry: { type: Boolean, default: true },      // 문의 관련 알림
    noticeNews: { type: Boolean, default: true },   // 공지/뉴스 관련 알림
  },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
module.exports = User;