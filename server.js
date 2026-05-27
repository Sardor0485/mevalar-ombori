const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 10000;
// Bot tokeningizni shu yerga qo'ying
const bot = new TelegramBot('7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0', { polling: true });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('meva_maxfiy_kalit_12345'));

// EJS sozlamalari
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// PostgreSQL ulanishi
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Auth himoyasi
function checkAuth(req, res, next) {
    if (req.signedCookies && req.signedCookies.isLoggedIn === 'true') return next();
    res.redirect('/login');
}

// --- MARSHRUTLAR ---

// Bosh sahifa
app.get('/', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nomi, soni, narxi FROM mevalar ORDER BY id ASC;');
        res.render('index', { mevalar: result.rows });
    } catch (err) {
        res.status(500).send("Bazadan o'qishda xatolik: " + err.message);
    }
});

// Tahrirlash (AJAX)
app.post('/meva/tahrirlash/:id', checkAuth, async (req, res) => {
    try {
        await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3;', 
            [parseInt(req.body.soni), parseFloat(req.body.narxi), req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login sahifalari
app.get('/login', (req, res) => {
    res.send(`<h2>Kirish</h2><form method="POST"><input name="username" placeholder="Login"><input type="password" name="password" placeholder="Parol"><button>Kirish</button></form>`);
});

app.post('/login', (req, res) => {
    if (req.body.username === 'admin' && req.body.password === '12345') {
        res.cookie('isLoggedIn', 'true', { signed: true, maxAge: 86400000, httpOnly: true });
        res.redirect('/');
    } else {
        res.send("Parol noto'g'ri! <a href='/login'>Qaytish</a>");
    }
});

// Telegram Bot
bot.onText(/\/status/, async (msg) => {
    try {
        const res = await pool.query('SELECT nomi, soni FROM mevalar');
        let text = "📦 *Ombor holati:*\n" + res.rows.map(m => `• ${m.nomi}: ${m.soni} ta`).join('\n');
        bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
    } catch (e) { bot.sendMessage(msg.chat.id, "Xatolik yuz berdi."); }
});

app.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT} da ishga tushdi`));