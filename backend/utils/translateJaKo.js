/* ====================================================================
 * 일본어 → 한국어 자동 번역 유틸
 * ------------------------------------------------------------------
 * 유튜브 커뮤니티 동기화(youtubeCommunitySync.js)가 채널에서 가져온 글이
 * 일본어일 때 이를 한국어로 번역해 공지/소식에 올리기 위해 사용한다.
 * 번역 자체는 구글 번역의 비공식 무료 엔드포인트(translate.googleapis.com)를
 * 호출해서 처리하며, 별도의 유료 API 키가 필요 없는 대신 한 번에 보낼 수 있는
 * 텍스트 길이 제한이 있어 긴 글은 청크로 쪼개 순차 번역한다.
 * ==================================================================== */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_CHUNK = 1500;
const TRANSLATE_TIMEOUT_MS = 15000;

// 히라가나/가타카나, 가타카나 음성 확장, CJK 통합 한자 범위로
// "일본어로 보이는 문자"를 판별한다.
// 한자 범위는 한국어 한자 표기와도 겹치지만, 여기서는 "번역이 필요할 만큼
// 일본어가 섞여 있는가"를 대략적으로 거르는 용도로만 쓰인다(엄밀한 언어 판별 아님).
const JP_CHAR = /[぀-ヿㇰ-ㇿ㐀-龯]/;

// 텍스트에 일본어로 판단되는 문자가 하나라도 포함되어 있는지 검사.
function containsJapanese(text) {
  return JP_CHAR.test(String(text || ''));
}

// 환경변수로 번역 기능 자체를 끌 수 있게 하는 플래그.
// '0'/'false'/'off'/'no' 중 하나면 비활성화, 그 외(미설정 포함)에는 기본 활성화.
function isTranslateEnabled() {
  const raw = String(process.env.YOUTUBE_POSTS_TRANSLATE || 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

// 청크 사이에 지연을 두기 위한 단순 sleep. 비공식 엔드포인트에 너무 빠르게
// 연속 요청을 보내면 일시적으로 제한될 수 있어 요청 간 텀을 준다.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 긴 텍스트를 번역 API가 처리 가능한 길이(max) 이하로 잘라 여러 청크로 나눈다.
// 무작정 max 글자에서 자르면 단어/문장이 중간에 끊겨 번역 품질이 떨어지므로,
// 줄바꿈 → 일본어 문장부호(。、) → 영문 마침표 순으로 "자연스러운 경계"를
// max 근처에서 찾아 그 지점에서 자른다. 어느 경계도 충분히 뒤쪽(max의 35% 이후)에서
// 찾지 못하면 어쩔 수 없이 max 위치에서 강제로 자른다(무한 루프 방지 및 최소 진행 보장).
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

// 마크다운 이미지(![]()) / 링크([]()) / 순수 URL을 번역 전에 임시 토큰(<<T0>>, <<T1>>, ...)
// 으로 치환해 "숨겨" 둔다. 번역기가 URL이나 마크다운 문법 안의 텍스트까지 건드리면
// 링크가 깨지므로, 원문을 tokens 배열에 보관해두고 번역이 끝난 뒤 restoreMarkdown으로
// 그대로 복원한다.
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

// protectMarkdown이 심어둔 <<Tn>> 토큰들을 원래의 마크다운/URL 원문으로 되돌린다.
function restoreMarkdown(text, tokens) {
  let out = String(text || '');
  tokens.forEach((value, idx) => {
    out = out.split(`<<T${idx}>>`).join(value);
  });
  return out;
}

// 구글 번역 비공식 엔드포인트(translate_a/single, client=gtx)를 호출해 텍스트 한 청크를 번역한다.
// 응답은 중첩 배열 형태의 JSON이며, json[0]이 "번역된 문장 조각들"의 배열이라
// 각 조각의 첫 번째 요소(번역문)만 이어붙여 하나의 문자열로 합친다.
// TRANSLATE_TIMEOUT_MS 안에 응답이 없으면 AbortController로 요청을 강제 취소한다.
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

// 전체 번역 파이프라인의 진입점: 마크다운 보호 → 청크 분할 → 청크별 순차 번역
// (일본어가 없는 청크는 API 호출 없이 그대로 통과) → 마크다운 복원 순으로 진행한다.
// 청크 하나가 번역에 실패해도 전체를 실패시키지 않고 그 청크만 원문을 유지한 채
// 나머지를 계속 진행한다(부분 번역이라도 사용자에게 보여주는 것이 낫다는 판단).
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
