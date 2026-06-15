const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  message: { type: String, required: true },
  date: { type: String, default: () => new Date().toLocaleString('ko-KR') },
  quotedUser: String,
  quotedMessage: String,
  reported: { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  reportDetail: { type: String, default: '' },
}, { _id: true });

const inquirySchema = new mongoose.Schema({
  userId: { type: String, required: true },           // 작성자 닉네임
  ip: { type: String, default: 'unknown' },
  isAdmin: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: String, default: () => new Date().toLocaleString('ko-KR') },
  answers: [answerSchema],                            // 답변 배열
  reported: { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  reportDetail: { type: String, default: '' },
}, { timestamps: true });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;