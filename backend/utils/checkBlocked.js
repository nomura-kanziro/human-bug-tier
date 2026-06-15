const Block = require('../models/Block');

async function findActiveBlock(value) {
  if (!value) return null;
  const now = new Date();
  return Block.findOne({ value, expiresAt: { $gt: now } });
}

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