const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientNickname: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  recipientEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'tier_post_comment',
      'tier_comment_reply',
      'tier_comment_mention',
      'inquiry_answer',
      'inquiry_mention',
      'notice',
      'news',
    ],
  },
  category: {
    type: String,
    required: true,
    enum: ['tierBoard', 'inquiry', 'noticeNews'],
  },
  actorNickname: {
    type: String,
    default: '',
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    default: '',
    trim: true,
  },
  link: {
    type: String,
    default: '',
    trim: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  resourceType: {
    type: String,
    default: '',
    trim: true,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

notificationSchema.index({ recipientNickname: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;