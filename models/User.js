const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    // Telefon raqam bo'yicha topish
    async findByPhone(phone, includeOtp = false) {
        const fields = includeOtp
            ? '*'
            : 'id, phone, name, password, telegram_chat_id, is_verified, created_at';
        const result = await pool.query(
            `SELECT ${fields} FROM users WHERE phone = $1`,
            [phone]
        );
        return result.rows[0] || null;
    },

    // ID bo'yicha topish
    async findById(id) {
        const result = await pool.query(
            'SELECT id, phone, name, telegram_chat_id, is_verified, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    // ID bo'yicha topish (parol bilan)
    async findByIdWithPassword(id) {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    // Yangi foydalanuvchi yaratish
    async create({ phone, name, otp_code, otp_expires_at }) {
        const result = await pool.query(
            `INSERT INTO users (phone, name, otp_code, otp_expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING id, phone, name, is_verified, created_at`,
            [phone, name, otp_code, otp_expires_at]
        );
        return result.rows[0];
    },

    // Foydalanuvchini yangilash
    async update(id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

        const result = await pool.query(
            `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, phone, name, is_verified, created_at`,
            [id, ...values]
        );
        return result.rows[0];
    },

    // Parolni hash qilish
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    },

    // Parolni tekshirish
    async matchPassword(enteredPassword, hashedPassword) {
        return await bcrypt.compare(enteredPassword, hashedPassword);
    }
};

module.exports = User;
