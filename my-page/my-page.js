const MY_PAGE_TIER_LABELS = {
  1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
  6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
};

function myPageResolveAsset(path) {
  if (!path) return getBasePath() + 'tier-image/logo.webp';
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
  if (path.startsWith('/')) return getBasePath() + path.slice(1);
  if (path.startsWith('../')) return getBasePath() + path.replace(/^\.\.\//, '');
  return getBasePath() + path;
}

function myPageFormatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');
}

function getMyPageUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    return null;
  }
}

function renderProfileHeader(user) {
  document.getElementById('my-page-avatar-img').src = getProfileImageSrc();
  document.getElementById('my-page-nickname').textContent = user.nickname || '사용자';
  document.getElementById('my-page-email').textContent = user.email || '';
  document.getElementById('my-page-board-link').href =
    getBasePath() + `custom-maker/custom-maker_post/custom-maker_post.html?search=@${encodeURIComponent(user.nickname)}`;
  document.getElementById('my-page-luck-link').href = getBasePath() + 'luck-draw/luck-draw.html#daily';
}

function renderPostList(posts) {
  const container = document.getElementById('my-page-posts');
  container.innerHTML = '';

  if (!posts || posts.length === 0) {
    container.innerHTML = '<p class="my-page-empty">아직 작성한 게시글이 없어요.</p>';
    return;
  }

  posts.slice(0, 6).forEach((post) => {
    const url = buildTierPostDetailUrl(post._id);
    const item = document.createElement('a');
    item.className = 'my-page-post-item';
    item.href = url || '#';

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

function renderStats({ postCount, likeTotal, drawTotal, bestTier, points }) {
  document.getElementById('stat-post-count').textContent = postCount;
  document.getElementById('stat-like-count').textContent = likeTotal;
  document.getElementById('stat-draw-count').textContent = drawTotal;
  document.getElementById('stat-best-tier').textContent = bestTier ? (MY_PAGE_TIER_LABELS[bestTier] || `${bestTier}티어`) : '-';
  document.getElementById('stat-points').textContent = typeof points === 'number' ? `${points >= 0 ? '+' : ''}${points}P` : '0P';
}

function escapeMyPageHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

async function initMyPage() {
  const user = getMyPageUser();
  if (!user?.nickname) {
    alert('마이페이지는 로그인 후 이용할 수 있습니다.');
    window.location.href = getBasePath() + 'user_login/login.html';
    return;
  }

  renderProfileHeader(user);

  if (getApiBase() === 'GITHUB_STATIC') {
    document.querySelector('.my-page-stats').insertAdjacentHTML(
      'afterend',
      '<p class="my-page-empty">이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.</p>',
    );
    return;
  }

  const [posts, luckStats, luckHistory] = await Promise.all([
    loadMyPosts(user.nickname),
    loadLuckStats(),
    loadLuckHistory(),
  ]);

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
