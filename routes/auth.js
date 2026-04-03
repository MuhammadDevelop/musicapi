const express = require('express');
const router = express.Router();
const { register, verify, login, loginVerify, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Ro'yxatdan o'tish
router.post('/register', register);

// OTP tasdiqlash (register)
router.post('/verify', verify);

// Kirish
router.post('/login', login);

// OTP tasdiqlash (login)
router.post('/login/verify', loginVerify);

// Profil
router.get('/me', protect, getMe);

module.exports = router;
