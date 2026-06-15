const User = require('../models/User');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked } = require('../utils/checkBlocked');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 이메일 전송 설정 (Gmail 예시)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // 당신 Gmail 주소
    pass: process.env.EMAIL_APP_PASSWORD   // Gmail 앱 비밀번호
  }
});

// 회원가입
const register = async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    // 이메일 중복 체크
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 인증 토큰 생성
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const newUser = new User({
      email,
      password: hashedPassword,
      nickname,
      ip: getClientIp(req),
      verificationToken,
      verificationTokenExpires: Date.now() + 3600000 // 1시간
    });

    await newUser.save();

    // 인증 이메일 발송
    const verificationUrl = `http://localhost:5000/api/auth/verify/${verificationToken}`;

    await transporter.sendMail({
      from: '"휴먼버그티어" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'human-bug-tier 회원가입 인증 메일',
      html: `
        <h2>회원가입 인증</h2>
          
        <p style="margin-bottom: 20px; font-size: 15px; line-height: 1.6;">
          아래 버튼을 클릭하여 회원가입을 완료해주세요.
        </p>
          
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; 
                    padding: 14px 32px; 
                    background-color: #007bff; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-size: 16px; 
                    font-weight: bold;">
            가입 완료
          </a>
        </div>
          
        <p style="color: #666; font-size: 14px;">
          링크는 1시간 후에 만료됩니다.
        </p>
      `
    });

    res.status(201).json({ message: '인증 메일이 발송되었습니다. 메일을 확인해주세요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
  }
};

// 이메일 인증
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email, verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: '유효하지 않은 인증 링크입니다.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // 성공 페이지 또는 리다이렉트 (프론트엔드 로그인 페이지로)
    res.send(`
      <h2>회원가입이 완료되었습니다!</h2>
      <p>로그인 페이지로 이동합니다...</p>
      <script>
        setTimeout(() => {
          window.location.href = '/login.html';  // 실제 로그인 페이지 경로로 변경
        }, 2000);
      </script>
    `);
  } catch (err) {
    res.status(400).send('인증 링크가 만료되었거나 유효하지 않습니다.');
  }
};

module.exports = { register, verifyEmail };

// 로그인
const login = async (req, res) => {
  try {
    const { userId, password } = req.body; // userId = nickname

    // 아이디로 사용자 찾기
    const user = await User.findOne({ nickname: userId });

    if (!user) {
      return res.status(400).json({ error: '존재하지 않는 아이디입니다.' });
    }

    // 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    // 이메일 인증 여부 확인 (선택)
    if (!user.isVerified) {
      return res.status(403).json({ error: '이메일 인증이 완료되지 않았습니다.' });
    }

    const clientIp = getClientIp(req);
    const block = await isUserBlocked(user.nickname, clientIp);
    if (block) {
      return res.status(403).json({
        error: '관리자로 인해 차단당했습니다.',
        blocked: true,
        expiresAt: block.expiresAt,
      });
    }

    // 로그인 성공 (간단하게 user 정보 반환)
    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        nickname: user.nickname,
        email: user.email,
        _id: user._id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
};

module.exports = { register, verifyEmail, login };