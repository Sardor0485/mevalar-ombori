const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bot = new TelegramBot('7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0', { polling: true });

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
        res.render('index', { mevalar: result.rows });
    } catch (err) { res.status(500).send("Bazaga ulanishda xatolik!"); }
});

app.post('/meva/qoshish', async (req, res) => {
    // Soni va Narxni Number() bilan tozalaymiz
    const soni = Number(req.body.soni) || 0;
    const narxi = Number(req.body.narxi) || 0;
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [req.body.nomi, soni, narxi]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    const soni = Number(req.body.soni) || 0;
    const narxi = Number(req.body.narxi) || 0;
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', [soni, narxi, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// Bot qismi: try/catch bilan o'ralgan
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    try {
        const p = msg.text.split(' ');
        if (p.length >= 3) {
            await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [p, Number(p) || 0, Number(p) || 0]);
            bot.sendMessage(msg.chat.id, "✅ Muvaffaqiyatli saqlandi!");
        } else {
            const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
            bot.sendMessage(msg.chat.id, res.rows.length ? res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta`).join('\n') : "Topilmadi.");
        }
    } catch (err) { console.error("Bot xatosi:", err); }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));