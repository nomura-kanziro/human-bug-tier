/* ====================================================================
 * JWT 저수준 유틸 — 서명·검증·Express 미들웨어의 실제 구현
 * ------------------------------------------------------------------
 * middleware/auth.js 는 이 파일의 requireAuth/optionalAuth를 그대로 재노출하고
 * 그 위에 requireAdmin(권한 체크)만 얹는 얇은 래퍼다. 즉 "토큰을 만들고
 * 검증하는 방법"은 전부 이 파일이 담당하고, middleware/auth.js는 라우트에
 * 붙이기 좋은 이름으로 다시 내보내는 역할만 한다.
 * ==================================================================== */
const jwt = require('jsonwebtoken');

// JWT 서명에 쓸 비밀키. JWT_SECRET이 없으면 개발용 기본값으로 폴백하는데,
// 운영(Render) 환경에서는 반드시 환경변수로 별도 설정해야 토큰 위조를 막을 수 있다.
function getJwtSecret() {
  return process.env.JWT_SECRET || 'human-bug-tier-dev-secret';
}

// 일반 회원 로그인 토큰 발급. payload에 isAdmin: false를 명시적으로 박아두어
// 이후 verifyToken() 결과만 보고도 관리자 여부를 판단할 수 있게 한다(요청마다 DB 조회 불필요).
// 만료는 7일 — 회원은 매번 재로그인하지 않아도 되도록 넉넉하게 설정.
function signUserToken(user) {
  return jwt.sign(
    {
      nickname: user.nickname,
      email: user.email || '',
      isAdmin: false,
      sub: String(user._id),
    },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
}

// 관리자 로그인 토큰 발급. isAdmin: true가 핵심이며, requireAdmin 미들웨어는
// 이 값 하나로 관리자 라우트 접근을 허용/거부한다. 회원 토큰(7일)보다 짧은
// 24시간으로 만료를 잡아, 관리자 세션이 탈취되었을 때의 위험 노출 시간을 줄인다.
function signAdminToken(admin) {
  return jwt.sign(
    {
      nickname: admin.name || '관리자',
      email: '',
      isAdmin: true,
      sub: String(admin._id),
    },
    getJwtSecret(),
    { expiresIn: '24h' },
  );
}

// 토큰 검증 + 디코딩. 서명이 틀리거나 만료됐으면 jwt.verify가 예외를 던지므로
// 호출부(optionalAuth/requireAuth)에서 try/catch로 감싸 처리한다.
function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

// Authorization 헤더에서 "Bearer <token>" 형식의 토큰 문자열만 추출한다.
// 헤더가 없거나 Bearer 스킴이 아니면 null을 반환해 비로그인 상태로 취급.
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

// 로그인 여부와 무관하게 통과시키되, 토큰이 유효하면 req.auth에 담아준다.
// 비회원도 볼 수 있지만 로그인 시 개인화된 정보(내 글 여부 등)를 보여줘야 하는
// 라우트(예: 목록 조회)에 사용 — 토큰이 없거나 깨져 있어도 절대 요청을 막지 않는다.
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.auth = verifyToken(token);
  } catch (err) {
    // 토큰이 손상/만료돼도 401로 막지 않고 비로그인 상태(req.auth = null)로 취급한다.
    req.auth = null;
  }
  return next();
}

// 로그인이 반드시 필요한 라우트를 보호한다. 토큰이 없거나 검증 실패 시
// 여기서 401 응답을 직접 보내고 next()를 호출하지 않으므로 이후 핸들러는 실행되지 않는다.
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  try {
    req.auth = verifyToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
}

// 현재 요청의 "행위자(글쓴이)" 정보를 한 곳에서 뽑아내는 헬퍼.
// 1순위: JWT로 로그인된 회원/관리자라면 req.auth(토큰 payload)를 신뢰.
// 2순위: 로그인 없이도 닉네임/이메일을 직접 입력해 작성할 수 있는 구(舊) 방식
//        (예: 비회원 댓글·문의)을 위해 요청 body의 author/nickname 필드로 폴백.
// 둘 다 없으면 작성자를 특정할 수 없으므로 null을 반환한다.
function getActor(req) {
  if (req.auth?.nickname) {
    return {
      nickname: String(req.auth.nickname).trim(),
      email: String(req.auth.email || '').trim().toLowerCase(),
      isAdmin: Boolean(req.auth.isAdmin),
    };
  }

  const body = req.body || {};
  const nickname = (body.author || body.nickname || '').trim();
  const email = (body.authorEmail || body.email || '').trim().toLowerCase();

  if (nickname) {
    return { nickname, email, isAdmin: false };
  }

  return null;
}

module.exports = {
  getJwtSecret,
  signUserToken,
  signAdminToken,
  verifyToken,
  extractToken,
  optionalAuth,
  requireAuth,
  getActor,
};