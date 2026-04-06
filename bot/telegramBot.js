const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('../config/db');

let bot = null;

const initBot = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
        console.log('⚠️  Telegram bot token sozlanmagan. OTP Telegram orqali yuborilmaydi.');
        console.log('   .env fayliga TELEGRAM_BOT_TOKEN ni qo\'shing.');
        return null;
    }

    bot = new TelegramBot(token, { polling: true });

    // /start komandasi
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId,
            '🎵 *Music API Bot*\n\n' +
            'Telefon raqamingizni yuboring (misol: +998901234567)\n' +
            'Shundan so\'ng ro\'yxatdan o\'tishda OTP kod shu yerga keladi.',
            { parse_mode: 'Markdown' }
        );
    });

    // Telefon raqamni qabul qilish — bazaga saqlash
    bot.onText(/^\+?\d{10,15}$/, async (msg) => {
        const chatId = msg.chat.id;
        const phone = msg.text.replace(/\s/g, '');

        try {
            // Avval bazada bor-yo'qligini tekshirish
            const existing = await pool.query(
                'SELECT id FROM users WHERE phone = $1',
                [phone]
            );

            if (existing.rows.length > 0) {
                // Foydalanuvchi bor — chatId ni yangilash
                await pool.query(
                    'UPDATE users SET telegram_chat_id = $1 WHERE phone = $2',
                    [chatId.toString(), phone]
                );
            } else {
                // Foydalanuvchi hali ro'yxatdan o'tmagan — chatId ni vaqtincha saqlash
                // Foydalanuvchi ro'yxatdan o'tganda phone bo'yicha chatId topiladi
                await pool.query(
                    `INSERT INTO users (phone, name, telegram_chat_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (phone) DO UPDATE SET telegram_chat_id = $3`,
                    [phone, 'Telegram User', chatId.toString()]
                );
            }

            bot.sendMessage(chatId,
                `✅ Raqamingiz saqlandi: ${phone}\n\nEndi ilovadan ro'yxatdan o'ting yoki kiring.`
            );
        } catch (error) {
            console.error('Telegram chatId saqlashda xato:', error.message);
            bot.sendMessage(chatId,
                `⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.`
            );
        }
    });

    // Kontakt orqali telefon raqam
    bot.on('contact', async (msg) => {
        const chatId = msg.chat.id;
        let phone = msg.contact.phone_number;

        // + belgisini qo'shish (telegram ba'zan + siz yuboradi)
        if (!phone.startsWith('+')) {
            phone = '+' + phone;
        }

        try {
            await pool.query(
                `INSERT INTO users (phone, name, telegram_chat_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (phone) DO UPDATE SET telegram_chat_id = $3`,
                [phone, 'Telegram User', chatId.toString()]
            );

            bot.sendMessage(chatId,
                `✅ Raqamingiz saqlandi: ${phone}\n\nEndi ilovadan ro'yxatdan o'ting yoki kiring.`
            );
        } catch (error) {
            console.error('Telegram kontakt saqlashda xato:', error.message);
            bot.sendMessage(chatId,
                `⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.`
            );
        }
    });

    console.log('🤖 Telegram bot ishga tushdi');
    return bot;
};

// OTP yuborish — bazadan chatId ni olish
const sendOTP = async (phone, code) => {
    if (!bot) {
        console.log(`📱 OTP (bot yo'q): ${phone} → ${code}`);
        return false;
    }

    try {
        // Bazadan chatId ni topish (+998 va 998 shakllarini tekshirish)
        let result = await pool.query(
            'SELECT telegram_chat_id FROM users WHERE phone = $1',
            [phone]
        );

        let chatId = result.rows[0]?.telegram_chat_id;

        // Agar topilmasa, + bilan/siz tekshirish
        if (!chatId && phone.startsWith('+')) {
            result = await pool.query(
                'SELECT telegram_chat_id FROM users WHERE phone = $1',
                [phone.substring(1)]
            );
            chatId = result.rows[0]?.telegram_chat_id;
        }
        if (!chatId && !phone.startsWith('+')) {
            result = await pool.query(
                'SELECT telegram_chat_id FROM users WHERE phone = $1',
                ['+' + phone]
            );
            chatId = result.rows[0]?.telegram_chat_id;
        }

        if (!chatId) {
            console.log(`⚠️ ChatId topilmadi: ${phone}. Foydalanuvchi avval botga yozishi kerak.`);
            console.log(`📱 OTP (chatId yo'q): ${phone} → ${code}`);
            return false;
        }

        await bot.sendMessage(chatId,
            `🔐 *Sizning tasdiqlash kodingiz:*\n\n` +
            `\`${code}\`\n\n` +
            `⏳ Kod 5 daqiqa amal qiladi.`,
            { parse_mode: 'Markdown' }
        );
        return true;
    } catch (error) {
        console.error('Telegram xabar yuborishda xato:', error.message);
        console.log(`📱 OTP (xato): ${phone} → ${code}`);
        return false;
    }
};

module.exports = { initBot, sendOTP };
