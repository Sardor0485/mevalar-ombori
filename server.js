const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bot = new TelegramBot(process.env.TOKEN || '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0', { polling: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// --- WEB ---
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', 
        [req.body.nomi, parseInt(req.body.soni) || 0, parseInt(req.body.narxi) || 0]);
    res.redirect('/');
});

// --- BOT LOGIKASI ---
const userState = {}; // Foydalanuvchi qaysi bosqichda ekanligini saqlash

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === '/start') {
        return bot.sendMessage(chatId, "🍎 **Ombor boshqaruviga xush kelibsiz!**\n\n- Meva qo'shish uchun: 'Nomi Narxi Soni' yozing\n- Qidirish uchun: shunchaki meva nomini yozing\n- Jami summa: /total", { parse_mode: 'Markdown' });
    }
    
    if (msg.text === '/total') {
        const res = await pool.query('SELECT SUM(soni * narxi) as jami FROM mevalar');
        return bot.sendMessage(chatId, `💰 **Ombor qiymati:** ${res.rows.jami || 0} so'm`);
    }

    const p = msg.text.split(' ');
    if (p.length === 3) {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [p, parseInt(p), parseInt(p)]);
        bot.sendMessage(chatId, "✅ Saqlandi!");
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        const reply = res.rows.length ? res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta (${m.narxi} so'm)`).join('\n') : "❌ Topilmadi.";
        bot.sendMessage(chatId, reply);
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));