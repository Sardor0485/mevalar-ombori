const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';
const ADMIN_ID = '8009669458';

const pool = new Pool({ 
    connectionString: 'postgres://default:o4W5fHlRjQ0G@ep-winter-water-a4178x6k.us-east-1.aws.neon.tech/verceldb?sslmode=require', 
    ssl: { rejectUnauthorized: false } 
});

const bot = new TelegramBot(TOKEN, { polling: !process.env.PORT });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// --- WEB YO'LLARI ---
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    await pool.query('INSERT INTO mevalar (nomi, narxi, soni) VALUES ($1, $2, $3)', 
        [req.body.nomi, parseInt(req.body.narxi), parseInt(req.body.soni)]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET narxi = $1, soni = $2 WHERE id = $3', 
        [parseInt(req.body.narxi), parseInt(req.body.soni), req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// --- BOT LOGIKASI ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== ADMIN_ID) return;

    if (msg.text === '/start') {
        return bot.sendMessage(chatId, "🍎 Salom Admin! Ombor tayyor.\nFormat: Nomi Narxi Soni");
    }

    const p = msg.text.split(' ');
    if (p.length === 3) {
        await pool.query('INSERT INTO mevalar (nomi, narxi, soni) VALUES ($1, $2, $3)', [p[0], parseInt(p[1]), parseInt(p[2])]);
        bot.sendMessage(chatId, "✅ Saqlandi!");
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        const reply = res.rows.length ? res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta (${m.narxi} so'm)`).join('\n') : "❌ Topilmadi.";
        bot.sendMessage(chatId, reply);
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));