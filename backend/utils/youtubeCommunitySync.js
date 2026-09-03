/* ====================================================================
 * 유튜브 커뮤니티 탭 -> 공지/소식(Notice) 자동 동기화
 * ------------------------------------------------------------------
 * 휴먼버그대학교 유튜브 채널의 "커뮤니티" 탭 게시글을 주기적으로 긁어와
 * 새 글을 Notice 모델(category: 'news')로 저장한다. 공식 API 키 없이
 * 채널 커뮤니티 글을 가져오는 방법이 마땅치 않아, 두 가지 비공식 경로를 병행한다.
 *   1) 커뮤니티 탭 HTML을 직접 요청해 그 안에 내장된 ytInitialData(페이지 초기 상태
 *      JSON)를 파싱 — 사람이 브라우저로 보는 것과 동일한 데이터를 얻는다.
 *   2) YouTube 내부용 InnerTube browse API(youtubei/v1/browse)를 직접 호출 —
 *      HTML 파싱이 실패했거나 누락된 글을 보완하기 위한 보조 경로.
 * 원문이 일본어면 translateJaKo.js로 번역해 한국어 소식으로 올리고,
 * 새 글이 생기면 notificationService.broadcastNoticeNotification으로 전 회원에게 알린다.
 * ==================================================================== */
const Notice = require('../models/Notice');
const { broadcastNoticeNotification } = require('./notificationService');
const { containsJapanese, isTranslateEnabled, translateJaToKo } = require('./translateJaKo');

// 유튜브 채널명이 여러 표기(부제 포함 등)로 나타날 수 있어, 알려진 채널명을
// 사이트에 표시할 한국어 이름으로 매핑한다(localizeAuthor에서 부분일치로도 사용).
const CHANNEL_AUTHOR_KO = {
  'ヒューマンバグ大学_闇の漫画': '휴먼버그대학교 유튜브',
  'ヒューマンバグ大学': '휴먼버그대학교 유튜브',
};

const DEFAULT_POSTS_URL = 'https://www.youtube.com/@humanbug_univ./posts';
const DEFAULT_BROWSE_ID = 'UC7umTzIrIJq8Xh428lj0M5A';
const POSTS_TAB_PARAMS = 'EgVwb3N0cw==';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 20000;
const MIN_POLL_MS = 60 * 1000;
const DEFAULT_POLL_MS = 10 * 60 * 1000;

// 동기화 프로세스의 현재 상태를 메모리에 보관 — /health나 관리자 진단 API에서
// "지금 돌고 있는지, 마지막 결과가 뭐였는지"를 보여주는 데 사용(DB에 저장하지 않음).
const syncState = {
  enabled: true,
  running: false,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastResult: null,
};

// 환경변수로 동기화 스케줄러 전체를 끌 수 있는 플래그.
function isSyncEnabled() {
  const raw = String(process.env.YOUTUBE_POSTS_SYNC_ENABLED || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

// 커뮤니티 탭 URL. 채널이 바뀌거나 테스트용으로 다른 채널을 지정할 수 있도록 환경변수로 오버라이드 가능.
function getPostsUrl() {
  const fromEnv = String(process.env.YOUTUBE_POSTS_URL || '').trim();
  return fromEnv || DEFAULT_POSTS_URL;
}

// 폴링 주기(ms). 너무 짧게 설정해 유튜브 쪽에 과도한 요청을 보내지 않도록
// MIN_POLL_MS(1분) 미만 값은 무시하고 기본값(10분)으로 대체한다.
function getPollIntervalMs() {
  const raw = parseInt(process.env.YOUTUBE_POSTS_POLL_MS, 10);
  if (Number.isFinite(raw) && raw >= MIN_POLL_MS) return raw;
  return DEFAULT_POLL_MS;
}

// 새 글이 생겼을 때 전체 회원에게 알림을 보낼지 여부(환경변수로 끌 수 있음).
function shouldNotifyNewPosts() {
  const raw = String(process.env.YOUTUBE_POSTS_SYNC_NOTIFY || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

// 관리자 진단/상태 조회용 스냅샷 반환.
function getYoutubeSyncStatus() {
  return {
    enabled: isSyncEnabled(),
    postsUrl: getPostsUrl(),
    pollMs: getPollIntervalMs(),
    running: syncState.running,
    lastStartedAt: syncState.lastStartedAt,
    lastFinishedAt: syncState.lastFinishedAt,
    lastResult: syncState.lastResult,
  };
}

// 공통 fetch 래퍼: 타임아웃(AbortController)과 브라우저 흉내 헤더(User-Agent 등)를
// 매 호출마다 반복하지 않도록 여기서 한 번에 적용한다. asJson 옵션이 true면
// 응답을 JSON으로 파싱해 반환(InnerTube API 호출용), 아니면 텍스트(HTML) 그대로 반환.
async function fetchText(url, options = {}) {
  const { json: asJson = false, ...fetchOptions } = options;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ac.signal,
      ...fetchOptions,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ko-KR,ko;q=0.9,ja;q=0.8,en;q=0.7',
        ...(fetchOptions.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`YouTube HTTP ${res.status}`);
    }
    if (asJson) return res.json();
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// YouTube 페이지 HTML에는 `var ytInitialData = {...};` 같은 형태로 초기 상태 JSON이
// <script> 안에 인라인으로 박혀 있다. 이 JSON은 매우 크고 문자열 안에 `{`/`}`가
// 자유롭게 등장할 수 있어 정규식만으로는 정확히 잘라낼 수 없으므로, marker 뒤의
// 첫 '{' 부터 문자 단위로 스캔하면서 중괄호 깊이(depth)를 세고 문자열 리터럴
// 안(inString)에서는 이스케이프(\)까지 고려해 중괄호를 무시한다. depth가 다시 0이
// 되는 지점이 곧 JSON 객체의 끝이므로 거기까지 잘라 JSON.parse한다.
function extractJsonObject(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf('{', idx + marker.length - 1);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(start, i + 1));
      }
    }
  }
  return null;
}

// ytInitialData(또는 InnerTube 응답)는 커뮤니티 게시글이 트리 구조 어딘가에
// 깊이 중첩되어 들어있고, 정확한 경로가 페이지 레이아웃 변경에 따라 달라질 수 있다.
// 그래서 정해진 경로로 찾아가는 대신 트리 전체를 재귀적으로 순회하며
// backstagePostThreadRenderer/backstagePostRenderer/postRenderer 키를 가진 노드를
// 전부 찾아 모은다(depth > 50 가드는 순환/과도한 중첩으로 인한 무한 재귀 방지용).
function collectPostRenderers(node, acc = [], depth = 0) {
  if (!node || depth > 50) return acc;
  if (Array.isArray(node)) {
    node.forEach((item) => collectPostRenderers(item, acc, depth + 1));
    return acc;
  }
  if (typeof node !== 'object') return acc;

  const thread = node.backstagePostThreadRenderer;
  if (thread) {
    const inner =
      thread.post?.backstagePostRenderer ||
      thread.post?.postRenderer ||
      thread.backstagePostRenderer ||
      thread.postRenderer;
    if (inner) acc.push(inner);
  }
  if (node.backstagePostRenderer) acc.push(node.backstagePostRenderer);
  if (node.postRenderer) acc.push(node.postRenderer);

  Object.keys(node).forEach((key) => {
    if (
      key === 'backstagePostThreadRenderer' ||
      key === 'backstagePostRenderer' ||
      key === 'postRenderer'
    ) {
      return;
    }
    collectPostRenderers(node[key], acc, depth + 1);
  });
  return acc;
}

/* ------ YouTube의 "runs" 리치 텍스트 포맷을 다루는 헬퍼들 ------
 * YouTube 내부 데이터는 텍스트를 { runs: [{ text, navigationEndpoint? }, ...] }
 * 형태로 표현해 서식/링크 정보를 함께 담는다(단순 문자열일 때도 있어 asRuns가 흡수). */
function asRuns(value) {
  if (!value) return [];
  if (typeof value === 'string') return [{ text: value }];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.runs)) return value.runs;
  if (value.simpleText) return [{ text: value.simpleText }];
  return [];
}

// runs 배열의 text만 이어붙여 서식·링크 없는 순수 텍스트로 변환.
function runsToPlain(value) {
  return asRuns(value)
    .map((run) => run.text || '')
    .join('')
    .replace(/\r\n/g, '\n')
    .trim();
}

// YouTube는 외부 링크를 바로 노출하지 않고 자체 리다이렉트 URL
// (/redirect?q=실제주소)로 감싸는 경우가 있어, q 쿼리 파라미터를 꺼내
// 실제 목적지 URL로 되돌린다. 파싱 실패 시 원본 url을 그대로 반환.
function decodeYoutubeRedirect(url) {
  if (!url) return '';
  try {
    const absolute = url.startsWith('/') ? `https://www.youtube.com${url}` : url;
    const parsed = new URL(absolute);
    if (parsed.pathname === '/redirect' && parsed.searchParams.get('q')) {
      return parsed.searchParams.get('q');
    }
    return parsed.href;
  } catch {
    return url;
  }
}

// http/https 스킴을 가진 유효한 URL인지 확인(마크다운 링크로 안전하게 써도 되는지 판단용).
function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// runs 배열을 마크다운으로 변환. 각 run에 navigationEndpoint(링크 정보)가 있으면
// [텍스트](URL) 형태로 감싼다. urlEndpoint/watchEndpoint(영상 링크)/webCommandMetadata
// 세 가지 링크 표현 방식을 순서대로 확인해 실제 href를 뽑아내고, decodeYoutubeRedirect로
// 리다이렉트를 풀어준 뒤 http(s) URL일 때만 링크로 만든다(그 외엔 텍스트만 남김).
function runsToMarkdown(value) {
  return asRuns(value)
    .map((run) => {
      const text = run.text || '';
      const nav = run.navigationEndpoint || {};
      let href = '';
      if (nav.urlEndpoint?.url) {
        href = decodeYoutubeRedirect(nav.urlEndpoint.url);
      } else if (nav.watchEndpoint?.videoId) {
        href = `https://www.youtube.com/watch?v=${nav.watchEndpoint.videoId}`;
      } else if (nav.commandMetadata?.webCommandMetadata?.url) {
        href = decodeYoutubeRedirect(nav.commandMetadata.webCommandMetadata.url);
      }
      if (href && isHttpUrl(href)) {
        return `[${text || href}](${href})`;
      }
      return text;
    })
    .join('')
    .replace(/\r\n/g, '\n')
    .trim();
}

// 여러 해상도로 제공되는 썸네일 배열 중 가장 큰(width 기준) 것을 고른다.
// 프로토콜 없는 // 로 시작하는 URL은 https:를 붙여 절대 URL로 만든다.
function pickLargestThumb(thumbnails) {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return null;
  const largest = thumbnails.slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  let url = largest?.url || '';
  if (url.startsWith('//')) url = `https:${url}`;
  return isHttpUrl(url) ? url : null;
}

// 렌더러 노드에서 이미지 URL 하나를 뽑아 urls 배열에 중복 없이 추가.
// 이미지 정보 위치가 렌더러 종류에 따라 image.thumbnails / thumbnails / thumbnail.thumbnails
// 등으로 제각각이라 셋 다 순서대로 확인한다.
function pushImageFromRenderer(renderer, urls) {
  if (!renderer) return;
  const url = pickLargestThumb(
    renderer.image?.thumbnails || renderer.thumbnails || renderer.thumbnail?.thumbnails
  );
  if (url && !urls.includes(url)) urls.push(url);
}

// 게시글 첨부(backstageAttachment)에서 이미지 URL들을 모두 추출한다.
// 여러 장 첨부(postMultiImageRenderer)와 단일 이미지(backstageImageRenderer) 두 형태를
// 모두 지원하며, 둘 다 못 찾았을 때 attachment 자체가 썸네일을 가진 마지막 경우까지 폴백.
function extractImages(attachment) {
  if (!attachment) return [];
  const urls = [];
  const multi = attachment.postMultiImageRenderer?.images;
  if (Array.isArray(multi)) {
    multi.forEach((item) => {
      pushImageFromRenderer(item.backstageImageRenderer || item, urls);
    });
  }
  pushImageFromRenderer(attachment.backstageImageRenderer, urls);
  if (!urls.length && attachment.image?.thumbnails) {
    pushImageFromRenderer(attachment, urls);
  }
  return urls;
}

// 게시글에 첨부된 영상을 [영상: 제목](워치URL) + 썸네일 이미지 마크다운으로 변환.
// videoRenderer/compactVideoRenderer/videoWithContextRenderer 등 렌더러 종류가
// 다를 수 있어 순서대로 확인한다.
function extractVideoMarkdown(attachment) {
  const video =
    attachment?.videoRenderer ||
    attachment?.compactVideoRenderer ||
    attachment?.videoWithContextRenderer?.videoRenderer;
  if (!video?.videoId) return '';
  const title = runsToPlain(video.title) || '유튜브 영상';
  const url = `https://www.youtube.com/watch?v=${video.videoId}`;
  const thumb = pickLargestThumb(video.thumbnail?.thumbnails);
  const lines = [`[영상: ${title}](${url})`];
  if (thumb) lines.push(`![${title}](${thumb})`);
  return lines.join('\n');
}

// 게시글에 첨부된 투표(poll)를 "투표\n- 선택지1\n- 선택지2..." 형태의 마크다운으로 변환.
function extractPollMarkdown(attachment) {
  const poll = attachment?.pollRenderer;
  if (!poll) return '';
  const choices = (poll.choices || [])
    .map((choice) => runsToPlain(choice.text) || runsToPlain(choice))
    .filter(Boolean);
  if (!choices.length) return '';
  return ['투표', ...choices.map((choice) => `- ${choice}`)].join('\n');
}

// YouTube가 표시하는 "3일 전" / "たった今" / "3 days ago" 같은 상대 시간 라벨을
// 실제 Date 객체로 역산한다(정확한 게시 시각 API가 없어 이 라벨이 유일한 시간 정보).
// "방금"/"오늘" 같은 특수 표현은 별도 처리하고, 그 외는 정규식으로 숫자+단위를 뽑아
// 단위별 밀리초 환산표(msMap)를 곱해 now에서 빼는 방식으로 근사 계산한다.
// 한국어/일본어/영어 표현을 모두 인식하도록 패턴에 세 언어를 함께 포함시켰다.
function parseRelativeTime(label) {
  if (!label) return null;
  const text = String(label).trim();
  const now = Date.now();
  if (/방금|たった|just now/i.test(text)) return new Date(now - 30 * 1000);
  if (/오늘|本日|today/i.test(text)) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }

  const match = text.match(/(\d+)\s*(초|seconds?|秒|분|minutes?|分|시간|hours?|時間|일|days?|日|주|weeks?|週間|개월|달|months?|か月|ヶ月|カ月|년|years?|年)/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n) || n < 0) return null;
  const unit = match[2].toLowerCase();
  const msMap = [
    { test: /초|second|秒/, ms: 1000 },
    { test: /분|minute|分/, ms: 60 * 1000 },
    { test: /시간|hour|時間/, ms: 60 * 60 * 1000 },
    { test: /일|day|日/, ms: 24 * 60 * 60 * 1000 },
    { test: /주|week|週間/, ms: 7 * 24 * 60 * 60 * 1000 },
    { test: /개월|달|month|か月|ヶ月|カ月/, ms: 30 * 24 * 60 * 60 * 1000 },
    { test: /년|year|年/, ms: 365 * 24 * 60 * 60 * 1000 },
  ];
  const found = msMap.find((item) => item.test.test(unit));
  if (!found) return null;
  return new Date(now - n * found.ms);
}

// 게시글 본문에서 제목을 뽑는다. 별도의 제목 필드가 없으므로 본문 앞부분을
// 공백 정리 후 80자로 잘라 사용하고, 본문이 아예 비어 있으면 기본 제목으로 대체.
function buildTitle(text) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '유튜브 커뮤니티 게시글';
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

// collectPostRenderers로 찾아낸 원시 렌더러 노드 하나를, 사이트에서 다루기 쉬운
// 평탄한 post 객체(postId, title, content 등)로 변환한다.
// content는 [본문 마크다운, 영상 마크다운, 투표 마크다운, 이미지 마크다운, 원본 링크]를
// 순서대로 이어붙여 구성하며, 전부 비어 있으면(파싱 실패 등) null을 반환해 이 글은 건너뛴다.
function normalizePost(renderer) {
  const postId = renderer?.postId;
  if (!postId) return null;

  const textMd = runsToMarkdown(renderer.contentText);
  const plain = runsToPlain(renderer.contentText);
  const images = extractImages(renderer.backstageAttachment);
  const videoMd = extractVideoMarkdown(renderer.backstageAttachment);
  const pollMd = extractPollMarkdown(renderer.backstageAttachment);
  const url = `https://www.youtube.com/post/${postId}`;
  const author = runsToPlain(renderer.authorText) || '휴먼버그대학교 유튜브';
  const publishedLabel = runsToPlain(renderer.publishedTimeText);

  const parts = [textMd, videoMd, pollMd];
  if (images.length) {
    parts.push(images.map((src, idx) => `![이미지 ${idx + 1}](${src})`).join('\n'));
  }
  parts.push(`---\n[유튜브 커뮤니티에서 보기](${url})`);
  const content = parts.filter(Boolean).join('\n\n').trim();
  if (!content) return null;

  return {
    postId,
    url,
    author,
    title: buildTitle(plain),
    summary: plain.slice(0, 200),
    content,
    imageCount: images.length,
    publishedAt: parseRelativeTime(publishedLabel),
    publishedLabel,
    textLength: plain.length,
  };
}

// 원본 채널명을 CHANNEL_AUTHOR_KO 매핑을 통해 한국어 표시명으로 바꾼다.
// 정확히 일치하는 키가 없으면 부분 문자열 포함 여부로도 한 번 더 확인한다
// (채널명 뒤에 부제/이모지 등이 붙어 나오는 경우를 흡수하기 위함).
function localizeAuthor(author) {
  const raw = String(author || '').trim();
  if (!raw) return '휴먼버그대학교 유튜브';
  if (CHANNEL_AUTHOR_KO[raw]) return CHANNEL_AUTHOR_KO[raw];
  const found = Object.keys(CHANNEL_AUTHOR_KO).find((name) => raw.includes(name));
  if (found) return CHANNEL_AUTHOR_KO[found];
  return raw;
}

// 번역된 게시글 본문 끝에 "일본어 원문을 번역했다"는 안내 문구를 덧붙인다.
// 이미 문구가 있으면(재번역 등으로 중복 실행돼도) 중복 추가하지 않는다.
function withTranslationNote(content) {
  const text = String(content || '').trim();
  if (!text) return text;
  if (text.includes('일본어 원문을 한국어로 번역')) return text;
  return `${text}\n\n> 일본어 원문을 한국어로 번역한 글입니다.`;
}

// 이미 DB에 저장된 Notice(notice)를 다시 번역해야 하는지 판단.
// - 번역 기능이 꺼져 있으면 무조건 false.
// - 기존에 저장된 제목/본문에 이미 일본어가 남아 있다면(예: 번역 기능이 나중에
//   켜졌거나 이전 번역이 실패했던 경우) 재번역이 필요하다고 본다.
// - youtubeTranslated 플래그가 아직 없는데 원본(post)에 일본어가 섞여 있다면
//   "번역을 아직 한 번도 안 거친 글"이므로 번역이 필요하다.
function needsKoreanTranslation(notice, post) {
  if (!isTranslateEnabled()) return false;
  if (containsJapanese(notice.title) || containsJapanese(notice.content)) return true;
  if (!notice.youtubeTranslated && containsJapanese(post.title + post.content)) return true;
  return false;
}

// 정규화된 post 하나를 한국어 표시용으로 가공한다.
// 번역이 필요 없으면(비활성화됐거나 일본어가 없으면) author만 한국어 표기로 바꾸고
// translated: false로 그대로 반환. 필요하면 제목/요약/본문을 translateJaToKo로 각각
// 번역하고, 번역 실패로 빈 문자열이 오는 경우를 대비해 원문(originalTitle 등)으로 폴백한다.
// 번역 전 원문은 originalTitle/originalContent에 별도 보관해 필요시 대조할 수 있게 한다.
async function localizePost(post) {
  const originalTitle = post.title;
  const originalContent = post.content;
  const originalSummary = post.summary;
  const originalAuthor = post.author;

  if (!isTranslateEnabled() || !containsJapanese(`${post.title}\n${post.content}`)) {
    return {
      ...post,
      author: localizeAuthor(originalAuthor),
      originalTitle,
      originalContent,
      translated: false,
    };
  }

  const title = await translateJaToKo(post.title);
  const summary = await translateJaToKo(post.summary);
  const content = await translateJaToKo(post.content);

  return {
    ...post,
    title: title || originalTitle,
    summary: (summary || originalSummary || title || '').slice(0, 200),
    content: withTranslationNote(content || originalContent),
    author: localizeAuthor(originalAuthor),
    originalTitle,
    originalContent,
    translated: true,
  };
}

// localizePost 결과를 Notice 모델 스키마에 맞는 필드 객체로 변환(생성/갱신 공용).
// source: 'youtube'와 youtubePostId로 어느 유튜브 글에서 왔는지 추적하고,
// 원문(youtubeOriginalTitle/Content)과 번역 여부(youtubeTranslated)도 함께 저장해
// 나중에 재번역 필요 여부(needsKoreanTranslation)를 판단할 수 있게 한다.
function noticeFieldsFromLocalized(post, localized) {
  return {
    title: localized.title,
    content: localized.content,
    summary: localized.summary || localized.title,
    author: localized.author,
    source: 'youtube',
    youtubePostId: post.postId,
    youtubePostUrl: post.url,
    youtubeOriginalTitle: localized.originalTitle || '',
    youtubeOriginalContent: localized.originalContent || '',
    youtubeTranslated: Boolean(localized.translated),
  };
}

// 같은 postId가 HTML 스크레이핑과 InnerTube 두 경로 모두에서 발견됐을 때,
// 둘 중 "정보가 더 풍부한" 쪽을 남기기 위한 비교 함수. 이미지가 더 많은 쪽을
// 우선하고, 이미지 수가 같으면 본문 텍스트가 더 긴(textLength) 쪽을 택한다
// (두 경로가 같은 글을 서로 다른 완성도로 파싱해오는 경우가 있어서 보완 목적).
function pickRicher(a, b) {
  if ((b.imageCount || 0) !== (a.imageCount || 0)) {
    return (b.imageCount || 0) > (a.imageCount || 0) ? b : a;
  }
  return (b.textLength || 0) > (a.textLength || 0) ? b : a;
}

// 주어진 데이터(ytInitialData 또는 InnerTube 응답) 전체에서 게시글 렌더러를 모두
// 찾아 normalizePost로 정규화하고, postId 기준으로 Map에 모아 같은 글이 여러 번
// 등장해도 pickRicher로 더 나은 버전 하나만 남긴다(중복 제거 + 품질 보정을 동시에 처리).
function parsePostsFromData(data) {
  const renderers = collectPostRenderers(data);
  const byId = new Map();
  renderers.forEach((renderer) => {
    const post = normalizePost(renderer);
    if (!post) return;
    const prev = byId.get(post.postId);
    byId.set(post.postId, prev ? pickRicher(prev, post) : post);
  });
  return [...byId.values()];
}

// 채널의 내부 ID(browseId, "UC..." 형식)를 알아내야 InnerTube browse API를 호출할 수 있다.
// HTML 안의 "browseId":"UC..." 패턴 → ytInitialData의 채널 메타데이터 →
// 헤더 렌더러의 channelId 순서로 시도해 가장 먼저 찾은 값을 사용한다.
function extractBrowseId(html, data) {
  const fromHtml = html && html.match(/"browseId":"(UC[^"]+)"/);
  if (fromHtml?.[1]) return fromHtml[1];
  const fromMeta = data?.metadata?.channelMetadataRenderer?.externalId;
  if (fromMeta) return fromMeta;
  const fromHeader = data?.header?.c4TabbedHeaderRenderer?.channelId;
  if (fromHeader) return fromHeader;
  return null;
}

// InnerTube API 호출 시 필요한 클라이언트 버전 문자열을 페이지 HTML에서 추출.
// 못 찾으면 하드코딩된 폴백 버전을 사용(다소 오래된 값이어도 API가 대개 허용).
function extractClientVersion(html) {
  const match = html && html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  return match?.[1] || '2.20260828.01.00';
}

// YouTube 웹 프론트가 내부적으로 쓰는 InnerTube browse API를 브라우저처럼 직접 호출한다.
// POSTS_TAB_PARAMS는 "채널의 커뮤니티(게시물) 탭"을 가리키는 고정 파라미터값이고,
// context.client에 clientName/Version 등을 채워야 정상 응답을 받을 수 있다.
// browseId가 없으면 애초에 호출할 수 없으므로 빈 배열을 반환한다.
async function fetchViaInnerTube(browseId, clientVersion) {
  if (!browseId) return [];
  const json = await fetchText('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'X-Youtube-Client-Name': '1',
      'X-Youtube-Client-Version': clientVersion,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion,
          hl: 'ko',
          gl: 'KR',
        },
      },
      browseId,
      params: POSTS_TAB_PARAMS,
    }),
  });
  return parsePostsFromData(json);
}

// 커뮤니티 탭 게시글을 가져오는 메인 함수: HTML 스크레이핑을 1차로 시도하고
// InnerTube API를 보조/보완으로 사용한다.
//   1) 커뮤니티 탭 HTML을 받아 ytInitialData를 추출해 파싱.
//   2) HTML 파싱으로 글을 하나도 못 찾았으면(레이아웃 변경 등) InnerTube를 유일한 경로로 사용.
//   3) HTML 파싱이 성공했더라도 InnerTube를 추가로 호출해, HTML에는 없던 글이 있으면
//      postId 기준으로 병합한다(InnerTube 호출 실패는 무시 — 이미 HTML 결과가 있으므로
//      보조 경로 실패로 전체를 실패시키지 않는다).
async function fetchYoutubeCommunityPosts() {
  const postsUrl = getPostsUrl();
  const html = await fetchText(postsUrl, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  const data =
    extractJsonObject(html, 'var ytInitialData = ') ||
    extractJsonObject(html, 'ytInitialData = ');
  let posts = data ? parsePostsFromData(data) : [];
  // browseId를 HTML/데이터에서 못 찾았어도, 기본 채널 URL을 쓰는 중이라면
  // 미리 알고 있는 DEFAULT_BROWSE_ID로 폴백해 InnerTube 호출이 가능하게 한다.
  const browseId = extractBrowseId(html, data) || (postsUrl.includes('@humanbug_univ') ? DEFAULT_BROWSE_ID : null);
  const clientVersion = extractClientVersion(html);

  if (!posts.length) {
    posts = await fetchViaInnerTube(browseId, clientVersion);
  } else {
    try {
      const extra = await fetchViaInnerTube(browseId, clientVersion);
      extra.forEach((post) => {
        if (!posts.some((item) => item.postId === post.postId)) {
          posts.push(post);
        }
      });
    } catch (err) {
      console.warn('유튜브 InnerTube 보조 조회 실패:', err.message);
    }
  }

  return { postsUrl, posts };
}

// 동기화 한 사이클 전체를 수행하는 메인 함수. 스케줄러(setInterval)와
// 관리자 수동 트리거(라우트) 양쪽에서 호출된다.
// 흐름: 중복 실행 방지 → DB 연결 확인 → 게시글 가져오기 → 이미 저장된 글(youtubePostId 매칭)은
// 스킵하거나 번역이 필요하면 갱신, 새 글이면 Notice 생성 → (신규 글이 있고 알림 대상이면)
// broadcastNoticeNotification으로 팬아웃 → 결과 집계 반환.
async function syncYoutubeCommunityPosts(options = {}) {
  // 이미 실행 중이면 중복 폴링/수동 트리거가 겹치지 않도록 즉시 이전 결과를 재반환하고 종료.
  if (syncState.running) {
    return { skipped: true, reason: 'already-running', ...syncState.lastResult };
  }

  // 서버 기동 초기 등 DB 연결이 아직 안 됐을 때 시도하면 의미 없는 실패만 반복되므로 미리 차단.
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    const result = { ok: false, error: 'database-disconnected' };
    syncState.lastResult = result;
    return result;
  }

  syncState.running = true;
  syncState.lastStartedAt = new Date().toISOString();

  try {
    const { postsUrl, posts } = await fetchYoutubeCommunityPosts();
    const existingCount = await Notice.countDocuments({ source: 'youtube' });
    // 알림 여부: 호출부가 명시적으로 지정했으면 그 값을 따르고, 아니면
    // "이미 유튜브 글이 하나라도 있었을 때만(즉, 최초 동기화가 아닐 때만)" 알림을 보낸다.
    // 서버를 처음 띄워 과거 글들을 한꺼번에 긁어올 때 회원 전체에게 알림이 폭탄처럼
    // 나가는 것을 막기 위한 안전장치다.
    const notify = options.notify !== undefined
      ? Boolean(options.notify)
      : existingCount > 0 && shouldNotifyNewPosts();

    let created = 0;
    let skipped = 0;
    let translated = 0;
    const createdIds = [];

    for (const post of posts) {
      const already = await Notice.findOne({ youtubePostId: post.postId });
      if (already) {
        // 이미 저장된 글이라도, 번역이 아직 안 됐거나 필요해진 경우(예: 번역 기능이
        // 나중에 켜짐)라면 내용을 다시 채워 저장한다. 그 외에는 변경 없이 스킵.
        if (needsKoreanTranslation(already, post)) {
          const localized = await localizePost(post);
          Object.assign(already, noticeFieldsFromLocalized(post, localized));
          await already.save();
          translated += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      try {
        const localized = await localizePost(post);
        const notice = await Notice.create({
          ...noticeFieldsFromLocalized(post, localized),
          category: 'news',
          // 실제 유튜브 게시 시각(publishedAt)을 알면 그 시각으로 createdAt을 맞춰
          // 사이트 내 정렬이 실제 게시 순서와 일치하게 한다. 못 구했으면 스키마 기본값(현재 시각) 사용.
          createdAt: post.publishedAt || undefined,
        });
        created += 1;
        if (localized.translated) translated += 1;
        createdIds.push(String(notice._id));

        if (notify) {
          // 알림 발송 실패가 동기화 자체를 실패시키지 않도록 fire-and-forget으로 처리하고 에러만 로그.
          broadcastNoticeNotification(notice).catch((err) => {
            console.error('유튜브 새 소식 알림 실패:', err.message);
          });
        }
      } catch (err) {
        // 동시에 두 번 실행되는 등의 이유로 unique 인덱스(youtubePostId) 충돌이 나면
        // 이미 다른 쪽에서 생성된 것이므로 에러로 취급하지 않고 스킵 처리한다.
        if (err && (err.code === 11000 || err.code === 11001)) {
          skipped += 1;
          continue;
        }
        throw err;
      }
    }

    const result = {
      ok: true,
      postsUrl,
      fetched: posts.length,
      created,
      skipped,
      translated,
      notified: Boolean(notify && created > 0),
      createdIds,
    };
    syncState.lastResult = result;
    return result;
  } catch (err) {
    const result = { ok: false, error: err.message || 'youtube-sync-failed' };
    syncState.lastResult = result;
    console.error('유튜브 커뮤니티 동기화 실패:', err.message);
    return result;
  } finally {
    // 성공/실패와 무관하게 running 플래그는 반드시 해제해야 다음 폴링이 막히지 않는다.
    syncState.running = false;
    syncState.lastFinishedAt = new Date().toISOString();
  }
}

let schedulerStarted = false;

// 서버 기동 시 한 번 호출되어 주기적 폴링을 예약한다.
// 중복 예약 방지(schedulerStarted), 기능 비활성화 시 조기 종료, 첫 실행은 서버가
// 완전히 뜬 뒤 15초 후로 지연시켜(다른 초기화 작업과 부하가 겹치지 않도록) 시작하고,
// 이후로는 getPollIntervalMs() 간격으로 계속 반복 실행한다.
function startYoutubeCommunitySyncScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  syncState.enabled = isSyncEnabled();
  if (!isSyncEnabled()) {
    console.log('ℹ️  유튜브 커뮤니티 동기화가 비활성화되어 있습니다. (YOUTUBE_POSTS_SYNC_ENABLED)');
    return;
  }

  const pollMs = getPollIntervalMs();
  console.log(`📺 유튜브 커뮤니티 동기화: ${getPostsUrl()} / ${Math.round(pollMs / 60000)}분 간격`);

  const run = () => {
    syncYoutubeCommunityPosts().catch((err) => {
      console.error('유튜브 커뮤니티 동기화 예외:', err.message);
    });
  };

  setTimeout(run, 15 * 1000);
  setInterval(run, pollMs);
}

module.exports = {
  DEFAULT_POSTS_URL,
  fetchYoutubeCommunityPosts,
  syncYoutubeCommunityPosts,
  startYoutubeCommunitySyncScheduler,
  getYoutubeSyncStatus,
  parsePostsFromData,
};
