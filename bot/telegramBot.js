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

    try {
        bot = new TelegramBot(token, { polling: true });

        // Polling xatolarini tutib olish (409 conflict va boshqalar)
        bot.on('polling_error', (error) => {
            if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
                console.log('⚠️  Telegram bot conflict — boshqa joyda ham bot ishlayapti (Render). OTP hali ham yuboriladi.');
            } else {
                console.error('Telegram polling xato:', error.message);
            }
        });

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

        // Telefon raqamni qabul qilish — faqat telegram_chat_id ni saqlash
        bot.onText(/^\+?\d{10,15}$/, async (msg) => {
            const chatId = msg.chat.id;
            let phone = msg.text.replace(/\s/g, '');

            // + belgisini qo'shish
            if (!phone.startsWith('+')) {
                phone = '+' + phone;
            }

            try {
                // Avval bazada bor-yo'qligini tekshirish
                const existing = await pool.query(
                    'SELECT id FROM users WHERE phone = $1 OR phone = $2',
                    [phone, phone.substring(1)]
                );

                if (existing.rows.length > 0) {
                    // Foydalanuvchi bor — chatId ni yangilash
                    await pool.query(
                        'UPDATE users SET telegram_chat_id = $1 WHERE id = $2',
                        [chatId.toString(), existing.rows[0].id]
                    );
                    bot.sendMessage(chatId,
                        `✅ Raqamingiz ulandi: ${phone}\n\nEndi ilovadan OTP kod so'rang — kod shu yerga keladi.`
                    );
                } else {
                    // Foydalanuvchi hali yo'q — vaqtincha saqlash
                    await pool.query(
                        `INSERT INTO users (phone, name, telegram_chat_id)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (phone) DO UPDATE SET telegram_chat_id = $3`,
                        [phone, 'Telegram User', chatId.toString()]
                    );
                    bot.sendMessage(chatId,
                        `✅ Raqamingiz saqlandi: ${phone}\n\nEndi ilovadan ro'yxatdan o'ting.`
                    );
                }
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
                const existing = await pool.query(
                    'SELECT id FROM users WHERE phone = $1 OR phone = $2',
                    [phone, phone.substring(1)]
                );

                if (existing.rows.length > 0) {
                    await pool.query(
                        'UPDATE users SET telegram_chat_id = $1 WHERE id = $2',
                        [chatId.toString(), existing.rows[0].id]
                    );
                } else {
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
                console.error('Telegram kontakt saqlashda xato:', error.message);
                bot.sendMessage(chatId,
                    `⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.`
                );
            }
        });

        console.log('🤖 Telegram bot ishga tushdi');
        return bot;
    } catch (error) {
        console.error('Telegram bot ishga tushmadi:', error.message);
        return null;
    }
};

// OTP yuborish — bazadan chatId ni olish
const sendOTP = async (phone, code) => {
    // Bot ishlamasa ham OTP ni konsolga chiqarish
    console.log(`📱 OTP kod: ${phone} → ${code}`);

    if (!bot) {
        console.log('⚠️  Bot ishlamayapti, OTP faqat konsolda.');
        return false;
    }

    try {
        // Telefon raqamni normalizatsiya qilish
        let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
        }
        const withoutPlus = normalizedPhone.substring(1);

        // Bazadan chatId ni topish (ikkala formatda tekshirish)
        const result = await pool.query(
            'SELECT telegram_chat_id FROM users WHERE (phone = $1 OR phone = $2) AND telegram_chat_id IS NOT NULL',
            [normalizedPhone, withoutPlus]
        );

        const chatId = result.rows[0]?.telegram_chat_id;

        if (!chatId) {
            console.log(`⚠️ ChatId topilmadi: ${phone}`);
            console.log(`   Foydalanuvchi avval Telegram botga /start bosib, raqamini yuborishi kerak.`);
            return false;
        }

        await bot.sendMessage(chatId,
            `🔐 *Sizning tasdiqlash kodingiz:*\n\n` +
            `\`${code}\`\n\n` +
            `⏳ Kod 5 daqiqa amal qiladi.`,
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ OTP Telegramga yuborildi: ${phone} → chatId: ${chatId}`);
        return true;
    } catch (error) {
        console.error('Telegram xabar yuborishda xato:', error.message);
        return false;
    }
};

module.exports = { initBot, sendOTP };
