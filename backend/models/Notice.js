const mongoose = require('mongoose');

/* ====== Notice 스키마 ======
 * 공지사항(notice)과 새 소식/뉴스(news)를 한 컬렉션에서 함께 관리한다(category로 구분).
 * 관리자가 직접 작성하는 글 외에, 유튜브 영상을 자동으로 가져와 게시하는 경로(source:
 * 'youtube')도 지원한다 — 아래 youtube* 필드들은 그 자동 수집 글에만 채워진다.
 */
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  summary: { type: String, default: '' }, // 목록/미리보기용 짧은 요약(선택)
  // 'notice'(공지) / 'news'(소식) — 프론트 목록/필터가 이 값으로 탭을 나눈다.
  category: {
    type: String,
    enum: ['notice', 'news'],
    required: true,
  },
  author: { type: String, default: '관리자' },
  // 이 글이 관리자가 직접 쓴 것인지('admin'), 유튜브 영상에서 자동 생성된 것인지('youtube').
  source: {
    type: String,
    enum: ['admin', 'youtube'],
    default: 'admin',
  },
  // 유튜브 영상 고유 ID. sparse+unique 조합으로 "값이 있는 문서끼리는 중복 불가,
  // 값이 없는(=관리자 작성) 문서는 여러 개라도 unique 제약에서 제외"되도록 한다.
  // 이렇게 해야 동일 영상이 자동 수집 과정에서 중복 게시되는 것을 막으면서도,
  // youtubePostId가 없는 일반 공지글들끼리는 unique 충돌 없이 자유롭게 생성 가능하다.
  youtubePostId: { type: String, trim: true, unique: true, sparse: true },
  youtubePostUrl: { type: String, default: '' },
  youtubeOriginalTitle: { type: String, default: '' },     // 번역 전 원문 제목(원본 보존용)
  youtubeOriginalContent: { type: String, default: '' },   // 번역 전 원문 내용(원본 보존용)
  youtubeTranslated: { type: Boolean, default: false },    // 자동 번역이 적용됐는지 여부
  // 상단 고정 여부. pinnedAt은 고정된 시점을 기록해 "여러 개 고정 시 최근 고정 순" 등의
  // 정렬 기준으로 활용할 수 있게 한다.
  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
}, { timestamps: true });

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;