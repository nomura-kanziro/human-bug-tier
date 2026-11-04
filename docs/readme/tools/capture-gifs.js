// 움직이는 장면 프레임 + 추가 정지 화면 캡처 — make_gifs.py 가 raw/ 를 GIF 로 묶는다
const { BASE, launch, newPage, loginUser, visit, shot, sleep, recorder, post } = require('./capture-lib');

const only = process.argv.slice(2);
const want = (name) => only.length === 0 || only.includes(name);

async function addCursor(page) {
  await page.evaluate(() => {
    const c = document.createElement('div');
    c.id = '__cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 12-7 1-3 7z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>';
    document.body.appendChild(c);
  });
}

const moveCursor = (page, x, y) => page.evaluate((a, b) => {
  document.getElementById('__cursor').style.transform = `translate(${a}px,${b}px)`;
}, x, y);

const rectOf = (page, sel, i = 0) => page.evaluate((s, n) => {
  const el = document.querySelectorAll(s)[n];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
}, sel, i);

// HTML5 드래그를 실제 이벤트(dragstart → dragover → drop)로 일으키고, 끌리는 모습은 고스트로 보여 준다
async function dragTo(page, rec, fromSel, fromIndex, toSel, toIndex) {
  const a = await rectOf(page, fromSel, fromIndex);
  const b = await rectOf(page, toSel, toIndex);
  await page.evaluate((s, n) => {
    const el = document.querySelectorAll(s)[n];
    const g = el.cloneNode(true);
    g.id = '__ghost';
    g.style.cssText = `position:fixed;left:0;top:0;margin:0;width:${el.offsetWidth}px;height:${el.offsetHeight}px;z-index:2147483646;pointer-events:none;opacity:.92;box-shadow:0 12px 26px rgba(0,0,0,.45);`;
    document.body.appendChild(g);
    window.__dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: window.__dt }));
  }, fromSel, fromIndex);
  const steps = 7;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const e = t * t * (3 - 2 * t);
    const x = a.x + (b.x - a.x) * e;
    const y = a.y + (b.y - a.y) * e;
    await moveCursor(page, x, y);
    await page.evaluate((px, py, w, h) => {
      document.getElementById('__ghost').style.transform = `translate(${px - w / 2}px,${py - h / 2}px) scale(1.06)`;
    }, x, y, a.w, a.h);
    await rec.snap();
  }
  await page.evaluate((s, n, fs, fn) => {
    const zone = document.querySelectorAll(s)[n];
    const src = document.querySelectorAll(fs)[fn];
    zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
    if (src) src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: window.__dt }));
    document.getElementById('__ghost').remove();
  }, toSel, toIndex, fromSel, fromIndex);
  await sleep(150);
  await rec.snap(2);
}

async function maker(browser) {
  const page = await newPage(browser, { width: 1280, height: 1120 });
  await loginUser(page);
  await visit(page, '/custom-maker');
  await page.evaluate(() => {
    const y = document.querySelector('.tier-nav').getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo(0, y);
  });
  await sleep(400);
  await addCursor(page);
  const rec = recorder(page, 'maker');
  await rec.snap(5);
  const POOL = '.character-pool .char';
  for (const zone of [0, 0, 0, 1, 1, 2, 2, 3]) {
    await dragTo(page, rec, POOL, 0, '.drop-zone', zone);
  }
  await rec.snap(10);
  await shot(page, 'maker');
  await page.close();
}

async function tiers(browser) {
  const page = await newPage(browser, { width: 1280, height: 820 });
  await visit(page, '/tier/1');
  const rec = recorder(page, 'tier');
  await rec.snap(8);
  for (const n of [2, 3, 5]) {
    await page.evaluate((v) => {
      const b = [...document.querySelectorAll('.tier-switch-nav a, .tier-switch-nav button')]
        .find((x) => x.textContent.trim().startsWith(String(v)));
      b.click();
    }, n);
    await sleep(900);
    await rec.snap(10);
  }
  await page.close();
}

async function luck(browser) {
  const page = await newPage(browser, { width: 1280, height: 820 });
  await loginUser(page, process.env.LUCK_USER || '랭킹분석가');
  await visit(page, '/luck-draw');
  const rec = recorder(page, 'luck');
  await rec.snap(6);
  await page.evaluate(() => document.querySelector('.luck-tab-panel.active .luck-draw-btn').click());
  // 두근두근 연출이 끝나 결과가 나올 때까지 찍는다
  for (let i = 0; i < 90; i += 1) {
    await rec.snap();
    await sleep(120);
    if (i > 5 && !(await page.evaluate(() => document.querySelector('.luck-tab-panel.active').innerText.includes('두근두근')))) break;
  }
  await sleep(600);
  await rec.snap(26);
  await shot(page, 'luck');
  await visit(page, '/luck-draw#poker'); await shot(page, 'poker');
  await visit(page, '/luck-draw#random'); await shot(page, 'ladder');
  await page.close();
}

async function quiz(browser) {
  const page = await newPage(browser, { width: 1280, height: 820 });
  await loginUser(page, '도쿄의밤');
  await visit(page, '/event');
  await page.evaluate(() => {
    const y = document.querySelector('.event-quiz-card').getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo(0, y);
  });
  const rec = recorder(page, 'quiz');
  await rec.snap(10);
  await page.click('.event-quiz-choice:nth-child(1)');
  await sleep(300);
  await rec.snap(7);
  await page.evaluate(() => document.querySelector('.event-quiz-card .event-btn').click());
  await sleep(1100);
  await rec.snap(26);
  await page.close();
}

async function memory(browser) {
  const page = await newPage(browser, { width: 1280, height: 900 });
  await loginUser(page, process.env.MEMORY_USER || '티어장인');
  await visit(page, '/event#memory');
  await page.evaluate(() => {
    const y = document.querySelector('.event-memory').getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo(0, y);
  });
  const rec = recorder(page, 'memory');
  await rec.snap(6);
  await page.evaluate(() => document.querySelector('.event-memory-bar .event-btn').click());
  await sleep(900);
  await rec.snap(4);
  const seen = {};
  const flip = async (i) => {
    await page.evaluate((n) => document.querySelectorAll('.event-card')[n].click(), i);
    await sleep(170);
    await rec.snap(2);
    return page.evaluate((n) => {
      const im = document.querySelectorAll('.event-card')[n].querySelector('img');
      return im && im.getAttribute('src');
    }, i);
  };
  const open = () => page.evaluate(() => [...document.querySelectorAll('.event-card')]
    .map((c, i) => (c.classList.contains('is-matched') ? -1 : i)).filter((i) => i >= 0));
  // 처음 보는 카드를 뒤집으며 외우고, 짝을 아는 순간 맞춘다 (사람이 푸는 방식 그대로)
  for (let guard = 0; guard < 40; guard += 1) {
    const left = await open();
    if (left.length === 0 || (await page.evaluate(() => !document.querySelector('.event-memory-grid.size-4')))) break;
    const known = {};
    let pair = null;
    for (const i of left) {
      const src = seen[i];
      if (src && known[src] !== undefined) { pair = [known[src], i]; break; }
      if (src) known[src] = i;
    }
    if (pair) {
      await flip(pair[0]); await flip(pair[1]);
      await sleep(350); await rec.snap();
    } else {
      const unseen = left.filter((i) => !seen[i]);
      const first = unseen[0];
      const src = await flip(first); seen[first] = src;
      const twin = left.find((i) => i !== first && seen[i] === src);
      const second = twin !== undefined ? twin : unseen[1];
      const src2 = await flip(second); seen[second] = src2;
      await sleep(src === src2 ? 350 : 1000); await rec.snap();
    }
  }
  await sleep(1500);
  await rec.snap(16);
  await page.close();
}

async function ai(browser) {
  const page = await newPage(browser, { width: 1180, height: 1040 });
  await visit(page, '/ai', 2500);
  const toChat = () => page.evaluate(() => {
    window.scrollTo(0, document.querySelector('.ai-head').getBoundingClientRect().top + window.scrollY - 80);
  });
  await toChat();
  const rec = recorder(page, 'ai');
  await rec.snap(8);
  await page.type('.ai-form textarea, .ai-form input', '티어표에서 갑을병정무는 뭐야?', { delay: 45 });
  await toChat();
  await rec.snap(4);
  await page.click('.ai-send');
  await sleep(400);
  await toChat();
  const t0 = Date.now();
  let typingFrames = 0;
  while (Date.now() - t0 < 150000) {
    const busy = await page.evaluate(() => Boolean(document.querySelector('.ai-typing')));
    if (!busy) break;
    if (typingFrames < 10) { await rec.snap(); typingFrames += 1; }
    await sleep(400);
  }
  console.log('ai answered in', Math.round((Date.now() - t0) / 1000), 's');
  await sleep(500);
  await toChat();
  await sleep(200);
  await rec.snap(32);
  await shot(page, 'ai');
  await page.close();
}

async function guide(browser) {
  const page = await newPage(browser, { width: 1280, height: 800 });
  await visit(page, '/guide');
  const rec = recorder(page, 'guide');
  await rec.snap(7);
  await page.click('.guide-start-btn');
  for (let i = 0; i < 6; i += 1) {
    await sleep(1100);
    await rec.snap(11);
    await page.click('.guide-btn-primary');
  }
  await sleep(1200);
  await rec.snap(14);
  await page.close();
}

async function theme(browser) {
  const page = await newPage(browser, { width: 1280, height: 720 });
  await visit(page, '/', 2500);
  const rec = recorder(page, 'theme');
  await rec.snap(10);
  await page.click('#theme-toggle-btn');
  for (let i = 0; i < 5; i += 1) { await sleep(90); await rec.snap(); }
  await rec.snap(12);
  await page.click('#theme-toggle-btn');
  for (let i = 0; i < 5; i += 1) { await sleep(90); await rec.snap(); }
  await rec.snap(4);
  await page.close();
}

async function extras(browser) {
  const guest = await newPage(browser);
  await visit(guest, '/', 2500);
  await guest.evaluate(() => document.querySelector('#home-tiers').scrollIntoView({ block: 'center' }));
  await sleep(700);
  await shot(guest, 'home-tiers');
  const id = await guest.evaluate(async (b) => {
    const d = await (await fetch(`${b}/api/tierlists`)).json();
    const list = d.tierLists || d.posts || d;
    return list.find((p) => p.title.includes('2티어'))._id;
  }, BASE);
  await visit(guest, `/board/post?id=${id}`);
  await guest.evaluate(() => {
    [...document.querySelectorAll('.tier-switch-pages button, .tier-switch-pages a')]
      .find((x) => x.textContent.trim().startsWith('2')).click();
  });
  await sleep(1000);
  await shot(guest, 'post');

  const phone = await newPage(browser, { width: 390, height: 844, dpr: 2, mobile: true });
  await visit(phone, '/custom-maker');
  console.log('phone maker widths', await phone.evaluate(() => ({
    viewport: innerWidth,
    scroll: document.documentElement.scrollWidth,
    board: Math.round(document.querySelector('.tier-list')?.getBoundingClientRect().right || 0),
    capture: Math.round(document.querySelector('#tier-capture-area')?.getBoundingClientRect().right || 0),
  })));
  await phone.close();

  const { token } = await post('/api/admin/login', { loginId: 'demo-admin', password: 'demo-admin-pass!' });
  for (const season of ['halloween', 'christmas', 'none']) {
    const r = await fetch(`${BASE}/api/admin/site/seasonal-theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ theme: season, seasonalTheme: season, value: season }),
    });
    console.log('season', season, r.status);
    if (season !== 'none') {
      const p = await newPage(browser, { theme: season === 'halloween' ? 'dark' : 'light' });
      await visit(p, '/', 3000);
      await shot(p, `season-${season}`);
      await p.close();
    }
  }
  await guest.close();
}

const SCENES = { maker, tiers, luck, quiz, memory, ai, guide, theme, extras };

(async () => {
  const browser = await launch();
  for (const [name, fn] of Object.entries(SCENES)) {
    if (want(name)) {
      console.log('==', name);
      try { await fn(browser); } catch (e) { console.error('FAIL', name, e.message); }
    }
  }
  await browser.close();
})();
