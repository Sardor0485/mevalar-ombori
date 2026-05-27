const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';

// Webhook orqali bot (409 Conflict yechimi)
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('meva_maxfiy_kalit_12345'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Middleware
const checkAuth = (req, res, next) => (req.signedCookies?.isLoggedIn === 'true') ? next() : res.redirect('/login');

// CRUD API
app.get('/', checkAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC;');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', checkAuth, async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [nomi, soni, narxi]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', checkAuth, async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', checkAuth, async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// Telegram Webhook route
app.post(`/bot${TOKEN}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

// Telegram Bot CRUD
bot.onText(/\/qoshish (.+) (.+) (.+)/, async (msg, match) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [match, match, match]);
    bot.sendMessage(msg.chat.id, "✅ Meva qo'shildi!");
});

bot.onText(/\/status/, async (msg) => {
    const res = await pool.query('SELECT * FROM mevalar');
    let text = "📦 *Ombor:\n" + res.rows.map(m => `ID:${m.id} | ${m.nomi}: ${m.soni} ta`).join('\n');
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// Login
app.get('/login', (req, res) => res.send(`<h2>Login</h2><form method="POST"><input name="username"><input type="password" name="password"><button>Kirish</button></form>`));
app.post('/login', (req, res) => {
    if (req.body.username === 'admin' && req.body.password === '12345') {
        res.cookie('isLoggedIn', 'true', { signed: true, maxAge: 86400000, httpOnly: true });
        res.redirect('/');
    } else res.send("Xato!");
});

app.listen(PORT, () => console.log(`Server running`));