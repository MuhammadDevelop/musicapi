const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Musiqa nomi kiritilishi shart'],
        trim: true,
        maxlength: 200
    },
    artist: {
        type: String,
        required: [true, 'Ijrochi nomi kiritilishi shart'],
        trim: true,
        maxlength: 100
    },
    genre: {
        type: String,
        trim: true,
        default: 'Boshqa'
    },
    duration: {
        type: Number,
        default: 0
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        default: 0
    },
    coverImage: {
        type: String,
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plays: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Qidiruv uchun indeks
musicSchema.index({ title: 'text', artist: 'text', genre: 'text' });

module.exports = mongoose.model('Music', musicSchema);
