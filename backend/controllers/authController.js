const crypto = require('crypto');
const User = require('../models/User');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked } = require('../utils/checkBlocked');
const { signUserToken, getJwtSecret } = require('../utils/jwtAuth');
const { getAppBaseUrl } = require('../utils/appUrl');
const {
  hasEmailConfig,
  sendAppMail,
  EMAIL_NOT_CONFIGURED_MSG,
  EMAIL_SEND_FAILED_MSG,
} = require('../utils/mail');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const RESET_TOKEN_TTL_MS = 3600000;

const GENERIC_EMAIL_MSG =
  '입력하신 정보가 등록되어 있다면 이메일로 안내를 발송했습니다. 메일이 없으면 스팸함을 확인하거나, 아이디·이메일이 가입 정보와 일치하는지 다시 확인해 주세요.';

function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** nickname 대소문자 무시 매칭 */
function nicknameQuery(nickname) {
  return { $regex: new RegExp(`^${escapeRegex(nickname.trim())}$`, 'i') };
}

async function findUserByResetToken(token) {
  return User.findOne({
    resetPasswordToken: hashResetToken(token),
    resetPasswordExpires: { $gt: Date.now() },
  });
}

/** 메일 기능 필수 엔드포인트: 미설정 시 가짜 성공 대신 503 */
function rejectIfEmailNotConfigured(res) {
  if (hasEmailConfig()) return false;
  res.status(503).json({
    error: EMAIL_NOT_CONFIGURED_MSG,
    code: 'EMAIL_NOT_CONFIGURED',
  });
  return true;
}

// 회원가입
const register = async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ email }, getJwtSecret(), { expiresIn: '1h' });

    const newUser = new User({
      email,
      password: hashedPassword,
      nickname,
      ip: getClientIp(req),
      verificationToken,
      verificationTokenExpires: Date.now() + 3600000,
    });

    await newUser.save();

    if (hasEmailConfig()) {
      const verificationUrl = `${getAppBaseUrl(req)}/api/auth/verify/${verificationToken}`;

      try {
        await sendAppMail({
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
          `,
        });
        res.status(201).json({ message: '인증 메일이 발송되었습니다. 메일을 확인해주세요.' });
      } catch (emailErr) {
        console.error('이메일 발송 실패:', emailErr.message || emailErr);
        res.status(201).json({
          message:
            '회원가입은 완료되었으나 인증 메일 발송에 실패했습니다. 관리자에게 문의해주세요.',
        });
      }
    } else {
      newUser.isVerified = true;
      newUser.verificationToken = undefined;
      newUser.verificationTokenExpires = undefined;
      await newUser.save();

      res.status(201).json({ message: '회원가입이 완료되었습니다. (이메일 인증 생략됨)' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
  }
};

// 이메일 인증
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findOne({ email: decoded.email, verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: '유효하지 않은 인증 링크입니다.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.send(`
      <h2>회원가입이 완료되었습니다!</h2>
      <p>로그인 페이지로 이동합니다...</p>
      <script>
        setTimeout(() => {
          window.location.href = '/user_login/login.html';
        }, 2000);
      </script>
    `);
  } catch (err) {
    res.status(400).send('인증 링크가 만료되었거나 유효하지 않습니다.');
  }
};

const login = async (req, res) => {
  try {
    const { userId, password } = req.body;

    const user = await User.findOne({ nickname: nicknameQuery(userId || '') });

    if (!user) {
      return res.status(400).json({ error: '존재하지 않는 아이디입니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

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

    const token = signUserToken(user);

    res.json({
      success: true,
      message: '로그인 성공',
      token,
      user: {
        nickname: user.nickname,
        email: user.email,
        _id: user._id,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
};

const findId = async (req, res) => {
  try {
    if (rejectIfEmailNotConfigured(res)) return;

    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: '이메일을 입력해주세요.' });
    }

    // 존재 여부는 응답에 드러내지 않음. 인증 완료 계정에만 발송.
    const user = await User.findOne({ email, isVerified: true });
    if (user) {
      try {
        await sendAppMail({
          to: email,
          subject: '아이디 찾기 안내',
          html: `<h2>아이디 찾기 결과</h2><p>회원님의 아이디는 <strong>${user.nickname}</strong> 입니다.</p>`,
        });
      } catch (emailErr) {
        console.error('아이디 찾기 메일 실패:', emailErr.message || emailErr);
        return res.status(502).json({
          error: EMAIL_SEND_FAILED_MSG,
          code: 'EMAIL_SEND_FAILED',
        });
      }
    }

    res.json({ success: true, message: GENERIC_EMAIL_MSG });
  } catch (err) {
    console.error('아이디 찾기 실패:', err);
    res.status(500).json({ error: '아이디 찾기 처리 중 오류가 발생했습니다.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    if (rejectIfEmailNotConfigured(res)) return;

    const nickname = (req.body?.nickname || req.body?.userId || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();

    if (!nickname || !email) {
      return res.status(400).json({ error: '아이디와 이메일을 모두 입력해주세요.' });
    }

    // 미인증 계정도 재설정 허용 (메일 수신 = 본인 확인). 재설정 성공 시 isVerified 처리.
    const user = await User.findOne({ nickname: nicknameQuery(nickname), email });
    if (user) {
      const resetToken = createResetToken();
      user.resetPasswordToken = hashResetToken(resetToken);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const resetUrl = `${getAppBaseUrl(req)}/user_login/reset_password.html?token=${resetToken}`;
      try {
        await sendAppMail({
          to: email,
          subject: '비밀번호 재설정 안내',
          html: `
            <h2>비밀번호 재설정</h2>
            <p>아래 버튼을 클릭해 새 비밀번호를 설정해주세요.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;">비밀번호 재설정</a>
            <p style="color:#666;font-size:14px;">링크는 1시간 후 만료됩니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.</p>`,
        });
      } catch (emailErr) {
        console.error('비밀번호 찾기 메일 실패:', emailErr.message || emailErr);
        // 발송 실패 시 토큰 무효화 (미사용 토큰 잔존 방지)
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save().catch(() => {});
        return res.status(502).json({
          error: EMAIL_SEND_FAILED_MSG,
          code: 'EMAIL_SEND_FAILED',
        });
      }
    }

    res.json({ success: true, message: GENERIC_EMAIL_MSG });
  } catch (err) {
    console.error('비밀번호 찾기 실패:', err);
    res.status(500).json({ error: '비밀번호 찾기 처리 중 오류가 발생했습니다.' });
  }
};

const validateResetToken = async (req, res) => {
  try {
    const token = (req.query?.token || '').trim();

    if (!token) {
      return res.status(400).json({ valid: false, error: '유효하지 않은 재설정 링크입니다.' });
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({
        valid: false,
        error: '만료되었거나 유효하지 않은 링크입니다. 비밀번호 찾기를 다시 시도해주세요.',
      });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('재설정 토큰 검증 실패:', err);
    res.status(400).json({ valid: false, error: '만료되었거나 유효하지 않은 링크입니다.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = (req.body?.token || '').trim();
    const password = (req.body?.password || '').trim();

    if (!token || !password) {
      return res.status(400).json({ error: '토큰과 새 비밀번호가 필요합니다.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    }

    const user = await findUserByResetToken(token);

    if (!user) {
      return res.status(400).json({
        error: '만료되었거나 유효하지 않은 링크입니다. 비밀번호 찾기를 다시 시도해주세요.',
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // 메일 링크로 본인 확인된 경우 미인증 계정도 로그인 가능하도록
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ success: true, message: '비밀번호가 변경되었습니다. 로그인해주세요.' });
  } catch (err) {
    console.error('비밀번호 재설정 실패:', err);
    res.status(400).json({ error: '비밀번호 재설정에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  findId,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
