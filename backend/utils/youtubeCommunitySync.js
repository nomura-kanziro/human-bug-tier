const Notice = require('../models/Notice');
const { broadcastNoticeNotification } = require('./notificationService');

const DEFAULT_POSTS_URL = 'https://www.youtube.com/@humanbug_univ./posts';
const DEFAULT_BROWSE_ID = 'UC7umTzIrIJq8Xh428lj0M5A';
const POSTS_TAB_PARAMS = 'EgVwb3N0cw==';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 20000;
const MIN_POLL_MS = 60 * 1000;
const DEFAULT_POLL_MS = 10 * 60 * 1000;

const syncState = {
  enabled: true,
  running: false,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastResult: null,
};

function isSyncEnabled() {
  const raw = String(process.env.YOUTUBE_POSTS_SYNC_ENABLED || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

function getPostsUrl() {
  const fromEnv = String(process.env.YOUTUBE_POSTS_URL || '').trim();
  return fromEnv || DEFAULT_POSTS_URL;
}

function getPollIntervalMs() {
  const raw = parseInt(process.env.YOUTUBE_POSTS_POLL_MS, 10);
  if (Number.isFinite(raw) && raw >= MIN_POLL_MS) return raw;
  return DEFAULT_POLL_MS;
}

function shouldNotifyNewPosts() {
  const raw = String(process.env.YOUTUBE_POSTS_SYNC_NOTIFY || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

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

function asRuns(value) {
  if (!value) return [];
  if (typeof value === 'string') return [{ text: value }];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.runs)) return value.runs;
  if (value.simpleText) return [{ text: value.simpleText }];
  return [];
}

function runsToPlain(value) {
  return asRuns(value)
    .map((run) => run.text || '')
    .join('')
    .replace(/\r\n/g, '\n')
    .trim();
}

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

function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

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

function pickLargestThumb(thumbnails) {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return null;
  const largest = thumbnails.slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  let url = largest?.url || '';
  if (url.startsWith('//')) url = `https:${url}`;
  return isHttpUrl(url) ? url : null;
}

function pushImageFromRenderer(renderer, urls) {
  if (!renderer) return;
  const url = pickLargestThumb(
    renderer.image?.thumbnails || renderer.thumbnails || renderer.thumbnail?.thumbnails
  );
  if (url && !urls.includes(url)) urls.push(url);
}

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

function extractPollMarkdown(attachment) {
  const poll = attachment?.pollRenderer;
  if (!poll) return '';
  const choices = (poll.choices || [])
    .map((choice) => runsToPlain(choice.text) || runsToPlain(choice))
    .filter(Boolean);
  if (!choices.length) return '';
  return ['투표', ...choices.map((choice) => `- ${choice}`)].join('\n');
}

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

function buildTitle(text) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '유튜브 커뮤니티 게시글';
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

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

function pickRicher(a, b) {
  if ((b.imageCount || 0) !== (a.imageCount || 0)) {
    return (b.imageCount || 0) > (a.imageCount || 0) ? b : a;
  }
  return (b.textLength || 0) > (a.textLength || 0) ? b : a;
}

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

function extractBrowseId(html, data) {
  const fromHtml = html && html.match(/"browseId":"(UC[^"]+)"/);
  if (fromHtml?.[1]) return fromHtml[1];
  const fromMeta = data?.metadata?.channelMetadataRenderer?.externalId;
  if (fromMeta) return fromMeta;
  const fromHeader = data?.header?.c4TabbedHeaderRenderer?.channelId;
  if (fromHeader) return fromHeader;
  return null;
}

function extractClientVersion(html) {
  const match = html && html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  return match?.[1] || '2.20260828.01.00';
}

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

async function fetchYoutubeCommunityPosts() {
  const postsUrl = getPostsUrl();
  const html = await fetchText(postsUrl, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  const data =
    extractJsonObject(html, 'var ytInitialData = ') ||
    extractJsonObject(html, 'ytInitialData = ');
  let posts = data ? parsePostsFromData(data) : [];
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

async function syncYoutubeCommunityPosts(options = {}) {
  if (syncState.running) {
    return { skipped: true, reason: 'already-running', ...syncState.lastResult };
  }

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
    const notify = options.notify !== undefined
      ? Boolean(options.notify)
      : existingCount > 0 && shouldNotifyNewPosts();

    let created = 0;
    let skipped = 0;
    const createdIds = [];

    for (const post of posts) {
      const already = await Notice.findOne({ youtubePostId: post.postId }).select('_id');
      if (already) {
        skipped += 1;
        continue;
      }

      try {
        const notice = await Notice.create({
          title: post.title,
          content: post.content,
          summary: post.summary || post.title,
          category: 'news',
          author: post.author,
          source: 'youtube',
          youtubePostId: post.postId,
          youtubePostUrl: post.url,
          createdAt: post.publishedAt || undefined,
        });
        created += 1;
        createdIds.push(String(notice._id));

        if (notify) {
          broadcastNoticeNotification(notice).catch((err) => {
            console.error('유튜브 새 소식 알림 실패:', err.message);
          });
        }
      } catch (err) {
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
      notified: notify,
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
    syncState.running = false;
    syncState.lastFinishedAt = new Date().toISOString();
  }
}

let schedulerStarted = false;

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
