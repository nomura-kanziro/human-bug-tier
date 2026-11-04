// README 다이어그램을 HTML 로 그려 PNG 로 렌더링한다 — docs/readme/diagrams/*.png
// GitHub 의 밝은·어두운 테마 어디서나 읽히도록 배경을 이미지 안에 넣는다. 사실이 바뀌면 여기를 고치고 다시 돌린다.
const fs = require('fs');
const path = require('path');
const icons = require('simple-icons');
const { launch, sleep, OUT } = require('./capture-lib');

const ROOT = path.resolve(__dirname, '../../..');
const IMG = path.join(ROOT, 'root-cloudflare/public/tier-media/tier-image');
const tiers = require(path.join(ROOT, 'root-cloudflare/src/data/tiers.json'));
const fileUrl = (p) => `file:///${p.replace(/\\/g, '/').split('/').map(encodeURI).join('/').replace(/#/g, '%23')}`;

function logo(key, label, color) {
  const ic = icons[key];
  if (!ic) return `<span class="mono" style="background:${color || '#475569'}">${label[0]}</span>`;
  return `<svg viewBox="0 0 24 24" class="ic"><path d="${ic.path}" fill="${color || `#${ic.hex}`}"/></svg>`;
}

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard','Malgun Gothic','Apple SD Gothic Neo',sans-serif;background:#0f1117;color:#e7e9ee;-webkit-font-smoothing:antialiased}
.canvas{padding:44px 48px;background:radial-gradient(1200px 500px at 12% -10%,rgba(245,158,11,.14),transparent 60%),#0f1117}
h1{font-size:30px;font-weight:800;letter-spacing:-.02em}
.sub{color:#9aa3b2;font-size:16px;margin-top:6px}
.ic{width:30px;height:30px;flex:none}
.mono{width:30px;height:30px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:15px}
.tag{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;display:inline-block}
.warn{background:rgba(245,158,11,.16);color:#fbbf24;border:1px solid rgba(245,158,11,.4)}
.ok{background:rgba(34,197,94,.14);color:#4ade80;border:1px solid rgba(34,197,94,.36)}
`;

function hero() {
  const pool = Object.values(tiers).flatMap((t) => t.rows.flatMap((r) => r.items)).filter((c) => c.img);
  const pick = [0, 9, 24, 31, 48, 62, 77, 95, 111, 128, 146, 171, 190, 214, 238, 262, 281, 300]
    .map((i) => pool[i % pool.length]);
  const cells = pick.map((c) => `<div class="c" style="background-image:url('${fileUrl(path.join(IMG, c.img))}')"></div>`).join('');
  const chips = ['9단계 공식 티어표', '캐릭터 338명', '드래그 앤 드롭 메이커', '게시판 · 알림', '행운 뽑기 · 이벤트', 'AI 도우미 휴버봇']
    .map((t) => `<span>${t}</span>`).join('');
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.hero{position:relative;height:500px;overflow:hidden;background:#0b0c10}
.grid{position:absolute;right:-30px;top:-46px;display:grid;grid-template-columns:repeat(6,132px);gap:10px;transform:rotate(-5deg)}
.c{width:132px;height:190px;border-radius:12px;background-size:cover;background-position:center top;box-shadow:0 6px 22px rgba(0,0,0,.5)}
.fade{position:absolute;inset:0;background:linear-gradient(90deg,#0b0c10 40%,rgba(11,12,16,.84) 58%,rgba(11,12,16,.2) 100%)}
.txt{position:absolute;left:64px;top:70px;width:800px}
.brand{display:flex;align-items:center;gap:18px}
.brand img{width:84px;height:84px;border-radius:50%;background:#fff}
.txt h1{font-size:64px;letter-spacing:-.03em}
.txt h1 b{color:#f59e0b}
.txt p{font-size:23px;line-height:1.55;color:#c7ccd6;margin-top:22px}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}
.chips span{font-size:17px;font-weight:600;padding:9px 16px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.17)}
</style>
<div class="hero"><div class="grid">${cells}</div><div class="fade"></div>
<div class="txt"><div class="brand"><img src="${fileUrl(path.join(IMG, 'logo.webp'))}"><h1>휴버대 <b>티어표</b></h1></div>
<p>'휴먼버그대학교' 캐릭터의 공식 티어를 보고, 나만의 티어표를 만들어<br>공유하고, 매일 뽑기와 이벤트까지 즐기는 팬 커뮤니티 사이트</p>
<div class="chips">${chips}</div></div></div>`,
  };
}

function stack() {
  const groups = [
    ['프론트엔드', '#38bdf8', 'root-cloudflare/', [
      ['siReact', 'React 18', '화면 전체 — 페이지 25개', '#61dafb'],
      ['siVite', 'Vite 5', '빌드 · 개발 서버(HMR)'],
      ['siReactrouter', 'React Router 6', '절대 경로 라우팅', '#f44250'],
      ['siHtml5', 'html2canvas · jsPDF', '티어표 PNG · PDF 저장'],
    ]],
    ['백엔드', '#4ade80', 'backend/', [
      ['siNodedotjs', 'Node.js', '서버 런타임'],
      ['siExpress', 'Express 5', 'API 라우터 11개 + 정적 서빙', '#ffffff'],
      ['siMongodb', 'MongoDB · Mongoose', '컬렉션 22개'],
      ['siJsonwebtokens', 'JWT · bcryptjs', '회원 / 관리자 토큰 분리', '#ffffff'],
    ]],
    ['AI 서비스', '#c084fc', 'ai-service/', [
      ['siFastapi', 'FastAPI', '챗봇 API (127.0.0.1:8000)'],
      ['siLangchain', 'LangChain', '문서 분할 · 모델 연결', '#ffffff'],
      ['siLanggraph', 'LangGraph', '질문 처리 흐름(조건 분기)', '#ffffff'],
      ['siOllama', 'Ollama · Claude', '답변 생성 모델 선택', '#ffffff'],
    ]],
    ['인프라', '#fb923c', 'backend/deploy/ · functions/', [
      ['siCloudflarepages', 'Cloudflare Pages', '프론트 + /api 프록시'],
      ['siOracle', 'Oracle Cloud VM', '백엔드 운영 서버', '#f80000'],
      ['siNginx', 'nginx · PM2', 'HTTPS · 프로세스 유지'],
      ['siGithubactions', 'GitHub Actions', '빌드 · 배포 워크플로'],
    ]],
  ];
  const cols = groups.map(([name, color, dir, items]) => `
<div class="col"><div class="head" style="border-color:${color}"><b style="color:${color}">${name}</b><code>${dir}</code></div>
${items.map(([k, t, d, c]) => `<div class="row">${logo(k, t, c)}<div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>`).join('');
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.cols{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}
.col{background:#171a22;border:1px solid #272b36;border-radius:16px;padding:20px}
.head{border-left:4px solid;padding-left:12px;margin-bottom:14px}
.head b{font-size:20px;display:block}
.head code{font-size:13px;color:#8b93a3;font-family:Consolas,monospace}
.row{display:flex;gap:14px;align-items:center;padding:13px 4px;border-top:1px solid #232733}
.row b{font-size:17px}
.row p{font-size:14px;color:#9aa3b2;margin-top:2px}
</style><div class="canvas"><h1>기술 스택</h1><p class="sub">어떤 프레임워크가 어느 폴더에서 무슨 일을 하는지</p><div class="cols">${cols}</div></div>`,
  };
}

function architecture() {
  const node = (cls, ico, title, lines, extra = '') => `<div class="n ${cls}"><div class="t">${ico}<b>${title}</b></div>${lines.map((l) => `<p>${l}</p>`).join('')}${extra}</div>`;
  const arrow = (label) => `<div class="a"><span>${label}</span><i></i></div>`;
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.flow{display:flex;align-items:stretch;margin-top:30px}
.n{flex:1;background:#171a22;border:1px solid #2a2e3a;border-radius:14px;padding:18px;min-width:0}
.t{display:flex;gap:11px;align-items:center;margin-bottom:10px}
.t b{font-size:18px}
.n p{font-size:14px;color:#a4acba;line-height:1.55}
.n code{font-family:Consolas,monospace;font-size:13px;color:#fbbf24}
.a{width:92px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0 4px}
.a span{font-size:12.5px;color:#9aa3b2;text-align:center;line-height:1.3}
.a i{display:block;width:100%;height:2px;background:#f59e0b;position:relative}
.a i:after{content:'';position:absolute;right:-1px;top:-5px;border-left:10px solid #f59e0b;border-top:6px solid transparent;border-bottom:6px solid transparent}
.vm{border:1.5px dashed #fb923c;border-radius:18px;padding:30px 14px 14px;display:flex;flex:3.25;position:relative;margin:0}
.vm>label{position:absolute;top:8px;left:16px;font-size:13px;font-weight:700;color:#fb923c}
.lower{display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:18px;margin-top:22px}
.lower .n h3{font-size:16px;margin-bottom:8px}
.lower li{font-size:14px;color:#a4acba;line-height:1.6;margin-left:18px}
</style><div class="canvas"><h1>시스템 아키텍처</h1><p class="sub">브라우저는 API 하나만 본다. AI 서비스는 Express 뒤에 숨겨져 외부에 열리지 않는다</p>
<div class="flow">
${node('', logo('siGooglechrome', '브라우저', '#e7e9ee'), '브라우저', ['React SPA', '<code>authToken</code>', '<code>adminAuthToken</code>'])}
${arrow('HTTPS')}
${node('', logo('siCloudflarepages', 'CF'), 'Cloudflare Pages', ['<code>dist/</code> 정적 파일', 'Pages Function', '<code>/api/*</code> 프록시'])}
${arrow('/api/*')}
<div class="vm"><label>Oracle Cloud VM</label>
${node('', logo('siNginx', 'nginx'), 'nginx', [':443 Let\'s Encrypt', '외부 포트는', '80 · 443 만'])}
${arrow('')}
${node('', logo('siExpress', 'Ex', '#ffffff'), 'Express', ['PM2 <code>human-bug-tier</code>', '<code>:5000</code> 라우터 11개', 'requireAuth / Admin'])}
${arrow('X-AI-Key')}
${node('', logo('siFastapi', 'FA'), 'ai-service', ['PM2 <code>hbt-ai</code>', '<code>127.0.0.1:8000</code>', '<span class="tag warn">배포 준비 완료</span>'])}
</div></div>
<div class="lower">
<div class="n"><div class="t">${logo('siMongodb', 'M')}<b>MongoDB Atlas</b></div><p>회원 · 게시글 · 공지 · 문의 · 알림 · 포인트 · 이벤트. Express 만 접속한다.</p></div>
<div class="n"><div class="t">${logo('siOllama', 'O', '#ffffff')}<b>답변 모델 (선택)</b></div><p><code>AI_LLM_PROVIDER</code> = <code>ollama</code> · <code>anthropic</code> · <code>none</code>. <code>none</code> 이면 지식 문서로 답한다.</p></div>
<div class="n"><div class="t">${logo('siGithubactions', 'GH')}<b>배포 경로</b></div><p>프론트: <code>wrangler pages deploy</code> 또는 master 푸시(Actions)<br>서버: <code>deploy.sh deploy</code> — 로컬 코드를 묶어 릴리스 폴더로 올리고 <code>current</code> 링크를 교체</p></div>
</div></div>`,
  };
}

function aiFlow() {
  const box = (cls, t, d) => `<div class="b ${cls}"><b>${t}</b><p>${d}</p></div>`;
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.g{display:grid;grid-template-columns:230px 60px 250px 60px 290px 60px 1fr;align-items:center;margin-top:30px}
.b{background:#171a22;border:1px solid #2a2e3a;border-radius:14px;padding:16px}
.b b{font-size:18px}
.b p{font-size:14px;color:#a4acba;line-height:1.5;margin-top:5px}
.b.p{border-color:#c084fc}.b.p b{color:#d8b4fe}
.b.y{border-color:#f59e0b}.b.y b{color:#fbbf24}
.b.g2{border-color:#4ade80}.b.g2 b{color:#86efac}
.b.r{border-color:#f87171}.b.r b{color:#fca5a5}
.ar{height:2px;background:#6b7280;position:relative}
.ar:after{content:'';position:absolute;right:-1px;top:-5px;border-left:10px solid #6b7280;border-top:6px solid transparent;border-bottom:6px solid transparent}
.stack{display:flex;flex-direction:column;gap:12px}
.src{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:26px}
.src code{font-family:Consolas,monospace;color:#fbbf24;font-size:13px}
</style><div class="canvas"><h1>휴버봇 질문 처리 (LangGraph · RAG)</h1><p class="sub"><code>service/graph.py</code> 의 실제 노드와 분기 — 사이트 지식 밖의 질문에는 지어내지 않고 범위 밖이라고 답한다</p>
<div class="g">
${box('', '질문 입력', '/api/ai/chat<br>입력 검사 · IP당 10분 20회')}
<div class="ar"></div>
${box('p', 'analyze', '인사인지, 프롬프트 인젝션인지, 일반 질문인지 판단')}
<div class="ar"></div>
<div class="stack">
${box('y', 'retrieve', '하이브리드 검색: BM25(2-gram) + ChromaDB(bge-m3) → RRF')}
${box('', 'greet', '인사에 정해진 문구로 답하고 끝')}
${box('r', 'refuse', '규칙 우회 시도를 막고 끝')}
</div>
<div class="ar" style="align-self:start;margin-top:48px"></div>
<div class="stack" style="align-self:start">
${box('g2', 'generate', '찾은 근거를 프롬프트에 넣어 답 생성 (Ollama / Claude). 모델이 없거나 꺼지면 문서 문장으로 답함')}
${box('r', 'out_of_scope', '근거가 부족하면 범위 밖이라고 안내')}
</div>
</div>
<div class="src">
<div class="b"><b>지식 원문</b><p><code>knowledge/*.md</code> 14개 + <code>tiers.json</code> 캐릭터 338명</p></div>
<div class="b"><b>대화 저장 안 함</b><p>대화를 DB 에 남기지 않는다. 최근 대화는 요청에 담겨 온 것만 쓴다</p></div>
<div class="b"><b>운영 가벼운 모드</b><p><code>requirements-prod.txt</code> — 1GB VM 에서는 BM25 만으로 동작</p></div>
</div></div>`,
  };
}

function featureMap() {
  const f = (ico, t, route, d, color) => `<div class="f" style="border-top-color:${color}"><span class="i">${ico}</span><b>${t}</b><code>${route}</code><p>${d}</p></div>`;
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.m{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:28px}
.f{background:#171a22;border:1px solid #2a2e3a;border-top:3px solid;border-radius:14px;padding:18px}
.i{font-size:30px;display:block}
.f b{font-size:19px;display:block;margin-top:8px}
.f code{font-family:Consolas,monospace;font-size:13px;color:#fbbf24;display:block;margin-top:4px}
.f p{font-size:14px;color:#a4acba;line-height:1.5;margin-top:8px}
</style><div class="canvas"><h1>기능 지도</h1><p class="sub">화면 주소와 하는 일을 한눈에</p><div class="m">
${f('🏆', '공식 티어표', '/tier/:n', '1~9티어를 세부 등급(갑·을·병·정 등, 2티어는 무까지)으로 나눈 캐릭터 338명', '#f59e0b')}
${f('🎨', '커스텀 메이커', '/custom-maker', '끌어다 놓기·꾸미기, PNG · PDF · JSON 저장, 게시판 업로드', '#38bdf8')}
${f('💬', '게시판', '/board', '티어표 공유, 댓글·답글, 좋아요, 신고, 본인 글 수정', '#4ade80')}
${f('🎲', '행운 뽑기', '/luck-draw', '오늘의 행운 티어(하루 20회), 티어 포커, 랜덤 사다리', '#c084fc')}
${f('🎉', '이벤트', '/event', '매일 퀴즈, 메모리 게임 순위전, 티어표 공개', '#fb7185')}
${f('🤖', 'AI 도우미', '/ai', '사이트 지식으로 답하는 휴버봇, 랜덤 추천 질문 3개', '#a78bfa')}
${f('🧭', '가이드 모드', '/guide', '화면을 직접 짚어 주는 스테이지 5개', '#22d3ee')}
${f('📢', '공지 · 알림', '/notice · /notifications', '공지·새 소식, 유튜브 동기화, 헤더 알림 벨', '#fbbf24')}
${f('👤', '회원', '/login · /my-page', '가입·재설정, 출석판, 내 글, 뽑기 통계', '#34d399')}
${f('🛡️', '관리자', '/admin', '공지·문의·신고·차단, 뽑기·이벤트·계절 디자인 관리', '#f87171')}
</div></div>`,
  };
}

const DIAGRAMS = { hero, stack, architecture, 'ai-flow': aiFlow, 'feature-map': featureMap };

(async () => {
  const browser = await launch();
  const dir = path.join(OUT, 'diagrams');
  const tmp = path.join(OUT, 'raw', '_diagrams');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const [name, make] of Object.entries(DIAGRAMS)) {
    const { html, width } = make();
    const file = path.join(tmp, `${name}.html`);
    fs.writeFileSync(file, `<!doctype html><meta charset="utf-8">${html}`);
    const page = await browser.newPage();
    await page.setViewport({ width, height: 400, deviceScaleFactor: 1 });
    await page.goto(fileUrl(file), { waitUntil: 'networkidle0' });
    await sleep(300);
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    await page.close();
    console.log('diagram', name);
  }
  await browser.close();
})();
