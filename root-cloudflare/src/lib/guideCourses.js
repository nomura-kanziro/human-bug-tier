// 가이드 모드 스테이지 정의 — 글이 아니라 "한 화면에 한 줄" 로 짚어 주는 게 목표라 문구는 짧게 쓴다.
//   route : 이 단계를 보여 줄 화면(해시 포함 가능). 다르면 가이드가 알아서 이동시킨다.
//   target: 강조할 요소의 CSS 선택자 목록 — 앞에서부터 "화면에 실제로 보이는" 첫 번째를 쓴다
//           (PC 에만 보이는 메뉴 / 모바일에만 보이는 버튼을 한 단계에 같이 적는 용도).
//           끝내 못 찾으면 강조 없이 가운데에 말풍선만 띄운다(로그인 상태에 따라 없는 버튼 대비).
export const GUIDE_COURSES = [
  {
    id: 'start',
    icon: '🏫',
    title: '첫 걸음',
    desc: '메뉴·테마·알림, 사이트 한 바퀴',
    steps: [
      { route: '/', target: ['.logo'], text: '여기를 누르면 언제든 홈으로!' },
      { route: '/', target: ['.desktop-nav', '#menuBtn'], text: '모든 기능은 이 메뉴에서 시작해요.' },
      { route: '/', target: ['#theme-toggle-btn'], text: '밝게 ☀️ 어둡게 🌙 — 눈에 편한 쪽으로.' },
      { route: '/', target: ['#notification-bell-btn', '#header-login-btn'], text: '로그인하면 알림·포인트·게시판이 열려요.' },
      { route: '/', target: ['.notice-section'], text: '공지와 새 소식은 여기에 모여요.' },
      { route: '/', target: ['#home-tiers'], text: '티어표는 여기서 바로 들어가요.' },
    ],
  },
  {
    id: 'tier',
    icon: '🏆',
    title: '티어표 보기',
    desc: '1~9티어 캐릭터 순위 구경',
    steps: [
      { route: '/tier/1', target: ['.tier-switch-nav'], text: '◀ ▶ 로 1~9티어를 넘겨 봐요.' },
      { route: '/tier/1', target: ['.tier-board-desc'], text: '이 티어가 어떤 구간인지 한 줄 요약!' },
      { route: '/tier/1', target: ['.tier-board'], text: '캐릭터들이 갑·을·병·정 순서로 놓여 있어요.' },
    ],
  },
  {
    id: 'maker',
    icon: '🎨',
    title: '나만의 티어표',
    desc: '끌어다 놓고, 꾸미고, 올리기',
    steps: [
      { route: '/custom-maker', target: ['#character-pool'], text: '캐릭터 풀 — 여기서 골라요.' },
      { route: '/custom-maker', target: ['#pool-search-input'], text: '이름으로 바로 찾기!' },
      { route: '/custom-maker', target: ['#tier-capture-area'], text: '골라서 등급 칸에 놓으면 배치 끝.' },
      { route: '/custom-maker', target: ['.btn-decorate'], text: '✨ 꾸미기 — 테두리·이펙트·이펙트 색.' },
      { route: '/custom-maker', target: ['.btn-download'], text: '이미지로 저장해요.' },
      { route: '/custom-maker', target: ['.btn-upload'], text: '게시판에 올려 자랑하기!' },
    ],
  },
  {
    id: 'board',
    icon: '💬',
    title: '게시판',
    desc: '다른 사람의 티어표 구경',
    steps: [
      { route: '/board', target: ['#board-search-input'], text: '제목·작성자로 검색해요.' },
      { route: '/board', target: ['#post-grid'], text: '마음에 드는 티어표를 눌러 보세요.' },
      { route: '/board', target: ['.write-btn'], text: '내 티어표도 여기에 올려요.' },
    ],
  },
  {
    id: 'play',
    icon: '🎲',
    title: '이벤트 · 행운 뽑기',
    desc: '퀴즈, 메모리 게임, 오늘의 행운',
    steps: [
      { route: '/event', target: ['.event-tabs'], text: '퀴즈 · 티어표 공개 · 메모리 게임.' },
      { route: '/luck-draw', target: ['.luck-draw-tabs'], text: '오늘의 행운 · 포커 · 랜덤 뽑기.' },
      { route: '/luck-draw', target: ['.luck-draw-page'], text: '로그인하면 포인트가 쌓이고 기록이 남아요.' },
    ],
  },
];

export const getGuideCourse = (id) => GUIDE_COURSES.find((c) => c.id === id) || null;
export const getStageNumber = (id) => GUIDE_COURSES.findIndex((c) => c.id === id) + 1;
