const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    required: true,
    trim: true
  },
  ip: {
    type: String,
    default: 'unknown'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  notificationSettings: {
    enabled: { type: Boolean, default: true },
    tierBoard: { type: Boolean, default: true },
    inquiry: { type: Boolean, default: true },
    noticeNews: { type: Boolean, default: true },
  },
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
module.exports = User;