const SITE_MARKERS = [
  'Contact_us',
  'tier-class',
  'user_login',
  'custom-maker',
  'notice',
  'admin',
  'news',
  'all_notices',
];

function getSiteRoot() {
  const path = window.location.pathname.replace(/\\/g, '/');

  for (const marker of SITE_MARKERS) {
    const needle = `/${marker}/`;
    const idx = path.indexOf(needle);
    if (idx !== -1) {
      return path.slice(0, idx + 1);
    }
  }

  if (path.endsWith('/index.html')) {
    return path.replace(/index\.html$/, '');
  }

  if (path.endsWith('/')) {
    return path;
  }

  const lastSlash = path.lastIndexOf('/');
  if (lastSlash <= 0) {
    return '/';
  }

  return path.slice(0, lastSlash + 1);
}

function siteUrl(relativePath) {
  const clean = String(relativePath || '').replace(/\\/g, '/').replace(/^\//, '');
  return getSiteRoot() + clean;
}

function getBasePath() {
  return getSiteRoot();
}