const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';
const ADMIN_ID = '8009669458';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// Telegram Webhook
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Sahifalar
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

// Ma'lumot qo'shish
app.post('/meva/qoshish', async (req, res) => {
    const { nomi, soni } = req.body;
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, 0)', [nomi, soni]);
    res.redirect('/');
});

// Tahrirlash
app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1 WHERE id = $2', [req.body.soni, req.params.id]);
    res.json({ success: true });
});

// O'chirish
app.get('/meva/ochirish/:id', async (req, res) => {
    const item = await pool.query('SELECT nomi FROM mevalar WHERE id = $1', [req.params.id]);
    if (item.rows.length > 0) {
        await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
        bot.sendMessage(ADMIN_ID, `🗑️ O'chirildi: ${item.rows.nomi}`);
    }
    res.redirect('/');
});

// Telegram Bot logika
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ombor nazorati tizimi:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 Status", callback_data: 'status' }, { text: "🔍 Qidiruv", callback_data: 'search' }]
            ]
        }
    });
});

bot.on('callback_query', async (q) => {
    if (q.data === 'status') {
        const res = await pool.query('SELECT * FROM mevalar');
        let text = "📦 <b>Ombor holati:</b>\n\n" + res.rows.map(m => `• ${m.nomi}: ${m.soni} ta`).join('\n');
        bot.sendMessage(q.message.chat.id, text, { parse_mode: 'HTML' });
    } else if (q.data === 'search') {
        bot.sendMessage(q.message.chat.id, "Qidirilayotgan meva nomini yozing:");
    }
});

bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        if (res.rows.length > 0) {
            let resText = res.rows.map(m => `✅ ${m.nomi}: ${m.soni} ta`).join('\n');
            bot.sendMessage(msg.chat.id, resText);
        } else {
            bot.sendMessage(msg.chat.id, "Bunday meva topilmadi.");
        }
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));