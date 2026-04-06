const fs = require('fs');
const path = require('path');
const Music = require('../models/Music');

// @desc    Musiqa yuklash
// @route   POST /api/music
const createMusic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Audio fayl yuklanishi shart'
            });
        }

        const { title, artist, genre, duration } = req.body;

        if (!title || !artist) {
            // Faylni o'chirish
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Musiqa nomi va ijrochi kiritilishi shart'
            });
        }

        const music = await Music.create({
            title,
            artist,
            genre: genre || 'Boshqa',
            duration: duration || 0,
            file_path: req.file.path,
            file_name: req.file.originalname,
            file_size: req.file.size,
            user_id: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Musiqa muvaffaqiyatli yuklandi',
            data: music
        });
    } catch (error) {
        console.error('Create music xato:', error);
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

// @desc    Barcha musiqalarni olish (search, filter, pagination)
// @route   GET /api/music
const getAllMusic = async (req, res) => {
    try {
        const { search, genre, page = 1, limit = 20, sort = 'created_at' } = req.query;

        const { rows: musics, total } = await Music.findAll({
            search,
            genre,
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            order: 'DESC'
        });

        res.status(200).json({
            success: true,
            count: musics.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            data: musics
        });
    } catch (error) {
        console.error('Get all music xato:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

// @desc    Foydalanuvchining musiqalari
// @route   GET /api/music/my
const getMyMusic = async (req, res) => {
    try {
        const musics = await Music.findByUserId(req.user.id);

        res.status(200).json({
            success: true,
            count: musics.length,
            data: musics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

// @desc    Bitta musiqa ma'lumoti
// @route   GET /api/music/:id
const getMusic = async (req, res) => {
    try {
        const music = await Music.findById(req.params.id);

        if (!music) {
            return res.status(404).json({
                success: false,
                message: 'Musiqa topilmadi'
            });
        }

        res.status(200).json({
            success: true,
            data: music
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

// @desc    Musiqa ma'lumotlarini yangilash
// @route   PUT /api/music/:id
const updateMusic = async (req, res) => {
    try {
        let music = await Music.findByIdSimple(req.params.id);

        if (!music) {
            return res.status(404).json({
                success: false,
                message: 'Musiqa topilmadi'
            });
        }

        // Faqat egasi o'zgartira oladi
        if (music.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Siz faqat o\'z musiqangizni o\'zgartira olasiz'
            });
        }

        const { title, artist, genre, duration } = req.body;
        const updateData = {};
        if (title) updateData.title = title;
        if (artist) updateData.artist = artist;
        if (genre) updateData.genre = genre;
        if (duration) updateData.duration = duration;

        music = await Music.update(req.params.id, updateData);

        res.status(200).json({
            success: true,
            message: 'Musiqa yangilandi',
            data: music
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

// @desc    Musiqani o'chirish
// @route   DELETE /api/music/:id
const deleteMusic = async (req, res) => {
    try {
        const music = await Music.findByIdSimple(req.params.id);

        if (!music) {
            return res.status(404).json({
                success: false,
                message: 'Musiqa topilmadi'
            });
        }

        // Faqat egasi o'chira oladi
        if (music.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Siz faqat o\'z musiqangizni o\'chira olasiz'
            });
        }

        // Faylni diskdan o'chirish
        if (music.file_path) {
            try {
                fs.unlinkSync(music.file_path);
            } catch (e) {
                console.log('Fayl o\'chirishda xato (fayl mavjud emas bo\'lishi mumkin):', e.message);
            }
        }

        await Music.delete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Musiqa o\'chirildi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

// @desc    Musiqani stream qilish
// @route   GET /api/music/:id/stream
const streamMusic = async (req, res) => {
    try {
        const music = await Music.findByIdSimple(req.params.id);

        if (!music) {
            return res.status(404).json({
                success: false,
                message: 'Musiqa topilmadi'
            });
        }

        const filePath = path.resolve(music.file_path);

        // Fayl mavjudligini tekshirish
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Audio fayl topilmadi'
            });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        // Tinglash sonini oshirish
        await Music.incrementPlays(req.params.id);

        // Range header bilan streaming (audio seeking uchun)
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            const fileStream = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'audio/mpeg'
            });

            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg'
            });

            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('Stream xato:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi'
        });
    }
};

module.exports = {
    createMusic,
    getAllMusic,
    getMyMusic,
    getMusic,
    updateMusic,
    deleteMusic,
    streamMusic
};
