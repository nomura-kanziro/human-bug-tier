const mongoose = require('mongoose');

/* ====== Admin 스키마 ======
 * 관리자 계정 전용 컬렉션. User(일반 회원)와 완전히 분리된 별도 컬렉션이다.
 * - 관리자 권한은 User 문서의 role 플래그가 아니라, 아예 다른 로그인 체계를 사용한다.
 * - 프론트에서도 일반 회원은 authToken(localStorage), 관리자는 adminAuthToken을 별도로
 *   발급/저장하며, 서버 미들웨어도 requireAdmin으로 완전히 분리해서 검증한다.
 * - 이렇게 분리해 둔 이유: 관리자 권한 탈취/오작동이 일반 회원 인증 로직에 영향을
 *   주지 않도록 하기 위함(공격 표면 최소화 + 코드상 실수로 role 체크를 빼먹는 사고 방지).
 */
const adminSchema = new mongoose.Schema({
  // 관리자 로그인 아이디. 회원의 email과 달리 이메일 형식이 아닌 별도의 관리자 ID.
  // unique 제약으로 동일 아이디의 관리자 계정 중복 생성을 DB 레벨에서 차단.
  loginId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  // 해시된 비밀번호(로그인 컨트롤러에서 해시 처리 후 저장). 평문 저장 금지.
  password: {
    type: String,
    required: true,
  },
  // 관리자 표시 이름. 지정하지 않으면 '관리자'로 표기(공지/문의 답변 등에 노출되는 이름).
  name: {
    type: String,
    default: '관리자',
    trim: true,
  },
  // 관리자 본인이 받을 알림(헤더 알림)의 카테고리별 on/off 설정.
  // User 스키마의 notificationSettings와 동일한 구조를 그대로 사용해
  // 알림 발송 로직(notificationService)을 회원/관리자 구분 없이 재사용할 수 있게 한다.
  notificationSettings: {
    enabled: { type: Boolean, default: true },     // 전체 알림 on/off
    tierBoard: { type: Boolean, default: true },    // 커스텀 티어 게시판 관련 알림
    inquiry: { type: Boolean, default: true },      // 문의 관련 알림
    noticeNews: { type: Boolean, default: true },   // 공지/뉴스 관련 알림
  },
}, {
  timestamps: true, // createdAt / updatedAt 자동 기록
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;