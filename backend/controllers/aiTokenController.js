/* ====================================================================
 * controllers/aiTokenController.js — 휴버토큰 지갑 · 충전 신청 · 관리자 승인
 * ------------------------------------------------------------------
 * 휴버토큰은 에이전트 봇에서 Claude 모델을 쓸 때 드는 AI 전용 포인트다(요금표·지갑 처리는 utils/aiTokens.js).
 * 기본 500 을 주고, 더 필요하면 "구매 신청"이나 "후원 신청"을 넣는다. 사이트에 결제 대행(PG)이 없어서
 * 신청은 대기 상태로 쌓이고, 관리자가 입금·후원을 확인한 뒤 승인하면 그때 적립된다.
 *
 * 회원용   (/api/ai/tokens, requireAuth)
 *   GET  /            내 지갑(잔액·오늘 무료 횟수) · 최근 원장 · 내 신청 · 묶음 목록 · 안내 문구
 *   POST /orders      충전 신청 { kind: 'purchase'|'sponsor', packId?, amount?, memo }
 * 관리자용 (/api/admin/ai-tokens, requireAdmin)
 *   GET  /orders?status=pending|approved|rejected|all
 *   POST /orders/:id/approve { tokens?, note? }   승인(후원은 tokens 필수) → 적립 + 원장
 *   POST /orders/:id/reject  { note? }
 *   POST /grant { nickname, tokens, note? }       직접 지급(음수면 회수)
 * 카드번호·계좌번호 같은 결제 정보는 받지도 저장하지도 않는다. memo 는 확인용 한 줄(입금자명·후원 닉네임)뿐이다.
 * ==================================================================== */
const mongoose = require('mongoose');
const User = require('../models/User');
const AiTokenLog = require('../models/AiTokenLog');
const AiTokenOrder = require('../models/AiTokenOrder');
const aiTokens = require('../utils/aiTokens');

const MAX_PENDING = 3;          // 회원 한 명이 동시에 걸어 둘 수 있는 대기 신청 수
const MAX_MEMO = 80;
const MAX_GRANT = 1000000;      // 한 번에 지급·승인할 수 있는 최대 토큰(오타 방지)

const SOURCE_LABELS = {
  signup_grant: '기본 지급',
  agent_run: '에이전트 봇 사용',
  refund: '환불',
  purchase: '구매 승인',
  sponsor: '후원 승인',
  admin_grant: '관리자 지급',
};
const KIND_LABELS = { purchase: '구매', sponsor: '후원' };

// 충전 방법 안내 문구 — 계좌 등은 코드에 박지 않고 서버 환경 변수로 준다(없으면 문의하기로 안내)
function payGuide() {
  return String(process.env.AI_TOKEN_PAY_GUIDE || '').trim()
    || '신청을 남기면 운영자가 확인 후 안내·적립해 드려요. 결제 방법은 문의하기로 물어봐 주세요.';
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function memberId(req) {
  const auth = req.auth;
  if (!auth || auth.isAdmin || !auth.sub || !mongoose.isValidObjectId(auth.sub)) return null;
  return String(auth.sub);
}

const orderShape = (o) => ({
  id: String(o._id),
  nickname: o.nickname || '',
  kind: o.kind,
  kindLabel: KIND_LABELS[o.kind] || o.kind,
  packId: o.packId || '',
  tokens: o.tokens || 0,
  price: o.price || 0,
  memo: o.memo || '',
  status: o.status,
  adminNote: o.adminNote || '',
  processedBy: o.processedBy || '',
  processedAt: o.processedAt,
  createdAt: o.createdAt,
});

// GET /api/ai/tokens
const getMyTokens = async (req, res) => {
  try {
    const userId = memberId(req);
    if (!userId) return res.status(403).json({ error: '휴버토큰은 회원 계정에서만 쓸 수 있어요.', code: 'MEMBER_ONLY' });
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const wallet = await aiTokens.getWallet(userId);
    const [logs, orders] = await Promise.all([
      AiTokenLog.find({ userId }).sort({ createdAt: -1 }).limit(12).lean(),
      AiTokenOrder.find({ userId }).sort({ createdAt: -1 }).limit(8).lean(),
    ]);
    const used = aiTokens.freeUsedToday(wallet);
    res.json({
      ok: true,
      tokens: wallet.tokens,
      defaultTokens: aiTokens.DEFAULT_TOKENS,
      free: { limit: aiTokens.FREE_DAILY_LIMIT, used, left: Math.max(0, aiTokens.FREE_DAILY_LIMIT - used) },
      packs: aiTokens.TOKEN_PACKS,
      payGuide: payGuide(),
      maxPending: MAX_PENDING,
      logs: logs.map((l) => ({
        id: String(l._id),
        source: l.source,
        sourceLabel: SOURCE_LABELS[l.source] || l.source,
        delta: l.delta,
        balanceAfter: l.balanceAfter,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
      orders: orders.map(orderShape),
    });
  } catch (err) {
    console.error('휴버토큰 조회 실패:', err.message);
    res.status(500).json({ error: '휴버토큰 정보를 불러오지 못했습니다.' });
  }
};

// POST /api/ai/tokens/orders
const createOrder = async (req, res) => {
  try {
    const userId = memberId(req);
    if (!userId) return res.status(403).json({ error: '휴버토큰은 회원 계정에서만 충전할 수 있어요.', code: 'MEMBER_ONLY' });
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const kind = req.body?.kind === 'sponsor' ? 'sponsor' : 'purchase';
    const memo = String(req.body?.memo || '').trim().slice(0, MAX_MEMO);
    if (!memo) return res.status(400).json({ error: '확인용 메모(입금자명 또는 후원 닉네임)를 적어 주세요.' });

    let packId = '';
    let tokens = 0;
    let price = 0;
    if (kind === 'purchase') {
      const pack = aiTokens.findPack(req.body?.packId);
      if (!pack) return res.status(400).json({ error: '충전할 묶음을 골라 주세요.' });
      ({ id: packId, tokens, price } = pack);
    } else {
      // 후원 — 적립할 토큰은 관리자가 후원을 확인하고 정한다. 금액은 참고용.
      const amount = Math.trunc(Number(req.body?.amount) || 0);
      price = Math.max(0, Math.min(10000000, amount));
    }

    const pending = await AiTokenOrder.countDocuments({ userId, status: 'pending' });
    if (pending >= MAX_PENDING) {
      return res.status(429).json({ error: `처리를 기다리는 신청이 이미 ${MAX_PENDING}건 있어요. 처리된 뒤에 다시 신청해 주세요.` });
    }
    const order = await AiTokenOrder.create({
      userId,
      nickname: String(req.auth.nickname || '').slice(0, 60),
      kind,
      packId,
      tokens,
      price,
      memo,
    });
    res.status(201).json({ ok: true, order: orderShape(order), payGuide: payGuide() });
  } catch (err) {
    console.error('휴버토큰 충전 신청 실패:', err.message);
    res.status(500).json({ error: '충전 신청을 저장하지 못했습니다.' });
  }
};

// ---------------------------------------------------------------- 관리자
// GET /api/admin/ai-tokens/orders
const adminListOrders = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const filter = status ? { status } : {};
    const [orders, pendingCount] = await Promise.all([
      AiTokenOrder.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
      AiTokenOrder.countDocuments({ status: 'pending' }),
    ]);
    res.json({ ok: true, pendingCount, packs: aiTokens.TOKEN_PACKS, orders: orders.map(orderShape) });
  } catch (err) {
    console.error('관리자 휴버토큰 신청 목록 실패:', err.message);
    res.status(500).json({ error: '신청 목록을 불러오지 못했습니다.' });
  }
};

function readTokens(raw) {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) ? n : 0;
}

// POST /api/admin/ai-tokens/orders/:id/approve
const adminApproveOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: '신청 ID 가 올바르지 않습니다.' });
    const found = await AiTokenOrder.findById(req.params.id).lean();
    if (!found) return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    // 구매는 묶음의 토큰이 기본값, 후원은 관리자가 정해야 한다. 둘 다 승인할 때 고쳐 줄 수 있다.
    const given = req.body?.tokens === undefined || req.body?.tokens === '' ? found.tokens : readTokens(req.body.tokens);
    if (given <= 0 || given > MAX_GRANT) return res.status(400).json({ error: `적립할 토큰 수(1~${MAX_GRANT})를 정해 주세요.` });
    const note = String(req.body?.note || '').trim().slice(0, 120);
    // pending 일 때만 승인으로 바뀐다 — 두 번 눌러도 한 번만 적립된다
    const order = await AiTokenOrder.findOneAndUpdate(
      { _id: found._id, status: 'pending' },
      { $set: { status: 'approved', tokens: given, adminNote: note, processedBy: String(req.auth?.nickname || '관리자'), processedAt: new Date() } },
      { new: true },
    );
    if (!order) return res.status(409).json({ error: '이미 처리된 신청입니다.' });
    const balance = await aiTokens.addTokens(
      order.userId, given, order.kind === 'sponsor' ? 'sponsor' : 'purchase',
      `${KIND_LABELS[order.kind]} 승인 · ${given.toLocaleString('ko-KR')}토큰`, order._id,
    );
    res.json({ ok: true, order: orderShape(order), balance });
  } catch (err) {
    console.error('휴버토큰 신청 승인 실패:', err.message);
    res.status(500).json({ error: '승인하지 못했습니다.' });
  }
};

// POST /api/admin/ai-tokens/orders/:id/reject
const adminRejectOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: '신청 ID 가 올바르지 않습니다.' });
    const note = String(req.body?.note || '').trim().slice(0, 120);
    const order = await AiTokenOrder.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'rejected', adminNote: note, processedBy: String(req.auth?.nickname || '관리자'), processedAt: new Date() } },
      { new: true },
    );
    if (!order) return res.status(409).json({ error: '이미 처리됐거나 없는 신청입니다.' });
    res.json({ ok: true, order: orderShape(order) });
  } catch (err) {
    console.error('휴버토큰 신청 거절 실패:', err.message);
    res.status(500).json({ error: '거절하지 못했습니다.' });
  }
};

// POST /api/admin/ai-tokens/grant
const adminGrant = async (req, res) => {
  try {
    const nickname = String(req.body?.nickname || '').trim();
    const tokens = readTokens(req.body?.tokens);
    if (!nickname) return res.status(400).json({ error: '닉네임을 입력해 주세요.' });
    if (!tokens || Math.abs(tokens) > MAX_GRANT) return res.status(400).json({ error: `지급할 토큰 수(±1~${MAX_GRANT})를 입력해 주세요.` });
    const user = await User.findOne({ nickname }).select('_id nickname').lean();
    if (!user) return res.status(404).json({ error: '그 닉네임의 회원을 찾을 수 없습니다.' });
    const note = String(req.body?.note || '').trim().slice(0, 120);
    const balance = await aiTokens.addTokens(user._id, tokens, 'admin_grant', `관리자 ${tokens > 0 ? '지급' : '회수'}${note ? ` · ${note}` : ''}`);
    res.json({ ok: true, nickname: user.nickname, balance });
  } catch (err) {
    console.error('휴버토큰 관리자 지급 실패:', err.message);
    res.status(500).json({ error: '지급하지 못했습니다.' });
  }
};

module.exports = {
  getMyTokens,
  createOrder,
  adminListOrders,
  adminApproveOrder,
  adminRejectOrder,
  adminGrant,
  MAX_PENDING,
};
