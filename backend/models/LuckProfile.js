const mongoose = require('mongoose');

/* ====== LuckProfile 스키마 ======
 * 뽑기 이력(LuckDraw)은 최근 5건만 남기고 애플리케이션 코드가 오래된 것을 지워버리므로,
 * 누적 포인트·총 횟수·최고 티어·오늘 진행 상황은 이 컬렉션에 "별도로" 영구 보관한다
 * (LuckDraw 이력이 잘려나가도 이 통계 문서는 그대로 유지됨).
 *
 * LuckDraw(이력 로그, 유저당 여러 건, 계속 잘려나감) vs LuckProfile(집계 문서, 유저당
 * 정확히 1건, unique 인덱스로 보장) — 서로 다른 목적의 두 컬렉션이며 중복이 아니다.
 * 하루 뽑기 횟수 제한/쿨다운처럼 "삭제되면 안 되는" 판정용 상태를 이력과 분리해 둠으로써
 * 이력 정리 로직이 하루 제한 로직에 영향을 주지 않도록 한 설계다.
 */
const luckProfileSchema = new mongoose.Schema({
  // 유저 1명당 프로필 문서 1개만 존재해야 하므로 unique 인덱스로 강제.
  // (findOneAndUpdate 등으로 upsert할 때도 이 unique 제약이 중복 생성을 막아준다)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // 뽑기로 누적된 총 포인트(티어별 포인트를 합산). 이력이 삭제돼도 감소하지 않는다.
  points: {
    type: Number,
    default: 0,
  },
  // 지금까지 뽑은 총 횟수(이력 5건 제한과 무관하게 계속 누적).
  totalDraws: {
    type: Number,
    default: 0,
  },
  // 티어별로 몇 번 뽑았는지 집계하는 맵(예: { "1": 3, "2": 10, ... }).
  // 고정된 필드 목록이 아니라 티어 번호가 키가 되므로 스키마 없는 Object 타입으로 둠.
  tierCounts: {
    type: Object,
    default: () => ({}),
  },
  // 지금까지 뽑은 것 중 가장 좋은 티어. 티어는 숫자가 작을수록 상위 티어이므로
  // 컨트롤러에서 "새 결과 tier < 기존 bestTier"일 때만 갱신한다(작을수록 갱신).
  bestTier: {
    type: Number,
    default: null,
  },
  // 오늘 하루 뽑은 횟수. 날짜가 바뀌면(todayDate와 비교) 0으로 리셋되는 방식으로
  // 회원 하루 20회 제한 등을 판정하는 데 사용된다.
  todayCount: {
    type: Number,
    default: 0,
  },
  // todayCount가 어느 날짜(KST 기준) 기준으로 집계된 것인지 표시하는 문자열.
  // 요청 시점의 날짜와 다르면 todayCount를 리셋해야 한다는 신호로 쓰인다.
  todayDate: {
    type: String,
    default: '',
  },
  // 마지막으로 뽑기를 실행한 시각. 쿨다운(연속 뽑기 방지) 판정의 기준 시각으로 쓰인다.
  lastDrawAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const LuckProfile = mongoose.model('LuckProfile', luckProfileSchema);

module.exports = LuckProfile;
