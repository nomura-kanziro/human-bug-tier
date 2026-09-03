// ========================================================
// authController.js - 일반 회원 인증 컨트롤러
// ========================================================
// 담당 기능: 회원가입 / 이메일 인증 / 로그인 / 아이디 찾기 /
//           비밀번호 찾기(재설정 메일 발송) / 재설정 토큰 검증 / 비밀번호 재설정
//
// 인증 토큰 구조 (utils/jwtAuth.js):
//   - 이 컨트롤러가 로그인 시 발급하는 토큰은 signUserToken()으로 생성되며,
//     페이로드에 isAdmin:false 가 박혀 프론트에서 localStorage.authToken 으로 저장됨.
//   - 관리자 로그인(adminController.js)은 signAdminToken()을 써서 별도 발급하고
//     프론트는 이를 localStorage.adminAuthToken 으로 따로 저장한다.
//   - 두 토큰 모두 같은 JWT_SECRET으로 서명되지만, 페이로드의 isAdmin 값과
//     만료시간(유저 7일 / 관리자 24시간)으로 서로 구분된다. (완전히 다른 비밀키를
//     쓰는 게 아니라 "역할이 다른 토큰"이라는 점에 유의)
//
// 이메일 발송: 회원가입 인증 메일 / 아이디 찾기 메일 / 비밀번호 재설정 메일 모두
//   utils/mail.js 의 sendAppMail()에 위임한다. 해당 파일 내부에서 Brevo → Resend
//   → Gmail SMTP 순으로 다중 공급자 폴백을 처리하므로, 여기서는 성공/실패 여부만 보고
//   구체적인 발송 로직은 신경 쓰지 않는다.
// ========================================================
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

// 비밀번호 재설정 토큰의 유효 시간(1시간). 이 시간이 지나면 findUserByResetToken()이
// 더 이상 매칭시키지 않으므로 사실상 토큰이 만료된 것과 같다.
const RESET_TOKEN_TTL_MS = 3600000;

// 아이디 찾기 / 비밀번호 찾기 응답에 공통으로 쓰는 안내 문구.
// 실제로 계정이 존재하는지 여부를 응답에서 드러내지 않기 위해(계정 존재 여부 스캐닝 방지),
// 성공했든 해당 이메일의 계정이 없든 항상 같은 문구를 돌려준다.
const GENERIC_EMAIL_MSG =
  '입력하신 정보가 등록되어 있다면 이메일로 안내를 발송했습니다. 메일이 없으면 스팸함을 확인하거나, 아이디·이메일이 가입 정보와 일치하는지 다시 확인해 주세요.';

// 이메일 발송 실패 시 프론트/로그에 함께 보여줄 상세 사유를 한 줄로 합쳐준다.
// (mail.js가 던지는 에러 객체에 code / responseCode / providerDetail 중 존재하는 값만 이어붙임)
function emailFailDetail(emailErr) {
  return [emailErr.code, emailErr.responseCode, emailErr.providerDetail]
    .filter(Boolean)
    .join(' ');
}

// 비밀번호 재설정용 원본 토큰 생성. crypto.randomBytes로 추측 불가능한 랜덤 값을 만들고,
// 이 원본 토큰은 이메일 링크(쿼리스트링)로만 전달되며 DB에는 절대 평문으로 저장/로그되지 않는다.
function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 원본 토큰을 SHA-256으로 해시한 값. DB(User.resetPasswordToken)에는 이 해시값만 저장하고,
// 이후 사용자가 링크의 원본 토큰을 다시 보내오면 같은 해시를 계산해 대조하는 방식으로 검증한다.
// (DB가 유출되더라도 원본 토큰을 역산할 수 없도록 하기 위함)
function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// 사용자 입력값을 정규식 리터럴에 안전하게 끼워넣기 위한 이스케이프 처리
// (닉네임에 정규식 특수문자가 섞여 있어도 의도치 않은 패턴으로 해석되지 않도록 방지)
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** nickname 대소문자 무시 매칭 */
// 로그인 시 아이디(닉네임) 대소문자를 구분하지 않고 매칭하기 위한 쿼리 조건 생성기.
// 앞뒤 공백은 trim으로 제거하고, ^...$ 로 완전 일치만 허용(부분 일치로 다른 계정이
// 걸리지 않도록) + 'i' 플래그로 대소문자 무시.
function nicknameQuery(nickname) {
  return { $regex: new RegExp(`^${escapeRegex(nickname.trim())}$`, 'i') };
}

// 원본 토큰을 해시해 DB의 resetPasswordToken과 대조하고, 아직 만료(resetPasswordExpires)되지
// 않은 사용자만 찾아서 반환한다. 토큰이 틀렸거나 만료됐으면 null.
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

// ========================================================
// 회원가입 (POST /api/auth/register)
// ========================================================
// 처리 순서:
//   1. email 중복 체크 (이미 가입된 이메일이면 400)
//   2. 비밀번호 bcrypt 해시(salt rounds 10) + 이메일 인증용 JWT(verificationToken, 1시간 만료) 발급
//      - 이 JWT는 로그인 토큰(signUserToken)과는 별개로, verifyEmail()에서 링크 클릭 시에만 검증됨
//   3. User 문서 저장 (가입 시점 IP도 getClientIp()로 함께 기록)
//   4. 메일 설정(hasEmailConfig())이 되어 있으면 인증 링크 메일을 발송하고,
//      메일 설정이 안 되어 있으면 인증 절차를 생략하고 즉시 isVerified=true 로 가입 완료 처리
//
// 주의: 메일 발송이 실패하더라도(catch 블록) 이미 User는 저장이 끝난 상태이므로
//      회원가입 자체는 완료된 것으로 간주하고 HTTP 201을 그대로 응답한다.
//      (계정은 생성됐지만 인증 메일만 못 받은 상태 → 응답 message로 안내, detail에 실패 사유 포함)
//      이는 의도된 동작이며 버그가 아니다.
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
          detail: emailFailDetail(emailErr) || undefined,
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

// ========================================================
// 이메일 인증 (GET /api/auth/verify/:token)
// ========================================================
// 회원가입 메일의 "가입 완료" 버튼이 이 엔드포인트로 연결된다.
// URL 경로의 JWT(token)를 검증(서명/만료 확인)하고, 그 안의 email + 원본 token 문자열이
// User.verificationToken과 동일한 사용자를 찾아 isVerified 처리한다.
// jwt.verify가 만료/변조를 이유로 던지는 예외는 바깥 catch에서 잡아 400으로 응답.
// 성공 시에는 JSON이 아니라 안내 문구 + 자동 리다이렉트 스크립트가 담긴 HTML을 바로 응답한다
// (사용자가 메일의 링크를 브라우저로 직접 클릭해서 들어오는 흐름이기 때문).
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

// ========================================================
// 로그인 (POST /api/auth/login)
// ========================================================
// 처리 순서:
//   1. 요청의 userId(닉네임)로 대소문자 무시 완전 일치 검색 (nicknameQuery)
//   2. bcrypt.compare로 비밀번호 검증
//   3. isVerified 확인 - 이메일 인증을 아직 완료하지 않은 계정은 로그인 거부(403)
//   4. utils/checkBlocked.js의 isUserBlocked()로 닉네임/접속 IP 기준 차단 여부 확인
//      - 이 함수가 조회하는 Block 컬렉션은 blockController.js(관리자 차단 기능)가 추가/삭제한다.
//      - 차단 중이면 403 + 차단 만료 시각(expiresAt)을 함께 내려줘서 프론트가 안내할 수 있게 함
//   5. 통과하면 signUserToken()으로 일반 유저용 JWT 발급(7일 만료) 후 응답
//      - 관리자 로그인(adminController.login)과는 별도 토큰 체계이며, 프론트는 이 토큰을
//        localStorage.authToken 에 저장해 이후 요청의 Authorization 헤더로 사용한다.
// 각 실패 단계는 일부러 서로 다른 에러 메시지를 주는데, 이는 기존 동작을 그대로 유지한 것이며
// 여기서 임의로 통일하지 않았다(로직/응답 변경 금지 범위).
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

// ========================================================
// 아이디 찾기 (POST /api/auth/find-id)
// ========================================================
// 이메일 기능이 꺼져 있으면 rejectIfEmailNotConfigured()가 바로 503으로 막는다
// (이 엔드포인트는 메일이 필수 - 메일 없이는 아이디를 알려줄 방법이 없으므로).
// 입력받은 이메일로 "인증 완료된" 계정만 조회(isVerified: true) 후, 존재하면 닉네임을
// 담은 메일을 발송한다. 계정이 없거나 미인증이어도 에러를 내지 않고 그냥 메일을 안 보낼 뿐이며,
// 최종 응답은 항상 동일한 GENERIC_EMAIL_MSG로 통일해 "이 이메일로 가입된 계정이 있는지"를
// 응답만으로는 외부에서 유추할 수 없게 한다. (단, 메일 발송 자체가 실패한 경우는 502로 구분)
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
          detail: emailFailDetail(emailErr),
        });
      }
    }

    res.json({ success: true, message: GENERIC_EMAIL_MSG });
  } catch (err) {
    console.error('아이디 찾기 실패:', err);
    res.status(500).json({ error: '아이디 찾기 처리 중 오류가 발생했습니다.' });
  }
};

// ========================================================
// 비밀번호 찾기 - 재설정 메일 발송 (POST /api/auth/forgot-password)
// ========================================================
// 닉네임 + 이메일이 모두 정확히 일치하는 계정에만 재설정 메일을 보낸다(둘 중 하나만 맞으면 무시).
// 미인증(isVerified:false) 계정도 재설정을 허용하는데, 이는 "본인 소유 이메일로 재설정 메일을
// 받아 클릭하는 것" 자체를 본인 확인 수단으로 보기 때문이다(resetPassword에서 재설정 성공 시
// isVerified를 true로 바꿔줌).
// 토큰 처리: createResetToken()으로 원본 토큰 생성 → 해시만 DB(resetPasswordToken)에 저장,
// 원본은 이메일 링크(reset_password.html?token=...)에만 실려 나간다.
// 메일 발송이 실패하면 이미 저장해둔 토큰을 즉시 무효화(undefined 처리 후 재저장)하여
// "메일은 못 받았는데 유효한 재설정 토큰만 DB에 남아있는" 상태를 방지한다.
// 응답은 계정 존재 여부와 무관하게 항상 GENERIC_EMAIL_MSG (findId와 동일한 이유).
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
          detail: emailFailDetail(emailErr),
        });
      }
    }

    res.json({ success: true, message: GENERIC_EMAIL_MSG });
  } catch (err) {
    console.error('비밀번호 찾기 실패:', err);
    res.status(500).json({ error: '비밀번호 찾기 처리 중 오류가 발생했습니다.' });
  }
};

// ========================================================
// 재설정 토큰 유효성 검사 (GET /api/auth/validate-reset-token?token=...)
// ========================================================
// 사용자가 reset_password.html 페이지에 진입했을 때, 실제 새 비밀번호 폼을 보여주기 전에
// 먼저 이 토큰이 아직 유효한지(해시 일치 + 미만료) 확인하기 위한 용도.
// findUserByResetToken()과 동일한 검증 로직을 재사용하며, 비밀번호는 변경하지 않고
// { valid: true/false }만 응답한다.
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

// ========================================================
// 비밀번호 재설정 (POST /api/auth/reset-password)
// ========================================================
// 토큰(원본)과 새 비밀번호를 받아, findUserByResetToken()으로 다시 한 번 유효성을 검증한 뒤
// bcrypt로 새 비밀번호를 해시하여 저장한다. 사용한 재설정 토큰은 즉시 무효화(undefined)해서
// 같은 링크로 재사용할 수 없게 한다.
// 부가 효과: 재설정에 성공하면 isVerified를 true로 강제하고 (남아있을 수 있는) 회원가입
// 이메일 인증 토큰도 함께 정리한다 - forgotPassword 주석에서 설명한 것처럼, 메일로 받은
// 재설정 링크를 클릭한 것 자체를 본인 인증으로 간주하기 때문.
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
