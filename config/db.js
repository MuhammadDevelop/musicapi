const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Jadvallarni yaratish
const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(50) NOT NULL,
                password TEXT,
                telegram_chat_id VARCHAR(50),
                is_verified BOOLEAN DEFAULT false,
                otp_code TEXT,
                otp_expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS music (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                artist VARCHAR(100) NOT NULL,
                genre VARCHAR(50) DEFAULT 'Boshqa',
                duration INTEGER DEFAULT 0,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER DEFAULT 0,
                cover_image TEXT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plays INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    console.log('✅ PostgreSQL jadvallar tayyor');
  } finally {
    client.release();
  }
};

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ PostgreSQL ulandi: ${client.host}:${client.port}`);
    client.release();
    await createTables();
  } catch (error) {
    console.error(`❌ PostgreSQL ulanish xatosi: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.pool = pool;
