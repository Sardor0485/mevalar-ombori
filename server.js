const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';
const ADMIN_ID = '8009669458';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', 
        [nomi, parseInt(soni) || 0, parseInt(narxi) || 0]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    const { soni, narxi } = req.body;
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', 
        [parseInt(soni) || 0, parseInt(narxi) || 0, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

bot.on('message', async (msg) => {
    if (msg.text.startsWith('/')) return;
    const p = msg.text.split(' ');
    if (p.length >= 3) {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', 
            [p, parseInt(p) || 0, parseInt(p) || 0]);
        bot.sendMessage(msg.chat.id, "✅ Mahsulot qo'shildi!");
        bot.sendMessage(ADMIN_ID, `📦 Yangi mahsulot: ${p}`);
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        if (res.rows.length > 0) {
            let text = res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta`).join('\n');
            bot.sendMessage(msg.chat.id, text);
        } else {
            bot.sendMessage(msg.chat.id, "Topilmadi.");
        }
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));