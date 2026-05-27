const express = require('express');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('meva_maxfiy_kalit_12345'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Markdown xatolarini tozalash funksiyasi
const escape = (text) => String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

app.get('/', (req, res) => {
    if (req.signedCookies?.isLoggedIn !== 'true') return res.redirect('/login');
    pool.query('SELECT * FROM mevalar ORDER BY id ASC;').then(r => res.render('index', { mevalar: r.rows }));
});

app.post('/meva/qoshish', async (req, res) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [req.body.nomi, req.body.soni, req.body.narxi]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// Bot uchun Telegram Webhook
app.post(`/bot${TOKEN}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

// Telegram CRUD
bot.onText(/\/qoshish (.+) (.+) (.+)/, async (msg, match) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [match, match, match]);
    bot.sendMessage(msg.chat.id, "✅ Meva qo'shildi!");
});

bot.onText(/\/status/, async (msg) => {
    const r = await pool.query('SELECT nomi, soni FROM mevalar');
    let text = "*📦 Ombor holati:*\n\n" + r.rows.map(m => `• ${escape(m.nomi)}: ${m.soni} ta`).join('\n');
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' });
});

app.get('/login', (req, res) => res.send(`<form method="POST"><input name="username" placeholder="Login"><input type="password" name="password" placeholder="Parol"><button>Kirish</button></form>`));
app.post('/login', (req, res) => {
    if (req.body.username === 'admin' && req.body.password === '12345') {
        res.cookie('isLoggedIn', 'true', { signed: true, maxAge: 86400000 }).redirect('/');
    } else res.send("Xato!");
});

app.listen(PORT);