const mongoose = require('mongoose');

/* ====== TierList 스키마 ======
 * 커스텀 티어 게시판에 저장되는 게시물 1건 = 유저가 만든 커스텀 티어표 1개.
 * 게시글 자체의 좋아요/댓글은 각각 TierLike / TierPostComment 컬렉션으로 분리되어 있고,
 * 이 문서는 그 집계 결과(likeCount)를 캐시로 들고 있는 구조다.
 */
const tierListSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  // 커스텀 티어 제작 툴에서 만들어진 티어 배치 데이터(어떤 캐릭터가 어느 줄에 있는지 등)를
  // 그대로 담는 자유 형식 객체. 프론트 제작 툴의 자료구조에 맞춰야 하므로 고정 스키마 없이
  // Object 타입으로 저장(구조가 바뀌어도 모델 쪽 수정 없이 그대로 저장 가능).
  tierData: {
    type: Object,
    required: true,
  },
  // 작성자 닉네임. 실제 생성 API(createTierList)는 로그인을 필수로 요구하며 항상
  // JWT actor.nickname을 채워 넣으므로 'anonymous' 기본값이 그 경로에서 쓰이는 일은
  // 없지만, required는 아니라서 스키마 레벨 안전장치로 기본값을 남겨 두었다.
  author: {
    type: String,
    default: 'anonymous',
  },
  // 작성자 이메일. isSameAuthor/getVoterKey 등에서 "본인 글인지" 판별하는 데 쓰이는
  // 보조 식별자(닉네임만으로는 동명이인을 구분할 수 없기 때문).
  authorEmail: {
    type: String,
    default: '',
  },
  // 목록/미리보기에 쓰이는 썸네일 이미지 경로(또는 데이터 URL).
  thumbnail: {
    type: String,
    default: '',
  },
  // 공개 여부. false면 게시판 목록/검색에 노출되지 않는 비공개 글로 취급된다.
  isPublic: {
    type: Boolean,
    default: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  // TierLike 문서 개수를 반영하는 비정규화 카운터. 매번 TierLike를 count하지 않고
  // 목록 조회 시 바로 정렬/표시할 수 있도록 캐시해 둔 값(추천 시 +1, 취소 기능은 없음).
  likeCount: {
    type: Number,
    default: 0,
  },
  // 조회수 카운터.
  viewCount: {
    type: Number,
    default: 0,
  },
  // 이 게시글 자체(제목/설명/티어 구성)에 대한 신고 상태.
  // 댓글 단위 신고는 TierPostComment 쪽에 별도로 존재한다.
  reported: {
    type: Boolean,
    default: false,
  },
  reportReason: {
    type: String,
    default: '',
    trim: true,
  },
  reportDetail: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

const TierList = mongoose.model('TierList', tierListSchema);

module.exports = TierList;