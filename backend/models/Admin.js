const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  loginId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '관리자',
    trim: true,
  },
  notificationSettings: {
    enabled: { type: Boolean, default: true },
    tierBoard: { type: Boolean, default: true },
    inquiry: { type: Boolean, default: true },
    noticeNews: { type: Boolean, default: true },
  },
}, {
  timestamps: true,
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;