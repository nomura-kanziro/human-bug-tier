const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  findId,
  forgotPassword,
  validateResetToken,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', register);
router.get('/verify/:token', verifyEmail);
router.post('/login', login);
router.post('/find-id', findId);
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;