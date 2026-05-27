const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser');
const TelegramBot = require('node-telegram-bot-api'); // Bot qo'shildi

const app = express();
const PORT = process.env.PORT || 10000;
const bot = new TelegramBot('7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0', { polling: true }); // Bot tokeningiz

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // AJAX uchun muhim
app.use(cookieParser('meva_maxfiy_kalit_12345'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Telegram Bot buyrug'i
bot.onText(/\/status/, async (msg) => {
    try {
        const res = await pool.query('SELECT nomi, soni FROM mevalar');
        let text = "📦 *Ombor holati:*\n\n";
        res.rows.forEach(m => text += `• ${m.nomi}: ${m.soni} ta\n`);
        bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(msg.chat.id, "Xatolik!"); }
});

// Tahrirlash (AJAX uchun moslandi)
app.post('/meva/tahrirlash/:id', async (req, res) => {
    const { id } = req.params;
    const { soni, narxi } = req.body;
    try {
        await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3;', [parseInt(soni), parseFloat(narxi), id]);
        res.json({ success: true }); // AJAXga javob
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ... (qolgan barcha kodlaringizni o'z holicha qoldiring) ...

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));