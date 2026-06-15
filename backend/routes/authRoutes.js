const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  findId,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', register);
router.get('/verify/:token', verifyEmail);
router.post('/login', login);
router.post('/find-id', findId);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;