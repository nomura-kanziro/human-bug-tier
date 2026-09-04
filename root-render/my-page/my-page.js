// ========================================================
// my-page.js - 마이페이지 스크립트
// ========================================================
// 목적:
//   1. 로그인한 사용자(일반 회원 · 관리자 공통) 자신의 프로필/통계를 보여준다.
//   2. 본인이 쓴 커스텀 티어 게시글 목록(최근 6개)을 불러와 카드로 렌더링.
//   3. 본인의 행운 뽑기(오늘의 행운) 통계 + 최근 기록(5건)을 불러와 렌더링.
//   4. 관리자 계정도 이 페이지는 완전히 동일하게 사용한다 — 어드민 전용 UI는
//      여기 없고, header.html 프로필 드롭다운의 "관리하기" 메뉴 항목 하나뿐이다.
//      (테스트 중 관리자 계정이 눈에 띄게 달라 보이지 않도록 하기 위한 의도적 설계)
// 의존: common.js 전역 함수 getBasePath() / getApiBase() / getAuthHeaders() /
//       getCurrentIdentity() / getProfileImageSrc() / buildTierPostDetailUrl()
//       (전부 common.js에 구현되어 있으므로 여기서는 재구현하지 않고 그대로 재사용)
// ========================================================

// 행운 뽑기 결과의 tier 숫자(1~9)를 화면에 보여줄 한글 라벨로 바꾸기 위한 매핑 테이블.
// luck-draw 쪽과 동일한 티어 체계(1~9)를 그대로 따른다.
const MY_PAGE_TIER_LABELS = {
  1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
  6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
};

// ========================================================
// 게시글 썸네일 등 자산(asset) 경로 보정
// ========================================================
// 서버에서 내려주는 post.thumbnail 값은 절대경로('/uploads/...'), 상대경로('../uploads/...'),
// data:/blob: URL, 외부 http(s) URL 등 형태가 제각각일 수 있어서 그대로 <img src>에 넣으면
// 배포 경로(getBasePath())가 다른 환경(로컬/서브폴더/Render)에서 깨질 수 있다.
// 이 함수가 모든 경우를 getBasePath() 기준 상대경로로 통일해준다.
// thumbnail이 아예 없으면 기본 로고 이미지를 대신 보여준다.
function myPageResolveAsset(path) {
  if (!path) return getBasePath() + 'tier-media/tier-image/logo.webp';
  // 폴더 구조가 두 번 바뀌었으므로(① tier-image → ② tier-media → ③ tier-media/tier-image, 2026-09)
  // DB에 남아있는 옛 접두사(둘 중 하나)를 최신 접두사로 보정한다.
  path = path.replace(/^(\.{2}\/|\/)?(?:tier-media\/tier-image\/|tier-image\/|tier-media\/)/, '$1tier-media/tier-image/');
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
  if (path.startsWith('/')) return getBasePath() + path.slice(1);
  if (path.startsWith('../')) return getBasePath() + path.replace(/^\.\.\//, '');
  return getBasePath() + path;
}

// 게시글 작성일(ISO 문자열 등)을 "YYYY.MM.DD" 형태의 한국식 짧은 날짜로 변환.
// toLocaleDateString 기본 출력이 "2024. 01. 01." 처럼 공백/마지막 점이 붙어 나오므로
// 정규식으로 다듬어서 "2024.01.01" 형태로 맞춘다. 날짜 파싱 실패 시 빈 문자열 반환.
function myPageFormatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');
}

// ========================================================
// 프로필 헤더(아바타 / 닉네임 / 이메일) 렌더링
// ========================================================
// getCurrentIdentity() 는 common.js 전역 함수 재사용 — 어드민도 nickname/email 형태로 동일하게 다뤄서
// 일반 회원과 같은 마이페이지를 그대로 쓸 수 있게 한다.
function renderProfileHeader(user) {
  // getProfileImageSrc() 도 common.js 전역 함수: 로그인 사용자가 설정한 프로필 이미지가 있으면
  // 그걸, 없으면 기본 아바타를 반환한다. 헤더 드롭다운의 아바타와 같은 소스를 재사용해
  // 마이페이지 아바타와 헤더 아바타가 항상 일치하도록 한다.
  document.getElementById('my-page-avatar-img').src = getProfileImageSrc();
  document.getElementById('my-page-nickname').textContent = user.nickname || '사용자';
  document.getElementById('my-page-email').textContent = user.email || '';
  // "전체 보기" 링크: 게시판으로 이동하되 검색어를 "@닉네임"으로 걸어서
  // 게시판 자체 검색 기능으로 내가 쓴 글만 필터링되게 한다(별도의 "내 글 보기" 화면 없이 재사용).
  document.getElementById('my-page-board-link').href =
    getBasePath() + `custom-maker/custom-maker_post/custom-maker_post.html?search=@${encodeURIComponent(user.nickname)}`;
  // "행운 뽑기 하러 가기" 링크: 오늘의 행운 뽑기 섹션(#daily 해시)으로 바로 스크롤/이동.
  document.getElementById('my-page-luck-link').href = getBasePath() + 'luck-draw/luck-draw.html#daily';
}

// ========================================================
// "내가 쓴 게시글" 목록 렌더링
// ========================================================
// posts 배열(최신순으로 서버에서 정렬돼 옴)을 받아 최대 6개까지만 카드로 그린다.
// 각 카드는 게시글 상세 페이지로 가는 링크이며, 썸네일 + 제목 + (작성일 · 추천수) 메타 정보를 보여준다.
// 비공개 글(isPublic === false)은 제목 앞에 자물쇠 이모지를 붙여 본인만 알아볼 수 있게 표시.
function renderPostList(posts) {
  const container = document.getElementById('my-page-posts');
  container.innerHTML = '';

  if (!posts || posts.length === 0) {
    container.innerHTML = '<p class="my-page-empty">아직 작성한 게시글이 없어요.</p>';
    return;
  }

  posts.slice(0, 6).forEach((post) => {
    // buildTierPostDetailUrl() 도 common.js 전역 함수 — 게시글 id로 상세 페이지 URL을 만들어준다.
    const url = buildTierPostDetailUrl(post._id);
    const item = document.createElement('a');
    item.className = 'my-page-post-item';
    item.href = url || '#';

    // post.title 등은 사용자가 직접 입력한 값이므로 escapeMyPageHtml()로 이스케이프해서
    // innerHTML에 삽입 — HTML/스크립트 주입(XSS)을 막기 위함.
    item.innerHTML = `
      <img class="my-page-post-thumb" src="${myPageResolveAsset(post.thumbnail)}" alt="">
      <div class="my-page-post-info">
        <span class="my-page-post-title">${post.isPublic ? '' : '🔒 '}${escapeMyPageHtml(post.title)}</span>
        <span class="my-page-post-meta">${myPageFormatDate(post.createdAt)} · 추천 ${post.likeCount || 0}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// ========================================================
// "최근 행운 뽑기 기록" 목록 렌더링
// ========================================================
// items(최근 뽑기 이력, 최신순)를 받아 최대 5개까지 한 줄씩 텍스트로 나열한다.
// (luck-draw 쪽에서도 이력은 최대 5건까지만 보관/노출하는 정책과 맞춰져 있음)
// 각 줄은 "뽑은 날짜 · 티어 라벨 · 캐릭터 이름" 형식.
function renderDrawList(items) {
  const container = document.getElementById('my-page-draws');
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="my-page-empty">아직 뽑기 기록이 없어요.</p>';
    return;
  }

  items.slice(0, 5).forEach((item) => {
    const row = document.createElement('div');
    row.className = 'my-page-draw-item';
    row.textContent = `${item.drawDate} · ${MY_PAGE_TIER_LABELS[item.tier] || item.tier + '티어'} · ${item.characterName}`;
    container.appendChild(row);
  });
}

// ========================================================
// 상단 통계 카드 5개(작성 글 수 / 받은 좋아요 / 뽑기 횟수 / 최고 등급 / 포인트) 렌더링
// ========================================================
// 호출부(initMyPage)에서 게시글 목록과 행운 뽑기 통계를 미리 집계해 하나의 객체로 넘겨준다.
// points는 음수(-)일 수도 있으므로 부호를 명시적으로 붙여 "+120P" / "-30P" 형태로 표시.
function renderStats({ postCount, likeTotal, drawTotal, bestTier, points }) {
  document.getElementById('stat-post-count').textContent = postCount;
  document.getElementById('stat-like-count').textContent = likeTotal;
  document.getElementById('stat-draw-count').textContent = drawTotal;
  document.getElementById('stat-best-tier').textContent = bestTier ? (MY_PAGE_TIER_LABELS[bestTier] || `${bestTier}티어`) : '-';
  document.getElementById('stat-points').textContent = typeof points === 'number' ? `${points >= 0 ? '+' : ''}${points}P` : '0P';
}

// 사용자 입력값(게시글 제목 등)을 innerHTML에 안전하게 넣기 위한 최소한의 HTML 이스케이프.
// &, <, >, ", ' 를 각각 엔티티로 치환해서 <script> 등 악성 태그 주입을 막는다.
function escapeMyPageHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========================================================
// 서버 API 호출 함수들
// ========================================================
// 아래 3개 함수는 모두 같은 패턴: getApiBase()로 서버 주소를 구하고,
// getAuthHeaders()로 로그인 토큰을 실어 fetch → 실패하면 콘솔에만 로그를 남기고
// 화면이 깨지지 않도록 빈 값(빈 배열/기본 통계 객체)을 반환한다.
// (마이페이지는 부가 정보 페이지이므로 API 실패가 로그인 자체를 막지는 않게 하기 위함)

// 로그인한 사용자 본인이 작성한 커스텀 티어 게시글 목록 조회.
// author=닉네임 + mine=true 쿼리로 "본인 글만" 필터링(비공개 글까지 포함해서 받아옴 — mine=true가
// 서버 쪽에서 소유자 인증을 확인하고 비공개 글도 내려주는 플래그).
async function loadMyPosts(nickname) {
  try {
    const res = await fetch(
      `${getApiBase()}/api/tierlists?author=${encodeURIComponent(nickname)}&mine=true`,
      { headers: getAuthHeaders() },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('내 게시글 조회 실패:', err);
    return [];
  }
}

// 행운 뽑기 누적 통계(총 뽑기 횟수 / 최고 당첨 등급 / 누적 포인트) 조회.
async function loadLuckStats() {
  try {
    const res = await fetch(`${getApiBase()}/api/luck-draw/stats`, { headers: getAuthHeaders() });
    if (!res.ok) return { totalDraws: 0, bestTier: null, points: 0 };
    const data = await res.json();
    return { totalDraws: data.totalDraws || 0, bestTier: data.bestTier, points: data.points || 0 };
  } catch (err) {
    console.error('행운 뽑기 통계 조회 실패:', err);
    return { totalDraws: 0, bestTier: null, points: 0 };
  }
}

// 행운 뽑기 최근 이력 조회(1페이지만 요청 — 마이페이지에는 최근 5건만 보여주면 되므로
// 전체 페이지네이션은 필요 없고 items 배열만 뽑아 쓴다).
async function loadLuckHistory() {
  try {
    const res = await fetch(`${getApiBase()}/api/luck-draw/history?page=1`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('행운 뽑기 기록 조회 실패:', err);
    return [];
  }
}

// ========================================================
// 마이페이지 진입점 (DOMContentLoaded에서 호출)
// ========================================================
async function initMyPage() {
  // getCurrentIdentity() 는 localStorage(authToken 또는 adminAuthToken)를 읽어 로그인 여부와
  // 사용자 정보를 판별하는 common.js 전역 함수. 일반 회원/관리자 구분 없이 nickname만 있으면
  // 같은 방식으로 처리 — 그래서 이 페이지는 관리자에게도 동일하게 보인다.
  const user = getCurrentIdentity();
  if (!user?.nickname) {
    // 비로그인 상태로 직접 URL 접근한 경우: 안내 후 로그인 페이지로 즉시 리다이렉트.
    alert('마이페이지는 로그인 후 이용할 수 있습니다.');
    window.location.href = getBasePath() + 'user_login/login.html';
    return;
  }

  renderProfileHeader(user);

  // GitHub Pages 같은 정적 미리보기 환경은 백엔드 서버 자체가 없으므로(getApiBase()가
  // 'GITHUB_STATIC'을 반환) 게시글/행운 뽑기 API 호출을 아예 시도하지 않고 안내 문구만 보여준 뒤 종료.
  if (getApiBase() === 'GITHUB_STATIC') {
    document.querySelector('.my-page-stats').insertAdjacentHTML(
      'afterend',
      '<p class="my-page-empty">이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.</p>',
    );
    return;
  }

  // 게시글/행운 뽑기 통계/행운 뽑기 이력을 동시에(Promise.all) 요청해서 로딩 시간을 최소화.
  // 세 요청은 서로 의존성이 없으므로 순차 호출 대신 병렬 호출로 처리한다.
  const [posts, luckStats, luckHistory] = await Promise.all([
    loadMyPosts(user.nickname),
    loadLuckStats(),
    loadLuckHistory(),
  ]);

  // "받은 좋아요" 총합은 서버가 따로 집계해주지 않으므로, 방금 받은 게시글 목록의
  // likeCount를 프론트에서 직접 더해서 구한다.
  const likeTotal = posts.reduce((sum, post) => sum + (post.likeCount || 0), 0);

  renderStats({
    postCount: posts.length,
    likeTotal,
    drawTotal: luckStats.totalDraws,
    bestTier: luckStats.bestTier,
    points: luckStats.points,
  });
  renderPostList(posts);
  renderDrawList(luckHistory);
}

document.addEventListener('DOMContentLoaded', initMyPage);
