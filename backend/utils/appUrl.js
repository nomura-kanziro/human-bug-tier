function getAppBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  if (req) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host) {
      return `${proto}://${host}`;
    }
  }

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

module.exports = { getAppBaseUrl };