const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Telefon raqam kiritilishi shart'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Ism kiritilishi shart'],
        trim: true,
        maxlength: 50
    },
    password: {
        type: String,
        select: false
    },
    telegramChatId: {
        type: String,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        code: { type: String, select: false },
        expiresAt: { type: Date, select: false }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Parolni hash qilish
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Parolni tekshirish
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
