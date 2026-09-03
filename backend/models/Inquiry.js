const mongoose = require('mongoose');

/* ====== answerSchema (서브 도큐먼트) ======
 * 문의(Inquiry) 하나에 달리는 답변/재답변들을 담는 배열 요소 스키마.
 * 관리자 답변뿐 아니라 작성자 본인의 추가 질문("재문의")도 같은 구조로 쌓이며,
 * isAdmin으로 관리자 답변인지 구분한다.
 */
const answerSchema = new mongoose.Schema({
  userId: { type: String, required: true },   // 답변 작성자 닉네임(관리자면 관리자 이름)
  isAdmin: { type: Boolean, default: false }, // true면 관리자가 단 답변
  message: { type: String, required: true },
  // 서버의 Date 객체 대신 한국 로캘로 미리 포맷된 문자열을 저장(프론트 표시용, 타임존 변환 불필요).
  date: { type: String, default: () => new Date().toLocaleString('ko-KR') },
  quotedUser: String,       // 답변이 인용(답글) 대상으로 삼은 사용자 닉네임(선택)
  quotedMessage: String,    // 인용된 원문 내용 일부(선택)
  // 이 개별 답변 하나에 대한 신고 상태. 문의글 전체가 아니라 답변 단위로도 신고 가능하다.
  reported: { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  reportDetail: { type: String, default: '' },
}, { _id: true }); // 각 답변마다 고유 _id 부여(프론트에서 답변 단위로 신고/식별하기 위함)

/* ====== Inquiry 스키마 ======
 * 1:1 문의(Contact Us) 게시물. 작성자의 최초 질문 + answers 배열(관리자 답변/추가 대화)로
 * 하나의 스레드를 구성한다(별도의 댓글 컬렉션을 쓰지 않고 서브 도큐먼트로 관리).
 */
const inquirySchema = new mongoose.Schema({
  userId: { type: String, required: true },           // 작성자 닉네임
  ip: { type: String, default: 'unknown' },            // 작성 당시 IP(악용/신고 대응용 기록)
  isAdmin: { type: Boolean, default: false },          // 관리자가 대신 작성한 문의인 경우 true
  title: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: String, default: () => new Date().toLocaleString('ko-KR') },
  answers: [answerSchema],                            // 답변 배열(관리자 답변 + 작성자 재문의가 순서대로 쌓임)
  // 문의글 자체(제목/본문)에 대한 신고 상태 — answers 내부 개별 신고와는 별개.
  reported: { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  reportDetail: { type: String, default: '' },
}, { timestamps: true }); // createdAt/updatedAt 자동 기록(목록 정렬 등에 사용)

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;