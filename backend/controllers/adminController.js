// ========================================================
// adminController.js - 관리자 계정/로그인/회원 관리 컨트롤러
// ========================================================
// 담당 기능:
//   1. seedAdmin() - 서버 부팅 시 .env의 관리자 계정 정보로 최초 1회 Admin 문서 생성
//   2. login()     - 관리자 전용 로그인 (일반 유저 로그인과 완전히 별도의 Admin 컬렉션/토큰)
//   3. getUsers()  - 관리자 대시보드용 전체 회원 목록 조회
//   4. deleteUser()- 회원 탈퇴 처리 시 해당 유저와 관련된 모든 데이터를 연쇄 삭제
//
// 인증 토큰: signAdminToken()으로 발급한 JWT는 페이로드에 isAdmin:true가 들어가며,
//   일반 유저 토큰(authController.signUserToken, 7일 만료)과 달리 24시간 만료로 짧게 잡혀 있다.
//   프론트는 이 토큰을 localStorage.adminAuthToken 으로 별도 저장하고, 관리자 전용 API는
//   서버 미들웨어 requireAdmin(라우트 계층, 이 파일 밖)에서 isAdmin 클레임을 검사해 보호한다.
// ========================================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Block = require('../models/Block');
const Inquiry = require('../models/Inquiry');
const Notification = require('../models/Notification');
const TierList = require('../models/TierList');
const TierPostComment = require('../models/TierPostComment');
const TierLike = require('../models/TierLike');
const { signAdminToken } = require('../utils/jwtAuth');

// ========================================================
// 관리자 계정 시딩 (서버 부팅 시 1회 호출)
// ========================================================
// .env의 ADMIN_INPUT_ID / ADMIN_INPUT_PW가 없으면 관리자 계정을 만들지 않고 경고만 출력.
// 이미 같은 loginId의 Admin 문서가 있으면 아무것도 하지 않음(중복 생성 방지, 비밀번호도
// 갱신하지 않음 - 이미 존재하면 완전히 스킵). 없을 때만 bcrypt 해시 후 새로 생성한다.
const seedAdmin = async () => {
  const loginId = process.env.ADMIN_INPUT_ID;
  const password = process.env.ADMIN_INPUT_PW;

  if (!loginId || !password) {
    console.warn('⚠️  ADMIN_INPUT_ID 또는 ADMIN_INPUT_PW가 없어 관리자 계정을 생성하지 않습니다.');
    return;
  }

  const existing = await Admin.findOne({ loginId });
  if (existing) return;

  const hashedPassword = await bcrypt.hash(password, 10);
  await Admin.create({
    loginId,
    password: hashedPassword,
    name: process.env.ADMIN_NAME || '관리자',
  });

  console.log('✅ 기본 관리자 계정이 DB에 생성되었습니다.');
};

// ========================================================
// 관리자 로그인 (POST /api/admin/login)
// ========================================================
// 일반 회원 로그인(authController.login)과는 완전히 별도의 흐름 - Admin 컬렉션에서
// loginId로 조회하고 bcrypt.compare로 비밀번호를 검증한다. 회원 로그인과 달리 이메일 인증이나
// 차단(Block) 체크는 하지 않는다(관리자 계정에는 해당 개념이 없음).
// 성공 시 signAdminToken()으로 관리자 전용 JWT(24시간 만료, isAdmin:true)를 발급해 응답하며,
// 응답의 admin.ip는 실제 저장 없이 요청 시점의 req.ip를 그대로 실어 보여주는 값이다.
const login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 모두 입력해주세요.' });
    }

    const admin = await Admin.findOne({ loginId: loginId.trim() });
    if (!admin) {
      return res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
    }

    const token = signAdminToken(admin);

    res.json({
      success: true,
      message: '관리자 로그인 성공',
      token,
      admin: {
        name: admin.name,
        loginId: admin.loginId,
        ip: req.ip || 'unknown',
      },
    });
  } catch (err) {
    console.error('관리자 로그인 에러:', err);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
};

// ========================================================
// 전체 회원 목록 조회 (GET /api/admin/users) - 관리자 대시보드용
// ========================================================
// 비밀번호 등 민감 필드는 제외하고 nickname/email/ip/isVerified/createdAt만 select해서 반환.
// 최신 가입자가 위로 오도록 createdAt 내림차순 정렬.
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('nickname email ip isVerified createdAt')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error('사용자 목록 조회 에러:', err);
    res.status(500).json({ error: '사용자 목록 조회 실패' });
  }
};

// ========================================================
// 회원 삭제 (DELETE /api/admin/users/:id) - 연쇄 삭제(cascade) 포함
// ========================================================
// 단순히 User 문서 하나만 지우면 다른 컬렉션에 그 유저가 남긴 흔적(게시글/댓글/좋아요/알림/
// 문의/차단기록)이 고아 데이터로 남기 때문에, 아래 순서로 관련 데이터를 함께 정리한다.
// 매칭은 nickname과 email(소문자 정규화) 두 축으로 이루어지며, 필드가 비어있으면 해당 조건은
// 쿼리에서 아예 제외한다(빈 문자열로 매칭되는 걸 방지).
//
//   1. 대상 id 유효성 검사 후 User 조회 (없으면 404)
//   2. 이 유저가 작성한 커스텀 티어 게시글(TierList)을 author/authorEmail 기준으로 먼저 찾아
//      postIds를 확보 (아래 댓글/좋아요 삭제에서 "이 유저 글에 달린 댓글/좋아요"까지 지우기 위함)
//   3. 댓글(TierPostComment) 삭제: 이 유저가 쓴 댓글이거나, 이 유저 게시글에 달린 댓글
//   4. 좋아요(TierLike) 삭제: voterKey가 "email:{email}" 또는 "nick:{nickname}" 형식으로
//      저장되는 것을 이용해 이 유저가 누른 좋아요이거나, 이 유저 게시글에 달린 좋아요
//   5. 위에서 찾은 게시글(TierList) 자체를 삭제
//   6. 알림(Notification) 삭제: 이 유저가 수신자(recipientNickname/recipientEmail)이거나
//      행위자(actorNickname, 예: 이 유저가 좋아요/댓글을 눌러서 발생한 알림)인 것 모두 삭제
//   7. nickname이 있을 때만: 이 유저를 대상으로 한 차단 기록(Block, type:'userId') 삭제,
//      이 유저가 작성한 문의(Inquiry) 삭제, 다른 문의글에 이 유저가 단 답변(answers 배열 내
//      해당 항목)만 $pull로 제거(문의글 자체는 남김)
//   8. 마지막으로 User 문서 자체를 삭제
//
// 각 삭제 단계는 매칭 조건 배열이 비어있으면($or 조건이 하나도 없으면) 쿼리를 아예 실행하지
// 않도록 방어되어 있다(예: 게시글이 하나도 없으면 댓글/좋아요 postIds 조건 자체가 안 붙음).
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: '올바르지 않은 사용자입니다.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const nickname = (user.nickname || '').trim();
    const email = (user.email || '').trim().toLowerCase();

    const postQuery = [];
    if (nickname) postQuery.push({ author: nickname });
    if (email) postQuery.push({ authorEmail: email });
    const posts = postQuery.length
      ? await TierList.find({ $or: postQuery }).select('_id')
      : [];
    const postIds = posts.map((post) => post._id);

    const commentFilter = [];
    if (nickname) commentFilter.push({ author: nickname });
    if (email) commentFilter.push({ authorEmail: email });
    if (postIds.length) commentFilter.push({ tierListId: { $in: postIds } });
    if (commentFilter.length) {
      await TierPostComment.deleteMany({ $or: commentFilter });
    }

    const likeFilter = [];
    if (email) likeFilter.push({ voterKey: `email:${email}` });
    if (nickname) likeFilter.push({ voterKey: `nick:${nickname}` });
    if (postIds.length) likeFilter.push({ tierListId: { $in: postIds } });
    if (likeFilter.length) {
      await TierLike.deleteMany({ $or: likeFilter });
    }

    if (postIds.length) {
      await TierList.deleteMany({ _id: { $in: postIds } });
    }

    const notificationFilter = [];
    if (nickname) {
      notificationFilter.push({ recipientNickname: nickname }, { actorNickname: nickname });
    }
    if (email) notificationFilter.push({ recipientEmail: email });
    if (notificationFilter.length) {
      await Notification.deleteMany({ $or: notificationFilter });
    }

    if (nickname) {
      await Block.deleteMany({ type: 'userId', value: nickname });
      await Inquiry.deleteMany({ userId: nickname });
      await Inquiry.updateMany(
        { 'answers.userId': nickname },
        { $pull: { answers: { userId: nickname } } }
      );
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    console.error('사용자 삭제 에러:', err);
    res.status(500).json({ error: '사용자 삭제 실패' });
  }
};

module.exports = { seedAdmin, login, getUsers, deleteUser };