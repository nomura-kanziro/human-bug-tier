// ========================================================
// sync-from-render.mjs — root-render(바닐라 정본) → React 앱 자산 동기화
// ========================================================
//   node scripts/sync-from-render.mjs
//
// 1) 캐릭터·로고 이미지(tier-media) 를 public/ 으로 복사
// 2) 공유 CSS 를 src/styles/ 로 복사하면서, 루트 기준 상대경로 url('tier-media/…') 을
//    절대경로 url('/tier-media/…') 로 고쳐 쓴다.
//    (바닐라는 CSS 가 사이트 루트에 있어 상대경로가 맞지만, Vite 는 /assets/ 로 번들되므로 깨진다)
// 3) 티어 데이터는 extract-tiers.mjs 가 따로 담당 — 여기서 이어서 호출한다.
//
// src/styles/react-extra.css 와 tier-board.css 는 React 전용이라 건드리지 않는다.
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const render = resolve(here, '../../root-render');
const app = resolve(here, '..');

// [바닐라 경로, React 파일명] — 이름이 겹치는 것(login.css 등)은 접두사를 붙여 구분한다
const CSS_FILES = [
  ['theme.css', 'theme.css'],
  ['loading-screen.css', 'loading-screen.css'],
  ['common.css', 'common.css'],
  ['Header_Footer.css', 'Header_Footer.css'],
  ['index-home.css', 'index-home.css'],
  ['notice/notice.css', 'notice.css'],
  ['luck-draw/luck-draw.css', 'luck-draw.css'],
  ['custom-maker/custom-maker.css', 'custom-maker.css'],
  ['custom-maker/custom-maker_post/custom-maker_post.css', 'custom-maker_post.css'],
  ['custom-maker/custom-maker_post/post_detail.css', 'post_detail.css'],
  ['Contact_us/contact_us.css', 'contact_us.css'],
  ['my-page/my-page.css', 'my-page.css'],
  ['notifications/notifications.css', 'notifications.css'],
  ['tier-class/tier-nav.css', 'tier-nav.css'],
  ['user_login/login.css', 'auth-login.css'],
  ['user_login/sign_up.css', 'auth-signup.css'],
  ['user_login/find_account.css', 'auth-find.css'],
  ['admin/admin-login.css', 'admin-login.css'],
  ['admin/comments/comment-management.css', 'admin-manage.css'],
];

// 바닐라에서 페이지 단독으로 열리던 CSS 는 body/* 같은 전역 선택자를 쓴다. React 는 CSS 를
// 전부 전역으로 번들하므로 그대로 두면 다른 화면까지 망가진다 → 래퍼 클래스로 범위를 좁힌다.
const SCOPED = {
  'auth-login.css': '.auth-page',
  'auth-signup.css': '.auth-page',
  'auth-find.css': '.auth-page',
  'admin-login.css': '.auth-page',
  'contact_us.css': '.inquiry-page',
};

function scopeGlobalSelectors(css, wrapper) {
  return css
    .replace(/(^|\n)\s*\*\s*\{/g, `$1${wrapper} *, ${wrapper} {`)
    .replace(/(^|\n)\s*body\s*\{/g, `$1${wrapper} {`)
    .replace(/(^|\n)\s*html\s*\{/g, `$1${wrapper} {`)
    // .logo/.logo-img 는 공용 헤더(Header_Footer.css)에도 같은 이름이 있다. 독립 페이지에서만
    // 쓰던 절대배치 로고 스타일이 전역으로 번져 헤더 로고와 겹치는 걸 막기 위해 래퍼로 좁힌다.
    .replace(/(^|\n)(\s*)\.logo(-img)?(\s*[,{])/g, `$1$2${wrapper} .logo$3$4`);
}

// url('tier-media/…') · url("tier-media/…") · url(tier-media/…) 전부 절대경로로
function toAbsoluteAssetUrls(css) {
  return css.replace(/url\((\s*['"]?)(\.{0,2}\/)*tier-media\//g, "url($1/tier-media/");
}

mkdirSync(resolve(app, 'src/styles'), { recursive: true });

let changed = 0;
for (const [src, dest] of CSS_FILES) {
  const raw = readFileSync(resolve(render, src), 'utf8');
  let fixed = toAbsoluteAssetUrls(raw);
  if (SCOPED[dest]) fixed = scopeGlobalSelectors(fixed, SCOPED[dest]);
  const out = resolve(app, 'src/styles', dest);
  writeFileSync(out, fixed, 'utf8');
  if (fixed !== raw) changed += 1;
  console.log(`css  ${src} → src/styles/${dest}${fixed !== raw ? `  (보정${SCOPED[dest] ? ` · ${SCOPED[dest]} 스코프` : ''})` : ''}`);
}

cpSync(resolve(render, 'tier-media'), resolve(app, 'public/tier-media'), { recursive: true });
console.log('img  root-render/tier-media → public/tier-media');

copyFileSync(resolve(render, 'manifest.webmanifest'), resolve(app, 'public/manifest.webmanifest'));
// 바닐라 매니페스트는 상대경로(./index.html)지만 SPA 는 루트가 시작점이다
const manifestPath = resolve(app, 'public/manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.start_url = '/';
manifest.scope = '/';
manifest.icons = (manifest.icons || []).map((i) => ({ ...i, src: `/${String(i.src).replace(/^\/+/, '')}` }));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('pwa  manifest.webmanifest (start_url·scope·icons 절대경로로 보정)');

console.log(`\n완료 — CSS ${CSS_FILES.length}개(경로 보정 ${changed}개). 이어서 티어 데이터를 추출하세요:`);
console.log('  npm run extract:tiers');
