const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 10000;
// Xavfsizlik: .env o'rniga oddiy o'zgaruvchilar (muhitda o'rnating)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bot = new TelegramBot(process.env.TOKEN || '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0', { polling: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// --- WEB ---
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', 
        [req.body.nomi, parseInt(req.body.soni) || 0, parseInt(req.body.narxi) || 0]);
    res.redirect('/');
});

// --- BOT ---
bot.on('message', async (msg) => {
    const text = msg.text;
    if (text === '/start') {
        return bot.sendMessage(msg.chat.id, "🍎 Xush kelibsiz! \nFormat: Nomi Narxi Soni\nMisol: Olma 5000 10");
    }
    
    const p = text.split(' ');
    if (p.length >= 3) {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [p, parseInt(p), parseInt(p)]);
        bot.sendMessage(msg.chat.id, "✅ Saqlandi!");
    } else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${text}%`]);
        const reply = res.rows.length ? res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta (${m.narxi} so'm)`).join('\n') : "Topilmadi.";
        bot.sendMessage(msg.chat.id, reply);
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));