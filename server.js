const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/db');
const { initBot } = require('./bot/telegramBot');

// Routes
const authRoutes = require('./routes/auth');
const musicRoutes = require('./routes/music');

const app = express();

// uploads papkasini yaratish
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🎵 Music API ishlayapti!',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                verify: 'POST /api/auth/verify',
                login: 'POST /api/auth/login',
                loginVerify: 'POST /api/auth/login/verify',
                me: 'GET /api/auth/me'
            },
            music: {
                create: 'POST /api/music (multipart, field: audio)',
                getAll: 'GET /api/music?search=&genre=&page=1&limit=20',
                getMy: 'GET /api/music/my',
                getOne: 'GET /api/music/:id',
                update: 'PUT /api/music/:id',
                delete: 'DELETE /api/music/:id',
                stream: 'GET /api/music/:id/stream'
            }
        }
    });
});

// Multer xatolari uchun handler
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'Fayl hajmi 50MB dan oshmasligi kerak'
        });
    }

    if (err.message && err.message.includes('audio')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    console.error('Server xato:', err);
    res.status(500).json({
        success: false,
        message: 'Server xatosi',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Serverni ishga tushirish
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // MongoDB ga ulanish
        await connectDB();

        // Telegram botni ishga tushirish
        initBot();

        app.listen(PORT, () => {
            console.log(`\n🚀 Server ishga tushdi: http://localhost:${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api`);
            console.log(`🎵 Music API: http://localhost:${PORT}/api/music`);
            console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth\n`);
        });
    } catch (error) {
        console.error('Server ishga tushmadi:', error);
        process.exit(1);
    }
};

startServer();
