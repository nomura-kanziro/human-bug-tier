/* ====================================================================
 * 행운 뽑기 포인트 증감 원장 기록 (models/LuckPointLog.js)
 * ------------------------------------------------------------------
 * 포인트를 바꾸는 코드는 LuckProfile 저장 직후 recordPointChange() 를 부른다.
 * 원장 기록은 부가 정보라서 실패해도 예외를 던지지 않는다 — 뽑기·정산·보상 지급 자체가
 * 원장 때문에 실패하면 안 되기 때문이다(실패는 로그로만 남긴다).
 * ==================================================================== */
const LuckPointLog = require('../models/LuckPointLog');

async function recordPointChange({ userId, source, delta, balanceAfter, detail = '', refId = null }) {
  const amount = Number(delta) || 0;
  if (!userId || amount === 0) return;
  try {
    await LuckPointLog.create({
      userId,
      source,
      delta: amount,
      balanceAfter: Number(balanceAfter) || 0,
      detail: String(detail || '').slice(0, 200),
      refId: refId || null,
    });
  } catch (err) {
    console.error('포인트 원장 기록 실패:', err.message);
  }
}

module.exports = { recordPointChange };
