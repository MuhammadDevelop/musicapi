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
                file_path TEXT,
                file_name TEXT NOT NULL,
                file_size INTEGER DEFAULT 0,
                file_data BYTEA,
                mime_type VARCHAR(50) DEFAULT 'audio/mpeg',
                cover_image TEXT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plays INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

    // Yangi ustunlarni qo'shish (agar jadval allaqachon mavjud bo'lsa)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='music' AND column_name='file_data') THEN
          ALTER TABLE music ADD COLUMN file_data BYTEA;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='music' AND column_name='mime_type') THEN
          ALTER TABLE music ADD COLUMN mime_type VARCHAR(50) DEFAULT 'audio/mpeg';
        END IF;
      END $$;
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
