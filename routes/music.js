const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const {
    createMusic,
    getAllMusic,
    getMyMusic,
    getMusic,
    updateMusic,
    deleteMusic,
    streamMusic
} = require('../controllers/musicController');
const { protect } = require('../middleware/auth');

// Multer sozlash — audio fayllarni saqlash
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `music-${uniqueSuffix}${ext}`);
    }
});

// Faqat audio fayllarni qabul qilish
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
        'audio/flac', 'audio/aac', 'audio/m4a', 'audio/x-m4a',
        'audio/mp4', 'audio/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Faqat audio fayllar qabul qilinadi (mp3, wav, ogg, flac, aac, m4a)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});

// Routes
router.post('/', protect, upload.single('audio'), createMusic);
router.get('/', protect, getAllMusic);
router.get('/my', protect, getMyMusic);
router.get('/:id', protect, getMusic);
router.put('/:id', protect, updateMusic);
router.delete('/:id', protect, deleteMusic);
router.get('/:id/stream', protect, streamMusic);

module.exports = router;
