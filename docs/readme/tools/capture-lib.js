// 캡처 공용 — 설치된 Chrome 을 puppeteer-core 로 띄우고 회원·관리자 세션을 만든다.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = 'http://127.0.0.1:5077';
const OUT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
}

async function newPage(browser, { width = 1280, height = 800, dpr = 1, mobile = false, theme = 'light' } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await page.evaluateOnNewDocument((t) => {
    // 테마 저장값(u 는 다음 자동 전환 시각)과 첫 방문 로딩 화면 생략 — 캡처 시각에 화면이 달라지지 않게 고정
    try { localStorage.setItem('hbtTheme', JSON.stringify({ t, u: Date.now() + 864e5 })); } catch { /* noop */ }
  }, theme);
  return page;
}

async function post(url, body) {
  const res = await fetch(BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(`${url}: ${JSON.stringify(data)}`);
  return data;
}

async function loginUser(page, nickname = '티어장인') {
  const data = await post('/api/auth/login', { userId: nickname, password: 'Demo!2345abc' });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((d) => {
    localStorage.setItem('authToken', d.token);
    localStorage.setItem('user', JSON.stringify(d.user));
    localStorage.setItem('loginAt', String(Date.now()));
  }, data);
}

async function loginAdmin(page) {
  const data = await post('/api/admin/login', { loginId: 'demo-admin', password: 'demo-admin-pass!' });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((d) => {
    localStorage.setItem('adminAuthToken', d.token);
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('adminName', d.name || (d.admin && d.admin.name) || '관리자');
    localStorage.setItem('loginAt', String(Date.now()));
  }, data);
}

async function visit(page, url, wait = 1500) {
  await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(wait);
}

async function shot(page, name, opts = {}) {
  const dir = path.join(OUT, opts.dir || 'screens');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: Boolean(opts.fullPage), clip: opts.clip });
  console.log('shot', name);
  return file;
}

// GIF 프레임을 raw/<name>/0001.png 로 저장 — make_gifs.py 가 GIF 로 묶는다
function recorder(page, name) {
  const dir = path.join(OUT, 'raw', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  const snap = async (hold = 1) => {
    const buf = await page.screenshot({ type: 'png' });
    for (let i = 0; i < hold; i += 1) {
      n += 1;
      fs.writeFileSync(path.join(dir, `${String(n).padStart(4, '0')}.png`), buf);
    }
  };
  return { snap, count: () => n };
}

module.exports = { BASE, OUT, sleep, launch, newPage, loginUser, loginAdmin, visit, shot, recorder, post };
