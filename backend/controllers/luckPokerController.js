/* ======================================================================
 * 행운 티어 포커 (Luck Poker) 컨트롤러
 * ----------------------------------------------------------------------
 * "오늘의 행운 티어" 뽑기로 모은 포인트(LuckProfile.points)를 걸고 하는 포커식 배팅.
 *
 * 규칙 요약
 *  - 카드 = 티어 숫자 1~9 (1이 가장 높은 티어) × 무늬 5종
 *    (다이아몬드·하트 = 빨강, 클로버·스페이드 = 검정, 휴먼버그대학교 마크 = 초록)
 *  - 유저와 딜러(랜덤 결과값)가 각각 5장을 갖고, 족보가 더 높은 쪽이 이긴다.
 *  - 유저 패는 자동으로 돌려주지 않는다. 공개된 후보 5장 중 유저가 3장을 직접 고르고,
 *    나머지 4·5번째 카드는 후보와 무관하게 서버가 새로 뽑아 자동으로 붙인다.
 *    (고르지 않은 후보 2장은 버려진다. 프론트는 자동 카드를 2초 간격으로 공개만 한다)
 *  - 이기면 배팅액 × 족보 배수만큼 포인트를 "추가로" 받고, 지면 배팅액을 그대로 잃는다.
 *  - 배팅 상한은 고정값이 아니라 "자신이 가진 포인트 전부"다 — 보유 포인트보다
 *    많이 걸 수 없다는 검사 하나가 곧 최대 배팅 제한이다.
 *  - 같은 족보·같은 끗수면 무승부로 배팅액을 돌려준다(포인트 변동 0).
 *
 * 진행은 두 단계다 — 유저의 선택이 결과에 영향을 주므로 한 요청으로 끝낼 수 없다.
 *   1) POST /poker/deal : 배팅액을 미리 차감(에스크로)하고 후보·자동·딜러 카드를 전부
 *      뽑아 LuckPokerRound 에 저장한 뒤, 공개 후보 5장만 내려준다.
 *   2) POST /poker/play : 유저가 고른 "후보 인덱스"만 받아 저장해 둔 카드로 패를 만들고
 *      족보를 판정해 정산한다(승리 = 원금 + 배팅액 × 배수, 무승부 = 원금, 패배 = 0).
 * 딜 시점에 배팅액을 먼저 빼는 이유는, 후보가 마음에 들 때까지 딜만 다시 돌려보는
 * 악용을 막기 위해서다(유저당 열린 판은 1건이며 새 딜 요청은 그 판을 그대로 돌려준다).
 *
 * 카드는 "덱에서 빼는" 방식이 아니라 매 장 독립 추첨(복원 추출)이다.
 * 45장(9랭크×5무늬)짜리 덱에서 빼면 같은 카드가 두 번 나올 수 없어
 * 5카드·하우스 플러시·파이브 플러시 같은 족보가 아예 성립하지 않기 때문이다.
 *
 * 판정·배수·포인트 계산은 전부 서버에서만 한다. 프론트는 /poker/config 로 받은
 * 표를 "표시"만 하며, 카드 값을 만들어 서버에 보내는 일은 없다(보내는 건 고른 번호뿐).
 * ====================================================================== */
const mongoose = require('mongoose');
const LuckProfile = require('../models/LuckProfile');
const LuckPokerRound = require('../models/LuckPokerRound');

// 무늬 5종. color 는 프론트가 카드 색을 칠할 때만 쓰는 표시용 값이다.
const SUITS = [
  { id: 'diamond', label: '다이아몬드', symbol: '♦', color: 'red' },
  { id: 'heart', label: '하트', symbol: '♥', color: 'red' },
  { id: 'club', label: '클로버', symbol: '♣', color: 'black' },
  { id: 'spade', label: '스페이드', symbol: '♠', color: 'black' },
  { id: 'hbu', label: '휴먼버그대학교', symbol: 'HBU', color: 'green' },
];

const MIN_TIER = 1;            // 가장 높은 티어(포커의 A 역할)
const MAX_TIER = 9;            // 가장 낮은 티어
const HAND_SIZE = 5;           // 배치 최대 장수 = 5장
const CHOICE_COUNT = 5;        // 유저에게 공개하는 후보 카드 장수
const PICK_COUNT = 3;          // 그중 유저가 직접 고르는 장수(나머지는 자동)
const AUTO_COUNT = HAND_SIZE - PICK_COUNT; // 4·5번째 = 서버가 새로 뽑아 자동으로 붙이는 장수
const MIN_BET = 1;
// 최대 배팅은 상수가 아니라 "그 유저의 보유 포인트"다(아래 dealPoker 의 잔액 검사가 상한 역할).

// 족보 표. rank 가 클수록 강하고, mult 는 승리 시 배팅액에 곱해지는 배수.
// 순서·배수는 여기 한 곳에만 존재한다(프론트는 /poker/config 로 받아 표시만).
const HANDS = {
  top: { rank: 1, mult: 1.5, label: '탑', desc: '아무 조합도 없는 가장 높은 티어 한 장' },
  one_pair: { rank: 2, mult: 1.95, label: '원페어', desc: '같은 티어 2장' },
  two_pair: { rank: 3, mult: 2.5, label: '투페어', desc: '같은 티어 2장씩 두 쌍' },
  triple: { rank: 4, mult: 2.95, label: '트리플', desc: '같은 티어 3장' },
  straight: { rank: 5, mult: 3.25, label: '스트레이트', desc: '연속된 티어 5장' },
  full_house: { rank: 6, mult: 3.5, label: '풀 하우스', desc: '트리플 + 원페어' },
  flush: { rank: 7, mult: 4.25, label: '플러시', desc: '같은 무늬 5장' },
  back_straight: { rank: 8, mult: 5, label: '백 스트레이트', desc: '9·8·7·6 + 1' },
  mountain: { rank: 9, mult: 5.5, label: '마운틴', desc: '1·2·3·4·5' },
  four_card: { rank: 10, mult: 6, label: '4카드', desc: '같은 티어 4장' },
  five_card: { rank: 11, mult: 7, label: '5카드', desc: '같은 티어 5장' },
  house_flush: { rank: 12, mult: 7.5, label: '하우스 플러시', desc: '풀 하우스 + 플러시' },
  straight_flush: { rank: 13, mult: 8, label: '스트레이트 플러시', desc: '스트레이트 + 플러시' },
  back_straight_flush: { rank: 14, mult: 8.5, label: '백 스트레이트 플러시', desc: '백 스트레이트 + 플러시' },
  royal_straight_flush: { rank: 15, mult: 9, label: '로얄 스트레이트 플러시', desc: '마운틴 + 플러시' },
  five_flush: { rank: 16, mult: 10, label: '파이브 플러시', desc: '5카드 + 플러시' },
};

function randomCard() {
  const tier = MIN_TIER + Math.floor(Math.random() * (MAX_TIER - MIN_TIER + 1));
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { tier, suit: suit.id };
}

// n장을 독립 추첨한다(후보 5장·자동 2장·딜러 5장 모두 이 함수로 뽑는다).
function dealCards(n) {
  return Array.from({ length: n }, randomCard);
}

// mongoose 서브도큐먼트를 응답·판정용 평범한 객체로 바꾼다.
function plainCard(card) {
  return { tier: card.tier, suit: card.suit };
}

/* 족보 판정.
 * 반환: { key, rank, mult, label, tiebreak }
 *  - tiebreak: 같은 족보끼리 비교할 때 앞에서부터 보는 티어 배열.
 *    "같은 티어가 많은 묶음 먼저 → 그 안에서는 높은 티어(=작은 숫자) 먼저" 순으로 정렬한다.
 *    티어는 숫자가 작을수록 강하므로 비교 시 "작은 쪽이 승리"다.
 */
function evaluateHand(cards) {
  const tierCount = new Map();
  const suitSet = new Set();
  for (const card of cards) {
    tierCount.set(card.tier, (tierCount.get(card.tier) || 0) + 1);
    suitSet.add(card.suit);
  }

  const groups = [...tierCount.entries()]
    .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
  const counts = groups.map(([, n]) => n);
  const tiebreak = groups.map(([tier]) => tier);

  const isFlush = suitSet.size === 1;
  const uniqueTiers = [...tierCount.keys()].sort((a, b) => a - b);

  // 스트레이트 판정 — 5장이 전부 다른 티어일 때만 가능.
  // 1·2·3·4·5 = 마운틴(가장 높은 스트레이트), 9·8·7·6 + 1 = 백 스트레이트.
  let straightKind = null;
  if (uniqueTiers.length === HAND_SIZE) {
    if (uniqueTiers[HAND_SIZE - 1] - uniqueTiers[0] === HAND_SIZE - 1) {
      straightKind = uniqueTiers[0] === MIN_TIER ? 'mountain' : 'straight';
    } else if (uniqueTiers.join(',') === '1,6,7,8,9') {
      straightKind = 'back';
    }
  }

  const top = counts[0];
  const isFullHouse = top === 3 && counts[1] === 2;

  let key = 'top';
  if (top === 5 && isFlush) key = 'five_flush';
  else if (straightKind === 'mountain' && isFlush) key = 'royal_straight_flush';
  else if (straightKind === 'back' && isFlush) key = 'back_straight_flush';
  else if (straightKind === 'straight' && isFlush) key = 'straight_flush';
  else if (isFullHouse && isFlush) key = 'house_flush';
  else if (top === 5) key = 'five_card';
  else if (top === 4) key = 'four_card';
  else if (straightKind === 'mountain') key = 'mountain';
  else if (straightKind === 'back') key = 'back_straight';
  else if (isFlush) key = 'flush';
  else if (isFullHouse) key = 'full_house';
  else if (straightKind === 'straight') key = 'straight';
  else if (top === 3) key = 'triple';
  else if (top === 2 && counts[1] === 2) key = 'two_pair';
  else if (top === 2) key = 'one_pair';

  return { key, ...HANDS[key], tiebreak };
}

// 1 = 앞쪽 승, -1 = 뒤쪽 승, 0 = 무승부
function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  for (let i = 0; i < a.tiebreak.length; i += 1) {
    if (a.tiebreak[i] !== b.tiebreak[i]) return a.tiebreak[i] < b.tiebreak[i] ? 1 : -1;
  }
  return 0;
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// 진행 중인 판을 프론트에 내려줄 모양 — 딜러 패·자동 카드는 정산 전까지 숨긴다.
function openRoundShape(round) {
  return {
    roundId: String(round._id),
    bet: round.bet,
    choices: round.choices.map(plainCard),
  };
}

// GET /api/luck-draw/poker/config
// 무늬·족보·배팅 한도 등 "표시용" 설정. 로그인 상태면 현재 보유 포인트와
// (있다면) 카드 선택이 끝나지 않은 진행 중인 판도 함께 준다 — 새로고침 후 이어서 진행용.
const getPokerConfig = async (req, res) => {
  try {
    const hands = Object.entries(HANDS)
      .map(([key, info]) => ({ key, ...info }))
      .sort((a, b) => a.rank - b.rank);

    let points = null;
    let openRound = null;
    if (req.auth?.sub && isDbConnected()) {
      const [profile, round] = await Promise.all([
        LuckProfile.findOne({ userId: req.auth.sub }),
        LuckPokerRound.findOne({ userId: req.auth.sub, status: 'open' }),
      ]);
      points = profile ? profile.points : 0;
      if (round) openRound = openRoundShape(round);
    }

    res.json({
      suits: SUITS,
      hands,
      handSize: HAND_SIZE,
      choiceCount: CHOICE_COUNT,
      pickCount: PICK_COUNT,
      autoCount: AUTO_COUNT,
      minTier: MIN_TIER,
      maxTier: MAX_TIER,
      minBet: MIN_BET,
      // 최대 배팅 = 지금 가진 포인트 전부. 비로그인이면 points 와 함께 null 이다.
      maxBet: points,
      points,
      openRound,
    });
  } catch (err) {
    console.error('행운 포커 설정 조회 에러:', err);
    res.status(500).json({ error: '설정 조회 실패' });
  }
};

// POST /api/luck-draw/poker/deal  { bet }
// 1단계 — 배팅액을 미리 차감하고 이번 판 카드를 전부 뽑아 저장한 뒤, 공개 후보만 내려준다.
// 이미 열린 판이 있으면 새로 뽑지 않고 그 판을 그대로 돌려준다(중복 차감 방지 + 이어서 진행).
const dealPoker = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    let profile = await LuckProfile.findOne({ userId: req.auth.sub });
    if (!profile) profile = await LuckProfile.create({ userId: req.auth.sub });

    // 아직 카드를 다 고르지 않은 판이 있으면 그 판을 이어서 진행한다(배팅액도 이미 빠져 있음).
    const existing = await LuckPokerRound.findOne({ userId: req.auth.sub, status: 'open' });
    if (existing) {
      return res.json({ ok: true, resumed: true, round: openRoundShape(existing), points: profile.points });
    }

    const bet = Math.trunc(Number(req.body?.bet));
    if (!Number.isFinite(bet) || bet < MIN_BET) {
      return res.status(400).json({ error: `배팅은 ${MIN_BET}P 이상만 가능합니다.` });
    }

    // 최대 배팅 제한 = 보유 포인트. 가진 것보다 많이 걸 수는 없다.
    if (profile.points < bet) {
      return res.status(400).json({
        error: `보유 포인트(${profile.points}P)보다 많이 걸 수 없습니다. 최대 배팅은 가진 포인트 전부까지이며, 오늘의 행운 티어를 뽑아 포인트를 모을 수 있습니다.`,
        points: profile.points,
      });
    }

    // 카드(후보·자동·딜러)를 먼저 전부 확정해 저장한다 — 유저의 선택이 카드 값을 바꾸지 못하게.
    let round;
    try {
      round = await LuckPokerRound.create({
        userId: req.auth.sub,
        bet,
        choices: dealCards(CHOICE_COUNT),
        autoCards: dealCards(AUTO_COUNT),
        dealerCards: dealCards(HAND_SIZE),
      });
    } catch (err) {
      // 동시에 두 번 눌러 열린 판이 이미 생겼으면(unique 충돌) 그 판을 그대로 쓴다 — 중복 차감 방지.
      if (err.code === 11000) {
        const already = await LuckPokerRound.findOne({ userId: req.auth.sub, status: 'open' });
        if (already) {
          return res.json({ ok: true, resumed: true, round: openRoundShape(already), points: profile.points });
        }
      }
      throw err;
    }

    // 판이 실제로 만들어진 뒤에 차감한다(생성에 실패했는데 포인트만 사라지는 일이 없도록).
    profile.points = Math.max(0, profile.points - bet);
    await profile.save();

    res.json({ ok: true, resumed: false, round: openRoundShape(round), points: profile.points });
  } catch (err) {
    console.error('행운 포커 딜 에러:', err);
    res.status(500).json({ error: '카드를 받지 못했습니다.' });
  }
};

// POST /api/luck-draw/poker/play  { roundId, picks: [후보 인덱스 3개] }
// 2단계 — 고른 후보 3장 + 자동 2장으로 패를 만들어 딜러와 비교하고 정산한다.
const playPoker = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const { roundId } = req.body || {};
    if (!mongoose.isValidObjectId(roundId)) {
      return res.status(400).json({ error: '진행 중인 판을 찾을 수 없습니다. 다시 배팅해주세요.' });
    }

    const round = await LuckPokerRound.findOne({ _id: roundId, userId: req.auth.sub, status: 'open' });
    if (!round) {
      return res.status(409).json({ error: '이미 끝났거나 존재하지 않는 판입니다. 다시 배팅해주세요.' });
    }

    // 프론트가 보내는 건 "카드"가 아니라 "후보 번호"다 — 개수·범위·중복을 여기서 전부 검사한다.
    const picks = Array.isArray(req.body?.picks) ? req.body.picks.map((n) => Math.trunc(Number(n))) : [];
    const valid = picks.length === PICK_COUNT
      && picks.every((i) => Number.isInteger(i) && i >= 0 && i < round.choices.length)
      && new Set(picks).size === PICK_COUNT;
    if (!valid) {
      return res.status(400).json({ error: `공개된 카드 중 서로 다른 ${PICK_COUNT}장을 골라주세요.` });
    }

    // 같은 판이 두 번 정산되지 않도록 status 를 원자적으로 바꾸면서 선점한다.
    const claimed = await LuckPokerRound.findOneAndUpdate(
      { _id: round._id, status: 'open' },
      { $set: { status: 'settled', picks } },
      { new: true },
    );
    if (!claimed) {
      return res.status(409).json({ error: '이미 정산된 판입니다. 다시 배팅해주세요.' });
    }

    const bet = claimed.bet;
    const pickedCards = picks.map((i) => plainCard(claimed.choices[i]));
    const autoCards = claimed.autoCards.map(plainCard);
    const playerCards = [...pickedCards, ...autoCards];   // 고른 3장 + 자동 2장
    const dealerCards = claimed.dealerCards.map(plainCard);
    // 고르지 않아 버려진 후보 — 프론트가 "버림"으로 표시하는 용도.
    const discarded = claimed.choices
      .map((card, index) => ({ index, card: plainCard(card) }))
      .filter(({ index }) => !picks.includes(index));

    const player = evaluateHand(playerCards);
    const dealer = evaluateHand(dealerCards);
    const verdict = compareHands(player, dealer);

    // 배팅액은 딜 때 이미 빠졌으므로 여기서는 "돌려줄 금액(payout)"만 더한다.
    // 승리 = 원금 + 배팅액 × 족보 배수, 무승부 = 원금, 패배 = 0(배팅액 그대로 손실).
    let payout = 0;
    if (verdict > 0) payout = bet + Math.floor(bet * player.mult);
    else if (verdict === 0) payout = bet;

    let profile = await LuckProfile.findOne({ userId: req.auth.sub });
    if (!profile) profile = await LuckProfile.create({ userId: req.auth.sub });
    profile.points = Math.max(0, profile.points + payout);
    await profile.save();

    res.json({
      ok: true,
      bet,
      outcome: verdict > 0 ? 'win' : (verdict < 0 ? 'lose' : 'push'),
      payout,
      // 이 판 전체의 순증감(배팅 전 대비) — 승리 +배팅액×배수, 패배 -배팅액, 무승부 0.
      pointsDelta: payout - bet,
      points: profile.points,
      picks,
      discarded,
      player: {
        cards: playerCards,
        pickedCards,
        autoCards,
        hand: { key: player.key, label: player.label, mult: player.mult },
      },
      dealer: { cards: dealerCards, hand: { key: dealer.key, label: dealer.label, mult: dealer.mult } },
    });
  } catch (err) {
    console.error('행운 포커 플레이 에러:', err);
    res.status(500).json({ error: '게임 진행에 실패했습니다.' });
  }
};

module.exports = { getPokerConfig, dealPoker, playPoker };
