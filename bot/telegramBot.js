const TelegramBot = require('node-telegram-bot-api');

let bot = null;

// Telefon raqam ↔ chatId xaritasi (foydalanuvchi botga yozganda saqlanadi)
const phoneToChatId = new Map();

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

    // Telefon raqamni qabul qilish
    bot.onText(/^\+?\d{10,15}$/, (msg) => {
        const chatId = msg.chat.id;
        const phone = msg.text.replace(/\s/g, '');

        phoneToChatId.set(phone, chatId.toString());
        bot.sendMessage(chatId,
            `✅ Raqamingiz saqlandi: ${phone}\n\nEndi ilovadan ro'yxatdan o'ting yoki kiring.`
        );
    });

    // Kontakt orqali telefon raqam
    bot.on('contact', (msg) => {
        const chatId = msg.chat.id;
        const phone = msg.contact.phone_number;

        phoneToChatId.set(phone, chatId.toString());
        bot.sendMessage(chatId,
            `✅ Raqamingiz saqlandi: ${phone}\n\nEndi ilovadan ro'yxatdan o'ting yoki kiring.`
        );
    });

    console.log('🤖 Telegram bot ishga tushdi');
    return bot;
};

// OTP yuborish
const sendOTP = async (phone, code) => {
    if (!bot) {
        console.log(`📱 OTP (bot yo'q): ${phone} → ${code}`);
        return false;
    }

    // +998 va 998 shakllarini tekshirish
    let chatId = phoneToChatId.get(phone);
    if (!chatId && phone.startsWith('+')) {
        chatId = phoneToChatId.get(phone.substring(1));
    }
    if (!chatId && !phone.startsWith('+')) {
        chatId = phoneToChatId.get('+' + phone);
    }

    if (!chatId) {
        console.log(`⚠️ ChatId topilmadi: ${phone}. Foydalanuvchi avval botga yozishi kerak.`);
        console.log(`📱 OTP (chatId yo'q): ${phone} → ${code}`);
        return false;
    }

    try {
        await bot.sendMessage(chatId,
            `🔐 *Sizning tasdiqlash kodingiz:*\n\n` +
            `\`${code}\`\n\n` +
            `⏳ Kod 5 daqiqa amal qiladi.`,
            { parse_mode: 'Markdown' }
        );
        return true;
    } catch (error) {
        console.error('Telegram xabar yuborishda xato:', error.message);
        return false;
    }
};

// ChatId ni telefon raqam bilan bog'lash (DB dan)
const setChatId = (phone, chatId) => {
    phoneToChatId.set(phone, chatId);
};

module.exports = { initBot, sendOTP, phoneToChatId, setChatId };
