/* ====================================================================
 * utils/aiTokens.js — 휴버토큰(AI 전용 포인트) 요금표와 지갑 처리
 * ------------------------------------------------------------------
 * 에이전트 봇은 엔진이 두 가지다.
 *   무료 엔진(ollama) : 서버의 Ollama 모델. 토큰이 들지 않고 하루(KST) FREE_DAILY_LIMIT 번까지.
 *   Claude 엔진       : Claude API. 모델·effort 를 골라 쓰고 "휴버토큰"이 든다.
 *
 * 휴버토큰 값 정하는 법 — 1토큰 ≈ $0.001. "평균 한 번"을 입력 2,500토큰 + 출력 700토큰(effort medium)으로 보고
 * 모델의 API 가격(입력/출력 $ per 1M)으로 계산해 올림했다(2026-11 가격표 기준):
 *   haiku 5.5   $0.10/$0.50  → 0.0006$ →  1        opus 5.5   $4/$20   → 0.024$ → 24
 *   haiku 4.5   $1/$5        → 0.006$  →  6        opus 5     $5/$25   → 0.030$ → 30
 *   sonnet 5·5.5 $2/$10      → 0.012$  → 12        fable 5.2  $8/$40   → 0.048$ → 48
 *                                                  fable 5.1  $10/$50  → 0.060$ → 60
 * effort 는 생각·출력 양을 늘리므로 배수를 곱한다(small 0.6 · medium 1 · high 1.6 · extra high 2.4, 올림·최소 1).
 * 한 번에 "평균값"을 정액으로 받는다(실제 사용량 정산이 아니다) — 화면에 실행 전에 값이 보여야 하기 때문이다.
 *
 * 이 파일의 값(모델·배수·기본 지급·하루 횟수·묶음)을 바꾸면 ai-service/knowledge/08·09 와 화면이 같이 바뀐다
 * (화면은 /api/ai/agent/info 로 받아 쓰고, 지식 문서는 ai-service/tests/test_knowledge_sync.py 가 대조한다).
 * ==================================================================== */
const AiTokenWallet = require('../models/AiTokenWallet');
const AiTokenLog = require('../models/AiTokenLog');
const { getKstDateString } = require('./kstDate');

const DEFAULT_TOKENS = 500;      // 지갑이 처음 만들어질 때 주는 휴버토큰
const FREE_DAILY_LIMIT = 20;     // 무료 엔진(Ollama) 하루 실행 횟수(KST 자정에 초기화)

// Claude 모델 — id 는 Claude API 모델 ID 그대로. base = effort medium 기준 1회 평균 휴버토큰.
// effort: false 인 모델은 effort 를 지원하지 않아 고를 수 없다(항상 base 값).
const CLAUDE_MODELS = [
  { id: 'claude-haiku-5-5', family: 'haiku', version: '5.5', label: 'Haiku 5.5', base: 1, effort: true, note: '가장 빠르고 저렴' },
  { id: 'claude-haiku-4-5', family: 'haiku', version: '4.5', label: 'Haiku 4.5', base: 6, effort: false, note: '이전 세대 · effort 선택 없음' },
  { id: 'claude-sonnet-5-5', family: 'sonnet', version: '5.5', label: 'Sonnet 5.5', base: 12, effort: true, note: '균형 잡힌 기본값' },
  { id: 'claude-sonnet-5', family: 'sonnet', version: '5.0', label: 'Sonnet 5.0', base: 12, effort: true, note: '이전 세대 Sonnet' },
  { id: 'claude-opus-5-5', family: 'opus', version: '5.5', label: 'Opus 5.5', base: 24, effort: true, note: '깊이 있는 분석' },
  { id: 'claude-opus-5', family: 'opus', version: '5.0', label: 'Opus 5.0', base: 30, effort: true, note: '이전 세대 Opus' },
  { id: 'claude-fable-5-2', family: 'fable', version: '5.2', label: 'Fable 5.2', base: 48, effort: true, note: '가장 뛰어난 모델' },
  { id: 'claude-fable-5-1', family: 'fable', version: '5.1', label: 'Fable 5.1', base: 60, effort: true, note: '이전 세대 Fable' },
];
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5';

// effort — 화면 이름(small·medium·high·extra high) ↔ Claude API 값(low·medium·high·xhigh)
const EFFORTS = [
  { id: 'low', label: 'small', mult: 0.6 },
  { id: 'medium', label: 'medium', mult: 1 },
  { id: 'high', label: 'high', mult: 1.6 },
  { id: 'xhigh', label: 'extra high', mult: 2.4 },
];
const DEFAULT_EFFORT = 'medium';

// 충전 묶음(원). 결제 대행이 없어 "구매 신청 → 관리자 승인" 으로 적립한다.
const TOKEN_PACKS = [
  { id: 'pack-1000', tokens: 1000, price: 2000 },
  { id: 'pack-3000', tokens: 3000, price: 5500 },
  { id: 'pack-10000', tokens: 10000, price: 17000 },
];

const findModel = (id) => CLAUDE_MODELS.find((m) => m.id === id) || null;
const findEffort = (id) => EFFORTS.find((e) => e.id === id) || null;
const findPack = (id) => TOKEN_PACKS.find((p) => p.id === id) || null;

// 모델·effort 로 1회 휴버토큰 값을 구한다. effort 를 지원하지 않는 모델은 base 그대로.
function tokenCost(modelId, effortId) {
  const model = findModel(modelId);
  if (!model) return null;
  const effort = model.effort ? (findEffort(effortId) || findEffort(DEFAULT_EFFORT)) : findEffort(DEFAULT_EFFORT);
  return Math.max(1, Math.ceil(model.base * effort.mult));
}

async function writeLog({ userId, source, delta, balanceAfter, detail = '', refId = null }) {
  if (!delta) return;
  try {
    await AiTokenLog.create({ userId, source, delta, balanceAfter, detail: String(detail || '').slice(0, 200), refId });
  } catch (err) {
    // 원장은 부가 정보 — 실패해도 지급·차감 자체를 막지 않는다
    console.error('휴버토큰 원장 기록 실패:', err.message);
  }
}

// 지갑을 읽는다. 없으면 기본 토큰을 넣어 만든다(동시에 두 번 만들려는 경우 unique 오류 → 다시 읽는다).
async function getWallet(userId) {
  let wallet = await AiTokenWallet.findOne({ userId });
  if (wallet) return wallet;
  try {
    wallet = await AiTokenWallet.create({ userId, tokens: DEFAULT_TOKENS });
    await writeLog({ userId, source: 'signup_grant', delta: DEFAULT_TOKENS, balanceAfter: DEFAULT_TOKENS, detail: '휴버토큰 기본 지급' });
    return wallet;
  } catch (err) {
    if (err && err.code === 11000) return AiTokenWallet.findOne({ userId });
    throw err;
  }
}

// 오늘 무료 엔진을 몇 번 썼는지(날짜가 바뀌었으면 0)
function freeUsedToday(wallet) {
  return wallet && wallet.freeDate === getKstDateString() ? Math.max(0, wallet.freeCount || 0) : 0;
}

// 무료 엔진 1회 쓰기 — 한도 안이면 횟수를 올리고 { used, left } 를, 한도를 넘으면 null 을 돌려준다(조건부 갱신이라 동시 요청에도 안전).
async function takeFreeRun(userId) {
  const today = getKstDateString();
  await getWallet(userId);
  // 날짜가 바뀌었으면 오늘 날짜로 넘기고 0 부터 다시 센다
  await AiTokenWallet.updateOne({ userId, freeDate: { $ne: today } }, { $set: { freeDate: today, freeCount: 0 } });
  const updated = await AiTokenWallet.findOneAndUpdate(
    { userId, freeDate: today, freeCount: { $lt: FREE_DAILY_LIMIT } },
    { $inc: { freeCount: 1 } },
    { new: true },
  );
  if (!updated) return null;
  return { used: updated.freeCount, left: Math.max(0, FREE_DAILY_LIMIT - updated.freeCount) };
}

// 실패한 작업의 무료 횟수를 되돌린다
async function returnFreeRun(userId) {
  const today = getKstDateString();
  try {
    const updated = await AiTokenWallet.findOneAndUpdate(
      { userId, freeDate: today, freeCount: { $gt: 0 } },
      { $inc: { freeCount: -1 } },
      { new: true },
    );
    return updated ? Math.max(0, FREE_DAILY_LIMIT - updated.freeCount) : null;
  } catch (err) {
    console.error('무료 횟수 되돌리기 실패:', err.message);
    return null;
  }
}

// 휴버토큰 차감 — 잔액이 모자라면 null(조건부 갱신이라 0 밑으로 내려가지 않는다)
async function chargeTokens(userId, cost, detail) {
  if (cost <= 0) return { tokens: null };
  await getWallet(userId);
  const updated = await AiTokenWallet.findOneAndUpdate(
    { userId, tokens: { $gte: cost } },
    { $inc: { tokens: -cost } },
    { new: true },
  );
  if (!updated) return null;
  await writeLog({ userId, source: 'agent_run', delta: -cost, balanceAfter: updated.tokens, detail });
  return { tokens: updated.tokens };
}

// 휴버토큰 더하기(환불·구매·후원·관리자 지급). amount 가 음수면 회수(0 밑으로는 안 내려간다).
async function addTokens(userId, amount, source, detail, refId = null) {
  const n = Math.trunc(Number(amount) || 0);
  if (!n) return null;
  const wallet = await getWallet(userId);
  const next = Math.max(0, wallet.tokens + n);
  const delta = next - wallet.tokens;
  if (!delta) return wallet.tokens;
  const updated = await AiTokenWallet.findOneAndUpdate({ userId }, { $inc: { tokens: delta } }, { new: true });
  await writeLog({ userId, source, delta, balanceAfter: updated.tokens, detail, refId });
  return updated.tokens;
}

module.exports = {
  DEFAULT_TOKENS,
  FREE_DAILY_LIMIT,
  CLAUDE_MODELS,
  DEFAULT_CLAUDE_MODEL,
  EFFORTS,
  DEFAULT_EFFORT,
  TOKEN_PACKS,
  findModel,
  findEffort,
  findPack,
  tokenCost,
  getWallet,
  freeUsedToday,
  takeFreeRun,
  returnFreeRun,
  chargeTokens,
  addTokens,
};
