// root-render/tier-class/tier1~9.html(바닐라 정본)을 파싱해 src/data/tiers.json 을 만든다.
// 캐릭터 추가/재배치는 여전히 바닐라 HTML에서 하고, 이 스크립트로 React 데이터를 다시 뽑는다.
//   node scripts/extract-tiers.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../root-render/tier-class');
const outFile = resolve(here, '../src/data/tiers.json');

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

// "../tier-media/tier-image/1 tier/x.jpg" → "1 tier/x.jpg"
const stripImg = (src) => src.replace(/^(\.\.\/)*(tier-media\/tier-image\/|tier-image\/|tier-media\/)/, '');

function parseTier(n) {
  const html = readFileSync(resolve(srcDir, `tier${n}.html`), 'utf8');
  const title = decode((html.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || `${n}티어`);
  const rows = [];
  const rowRe = /<div class="tier-row">([\s\S]*?)<\/div>\s*<\/div>\s*(?=<!--|<div class="tier-row">|<\/section>)/g;
  let m;
  while ((m = rowRe.exec(html))) {
    const block = m[1];
    const labelRaw = (block.match(/<div class="tier-label">([\s\S]*?)<\/div>/) || [])[1] || '';
    const label = decode(labelRaw.replace(/<br\s*\/?>/gi, '\n'));
    const cardsHtml = block.slice(block.indexOf('<div class="tier-cards">'));
    const items = [];
    const itemRe = /<div class="char">([\s\S]*?)<\/div>|<div style="flex-basis:\s*100%;?"><\/div>/g;
    let c;
    while ((c = itemRe.exec(cardsHtml))) {
      if (c[1] === undefined) { items.push({ break: true }); continue; }
      const img = (c[1].match(/src="([^"]+)"/) || [])[1] || '';
      const alt = decode((c[1].match(/alt="([^"]*)"/) || [])[1] || '');
      const name = decode((c[1].match(/<span>([\s\S]*?)<\/span>/) || [])[1] || '');
      items.push({ img: stripImg(img), alt, name });
    }
    rows.push({ label, items });
  }
  return { tier: n, title, rows };
}

const tiers = {};
for (let n = 1; n <= 9; n += 1) {
  tiers[n] = parseTier(n);
  const count = tiers[n].rows.reduce((a, r) => a + r.items.filter((i) => !i.break).length, 0);
  console.log(`tier${n}: ${tiers[n].rows.length} rows, ${count} chars — ${tiers[n].title}`);
}
writeFileSync(outFile, JSON.stringify(tiers, null, 2) + '\n', 'utf8');
console.log('→', outFile);
