const { pool } = require('../config/db');

const Music = {
    // Musiqa yaratish
    async create({ title, artist, genre, duration, file_path, file_name, file_size, user_id }) {
        const result = await pool.query(
            `INSERT INTO music (title, artist, genre, duration, file_path, file_name, file_size, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [title, artist, genre || 'Boshqa', duration || 0, file_path, file_name, file_size || 0, user_id]
        );
        return result.rows[0];
    },

    // ID bo'yicha topish
    async findById(id) {
        const result = await pool.query(
            `SELECT m.*, u.name as user_name, u.phone as user_phone
             FROM music m
             LEFT JOIN users u ON m.user_id = u.id
             WHERE m.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    // ID bo'yicha topish (faqat music ma'lumotlari)
    async findByIdSimple(id) {
        const result = await pool.query(
            'SELECT * FROM music WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    // Barcha musiqalar (search, filter, pagination)
    async findAll({ search, genre, page = 1, limit = 20, sort = 'created_at', order = 'DESC' }) {
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereConditions.push(`(title ILIKE $${paramIndex} OR artist ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (genre) {
            whereConditions.push(`genre = $${paramIndex}`);
            params.push(genre);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Umumiy son
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM music ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Ma'lumotlar
        const orderClause = `ORDER BY m.${sort} ${order}`;
        params.push(parseInt(limit));
        params.push(offset);

        const result = await pool.query(
            `SELECT m.*, u.name as user_name, u.phone as user_phone
             FROM music m
             LEFT JOIN users u ON m.user_id = u.id
             ${whereClause}
             ${orderClause}
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        return { rows: result.rows, total };
    },

    // Foydalanuvchining musiqalari
    async findByUserId(userId) {
        const result = await pool.query(
            'SELECT * FROM music WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows;
    },

    // Yangilash
    async update(id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

        const result = await pool.query(
            `UPDATE music SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return result.rows[0];
    },

    // O'chirish
    async delete(id) {
        await pool.query('DELETE FROM music WHERE id = $1', [id]);
    },

    // Tinglash sonini oshirish
    async incrementPlays(id) {
        await pool.query('UPDATE music SET plays = plays + 1 WHERE id = $1', [id]);
    }
};

module.exports = Music;
