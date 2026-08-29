const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_CHUNK = 1500;
const TRANSLATE_TIMEOUT_MS = 15000;

const JP_CHAR = /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u9faf]/;

function containsJapanese(text) {
  return JP_CHAR.test(String(text || ''));
}

function isTranslateEnabled() {
  const raw = String(process.env.YOUTUBE_POSTS_TRANSLATE || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitChunks(text, max = MAX_CHUNK) {
  const source = String(text || '');
  if (source.length <= max) return source ? [source] : [];

  const chunks = [];
  let rest = source;
  while (rest.length) {
    if (rest.length <= max) {
      chunks.push(rest);
      break;
    }
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.35) cut = rest.lastIndexOf('。', max);
    if (cut < max * 0.35) cut = rest.lastIndexOf('、', max);
    if (cut < max * 0.35) cut = rest.lastIndexOf('. ', max);
    if (cut < max * 0.35) cut = max;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return chunks;
}

function protectMarkdown(text) {
  const tokens = [];
  const stash = (match) => {
    const key = `<<T${tokens.length}>>`;
    tokens.push(match);
    return key;
  };
  const protectedText = String(text || '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, stash)
    .replace(/\[[^\]]+\]\([^)]+\)/g, stash)
    .replace(/https?:\/\/[^\s)]+/g, stash);
  return { protectedText, tokens };
}

function restoreMarkdown(text, tokens) {
  let out = String(text || '');
  tokens.forEach((value, idx) => {
    out = out.split(`<<T${idx}>>`).join(value);
  });
  return out;
}

async function translateChunk(text, sourceLang, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: ac.signal,
    });
    if (!res.ok) {
      throw new Error(`translate HTTP ${res.status}`);
    }
    const json = await res.json();
    const parts = Array.isArray(json?.[0]) ? json[0] : [];
    return parts.map((row) => (Array.isArray(row) ? row[0] : '')).join('');
  } finally {
    clearTimeout(timer);
  }
}

async function translateJaToKo(text) {
  const source = String(text || '');
  if (!source.trim()) return source;
  if (!isTranslateEnabled() || !containsJapanese(source)) return source;

  const { protectedText, tokens } = protectMarkdown(source);
  const chunks = splitChunks(protectedText);
  const translated = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!containsJapanese(chunk)) {
      translated.push(chunk);
      continue;
    }
    try {
      const piece = await translateChunk(chunk, 'ja', 'ko');
      translated.push(piece || chunk);
    } catch (err) {
      console.warn('일본어 번역 실패, 원문 유지:', err.message);
      translated.push(chunk);
    }
    if (i < chunks.length - 1) await sleep(120);
  }

  return restoreMarkdown(translated.join(''), tokens).trim() || source;
}

module.exports = {
  containsJapanese,
  isTranslateEnabled,
  translateJaToKo,
};
