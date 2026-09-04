// ========================================================
// paths.js — 이미지 경로 정규화 + 바닐라 URL → React 라우트 매핑
// ========================================================
// 서버(luckPool, LuckDraw, Notice link 등)는 'tier-media/tier-image/…' 또는 'tier-image/…' 접두사로
// 이미지 경로를 내려준다(backend/utils/tierMediaDir.js). React 앱은 public/tier-media/tier-image/ 에
// 이미지를 두므로 어떤 접두사가 와도 여기서 한 번에 맞춘다. getBasePath() 상대경로 계산은
// SPA에서는 필요 없고, 항상 사이트 루트 기준 절대경로를 쓴다(Vite base '/').
export const TIER_IMAGE_ROOT = '/tier-media/tier-image/';

export function tierImageUrl(rawPath) {
  if (!rawPath) return '';
  if (/^(https?:|data:|blob:)/i.test(rawPath)) return rawPath;
  const stripped = String(rawPath).replace(/^(\.\.\/|\.\/|\/)*/, '')
    .replace(/^tier-media\/tier-image\/|^tier-image\/|^tier-media\//, '');
  return TIER_IMAGE_ROOT + encodeURI(stripped);
}

export const LOGO_URL = `${TIER_IMAGE_ROOT}logo.webp`;
export const tierIconUrl = (n) => `${TIER_IMAGE_ROOT}logo2-${n}.png`;

// 바닐라 시대 링크(알림 link, 외부 공유 URL 등)를 React 라우트로 변환.
// 아직 이식되지 않은 영역은 같은 경로명을 유지해 PendingPage 로 떨어진다.
export function legacyToRoute(href) {
  if (!href) return '/';
  let path = String(href).trim();
  let search = '';
  try {
    const u = new URL(path, window.location.origin);
    if (u.origin !== window.location.origin && /^https?:/i.test(path)) return path;
    path = u.pathname;
    search = u.search;
  } catch { /* 상대경로 그대로 */ }
  path = path.replace(/^(\.\.\/|\.\/)+/, '/').replace(/^\/?/, '/');
  const params = new URLSearchParams(search);

  const tier = path.match(/tier-class\/tier(\d)\.html$/i);
  if (tier) return `/tier/${tier[1]}`;
  if (/index\.html$/i.test(path)) return '/';
  if (/notice\/notice-detail\.html$/i.test(path)) return params.get('id') ? `/notice/${params.get('id')}` : '/notice';
  if (/notice\/all_notices\.html$/i.test(path)) return '/notice/all';
  if (/notice\/news\.html$/i.test(path)) return '/notice/news';
  if (/notice\/notice\.html$/i.test(path)) return '/notice';
  if (/custom-maker_post\/post_detail\.html$/i.test(path)) return `/board/post${search}`;
  if (/custom-maker_post\/custom-maker_post\.html$/i.test(path)) return `/board${search}`;
  if (/custom-maker\/custom-maker\.html$/i.test(path)) return '/custom-maker';
  if (/custom-maker\/post_edit\.html$/i.test(path)) return `/board/edit${search}`;
  if (/luck-draw\/luck-draw\.html$/i.test(path)) return '/luck-draw';
  if (/my-page\/my-page\.html$/i.test(path)) return '/my-page';
  if (/notifications\/notifications\.html$/i.test(path)) return '/notifications';
  if (/Contact_us\/contact_us\.html$/i.test(path)) return `/inquiry${search}`;
  if (/user_login\/login\.html$/i.test(path)) return '/login';
  if (/user_login\/sign_up\.html$/i.test(path)) return '/signup';
  if (/user_login\/find_account\.html$/i.test(path)) return '/find-account';
  if (/user_login\/reset_password\.html$/i.test(path)) return `/reset-password${search}`;
  if (/admin\/admin-login\.html$/i.test(path)) return '/admin/login';
  if (/admin\/comments\/comment-management\.html$/i.test(path)) return '/admin';
  return `${path}${search}`;
}
