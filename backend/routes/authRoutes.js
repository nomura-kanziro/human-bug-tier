// ========================================================
// routes/authRoutes.js - 회원 인증 API 라우터 (/api/auth)
// ========================================================
// 전부 공개(비로그인) 엔드포인트다 — 로그인 전 단계의 기능들이므로 인증 미들웨어가 없다.
// 여기서 발급되는 JWT(signUserToken, authController.login)는 관리자 토큰과는
// 별개 체계로, payload의 isAdmin이 항상 false로 서명되어 관리자 전용 라우트를
// 통과할 수 없다.
// ========================================================
const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  findId,
  forgotPassword,
  validateResetToken,
  resetPassword,
} = require('../controllers/authController');

// 회원가입 — 이메일 발송이 설정돼 있으면 인증 메일을 보내고 isVerified=false로 대기,
// 미설정 환경이면 바로 isVerified=true로 가입 완료 처리한다.
router.post('/register', register);
// 가입 메일의 인증 링크 클릭 시 호출 (JWT 형태의 verificationToken, 1시간 유효) → isVerified=true 전환
router.get('/verify/:token', verifyEmail);
// 로그인 — 아이디/비번 검증 + 이메일 인증 여부 + 차단(Block) 여부까지 확인 후 사용자 JWT 발급
router.post('/login', login);
// 아이디 찾기 — 이메일로 가입된 닉네임을 메일 발송. 계정 존재 여부는 응답 메시지로 드러내지 않음(계정 존재 유추 방지)
router.post('/find-id', findId);
// 비밀번호 재설정 요청 — 랜덤 토큰을 생성해 SHA-256 해시만 DB에 저장하고,
// 원본 토큰이 담긴 링크만 메일로 발송한다(원본 토큰은 서버에 절대 남기지 않음). 유효기간 1시간.
router.post('/forgot-password', forgotPassword);
// 재설정 페이지 진입 시 URL의 토큰이 아직 유효한지(해시 일치 + 만료 전) 사전 확인
router.get('/validate-reset-token', validateResetToken);
// 실제 비밀번호 변경 — 토큰 재검증 후 새 비번 해시 저장, 재설정 토큰은 즉시 폐기(1회성)
router.post('/reset-password', resetPassword);

module.exports = router;