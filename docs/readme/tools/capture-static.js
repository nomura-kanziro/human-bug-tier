// 정지 화면 캡처 — docs/readme/screens/*.png
const { launch, newPage, loginUser, loginAdmin, visit, shot, sleep, BASE } = require('./capture-lib');

(async () => {
  const browser = await launch();
  const guest = await newPage(browser);
  await visit(guest, '/', 2500);
  await shot(guest, 'home');
  await visit(guest, '/tier/2'); await shot(guest, 'tier');
  await visit(guest, '/custom-maker'); await shot(guest, 'maker');
  await visit(guest, '/board'); await shot(guest, 'board');
  const firstId = await guest.evaluate(async (b) => {
    const r = await fetch(`${b}/api/tierlists`); const d = await r.json();
    const list = d.tierLists || d.posts || d; return (list.find((p) => p.title.includes('2티어')) || list[0])._id;
  }, BASE);
  await visit(guest, `/board/post?id=${firstId}`); await shot(guest, 'post');
  await visit(guest, '/notice'); await shot(guest, 'notice');
  await visit(guest, '/guide'); await shot(guest, 'guide');
  await visit(guest, '/login'); await shot(guest, 'login');
  await visit(guest, '/ai'); await shot(guest, 'ai');

  const user = await newPage(browser);
  await loginUser(user);
  await visit(user, '/my-page'); await shot(user, 'mypage');
  await visit(user, '/notifications'); await shot(user, 'notifications');
  await visit(user, '/luck-draw'); await shot(user, 'luck');
  await visit(user, '/event'); await shot(user, 'event');
  await visit(user, '/inquiry'); await shot(user, 'inquiry');

  const admin = await newPage(browser);
  await loginAdmin(admin);
  await visit(admin, '/admin', 2500); await shot(admin, 'admin');

  const dark = await newPage(browser, { theme: 'dark' });
  await visit(dark, '/', 2500); await shot(dark, 'home-dark');

  const phone = await newPage(browser, { width: 390, height: 844, dpr: 2, mobile: true });
  await visit(phone, '/', 2500); await shot(phone, 'phone-home');
  await visit(phone, '/tier/2'); await shot(phone, 'phone-tier');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
