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

// Telegram buyruqlari
app.post(`/bot${TOKEN}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

bot.onText(/\/qoshish (.+) (.+) (.+)/, async (msg, match) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [match, match, match]);
    bot.sendMessage(msg.chat.id, "✅ Meva qo'shildi!");
});

bot.onText(/\/status/, async (msg) => {
    const res = await pool.query('SELECT nomi, soni FROM mevalar');
    let text = "📦 *Ombor holati:*\n" + res.rows.map(m => `• ${m.nomi}: ${m.soni} ta`).join('\n');
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// Veb qism
app.get('/', async (req, res) => {
    const r = await pool.query('SELECT * FROM mevalar ORDER BY id ASC;');
    res.render('index', { mevalar: r.rows });
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

app.listen(PORT);