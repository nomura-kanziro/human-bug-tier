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