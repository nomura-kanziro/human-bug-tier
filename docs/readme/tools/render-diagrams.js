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
      ['siMongodb', 'MongoDB · Mongoose', '컬렉션 25개'],
      ['siJsonwebtokens', 'JWT · bcryptjs', '회원 / 관리자 토큰 분리', '#ffffff'],
    ]],
    ['AI 서비스', '#c084fc', 'ai-service/', [
      ['siFastapi', 'FastAPI', '챗봇 API (127.0.0.1:8000)'],
      ['siLangchain', 'LangChain', '문서 분할 · 모델 연결', '#ffffff'],
      ['siLanggraph', 'LangGraph', '질문 처리 흐름(조건 분기)', '#ffffff'],
      ['siOllama', 'Ollama · Claude', '무료 엔진 · Claude 엔진(휴버토큰)', '#ffffff'],
    ]],
    ['모바일', '#22d3ee', 'mobile/', [
      ['siExpo', 'Expo SDK 58', 'React Native 0.88 · 뼈대 단계', '#ffffff'],
      ['siAndroid', 'EAS Build', 'Android APK · AAB / iOS IPA'],
      ['siReact', 'JavaScript + React', '웹과 같은 언어·같은 /api', '#61dafb'],
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
.cols{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:28px}
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
.lower{display:grid;grid-template-columns:1fr 1fr 1fr 1.25fr;gap:18px;margin-top:22px}
.lower .n h3{font-size:16px;margin-bottom:8px}
.lower li{font-size:14px;color:#a4acba;line-height:1.6;margin-left:18px}
</style><div class="canvas"><h1>시스템 아키텍처</h1><p class="sub">브라우저는 API 하나만 본다. AI 서비스는 Express 뒤에 숨겨져 외부에 열리지 않는다</p>
<div class="flow">
${node('', logo('siGooglechrome', '브라우저', '#e7e9ee'), '브라우저 · 앱', ['React SPA · 모바일 앱(Expo)', '<code>authToken</code>', '<code>adminAuthToken</code>'])}
${arrow('HTTPS')}
${node('', logo('siCloudflarepages', 'CF'), 'Cloudflare Pages', ['<code>dist/</code> 정적 파일', 'Pages Function', '<code>/api/*</code> 프록시'])}
${arrow('/api/*')}
<div class="vm"><label>Oracle Cloud VM</label>
${node('', logo('siNginx', 'nginx'), 'nginx', [':443 Let\'s Encrypt', '외부 포트는', '80 · 443 만'])}
${arrow('')}
${node('', logo('siExpress', 'Ex', '#ffffff'), 'Express', ['PM2 <code>human-bug-tier</code>', '<code>:5000</code> 라우터 11개', 'requireAuth / Admin'])}
${arrow('X-AI-Key')}
${node('', logo('siFastapi', 'FA'), 'ai-service', ['PM2 <code>hbt-ai</code>', '<code>127.0.0.1:8000</code>', '<span class="tag ok">운영 중</span>'])}
</div></div>
<div class="lower">
<div class="n"><div class="t">${logo('siMongodb', 'M')}<b>MongoDB Atlas</b></div><p>회원 · 게시글 · 공지 · 문의 · 알림 · 포인트 · 이벤트. Express 만 접속한다.</p></div>
<div class="n"><div class="t">${logo('siOllama', 'O', '#ffffff')}<b>답변 모델</b></div><p>무료 엔진: 같은 VM 의 Ollama <code>gemma4:e4b</code>(CPU). 에이전트 봇 Claude 엔진: Claude API(모델·effort 선택, 휴버토큰).</p></div>
<div class="n"><div class="t">${logo('siOracle', 'O', '#f80000')}<b>Oracle Autonomous DB</b></div><p>ai-service 만 접속(Oracle SQL). AI 사용 통계만 저장하고 대화 원문은 저장하지 않는다.</p></div>
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

// ---------------------------------------------------------------------------
// 간편 아키텍처(아이콘형) — 루트 README "시스템 아키텍처" 바로 아래에 둔다.
// 로고로 "무엇이 어디서 도는지"를 한눈에 보여 주고, 화살표는 실제로 통신하는 방향만 긋는다.
// 상자 좌표는 1600×900 캔버스 기준 고정값이다(상자를 옮기면 SVG 선 좌표도 같이 고친다).
// ---------------------------------------------------------------------------
function bigLogo(key, label, color, size = 46) {
  const ic = icons[key];
  if (!ic) return `<span class="mono" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 2)}px;background:${color || '#475569'}">${label[0]}</span>`;
  return `<svg viewBox="0 0 24 24" style="width:${size}px;height:${size}px;flex:none"><path d="${ic.path}" fill="${color || `#${ic.hex}`}"/></svg>`;
}

function architectureSimple() {
  const box = (x, y, w, h, cls, inner, label = '') => `<div class="bx ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${label ? `<label>${label}</label>` : ''}${inner}</div>`;
  const item = (logoHtml, title, desc = '') => `<div class="it">${logoHtml}<div><b>${title}</b>${desc ? `<p>${desc}</p>` : ''}</div></div>`;
  const cap = (x, y, text, cls = '') => `<div class="cap ${cls}" style="left:${x}px;top:${y}px">${text}</div>`;
  const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-start="url(#h)" marker-end="url(#h)"/>`;
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.stage{position:relative;width:1600px;height:820px;background:radial-gradient(1000px 420px at 12% -8%,rgba(245,158,11,.13),transparent 60%),#0f1117}
.stage h1{position:absolute;left:48px;top:34px}
.stage .sub{position:absolute;left:48px;top:80px}
.bx{position:absolute;border-radius:16px;padding:16px 16px 14px;display:flex;flex-direction:column;gap:12px}
.bx>label{font-size:13px;font-weight:800;letter-spacing:.02em}
.vm{border:2.5px solid #fb923c;background:rgba(251,146,60,.04)}
.vm>label{color:#fb923c;position:absolute;right:18px;top:12px}
.inner{border:2px solid #3b82f6;background:#141821}
.inner>label{color:#93c5fd}
.ext{border:2px solid #4ade80;background:#141a17}
.ext>label{color:#86efac}
.cli{border:2px solid #a1a1aa;background:#16171c}
.cli>label{color:#d4d4d8}
.cf{border:2px solid #f6821f;background:#1a1510}
.cf>label{color:#fdba74}
.it{display:flex;align-items:center;gap:12px}
.it b{font-size:17px;display:block}
.it p{font-size:13px;color:#a4acba;line-height:1.4;margin-top:2px}
.it code,.cap code{font-family:Consolas,monospace;color:#fbbf24;font-size:12.5px}
.cap{position:absolute;font-size:13px;font-weight:700;color:#e7e9ee;background:#0f1117;padding:2px 8px;border-radius:999px;border:1px solid #2a2e3a;white-space:nowrap}
.cap.y{color:#fbbf24;border-color:rgba(245,158,11,.45)}
.big{position:absolute;bottom:22px;left:48px;right:48px;display:flex;gap:26px;font-size:13.5px;color:#9aa3b2}
.big span b{color:#e7e9ee}
svg.lines{position:absolute;inset:0;width:1600px;height:820px;pointer-events:none}
svg.lines line{stroke:#9ca3af;stroke-width:2.6}
</style>
<div class="stage">
<h1>한눈에 보는 구조</h1>
<p class="sub">로고로 보는 간편 아키텍처 — 어떤 프로그램이 어디서 돌고, 누가 누구와 통신하는지</p>
<svg class="lines"><defs><marker id="h" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9ca3af"/></marker></defs>
${line(268, 420, 330, 420)}
${line(576, 420, 664, 420)}
${line(952, 468, 1000, 468)}
${line(808, 576, 808, 652)}
${line(1270, 312, 1360, 312)}
${line(1270, 512, 1360, 512)}
${line(808, 184, 808, 246)}
</svg>
${box(40, 276, 228, 290, 'cli', `
${item(bigLogo('siGooglechrome', '웹', '#e7e9ee'), '웹 브라우저', 'PC · 모바일 웹<br>PWA 홈 화면 설치')}
${item(bigLogo('siExpo', '앱', '#ffffff'), '모바일 앱', 'React Native · Expo<br><span style="color:#fbbf24">뼈대 단계</span>')}
<div class="it" style="gap:10px">${bigLogo('siAndroid', 'A', '#3ddc84', 30)}${bigLogo('siApple', 'i', '#e7e9ee', 30)}<p>Android · iOS</p></div>`, 'Client')}
${box(330, 306, 246, 230, 'cf', `
${item(bigLogo('siCloudflarepages', 'CF'), 'Cloudflare Pages', 'human-bug-tier.com')}
${item(bigLogo('siReact', 'R', '#61dafb'), 'React 18 + Vite', '빌드된 화면(dist)')}
<p style="font-size:13px;color:#a4acba">Pages Function 이 <code>/api/*</code> 를 오리진으로 넘긴다</p>`, 'Cloudflare')}
${box(632, 202, 668, 398, 'vm', '', 'Oracle Cloud VM · Ubuntu · 4코어 / 24GB')}
${box(664, 246, 288, 330, 'inner', `
${item(bigLogo('siNginx', 'N'), 'nginx', ':443 Let&#39;s Encrypt<br>외부 포트는 80 · 443 만')}
${item(bigLogo('siNodedotjs', 'N'), 'Node.js 22 · PM2', '<code>human-bug-tier</code>')}
${item(bigLogo('siExpress', 'E', '#ffffff'), 'Express 5', '<code>:5000</code> API 라우터 11개<br>JWT 회원 / 관리자 분리<br>휴버토큰 · 포인트 판정')}`, '웹 서버 (backend/)')}
${box(1000, 246, 270, 330, 'inner', `
${item(bigLogo('siFastapi', 'F'), 'FastAPI · PM2', '<code>127.0.0.1:8000</code> 내부 전용')}
${item(bigLogo('siLangchain', 'L', '#ffffff'), 'LangGraph', 'LangChain · 휴버봇(RAG)<br>에이전트 봇(도구 5개)')}
${item(bigLogo('siOllama', 'O', '#ffffff'), 'Ollama gemma4:e4b', '무료 엔진 · CPU · 하루 20회')}`, 'AI 서버 (ai-service/)')}
${box(1360, 222, 210, 196, 'ext', `
${item(bigLogo('siClaude', 'C', '#d97757'), 'Claude API', 'Haiku · Sonnet<br>Opus · Fable')}
<p style="font-size:13px;color:#a4acba">에이전트 봇 Claude 엔진<br>= <b style="color:#fbbf24">휴버토큰</b> 사용</p>`, 'AI 모델')}
${box(1360, 440, 210, 150, 'ext', `
${item(bigLogo('siOracle', 'O', '#f80000'), 'Oracle DB', 'Autonomous DB · SQL<br>AI 사용 통계만')}`, 'AI 전용 DB')}
${box(664, 652, 292, 116, 'ext', `
${item(bigLogo('siMongodb', 'M'), 'MongoDB Atlas', '회원 · 게시글 · 공지 · 포인트<br>휴버토큰 지갑 · 원장(25개 모델)')}`, '사이트 DB')}
${box(664, 96, 288, 88, 'ext', `
<div class="it" style="gap:14px">${bigLogo('siYoutube', 'Y', null, 30)}<p>유튜브 커뮤니티 → 새 소식 동기화<br>인증 메일(사이트 전용 SMTP)</p></div>`, '외부 연동')}
${cap(272, 388, 'HTTPS')}
${cap(590, 388, '/api/*')}
${cap(938, 436, 'X-AI-Key', 'y')}
${cap(1286, 280, 'SDK')}
${cap(1286, 480, 'SQL')}
${cap(822, 602, 'Mongoose')}
<div class="big">
<span><b>브라우저·앱은 /api 하나만</b> 본다</span>
<span><b>AI 서버는 Express 뒤</b>에 숨어 외부에 안 열린다</span>
<span><b>포인트·휴버토큰은 서버가</b> 판정·차감·환불</span>
<span><b>대화 내용은 저장하지 않는다</b></span>
</div>
</div>`,
  };
}

// ---------------------------------------------------------------------------
// 폴더별 간편 상세 구조 — 각 README 맨 위에 둔다. 왼쪽에서 오른쪽으로 "요청(또는 코드)이 지나가는 순서".
// stage = { title, color, logo: [key, label, color], sub, items: [...] }
// ---------------------------------------------------------------------------
function stageFlow(title, sub, stages, notes = []) {
  const col = (s) => `<div class="st" style="border-top-color:${s.color}">
<div class="sh">${s.logo ? bigLogo(s.logo[0], s.logo[1], s.logo[2], 34) : ''}<div><b style="color:${s.color}">${s.title}</b>${s.sub ? `<code>${s.sub}</code>` : ''}</div></div>
<ul>${s.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
  const cols = stages.map(col).join('<div class="ar"><i></i></div>');
  return {
    width: 1600,
    html: `<style>${BASE_CSS}
.fl{display:flex;align-items:stretch;margin-top:28px}
.st{flex:1;min-width:0;background:#171a22;border:1px solid #2a2e3a;border-top:4px solid;border-radius:14px;padding:16px}
.sh{display:flex;gap:11px;align-items:center;margin-bottom:10px}
.sh b{font-size:18px;display:block}
.sh code{font-family:Consolas,monospace;font-size:12.5px;color:#8b93a3}
.st ul{list-style:none}
.st li{font-size:14px;color:#c3c9d4;line-height:1.5;padding:6px 0;border-top:1px solid #232733}
.st li code{font-family:Consolas,monospace;color:#fbbf24;font-size:12.5px}
.st li em{font-style:normal;color:#8b93a3;font-size:12.5px}
.ar{width:40px;flex:none;display:flex;align-items:center}
.ar i{display:block;width:100%;height:2px;background:#f59e0b;position:relative}
.ar i:after{content:'';position:absolute;right:-1px;top:-5px;border-left:10px solid #f59e0b;border-top:6px solid transparent;border-bottom:6px solid transparent}
.nt{display:grid;grid-template-columns:repeat(${Math.max(1, notes.length)},1fr);gap:16px;margin-top:20px}
.nt div{background:#13161d;border:1px dashed #343a48;border-radius:12px;padding:12px 14px;font-size:13.5px;color:#a4acba;line-height:1.5}
.nt b{color:#e7e9ee}
.nt code{font-family:Consolas,monospace;color:#fbbf24;font-size:12.5px}
</style><div class="canvas"><h1>${title}</h1><p class="sub">${sub}</p><div class="fl">${cols}</div>
${notes.length ? `<div class="nt">${notes.map((n) => `<div>${n}</div>`).join('')}</div>` : ''}</div>`,
  };
}

function archFrontend() {
  return stageFlow('프론트엔드 간편 구조 — root-cloudflare/', 'React 18 SPA. 화면은 Cloudflare Pages(운영) 또는 Express(로컬 :5000)가 같은 dist/ 를 내보낸다', [
    { title: '진입', sub: 'src/main.jsx', color: '#38bdf8', logo: ['siReact', 'R', '#61dafb'], items: ['전역 CSS(테마·디자인 시스템)', '<code>BrowserRouter</code>', '<code>AuthProvider</code> 로그인 신원·방치 1시간 로그아웃', '<code>AgentBotProvider</code> 에이전트 봇 상태(라우트 밖)'] },
    { title: '라우트', sub: 'src/App.jsx', color: '#a78bfa', logo: ['siReactrouter', 'RR', '#f44250'], items: ['단독 페이지: 로그인·가입·찾기·재설정·관리자 로그인', '<code>Layout</code> 안: 홈·티어표·메이커·게시판·뽑기·이벤트·AI·마이페이지·관리자', '<em>화면 25개 · src/pages/</em>'] },
    { title: '화면 · 부품', sub: 'pages/ · components/', color: '#4ade80', logo: ['siReact', 'R', '#61dafb'], items: ['부품 30개(헤더·알림 벨·꾸미기·에이전트 봇…)', '데이터 <code>src/data/tiers.json</code> — 공식 티어표 정본', '스타일 <code>src/styles/*.css</code> — 라이트/다크 변수'] },
    { title: 'API 호출', sub: 'src/lib/', color: '#fbbf24', logo: null, items: ['<code>api.js</code> getApiBase · apiRequest · <b>apiStream</b>(NDJSON)', '<code>agentApi.js</code> · <code>aiApi.js</code> · <code>authApi.js</code> …', '토큰: <code>authToken</code> / <code>adminAuthToken</code>'] },
    { title: '빌드 · 배포', sub: 'vite build → dist/', color: '#fb923c', logo: ['siVite', 'V'], items: ['<code>npm run build</code>', 'Cloudflare Pages(master 푸시)', 'Pages Function <code>functions/api/[[path]].js</code> → Oracle 백엔드'] },
  ], [
    '<b>바닐라 root-render/ 는 수정 금지</b> — 화면 작업은 이 폴더에서만',
    '<b>경로</b>는 React Router 절대 경로(<code>&lt;Link to="/…"&gt;</code>), 이미지는 <code>tierImageUrl()</code>',
    '<b>API 주소를 하드코딩하지 않는다</b> — 항상 <code>src/lib/api.js</code> 를 거친다',
  ]);
}

function archBackend() {
  return stageFlow('백엔드 간편 구조 — backend/', 'Express 5 + Mongoose. 요청은 routes → middleware → controllers → models 한 방향으로 흐른다', [
    { title: '서버', sub: 'server.js', color: '#4ade80', logo: ['siNodedotjs', 'N'], items: ['.env 로드(루트 → backend 우선)', 'cors · json(2mb) · 정적 서빙 + SPA 폴백', '스케줄러: 랜덤 뽑기 라운드 · 이벤트 · 유튜브 동기화', '<code>/health</code> · <code>/api/site/status</code>'] },
    { title: '라우터', sub: 'routes/ 11개', color: '#38bdf8', logo: ['siExpress', 'E', '#ffffff'], items: ['tierlists · auth · inquiries · admin', 'notices · notifications · luck-draw', 'profile · events · site', '<code>/api/ai</code> 휴버봇 · 에이전트 봇 · 휴버토큰'] },
    { title: '미들웨어', sub: 'middleware/ · utils/jwtAuth', color: '#f87171', logo: ['siJsonwebtokens', 'J', '#ffffff'], items: ['<code>optionalAuth</code> · <code>requireAuth</code>', '<code>requireAdmin</code> — 관리 API 전부', '차단 검사(IP·회원) · 요청 수 제한'] },
    { title: '컨트롤러', sub: 'controllers/ 18개', color: '#fbbf24', logo: null, items: ['업무 판정은 전부 서버가(포인트·확률·배당)', '<code>aiAgentController</code> 엔진·휴버토큰 차감·환불', '<code>aiTokenController</code> 충전 신청·승인'] },
    { title: '모델 · DB', sub: 'models/ 25개', color: '#22c55e', logo: ['siMongodb', 'M'], items: ['MongoDB Atlas(Mongoose)', '회원·게시글·공지·알림·문의', '행운 포인트 원장 · 휴버토큰 지갑·원장·신청'] },
  ], [
    '<b>utils/</b> mail · attendance · aiTokens · luckPointLog · notificationService · kstDate …',
    '<b>ai-service 는 프록시로만</b> — <code>X-AI-Key</code> 를 붙여 127.0.0.1:8000 으로',
    '<b>배포</b> <code>deploy/oracle/deploy.sh deploy</code> — 릴리스 폴더 + current 링크 교체, PM2 재시작',
  ]);
}

function archAi() {
  return stageFlow('AI 서비스 간편 구조 — ai-service/', 'FastAPI 하나에 챗봇 두 개. 챗봇 폴더마다 같은 6개 층(schema · router · service · models · repository · database)', [
    { title: '진입', sub: 'app/main.py', color: '#c084fc', logo: ['siFastapi', 'F'], items: ['설정 <code>config.py</code> · 키 검사 <code>deps.py</code>', '<code>agent_loader.py</code> — Agent-Bot 폴더를 패키지로', '<code>/health</code> · 두 챗봇 라우터 연결'] },
    { title: '휴버봇', sub: 'app/guidans_Chat/', color: '#38bdf8', logo: ['siLanggraph', 'LG', '#ffffff'], items: ['<code>/chat</code> · <code>/questions</code> · <code>/status</code>', 'LangGraph: analyze → retrieve → generate', 'RAG: BM25 + ChromaDB(bge-m3) → RRF', '지식 <code>knowledge/*.md</code> 14개 + tiers.json'] },
    { title: '에이전트 봇', sub: 'app/Agent-Bot/', color: '#fbbf24', logo: ['siLangchain', 'LC', '#ffffff'], items: ['<code>/agent/run</code> NDJSON 스트림', 'planner(규칙 먼저) → graph → 도구 5개', '도구: 초안·분석·요약·브리핑·검색', '게시판·공지는 백엔드 조회 API 로'] },
    { title: '답변 모델', sub: 'service/llm.py · claude.py', color: '#4ade80', logo: ['siOllama', 'O', '#ffffff'], items: ['무료 엔진: Ollama <code>gemma4:e4b</code>(생각 모드 끔)', 'Claude 엔진: anthropic SDK · 모델·effort 선택', '실패하면 → 무료 엔진 → 정해진 해설(끊기지 않음)'] },
    { title: '저장', sub: 'database/ · repository/', color: '#f87171', logo: null, items: ['ChromaDB(벡터, 로컬 파일)', 'Oracle SQL — 통계만(바인드 변수)', '<b>MongoDB 금지</b> · 대화 원문 저장 안 함'] },
  ], [
    '<b>외부에 열지 않는다</b> — 127.0.0.1:8000, Express <code>/api/ai</code> 뒤에서만',
    '<b>지식 = 사이트 규칙</b> — 수치가 바뀌면 <code>knowledge/*.md</code> 를 고치고 <code>pytest</code>(동기화 테스트)',
    '<b>테스트</b> 가짜 LLM·가짜 Claude 클라이언트 — 실제 API 를 부르지 않는다',
  ]);
}

function archMobile() {
  return stageFlow('모바일 앱 간편 구조 — mobile/', 'React Native 0.88 + Expo SDK 58. 지금은 뼈대: 서버 연결 상태 확인 화면 하나', [
    { title: '앱', sub: 'App.js · index.js', color: '#38bdf8', logo: ['siExpo', 'E', '#ffffff'], items: ['상태 확인 화면(라이트/다크 자동)', '서버 주소 바꾸기(로컬 PC IP)', '화면 이동 라이브러리 없음(가볍게)'] },
    { title: '요청', sub: 'src/api.js · config.js', color: '#fbbf24', logo: null, items: ['fetch + 8초 제한, 4개를 동시에', '사이트 API · 공지 · AI · 에이전트 봇', '기본 주소 <code>human-bug-tier.com</code>'] },
    { title: '서버', sub: '웹과 같은 /api', color: '#4ade80', logo: ['siCloudflarepages', 'CF'], items: ['Cloudflare Pages 프록시', 'Oracle VM Express(backend/)', '앱 전용 서버 없음'] },
    { title: '빌드', sub: 'eas.json', color: '#fb923c', logo: ['siAndroid', 'A', '#3ddc84'], items: ['preview → APK(바로 설치)', 'production → AAB · IPA(스토어)', 'Android 릴리스 코드·리소스 축소'] },
  ], [
    '<b>번들</b> Hermes 약 1.5MB · 의존성 6개',
    '<b>다음</b> 로그인(secure-store) → 티어표(FlatList) → 게시판 → 에이전트 봇',
  ]);
}

function archDocs() {
  return stageFlow('문서 간편 구조 — 어디에 무엇을 쓰나', '사람이 읽는 문서 · AI 에이전트 규칙 · 기록 · 그림을 나눠 둔다. 기능이 바뀌면 오른쪽 끝(지식 문서)까지 같이 고친다', [
    { title: '소개', sub: 'README.md · 폴더 README', color: '#38bdf8', logo: null, items: ['루트 README — 시연·구조·시작하기', '폴더별 README — 그 폴더의 구조·실행', '<code>DEPLOY.md</code> · <code>SECURITY.md</code> · <code>LICENSE</code>'] },
    { title: '규칙', sub: '.Agents/ → 12개 폴더', color: '#f87171', logo: null, items: ['<code>common-rules.md</code> 모든 AI 공통', '<code>skills/&lt;기능&gt;/SKILL.md</code> 정본', '.Claude · .Grok · .Cursor … 는 복제본', '사람 규칙 <code>team/</code>'] },
    { title: '기록', sub: 'RDMD/', color: '#fbbf24', logo: null, items: ['<code>features/</code> 기능 설명(what)', '<code>guides/</code> 개발·보안·배포 가이드', '<code>frontend|backend|ai/</code> 작업 기록', '<code>commit_history/</code> 커밋 전 필수'] },
    { title: '그림', sub: 'docs/readme/', color: '#a78bfa', logo: null, items: ['<code>diagrams/</code> 이 그림들(HTML → PNG)', '<code>screens/</code> · <code>gifs/</code> 화면 캡처', '<code>tools/</code> 재생성 도구(가상 데이터만)'] },
    { title: '지식', sub: 'ai-service/knowledge/', color: '#4ade80', logo: null, items: ['휴버봇이 읽는 사용자용 설명 14개', '수치(확률·포인트·휴버토큰)를 코드와 대조', '<code>pytest</code> 가 어긋나면 실패'] },
  ]);
}

const DIAGRAMS = {
  hero, stack, architecture, 'architecture-simple': architectureSimple, 'ai-flow': aiFlow, 'feature-map': featureMap,
  'arch-frontend': archFrontend, 'arch-backend': archBackend, 'arch-ai': archAi, 'arch-mobile': archMobile, 'arch-docs': archDocs,
};
// 이름을 주면 그 그림만 다시 만든다 — 예) node render-diagrams.js architecture-simple arch-ai
const ONLY = process.argv.slice(2);

(async () => {
  const browser = await launch();
  const dir = path.join(OUT, 'diagrams');
  const tmp = path.join(OUT, 'raw', '_diagrams');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const [name, make] of Object.entries(DIAGRAMS)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
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
