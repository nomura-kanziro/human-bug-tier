const mongoose = require('mongoose');

/* ====== LuckDraw 스키마 ======
 * "행운 뽑기" 기능의 개별 뽑기 이력(히스토리 로그).
 * 이 컬렉션은 유저당 최근 5건만 유지되도록 애플리케이션 코드(컨트롤러)에서 오래된
 * 문서를 직접 지워서 관리한다 — Mongo TTL 인덱스로 자동 만료시키는 방식이 아니다.
 *
 * ※ LuckProfile과의 관계(중요, 중복 모델이 아님):
 *   - LuckDraw = "최근 몇 건을 뽑았는지" 보여주기 위한 짧은 이력 로그(계속 잘려나감).
 *   - LuckProfile = 포인트/총 뽑기 횟수/최고 티어/오늘 카운트 등 "누적 통계"를 담는
 *     유저당 1건짜리 영구 집계 문서(LuckDraw.js 참고: 이력이 잘려도 통계는 보존되어야
 *     하루 제한·쿨다운 판정과 랭킹/최고기록 표시가 안전하게 유지됨).
 *   즉 이력이 삭제되어도 하루 제한 로직이 깨지지 않도록 통계를 별도 컬렉션으로 분리한 것.
 */
const luckDrawSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  // 뽑기 모드: 'daily_tier'(오늘의 행운 티어) / 'random_char'(랜덤 캐릭터 뽑기).
  mode: {
    type: String,
    enum: ['daily_tier', 'random_char'],
    required: true,
  },
  // 결과 티어(1~9). 공식 티어표의 1~9 티어 범위와 동일하게 맞춘 값.
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 9,
  },
  characterName: {
    type: String,
    required: true,
    trim: true,
  },
  imagePath: {
    type: String,
    required: true,
    trim: true,
  },
  // 뽑기가 일어난 "날짜"(KST 기준 YYYY-MM-DD 등 문자열). 하루 단위 횟수 집계의 기준 키.
  drawDate: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// 1일 다회(최대 20회) 허용 — 절대 unique로 만들면 안 됨(과거 버그 이력).
// unique로 걸었을 때 이력이 5건으로 잘려나가면서 "오늘 이미 뽑은 기록"이 삭제돼
// 하루 횟수 제한 로직이 오작동한 적이 있음. 이 인덱스는 어디까지나 조회 성능용
// (유저+모드+날짜로 당일 뽑기 횟수를 빠르게 집계하기 위함)이지 유일성 제약이 아니다.
luckDrawSchema.index({ userId: 1, mode: 1, drawDate: 1 });
// 쿨다운(마지막 뽑기 시각) 조회용 인덱스 — 최근 뽑기를 createdAt 내림차순으로 빠르게 찾기 위함.
// 이 역시 unique가 아니며, 회원 20회/게스트 등 반복 뽑기를 그대로 허용한다.
luckDrawSchema.index({ userId: 1, mode: 1, createdAt: -1 });

const LuckDraw = mongoose.model('LuckDraw', luckDrawSchema);

module.exports = LuckDraw;
