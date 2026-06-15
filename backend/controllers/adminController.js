const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const User = require('../models/User');

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

    res.json({
      success: true,
      message: '관리자 로그인 성공',
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

module.exports = { seedAdmin, login, getUsers };