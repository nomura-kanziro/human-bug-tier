// README 캡처용 가상 데이터 — 로컬 임시 Mongo 에만 넣는다. 닉네임·글 내용은 모두 지어낸 것이다.
const path = require('path');

const backend = path.resolve(__dirname, '../../../backend');
const mongoose = require(path.join(backend, 'node_modules/mongoose'));
const tiers = require('../../../root-cloudflare/src/data/tiers.json');

const DEMO_URI = 'mongodb://127.0.0.1:27099/hbt_readme_demo';
const API = 'http://127.0.0.1:5077/api';
const PASSWORD = 'Demo!2345abc';
const MAIN_USER = '티어장인';
const NICKS = [MAIN_USER, '도쿄의밤', '메이커초보', '랭킹분석가', '휴버덕후'];

const model = (name) => require(path.join(backend, 'models', name));
const clean = (s) => String(s || '').replace(/[*_]/g, ' ').trim();

async function api(url, body, token) {
  const res = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${url} ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// 게시글 하나 = 등급(tierIndex)별 세부 칸에 캐릭터를 배치한 tierState
function buildTierState(tierIndex, offset) {
  const pool = Object.values(tiers).flatMap((t) => t.rows.flatMap((r) => r.items))
    .filter((c) => c.img && !c.break);
  const labels = tiers[tierIndex + 1].rows.map((r) => String(r.label).replace(/\n/g, ' '));
  const state = {};
  labels.forEach((label, i) => {
    state[`${tierIndex}_${label}`] = pool.slice(offset + i * 9, offset + i * 9 + 5 + (i % 3)).map((c) => {
      const name = clean(c.name || c.alt);
      return { id: name, name, img: c.img };
    });
  });
  return state;
}

async function main() {
  await mongoose.connect(DEMO_URI);
  const User = model('User');
  const LuckProfile = model('LuckProfile');
  const TierList = model('TierList');
  const TierPostComment = model('TierPostComment');
  const Notice = model('Notice');
  const Inquiry = model('Inquiry');
  const Notification = model('Notification');
  const Period = model('EventMemoryPeriod');
  const Session = model('EventMemorySession');

  const tokens = {};
  for (const [i, nickname] of NICKS.entries()) {
    const email = `demo${i}@example.com`;
    if (!(await User.findOne({ email }))) await api('/auth/register', { email, password: PASSWORD, nickname });
    tokens[nickname] = (await api('/auth/login', { userId: nickname, password: PASSWORD })).token;
  }

  await Promise.all([TierList, TierPostComment, Notice, Inquiry, Notification, Period, Session].map((m) => m.deleteMany({})));

  const posts = [
    ['내가 뽑은 2티어 재배치', '무급이 새로 생겨서 다시 정리해 봤어요', MAIN_USER, 1, 0, 128, 942],
    ['1티어 재해석 — 신계의 기준', '서열 근거는 댓글에 적어 두었습니다', '랭킹분석가', 0, 40, 96, 713],
    ['입문자를 위한 3티어 정리', '처음 보는 분들도 알아보기 쉽게 정렬', '메이커초보', 2, 80, 54, 402],
    ['4티어 숨은 강자들', '과소평가된 캐릭터 위주로 올렸어요', '휴버덕후', 3, 120, 41, 318],
    ['5티어 전투 스타일별 분류', '근접 · 무기 · 전략형으로 나눠 봤습니다', '도쿄의밤', 4, 160, 33, 276],
    ['6티어 최애 픽', '순전히 제 취향이 들어갔습니다', MAIN_USER, 5, 200, 18, 151],
  ];
  const saved = [];
  for (const [title, description, author, tierIndex, offset, likeCount, viewCount] of posts) {
    saved.push(await TierList.create({
      title, description, author, authorEmail: `demo${NICKS.indexOf(author)}@example.com`,
      tierData: { tierState: buildTierState(tierIndex, offset), tierIndex }, likeCount, viewCount, tags: ['데모'],
    }));
  }
  const first = saved[0];
  await TierPostComment.create([
    { tierListId: first._id, author: '도쿄의밤', content: '무급 분류 깔끔하네요. 저도 비슷하게 봤어요!' },
    { tierListId: first._id, author: '랭킹분석가', content: '근거까지 같이 적어 주시면 더 좋을 것 같아요.' },
    { tierListId: first._id, author: MAIN_USER, content: '좋아요, 다음 글에 정리해서 올릴게요 🙌', quotedUser: '랭킹분석가', quotedMessage: '근거까지 같이 적어 주시면 더 좋을 것 같아요.' },
  ]);

  await Notice.create([
    { title: '2티어 무급 신설 안내', category: 'notice', summary: '공식 티어표에 2티어 무급이 추가되었습니다.', content: '<p>공식 티어표 2티어에 <b>무급</b>이 추가되었습니다.</p><p>커스텀 메이커에서도 바로 사용할 수 있습니다.</p>', isPinned: true, pinnedAt: new Date() },
    { title: '출석체크가 시작되었습니다', category: 'notice', summary: '로그인만 해도 매일 포인트를 받을 수 있어요.', content: '<p>로그인하면 매일 출석 포인트가 쌓입니다. 7일째에는 더 큰 보상이 기다립니다.</p>' },
    { title: 'AI 도우미 휴버봇 안내', category: 'notice', summary: '사이트 이용 방법을 물어보세요.', content: '<p>사이트 기능이 궁금하면 휴버봇에게 물어보세요.</p>' },
    { title: '이벤트 페이지 오픈 소식', category: 'news', summary: '매일 퀴즈와 메모리 게임을 즐겨 보세요.', content: '<p>매일 퀴즈와 메모리 게임이 열렸습니다.</p>' },
    { title: '가이드 모드 업데이트', category: 'news', summary: '처음 오셨다면 가이드를 따라가 보세요.', content: '<p>화면을 직접 따라가는 가이드 모드가 추가되었습니다.</p>' },
    { title: '메이커 꾸미기 기능 추가', category: 'news', summary: '티어표 색과 스타일을 바꿀 수 있어요.', content: '<p>꾸미기 패널에서 티어표 스타일을 바꿀 수 있습니다.</p>' },
  ]);

  await Inquiry.create([
    { userId: MAIN_USER, title: '캐릭터 이미지가 안 보여요', message: '특정 캐릭터 이미지가 안 보이는데 확인 부탁드립니다.', answers: [{ userId: '관리자', isAdmin: true, message: '확인 후 수정했습니다. 새로고침해 보세요!' }] },
    { userId: '메이커초보', title: 'PDF 저장 방법이 궁금합니다', message: '티어표를 PDF로 저장하려면 어떻게 하나요?', answers: [{ userId: '관리자', isAdmin: true, message: '메이커 하단 다운로드 → PDF로 저장을 눌러 주세요.' }] },
    { userId: '휴버덕후', title: '이벤트 보상 문의', message: '메모리 게임 보상은 언제 지급되나요?' },
  ]);

  await Notification.create([
    { recipientNickname: MAIN_USER, type: 'tier_post_comment', category: 'tierBoard', actorNickname: '도쿄의밤', title: '내 티어표에 새 댓글', message: '무급 분류 깔끔하네요. 저도 비슷하게 봤어요!', link: `/board/post?id=${first._id}` },
    { recipientNickname: MAIN_USER, type: 'inquiry_answer', category: 'inquiry', actorNickname: '관리자', title: '문의에 답변이 달렸습니다', message: '확인 후 수정했습니다. 새로고침해 보세요!', link: '/inquiry' },
    { recipientNickname: MAIN_USER, type: 'notice', category: 'noticeNews', title: '새 공지', message: '2티어 무급 신설 안내', link: '/notice' },
    { recipientNickname: MAIN_USER, type: 'event_open', category: 'noticeNews', title: '메모리 게임 기록 이벤트가 열렸습니다', message: '이번 주 1위에게 1000P', link: '/event#memory', read: true },
  ]);

  const main = await User.findOne({ nickname: MAIN_USER });
  await LuckProfile.findOneAndUpdate(
    { userId: main._id },
    { $set: { points: 3280, totalDraws: 86, bestTier: 2, attendanceStreak: 4, tierCounts: { 2: 3, 3: 7, 4: 12, 5: 18, 6: 21, 7: 25 } } },
    { upsert: true },
  );

  const period = await Period.create({
    title: '11월 첫째 주 메모리 기록전', description: '가장 빠른 기록에 1000P', status: 'open',
    startsAt: new Date(), endsAt: new Date(Date.now() + 5 * 864e5), prizePoints: 1000,
  });
  const users = await User.find({ nickname: { $in: NICKS } });
  const times = [48210, 53640, 61120, 72980];
  await Promise.all(times.map((totalMs, i) => Session.create({
    userId: users[i + 1]._id, nickname: users[i + 1].nickname, periodId: period._id, totalMs,
    status: 'done', stageIndex: 3, startedAt: new Date(Date.now() - totalMs), finishedAt: new Date(),
  })));

  console.log('seed ok', { users: NICKS.length, posts: saved.length, firstPost: String(first._id) });
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
