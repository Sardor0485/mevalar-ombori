const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

app.post(`/bot${TOKEN}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

// Asosiy sahifa
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

// Mahsulot qo'shish (Sayt uchun)
app.post('/meva/qoshish', async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [nomi, soni, narxi]);
    res.redirect('/');
});

// Tahrirlash
app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

// O'chirish
app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// Bot Logikasi
bot.on('message', async (msg) => {
    if (msg.text.startsWith('/')) return;
    const p = msg.text.split(' ');
    if (p.length === 3 && !isNaN(p) && !isNaN(p)) {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [p, parseInt(p), parseInt(p)]);
        bot.sendMessage(msg.chat.id, "✅ Saqlandi!");
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        bot.sendMessage(msg.chat.id, res.rows.length ? res.rows.map(m => `${m.nomi}: ${m.soni} ta`).join('\n') : "Topilmadi.");
    }
});

app.listen(PORT);