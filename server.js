const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;

// Ma'lumotlar bazasi
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Bot
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';
const bot = new TelegramBot(TOKEN, { polling: true }); // Polling yaxshiroq ishlaydi Render'da

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sahifalar
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [nomi, soni, narxi]);
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

// Bot buyruqlari
bot.on('message', async (msg) => {
    if (msg.text.startsWith('/')) return;
    const p = msg.text.split(' ');
    if (p.length === 3 && !isNaN(p[1]) && !isNaN(p[2])) {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [p[0], parseInt(p[1]), parseInt(p[2])]);
        bot.sendMessage(msg.chat.id, "✅ Saqlandi!");
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        bot.sendMessage(msg.chat.id, res.rows.length ? res.rows.map(m => `${m.nomi}: ${m.soni} ta`).join('\n') : "Topilmadi.");
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));