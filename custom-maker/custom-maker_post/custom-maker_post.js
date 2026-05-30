// custom-maker_post/custom-maker_post.js

// ─── 더미 게시글 데이터 (백엔드 연동 전 테스트용) ─────────────────────
const dummyPosts = [
  {
    id: 1,
    title: "내 최애 캐릭터들로 만든 신계 1티어",
    author: "유저123",
    date: "2026.05.30",
    views: 342,
    likes: 47,
    thumbnail: "../tier-image/sample1.webp"
  },
  {
    id: 2,
    title: "2티어 최강 무투파 조합 추천합니다",
    author: "티어왕",
    date: "2026.05.29",
    views: 189,
    likes: 32,
    thumbnail: "../tier-image/sample2.webp"
  },
  {
    id: 3,
    title: "3티어에서 1티어로 올라간 캐릭터 분석",
    author: "분석가",
    date: "2026.05.28",
    views: 256,
    likes: 19,
    thumbnail: "../tier-image/sample3.webp"
  },
  {
    id: 4,
    title: "나만의 5티어 커스텀 티어 공유해요",
    author: "초보티어",
    date: "2026.05.27",
    views: 98,
    likes: 12,
    thumbnail: "../tier-image/sample1.webp"
  },
  {
    id: 5,
    title: "9티어 비전투원들로 만든 재미있는 티어",
    author: "재미쟁이",
    date: "2026.05.26",
    views: 145,
    likes: 8,
    thumbnail: "../tier-image/sample2.webp"
  }
];

// ─── 카드 하나를 생성하는 헬퍼 함수 ─────────────────────────────
function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-thumbnail">
      <img src="${post.thumbnail}" alt="${post.title}">
    </div>
    <div class="post-info">
      <h3 class="post-title">${post.title}</h3>
      <div class="post-meta">
        <span class="post-author">${post.author}</span>
        <span class="post-date">${post.date}</span>
      </div>
      <div class="post-stats">
        <span>조회 ${post.views}</span>
        <span>추천 ${post.likes}</span>
      </div>
    </div>
  `;

  // 카드 클릭 → 상세 페이지 이동 (나중에 post.html?id=1 형태로 연결)
  card.addEventListener('click', () => {
    window.location.href = `post.html?id=${post.id}`;
    // 현재는 post.html이 없으므로 아래 alert로 테스트
    // alert(`게시글 "${post.title}" 상세 페이지로 이동합니다.`);
  });

  return card;
}

// ─── 게시글 렌더링 함수 ─────────────────────────────
function loadPosts(filteredPosts = null) {
  const grid = document.getElementById('post-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const postsToShow = filteredPosts || dummyPosts;

  if (postsToShow.length === 0) {
    grid.innerHTML = `<div class="empty-message">검색 결과가 없습니다.<br>다른 검색어로 시도해보세요.</div>`;
    return;
  }

  postsToShow.forEach(post => {
    const card = createPostCard(post);
    grid.appendChild(card);
  });
}

// ─── 검색 기능 ─────────────────────────────
function searchPosts() {
  const keyword = document.getElementById('search-input').value.toLowerCase().trim();

  if (!keyword) {
    loadPosts();           // 검색어 없으면 전체 표시
    return;
  }

  const filtered = dummyPosts.filter(post =>
    post.title.toLowerCase().includes(keyword) ||
    post.author.toLowerCase().includes(keyword)
  );

  loadPosts(filtered);
}

// ─── 페이지 로드 시 초기화 ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ custom-maker_post.js 로드 완료');

  // 헤더 + 푸터 로드
  if (typeof loadCommon === 'function') {
    loadCommon();
  }

  // 게시글 카드 렌더링
  loadPosts();

  // 검색 입력창 엔터키 지원
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchPosts();
    });
  }

  console.log('✅ 게시판 초기화 완료');
});

// 전역에서 사용할 수 있게 export
window.loadPosts = loadPosts;
window.searchPosts = searchPosts;