/* ====================================================================
 * 차단(Block) 여부 조회 유틸
 * ------------------------------------------------------------------
 * 관리자가 특정 닉네임 또는 IP를 신고/제재 목적으로 차단하면 Block 컬렉션에
 * { value, expiresAt } 형태로 저장된다(value는 닉네임일 수도, IP일 수도 있음).
 * 여기서는 그 컬렉션을 조회해 "지금 이 순간 유효한 차단"이 있는지만 판단한다.
 * ==================================================================== */
const Block = require('../models/Block');

// value(닉네임 또는 IP) 하나에 대해 만료되지 않은(expiresAt이 현재 시각보다 미래인)
// 차단 레코드를 찾는다. expiresAt이 지난 차단은 findOne 조건에 걸리지 않으므로
// 별도의 삭제/정리 배치 없이도 자동으로 "해제된" 것처럼 동작한다.
async function findActiveBlock(value) {
  if (!value) return null;
  const now = new Date();
  return Block.findOne({ value, expiresAt: { $gt: now } });
}

// 닉네임과 IP 두 기준으로 순서대로 차단 여부를 확인한다.
// 닉네임 차단이 없으면 IP 차단도 확인해, 닉네임을 바꿔서 재가입/재접속해도
// 같은 IP로는 계속 차단되도록 한다. 둘 중 하나라도 걸리면 그 즉시 반환(단락 평가).
async function isUserBlocked(nickname, ip) {
  const byNickname = await findActiveBlock(nickname);
  if (byNickname) return byNickname;

  if (ip) {
    const byIp = await findActiveBlock(ip);
    if (byIp) return byIp;
  }

  return null;
}

module.exports = { findActiveBlock, isUserBlocked };