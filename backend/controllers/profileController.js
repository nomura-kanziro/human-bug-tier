/* ======================================================================
 * 프로필 컨트롤러 — 닉네임 변경 (POST /api/profile/nickname)
 * ----------------------------------------------------------------------
 * 이 사이트에서 닉네임은 세 가지 역할을 동시에 한다.
 *   1) 로그인 아이디(authController.login 이 닉네임으로 계정을 찾는다)
 *   2) 게시글·댓글·문의·알림·뽑기 이력에 "문자열로 복사돼" 남는 표시 이름
 *   3) 관리자 차단(Block) 대상 값
 * 그래서 User.nickname 한 칸만 바꾸면 내 글이 "내가 쓴 글"에서 사라지고, 알림이 끊기고,
 * 차단을 닉네임 바꿔 피하는 일이 생긴다. 이 컨트롤러는 그걸 막기 위해 다음을 한다.
 *   - 검증: 길이·문자 규칙, 대소문자 무시 중복(회원 + 관리자 이름), 예약어, 차단 여부, 7일 쿨다운
 *   - 전파: 이 회원이 쓴 글/댓글/알림/문의/뽑기 이력의 닉네임 복사본을 새 이름으로 갱신
 *   - 토큰: JWT 에 닉네임이 박혀 있으므로 새 토큰을 발급(다른 기기의 옛 토큰은
 *           utils/jwtAuth.requireAuth 가 401 NICKNAME_CHANGED 로 거부한다)
 *
 * 관리자 계정은 Admin 컬렉션의 별개 체계라 여기서 바꾸지 않는다(403).
 * ====================================================================== */
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');
const TierList = require('../models/TierList');
const TierPostComment = require('../models/TierPostComment');
const Notification = require('../models/Notification');
const Inquiry = require('../models/Inquiry');
const LuckDraw = require('../models/LuckDraw');
const EventMemorySession = require('../models/EventMemorySession');
const EventShowcaseEntry = require('../models/EventShowcaseEntry');
const EventShowcaseVote = require('../models/EventShowcaseVote');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked, findActiveBlock } = require('../utils/checkBlocked');
const { signUserToken } = require('../utils/jwtAuth');

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;
// 글자(한글·영문 등)·숫자·밑줄·하이픈·점만 허용. 공백과 '@' 는 게시판 검색("@닉네임")과
// 로그인 입력을 헷갈리게 하므로 뺀다.
const NICKNAME_PATTERN = /^[\p{L}\p{N}_.-]+$/u;
// 운영진으로 오해받을 수 있는 이름 — 이미 쓰는 사람이 없어도 새로 쓰지 못하게 막는다.
const RESERVED_NICKNAMES = ['관리자', '운영자', '운영진', 'admin', 'administrator', 'moderator'];
// 닉네임 변경은 7일에 한 번. 신고·차단 이력 추적을 어렵게 하는 잦은 개명을 막는다.
const NICKNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 대소문자 무시 완전 일치 조건(authController.nicknameQuery 와 같은 규칙).
function nicknameQuery(nickname) {
  return { $regex: new RegExp(`^${escapeRegex(nickname)}$`, 'i') };
}

// 새 닉네임 형식 검사. 통과하면 null, 아니면 사용자에게 보여줄 문구.
function validateNicknameFormat(nickname) {
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해주세요.`;
  }
  if (!NICKNAME_PATTERN.test(nickname)) {
    return '닉네임에는 한글·영문·숫자와 _ - . 만 쓸 수 있어요(공백·@ 불가).';
  }
  if (RESERVED_NICKNAMES.includes(nickname.toLowerCase())) {
    return '사용할 수 없는 닉네임입니다.';
  }
  return null;
}

// 옛 닉네임으로 남아 있던 복사본을 새 닉네임으로 바꾼다.
// 이메일이 있는 기록은 이메일로만 "내 것"을 확정하고(닉네임이 같은 다른 사람 것을 건드리지 않도록),
// 이메일이 없는 옛 기록만 닉네임 문자열로 대신 찾는다 — ownership.isSameAuthor 와 같은 기준이다.
async function propagateNickname({ userId, email, oldNickname, newNickname }) {
  const blankEmail = { $in: ['', null] };
  const ownedByEmailOrLegacy = [{ authorEmail: email }, { author: oldNickname, authorEmail: blankEmail }];

  await Promise.all([
    TierList.updateMany({ $or: ownedByEmailOrLegacy }, { $set: { author: newNickname } }),
    TierPostComment.updateMany({ $or: ownedByEmailOrLegacy }, { $set: { author: newNickname } }),
    LuckDraw.updateMany({ userId }, { $set: { nickname: newNickname } }),
    // 이벤트: 메모리 게임 기록, 티어표 공개 출품작·투표에 찍힌 표시용 닉네임(알림 수신자를 닉네임으로 찾기 때문에 꼭 맞춰야 한다)
    EventMemorySession.updateMany({ userId }, { $set: { nickname: newNickname } }),
    EventShowcaseEntry.updateMany({ userId }, { $set: { nickname: newNickname } }),
    EventShowcaseVote.updateMany({ voterId: userId }, { $set: { voterNickname: newNickname } }),
    // 알림: 내가 받은 알림의 수신자 이름 + 내가 유발한 알림에 찍힌 행위자 이름.
    // 행위자 쪽은 이메일 없이 표시용 이름만 저장돼 있어 닉네임 일치로만 찾는다.
    Notification.updateMany(
      { recipientNickname: oldNickname, recipientEmail: { $in: ['', null, email] } },
      { $set: { recipientNickname: newNickname } },
    ),
    Notification.updateMany({ actorNickname: oldNickname }, { $set: { actorNickname: newNickname } }),
    // 문의: 내가 쓴 문의(관리자 대필 제외) + 그 안의 내 재문의/인용 표기.
    // 관리자 답변(isAdmin)은 이름이 우연히 같아도 건드리지 않는다.
    Inquiry.updateMany({ userId: oldNickname, isAdmin: false }, { $set: { userId: newNickname } }),
    Inquiry.updateMany(
      { 'answers.userId': oldNickname },
      { $set: { 'answers.$[mine].userId': newNickname } },
      { arrayFilters: [{ 'mine.userId': oldNickname, 'mine.isAdmin': false }] },
    ),
    Inquiry.updateMany(
      { 'answers.quotedUser': oldNickname },
      { $set: { 'answers.$[q].quotedUser': newNickname } },
      { arrayFilters: [{ 'q.quotedUser': oldNickname }] },
    ),
  ]);
}

// POST /api/profile/nickname  { nickname }
const changeNickname = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }
    if (req.auth?.isAdmin) {
      return res.status(403).json({ error: '관리자 이름은 여기서 바꿀 수 없습니다.' });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ error: '계정을 찾을 수 없습니다.' });
    }

    const next = String(req.body?.nickname ?? '').trim();
    const formatError = validateNicknameFormat(next);
    if (formatError) return res.status(400).json({ error: formatError });

    const current = user.nickname;
    if (next === current) {
      return res.status(400).json({ error: '현재 닉네임과 같습니다.' });
    }

    // 쿨다운 — 대소문자만 고치는 경우도 개명 1회로 센다.
    const lastChangedAt = user.nicknameChangedAt ? user.nicknameChangedAt.getTime() : 0;
    const nextChangeAt = lastChangedAt + NICKNAME_CHANGE_COOLDOWN_MS;
    if (lastChangedAt && Date.now() < nextChangeAt) {
      return res.status(429).json({
        error: `닉네임은 7일에 한 번만 바꿀 수 있어요. ${new Date(nextChangeAt).toLocaleDateString('ko-KR')} 이후에 다시 시도해주세요.`,
        code: 'NICKNAME_COOLDOWN',
        nextChangeAt: new Date(nextChangeAt).toISOString(),
      });
    }

    // 제재 중인 계정은 닉네임을 바꿔 차단(닉네임 기준)을 피할 수 없다.
    if (await isUserBlocked(current, getClientIp(req))) {
      return res.status(403).json({ error: '이용이 제한된 계정은 닉네임을 바꿀 수 없습니다.' });
    }
    // 이미 차단된 값(닉네임)을 새 이름으로 가져가면 본인이 로그인 불가가 되므로 막는다.
    if (await findActiveBlock(next)) {
      return res.status(400).json({ error: '사용할 수 없는 닉네임입니다.' });
    }

    // 대소문자 무시 중복 — 다른 회원 + 관리자 표시 이름까지 확인(관리자 사칭 방지).
    // 내 옛 닉네임과 대소문자만 다른 경우(예: abc → Abc)는 본인이라 통과시킨다.
    const [takenByUser, takenByAdmin] = await Promise.all([
      User.findOne({ _id: { $ne: user._id }, nickname: nicknameQuery(next) }).select('_id').lean(),
      Admin.findOne({ name: nicknameQuery(next) }).select('_id').lean(),
    ]);
    if (takenByUser || takenByAdmin) {
      return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
    }

    const email = (user.email || '').trim().toLowerCase();
    user.nickname = next;
    user.nicknameChangedAt = new Date();
    await user.save();

    // 계정(원본)은 이미 바뀐 상태다. 복사본 갱신이 일부 실패해도 소유권 판정은 이메일 기준이라
    // 깨지지 않으므로 개명 자체는 성공으로 돌려주고, 실패는 로그로 남겨 재처리할 수 있게 한다.
    let propagated = true;
    try {
      await propagateNickname({ userId: user._id, email, oldNickname: current, newNickname: next });
    } catch (err) {
      propagated = false;
      console.error(`닉네임 변경 후 복사본 갱신 실패 (${current} → ${next}):`, err);
    }

    res.json({
      ok: true,
      propagated,
      token: signUserToken(user),
      user: { nickname: user.nickname, email: user.email, _id: user._id },
      nextChangeAt: new Date(user.nicknameChangedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_MS).toISOString(),
    });
  } catch (err) {
    console.error('닉네임 변경 에러:', err);
    res.status(500).json({ error: '닉네임 변경에 실패했습니다.' });
  }
};

module.exports = { changeNickname };
