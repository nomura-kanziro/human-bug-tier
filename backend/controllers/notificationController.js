const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { DEFAULT_SETTINGS, getUserSettings } = require('../utils/notificationService');

function getRecipient(req) {
  if (!req.auth?.nickname) return null;
  return {
    nickname: String(req.auth.nickname).trim(),
    email: String(req.auth.email || '').trim().toLowerCase(),
    isAdmin: Boolean(req.auth.isAdmin),
  };
}

const getNotifications = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const notifications = await Notification.find({ recipientNickname: recipient.nickname })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(notifications);
  } catch (err) {
    console.error('알림 목록 조회 실패:', err);
    res.status(500).json({ error: '알림 목록 조회 실패' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const count = await Notification.countDocuments({
      recipientNickname: recipient.nickname,
      read: false,
    });

    res.json({ count });
  } catch (err) {
    console.error('미읽음 알림 수 조회 실패:', err);
    res.status(500).json({ error: '미읽음 알림 수 조회 실패' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientNickname: recipient.nickname,
    });

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (err) {
    console.error('알림 읽음 처리 실패:', err);
    res.status(500).json({ error: '알림 읽음 처리 실패' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    await Notification.updateMany(
      { recipientNickname: recipient.nickname, read: false },
      { $set: { read: true } },
    );

    res.json({ success: true });
  } catch (err) {
    console.error('전체 읽음 처리 실패:', err);
    res.status(500).json({ error: '전체 읽음 처리 실패' });
  }
};

const getSettings = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const settings = await getUserSettings(recipient.nickname);
    res.json(settings);
  } catch (err) {
    console.error('알림 설정 조회 실패:', err);
    res.status(500).json({ error: '알림 설정 조회 실패' });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const result = await Notification.deleteMany({
      recipientNickname: recipient.nickname,
    });

    res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('알림 기록 삭제 실패:', err);
    res.status(500).json({ error: '알림 기록 삭제 실패' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const recipient = getRecipient(req);
    if (!recipient) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const allowedKeys = ['enabled', 'tierBoard', 'inquiry', 'noticeNews'];
    const account = recipient.isAdmin
      ? await Admin.findOne({ name: recipient.nickname })
      : await User.findOne({ nickname: recipient.nickname });

    if (!account) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const nextSettings = { ...DEFAULT_SETTINGS, ...(account.notificationSettings || {}) };

    allowedKeys.forEach((key) => {
      if (typeof req.body?.[key] === 'boolean') {
        nextSettings[key] = req.body[key];
      }
    });

    account.notificationSettings = nextSettings;
    await account.save();

    res.json({ success: true, settings: nextSettings });
  } catch (err) {
    console.error('알림 설정 저장 실패:', err);
    res.status(500).json({ error: '알림 설정 저장 실패' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  getSettings,
  updateSettings,
};