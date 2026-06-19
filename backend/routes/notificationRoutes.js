const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  getSettings,
  updateSettings,
} = require('../controllers/notificationController');

router.get('/', requireAuth, getNotifications);
router.delete('/', requireAuth, deleteAllNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.get('/settings', requireAuth, getSettings);
router.patch('/settings', requireAuth, updateSettings);
router.patch('/read-all', requireAuth, markAllAsRead);
router.patch('/:id/read', requireAuth, markAsRead);

module.exports = router;