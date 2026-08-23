function getAppBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  // Render는 웹 서비스마다 RENDER_EXTERNAL_URL을 자동으로 주입한다 (설정 불필요).
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
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