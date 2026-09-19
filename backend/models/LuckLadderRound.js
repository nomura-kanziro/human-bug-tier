const mongoose = require('mongoose');

/* ====== LuckLadderRound 스키마 ======
 * "랜덤 뽑기"(사다리 게임 스타일) 전용 라운드. 개인별 즉시 뽑기가 아니라, 5분마다
 * 서버가 자동으로 진행하는 "전체 공용 라운드" 한 건을 나타낸다 — 그 라운드가 열려 있는
 * 동안 모든 유저가 같은 결과를 두고 배팅하고, 라운드가 끝나면 서버가 캐릭터 하나를
 * 무작위로 뽑아 그 라운드의 정답으로 확정한 뒤 걸린 배팅을 한 번에 정산한다.
 * (controllers/luckLadderController.js 의 스케줄러가 생성·정산을 전담)
 */
const luckLadderRoundSchema = new mongoose.Schema({
  // 1부터 증가하는 라운드 번호. 유저 배팅(LuckLadderBet)이 어느 라운드 것인지 연결하는 키.
  roundNo: {
    type: Number,
    required: true,
    unique: true,
  },
  startAt: {
    type: Date,
    required: true,
  },
  // 이 시각이 지나면 스케줄러가 라운드를 정산하고 다음 라운드를 연다.
  endAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'settled'],
    default: 'open',
  },
  // 정산 시점에 뽑힌 결과 — 정산 전에는 전부 비어 있다.
  resultCharacterName: {
    type: String,
    default: '',
  },
  resultImagePath: {
    type: String,
    default: '',
  },
  resultTier: {
    type: Number,
    default: null,
  },
  resultParity: {
    type: String,
    enum: ['odd', 'even', null],
    default: null,
  },
}, {
  timestamps: true,
});

const LuckLadderRound = mongoose.model('LuckLadderRound', luckLadderRoundSchema);

module.exports = LuckLadderRound;
