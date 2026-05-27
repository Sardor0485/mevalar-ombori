const express = require('express');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('secret'));
app.set('view engine', 'ejs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Telegram Bot
app.post(`/bot${TOKEN}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ombor nazoratchisi:", {
        reply_markup: { inline_keyboard: [[{ text: "📦 Status", callback_data: 'status' }]] }
    });
});

bot.on('callback_query', async (q) => {
    if (q.data === 'status') {
        const res = await pool.query('SELECT nomi, soni FROM mevalar');
        let text = "📦 *Ombor:\n" + res.rows.map(m => `• ${m.nomi}: ${m.soni} ta`).join('\n');
        bot.sendMessage(q.message.chat.id, text, { parse_mode: 'Markdown' });
    }
});

// Veb CRUD
app.get('/', async (req, res) => {
    const r = await pool.query('SELECT * FROM mevalar ORDER BY id ASC;');
    res.render('index', { mevalar: r.rows });
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

app.listen(PORT, () => console.log('Server ishda!'));