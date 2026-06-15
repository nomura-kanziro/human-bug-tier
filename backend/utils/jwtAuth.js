const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'human-bug-tier-dev-secret';
}

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

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.auth = verifyToken(token);
  } catch (err) {
    req.auth = null;
  }
  return next();
}

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
  signUserToken,
  signAdminToken,
  verifyToken,
  extractToken,
  optionalAuth,
  requireAuth,
  getActor,
};