const express = require('express');
const router = express.Router();
const { register, verifyEmail, login } = require('../controllers/authController');

router.post('/register', register);
router.get('/verify/:token', verifyEmail);

// 새로 추가한 로그인 라우터
router.post('/login', login);

module.exports = router;