const mongoose = require('mongoose');

/* ====== EventQuizAttempt 스키마 ======
 * 이벤트 "매일 간단 퀴즈" 한 판(유저 1명 × 하루 1번).
 *
 * 문제는 서버가 만들어 이 문서에 **먼저 저장**하고(status:'open'), 유저가 고른 보기 번호만
 * 받아서 채점한다 — 정답(correctIndex)이 응답에 나가지 않으므로 프론트에서 답을 미리 볼 수 없다.
 * 하루 한 번 제한은 {userId, quizDate} unique 인덱스가 DB 레벨에서 보장한다
 * (quizDate 는 KST 기준 YYYY-MM-DD — utils/kstDate.getKstDateString).
 *
 * 보상은 맞혔을 때만, 1~1000P 를 "복권식"으로 뽑아 LuckProfile.points 에 더한다
 * (확률표는 controllers/eventController.js 의 QUIZ_PRIZE_TABLE 한 곳에만 있다).
 */
const eventQuizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // KST 기준 날짜(YYYY-MM-DD). 하루 1회 제한과 "오늘 문제" 조회의 기준.
  quizDate: {
    type: String,
    required: true,
  },
  // 문제 대상 캐릭터
  characterName: { type: String, required: true },
  characterImg: { type: String, default: '' },
  // 보기 3개. 정답은 correctIndex 가 가리키는 항목이며 응답에는 내보내지 않는다.
  choices: {
    type: [{ tier: Number, subTier: String, _id: false }],
    required: true,
  },
  correctIndex: { type: Number, required: true },
  // 유저가 고른 보기 번호(아직 안 풀었으면 null)
  answeredIndex: { type: Number, default: null },
  correct: { type: Boolean, default: null },
  // 맞혔을 때 실제로 지급된 포인트(0 이면 미지급). 틀리면 0.
  points: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['open', 'answered'],
    default: 'open',
    index: true,
  },
  answeredAt: { type: Date, default: null },
}, {
  timestamps: true,
});

// 유저당 하루 1판 — 같은 날 두 번째 문제가 생기지 않게 DB 가 막는다.
eventQuizAttemptSchema.index({ userId: 1, quizDate: 1 }, { unique: true });

const EventQuizAttempt = mongoose.model('EventQuizAttempt', eventQuizAttemptSchema);

module.exports = EventQuizAttempt;
