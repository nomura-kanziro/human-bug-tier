// post_detail.js

// 더미 게시글 데이터 (나중에 실제 DB 데이터로 교체 예정)
const dummyPosts = [
  {
    id: 1,
    title: "내 최애 캐릭터들로 만든 신계 1티어",
    author: "유저123",
    date: "2026.05.30",
    views: 342,
    likes: 47,
    // 나중에 tierData에 실제 저장된 캐릭터 데이터 들어갈 예정
  }
];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ post_detail.js 로드 완료');

  // 헤더/푸터 로드
  if (typeof loadCommon === 'function') {
    loadCommon();
  }

  // 게시글 상세 정보 로드 + 티어 테이블 렌더링
  loadPostDetail();

  // 버튼 이벤트 연결
  setupActionButtons();

  // 댓글 로드
  loadComments();
});

// 게시글 상세 정보 불러오기
function loadPostDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = parseInt(urlParams.get('id')) || 1;

  const post = dummyPosts.find(p => p.id === postId);
  if (!post) {
    alert('게시글을 찾을 수 없습니다.');
    return;
  }

  // HTML에 데이터 넣기
  document.getElementById('post-title').textContent = post.title;
  document.getElementById('post-author').textContent = post.author;
  document.getElementById('post-date').textContent = post.date;
  document.getElementById('post-views').textContent = post.views;
  document.getElementById('post-likes').textContent = post.likes;

  // 현재는 더미로 갑급에 캐릭터 1개 넣기 (나중에 실제 데이터로 교체)
  loadSavedCharacters();
}

// 유저 관련 게시글 보기 (나중에 게시판에서 검색 기능과 연결)
function goToUserPosts() {
  const author = document.getElementById('post-author').textContent;
  // 현재는 alert, 나중에 index.html에서 검색 기능 구현 시 연결
  alert(`"${author}"님이 작성한 게시글 목록으로 이동합니다. (추후 구현)`);
  // 나중에 아래처럼 연결 예정
  // window.location.href = `index.html?author=${author}`;
}

// 댓글 영역으로 스크롤 이동
function scrollToComments() {
  const commentSection = document.querySelector('.comment-section');
  if (commentSection) {
    commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 저장된 캐릭터를 티어 테이블에 넣는 함수 (읽기 전용)
function loadSavedCharacters() {
  const gapZone = document.querySelector('.characters[data-tier="갑급"]');
  if (gapZone) {
    const char = document.createElement('div');
    char.className = 'char';
    char.innerHTML = `
      <img src="../tier-image/sample1.webp" alt="캐릭터">
      <p>테스트 캐릭터</p>
    `;
    gapZone.appendChild(char);
  }
}

// 추천하기, 공유하기, 이벤트 버튼
function setupActionButtons() {
  const likeBtn = document.getElementById('like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      alert('추천 기능은 추후 백엔드 연동 후 구현 예정입니다.');
    });
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      alert('공유 기능은 추후 구현 예정입니다.');
    });
  }

  const eventBtn = document.getElementById('event-btn');
  if (eventBtn) {
    eventBtn.addEventListener('click', () => {
      alert('이벤트 참여 기능은 준비 중입니다.');
    });
  }
}

// 댓글 관련 (임시)
function loadComments() {
  console.log('댓글 로드 (임시)');
}

function submitComment() {
  const inputBox = document.getElementById('comment-input');
  if (!inputBox) return;

  const text = inputBox.innerText.trim();
  if (text === '') {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  // 나중에 실제 댓글 등록 로직으로 교체 예정
  alert('댓글 등록 기능은 추후 백엔드 연동 후 구현 예정입니다.\n\n입력 내용: ' + text);

  // 입력창 비우기
  inputBox.innerHTML = '';
}