// ========================================================
// adminLuckController.js - 관리자 "행운 뽑기 관리" (/api/admin/luck/*, requireAdmin)
// ========================================================
// 행운 뽑기 3종(오늘의 행운 티어 / 행운 티어 포커 / 랜덤 뽑기)을 이용한 회원별 기록과
// 포인트 증감 내역을 관리자가 조회만 한다(수정·지급 기능 없음).
//
// 데이터 출처와 한계:
//   - 오늘의 행운 티어: LuckDraw — 뽑을 때마다 회원별 최근 5건만 남기고 지운다(luckDrawController HISTORY_RETENTION).
//     전체 횟수·티어별 횟수·최고 티어는 LuckProfile 의 누적값으로 보여준다.
//   - 행운 티어 포커: LuckPokerRound — 판마다 남는다. 승패·지급액(outcome/payout)은 2026-10 부터 저장되며 그 전 판은 비어 있다.
//   - 랜덤 뽑기: LuckLadderBet(+ LuckLadderRound 결과) — 배팅마다 남는다.
//   - 포인트 내역: LuckPointLog — 포인트가 바뀔 때마다 1건(utils/luckPointLog.js). 이 원장이 생긴 뒤의 증감만 있다.
// ========================================================
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');
const LuckProfile = require('../models/LuckProfile');
const LuckDraw = require('../models/LuckDraw');
const LuckPokerRound = require('../models/LuckPokerRound');
const LuckLadderBet = require('../models/LuckLadderBet');
const LuckLadderRound = require('../models/LuckLadderRound');
const LuckPointLog = require('../models/LuckPointLog');
const { betLabel } = require('./luckLadderController');

const USERS_PER_PAGE = 20;
const HISTORY_LIMIT = 50;      // 포커·랜덤 뽑기 기록은 최근 이만큼만 보여준다
const POINT_LOGS_PER_PAGE = 30;

const POINT_SOURCE_LABELS = {
  daily_tier: '오늘의 행운 티어',
  poker_bet: '포커 배팅',
  poker_payout: '포커 정산',
  ladder: '랜덤 뽑기',
  quiz: '이벤트 퀴즈',
  memory_award: '메모리 기록 상금',
  showcase_award: '티어표 공개 상금',
};

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// 검색어를 정규식 문자 그대로 쓰도록 이스케이프(닉네임 부분 일치 검색)
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPage(value) {
  const n = Math.trunc(Number(value));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// 지갑 주인(userId)이 누구인지 판별한다. 관리자 토큰으로 행운 뽑기를 하면 req.auth.sub 가 Admin 문서 id 라서
// LuckProfile.userId 가 회원(User)이 아니라 관리자(Admin)를 가리킨다 — 회원에서 못 찾으면 관리자에서도 찾고,
// 둘 다 없을 때만 탈퇴 회원으로 본다(회원 탈퇴 처리는 행운 뽑기 지갑을 지우지 않으므로 남아 있을 수 있다).
// 반환: Map(id → { accountType: 'member'|'admin'|'deleted', nickname, email })
async function resolveAccounts(ids) {
  const [users, admins] = await Promise.all([
    User.find({ _id: { $in: ids } }).select('nickname email').lean(),
    Admin.find({ _id: { $in: ids } }).select('name').lean(),
  ]);
  const map = new Map();
  users.forEach((u) => map.set(String(u._id), { accountType: 'member', nickname: u.nickname, email: u.email || '' }));
  admins.forEach((a) => {
    if (!map.has(String(a._id))) map.set(String(a._id), { accountType: 'admin', nickname: a.name || '관리자', email: '' });
  });
  ids.forEach((id) => {
    if (!map.has(String(id))) map.set(String(id), { accountType: 'deleted', nickname: '탈퇴 회원', email: '' });
  });
  return map;
}

// GET /api/admin/luck/users?q=닉네임&page=1
// 행운 뽑기 지갑(LuckProfile)이 있는 회원 목록 — 최근 활동(지갑 갱신) 순.
const getLuckUsers = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const q = String(req.query.q || '').trim();
    const filter = {};
    if (q) {
      const pattern = { $regex: escapeRegex(q), $options: 'i' };
      const [matchedUsers, matchedAdmins] = await Promise.all([
        User.find({ nickname: pattern }).select('_id').lean(),
        Admin.find({ name: pattern }).select('_id').lean(),
      ]);
      filter.userId = { $in: [...matchedUsers, ...matchedAdmins].map((u) => u._id) };
    }

    const total = await LuckProfile.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
    const page = Math.min(toPage(req.query.page), totalPages);

    const profiles = await LuckProfile.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * USERS_PER_PAGE)
      .limit(USERS_PER_PAGE)
      .lean();
    const ids = profiles.map((p) => p.userId);

    const [accounts, pokerCounts, ladderCounts] = await Promise.all([
      resolveAccounts(ids),
      LuckPokerRound.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', n: { $sum: 1 } } }]),
      LuckLadderBet.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', n: { $sum: 1 } } }]),
    ]);
    const pokerMap = new Map(pokerCounts.map((c) => [String(c._id), c.n]));
    const ladderMap = new Map(ladderCounts.map((c) => [String(c._id), c.n]));

    const [summary] = await LuckProfile.aggregate([
      { $group: { _id: null, profiles: { $sum: 1 }, totalPoints: { $sum: '$points' } } },
    ]);

    res.json({
      ok: true,
      page,
      totalPages,
      total,
      summary: { profiles: summary?.profiles || 0, totalPoints: summary?.totalPoints || 0 },
      users: profiles.map((p) => {
        const key = String(p.userId);
        const account = accounts.get(key);
        return {
          userId: key,
          accountType: account.accountType,
          nickname: account.nickname,
          email: account.email,
          points: p.points || 0,
          dailyDraws: p.totalDraws || 0,
          bestTier: p.bestTier ?? null,
          pokerRounds: pokerMap.get(key) || 0,
          ladderBets: ladderMap.get(key) || 0,
          lastActiveAt: p.updatedAt,
        };
      }),
    });
  } catch (err) {
    console.error('관리자 행운 뽑기 회원 목록 에러:', err);
    res.status(500).json({ error: '행운 뽑기 회원 목록을 불러오지 못했습니다.' });
  }
};

// GET /api/admin/luck/users/:userId — 한 회원의 행운 뽑기 3종 기록
const getLuckUserDetail = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: '잘못된 회원 id 입니다.' });

    const [accounts, user, profile, daily, poker, bets] = await Promise.all([
      resolveAccounts([new mongoose.Types.ObjectId(userId)]),
      User.findById(userId).select('createdAt').lean(),
      LuckProfile.findOne({ userId }).lean(),
      LuckDraw.find({ userId, mode: 'daily_tier' }).sort({ createdAt: -1 }).lean(),
      LuckPokerRound.find({ userId }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean(),
      LuckLadderBet.find({ userId }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean(),
    ]);
    const account = accounts.get(String(userId));
    if (!profile && account.accountType === 'deleted') return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });

    const rounds = await LuckLadderRound.find({ roundNo: { $in: bets.map((b) => b.roundNo) } })
      .select('roundNo resultCharacterName resultTier status endAt').lean();
    const roundMap = new Map(rounds.map((r) => [r.roundNo, r]));

    const [pokerTotal, ladderTotal] = await Promise.all([
      LuckPokerRound.countDocuments({ userId }),
      LuckLadderBet.countDocuments({ userId }),
    ]);

    res.json({
      ok: true,
      user: {
        userId,
        accountType: account.accountType,
        nickname: account.nickname,
        email: account.email,
        joinedAt: user?.createdAt || null,
      },
      profile: {
        points: profile?.points || 0,
        totalDraws: profile?.totalDraws || 0,
        tierCounts: profile?.tierCounts || {},
        bestTier: profile?.bestTier ?? null,
        todayCount: profile?.todayCount || 0,
        todayDate: profile?.todayDate || '',
        lastDrawAt: profile?.lastDrawAt || null,
      },
      daily: daily.map((d) => ({
        id: String(d._id),
        tier: d.tier,
        characterName: d.characterName,
        drawDate: d.drawDate,
        createdAt: d.createdAt,
      })),
      dailyRetention: 5,
      poker: {
        total: pokerTotal,
        rounds: poker.map((r) => ({
          id: String(r._id),
          bet: r.bet,
          status: r.status,
          outcome: r.outcome ?? null,
          payout: r.payout ?? null,
          pointsDelta: r.pointsDelta ?? null,
          playerHand: r.playerHand || '',
          dealerHand: r.dealerHand || '',
          createdAt: r.createdAt,
        })),
      },
      ladder: {
        total: ladderTotal,
        bets: bets.map((b) => {
          const round = roundMap.get(b.roundNo);
          return {
            id: String(b._id),
            roundNo: b.roundNo,
            bet: b.bet,
            betLabel: betLabel(b.betType, b.betValue),
            mult: b.mult,
            settled: b.settled,
            outcome: b.outcome,
            pointsDelta: b.pointsDelta,
            resultTier: round?.resultTier ?? null,
            resultCharacterName: round?.resultCharacterName || '',
            createdAt: b.createdAt,
          };
        }),
      },
      historyLimit: HISTORY_LIMIT,
    });
  } catch (err) {
    console.error('관리자 행운 뽑기 회원 기록 에러:', err);
    res.status(500).json({ error: '회원의 행운 뽑기 기록을 불러오지 못했습니다.' });
  }
};

// GET /api/admin/luck/users/:userId/points?page=1 — 한 회원의 포인트 증감 원장(최신순) + 출처별 합계
const getLuckUserPoints = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: '잘못된 회원 id 입니다.' });
    const oid = new mongoose.Types.ObjectId(userId);

    const total = await LuckPointLog.countDocuments({ userId: oid });
    const totalPages = Math.max(1, Math.ceil(total / POINT_LOGS_PER_PAGE));
    const page = Math.min(toPage(req.query.page), totalPages);

    const [logs, bySource] = await Promise.all([
      LuckPointLog.find({ userId: oid })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * POINT_LOGS_PER_PAGE)
        .limit(POINT_LOGS_PER_PAGE)
        .lean(),
      LuckPointLog.aggregate([
        { $match: { userId: oid } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            gained: { $sum: { $cond: [{ $gt: ['$delta', 0] }, '$delta', 0] } },
            spent: { $sum: { $cond: [{ $lt: ['$delta', 0] }, '$delta', 0] } },
          },
        },
      ]),
    ]);

    const totals = bySource.reduce((acc, s) => ({ gained: acc.gained + s.gained, spent: acc.spent + s.spent }), { gained: 0, spent: 0 });

    res.json({
      ok: true,
      page,
      totalPages,
      total,
      totals,
      bySource: bySource
        .map((s) => ({ source: s._id, label: POINT_SOURCE_LABELS[s._id] || s._id, count: s.count, gained: s.gained, spent: s.spent }))
        .sort((a, b) => b.count - a.count),
      logs: logs.map((l) => ({
        id: String(l._id),
        source: l.source,
        sourceLabel: POINT_SOURCE_LABELS[l.source] || l.source,
        delta: l.delta,
        balanceAfter: l.balanceAfter,
        detail: l.detail,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    console.error('관리자 포인트 내역 에러:', err);
    res.status(500).json({ error: '포인트 내역을 불러오지 못했습니다.' });
  }
};

module.exports = { getLuckUsers, getLuckUserDetail, getLuckUserPoints };
