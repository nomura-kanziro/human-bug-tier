function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const ip = req.socket?.remoteAddress || req.ip || 'unknown';
  return ip.replace(/^::ffff:/, '');
}

module.exports = getClientIp;