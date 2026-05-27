const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';
const ADMIN_ID = 'YOUR_TELEGRAM_ID'; // O'zingizning ID raqamingizni yozing

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Telegram Bot Tugmalar
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ombor nazorati:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 Status", callback_data: 'status' }, { text: "🔍 Qidiruv", callback_data: 'search' }]
            ]
        }
    });
});

bot.on('callback_query', async (q) => {
    if (q.data === 'status') {
        const res = await pool.query('SELECT nomi, soni FROM mevalar');
        let text = "<b>📦 Ombor holati:</b>\n" + res.rows.map(m => `• ${m.nomi}: ${m.soni} ta`).join('\n');
        bot.sendMessage(q.message.chat.id, text, { parse_mode: 'HTML' });
    }
});

// Saytdan o'chirish va botga xabar
app.get('/meva/ochirish/:id', async (req, res) => {
    const id = req.params.id;
    const item = await pool.query('SELECT nomi FROM mevalar WHERE id = $1', [id]);
    await pool.query('DELETE FROM mevalar WHERE id = $1', [id]);
    
    // Botga xabar yuborish
    bot.sendMessage(ADMIN_ID, `🗑️ O'chirildi: ${item.rows?.nomi || 'Noma\'lum meva'}`);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

app.listen(PORT);