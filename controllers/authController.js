const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendOTP } = require('../bot/telegramBot');

// Random 6 xonali OTP generatsiya qilish
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// JWT token yaratish
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Ro'yxatdan o'tish — telefon raqam va ism
// @route   POST /api/auth/register
const register = async (req, res) => {
    try {
        const { phone, name } = req.body;

        if (!phone || !name) {
            return res.status(400).json({
                success: false,
                message: 'Telefon raqam va ism kiritilishi shart'
            });
        }

        // Foydalanuvchi mavjudligini tekshirish
        let user = await User.findOne({ phone });
        if (user && user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan'
            });
        }

        // OTP generatsiya
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa

        if (user) {
            // Tasdiqlanmagan foydalanuvchini yangilash
            user.name = name;
            user.otp = { code: otpHash, expiresAt };
            await user.save();
        } else {
            // Yangi foydalanuvchi yaratish
            user = await User.create({
                phone,
                name,
                otp: { code: otpHash, expiresAt }
            });
        }

        // OTP telegram orqali yuborish
        const sent = await sendOTP(phone, otp);

        res.status(200).json({
            success: true,
            message: sent
                ? 'Tasdiqlash kodi Telegram orqali yuborildi'
                : 'Tasdiqlash kodi yaratildi (Telegram bot sozlanmagan, konsolda ko\'ring)',
            phone
        });
    } catch (error) {
        console.error('Register xato:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

// @desc    OTP ni tasdiqlash (Register)
// @route   POST /api/auth/verify
const verify = async (req, res) => {
    try {
        const { phone, code } = req.body;

        if (!phone || !code) {
            return res.status(400).json({
                success: false,
                message: 'Telefon raqam va kod kiritilishi shart'
            });
        }

        const user = await User.findOne({ phone }).select('+otp.code +otp.expiresAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Foydalanuvchi topilmadi'
            });
        }

        // OTP muddatini tekshirish
        if (!user.otp || !user.otp.expiresAt || user.otp.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Tasdiqlash kodi muddati o\'tgan. Qaytadan so\'rang.'
            });
        }

        // OTP kodni tekshirish
        const isMatch = await bcrypt.compare(code, user.otp.code);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri tasdiqlash kodi'
            });
        }

        // Foydalanuvchini tasdiqlash
        user.isVerified = true;
        user.otp = undefined;
        await user.save();

        // Token qaytarish
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz!',
            token,
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Verify xato:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

// @desc    Login — telefon raqam orqali OTP yuborish
// @route   POST /api/auth/login
const login = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Telefon raqam kiritilishi shart'
            });
        }

        const user = await User.findOne({ phone, isVerified: true });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Foydalanuvchi topilmadi. Avval ro\'yxatdan o\'ting.'
            });
        }

        // OTP generatsiya va yuborish
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        user.otp = { code: otpHash, expiresAt };
        await user.save();

        const sent = await sendOTP(phone, otp);

        res.status(200).json({
            success: true,
            message: sent
                ? 'Kirish kodi Telegram orqali yuborildi'
                : 'Kirish kodi yaratildi (Telegram bot sozlanmagan, konsolda ko\'ring)',
            phone
        });
    } catch (error) {
        console.error('Login xato:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

// @desc    Login OTP ni tasdiqlash
// @route   POST /api/auth/login/verify
const loginVerify = async (req, res) => {
    try {
        const { phone, code } = req.body;

        if (!phone || !code) {
            return res.status(400).json({
                success: false,
                message: 'Telefon raqam va kod kiritilishi shart'
            });
        }

        const user = await User.findOne({ phone }).select('+otp.code +otp.expiresAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Foydalanuvchi topilmadi'
            });
        }

        if (!user.otp || !user.otp.expiresAt || user.otp.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Kirish kodi muddati o\'tgan. Qaytadan so\'rang.'
            });
        }

        const isMatch = await bcrypt.compare(code, user.otp.code);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri kirish kodi'
            });
        }

        user.otp = undefined;
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Muvaffaqiyatli kirdingiz!',
            token,
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login verify xato:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

// @desc    Joriy foydalanuvchi ma'lumotlari
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

module.exports = { register, verify, login, loginVerify, getMe };
