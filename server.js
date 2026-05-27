const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bot = new TelegramBot('7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

// Bot qidiruv va qo'shish (NaN xatosini oldini olish uchun tekshiruv)
bot.on('message', async (msg) => {
    const parts = msg.text.split(' ');
    if (parts.length === 3 && !isNaN(parts[1]) && !isNaN(parts[2])) {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [parts[0], parseInt(parts[1]), parseInt(parts[2])]);
        bot.sendMessage(msg.chat.id, "✅ Muvaffaqiyatli qo'shildi!");
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        bot.sendMessage(msg.chat.id, res.rows.length ? res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta`).join('\n') : "Topilmadi.");
    }
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [req.body.soni, req.body.narxi, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

app.listen(PORT);