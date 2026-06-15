const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  summary: { type: String, default: '' },
  category: {
    type: String,
    enum: ['notice', 'news'],
    required: true,
  },
  author: { type: String, default: '관리자' },
  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
}, { timestamps: true });

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;