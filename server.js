const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 10000;

// Ma'lumotlar bazasi va Bot sozlamalari
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const bot = new TelegramBot(process.env.TOKEN || '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0', { 
    polling: process.env.NODE_ENV !== 'production' 
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// --- WEB YO'LLARI ---
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', 
        [req.body.nomi, parseInt(req.body.soni) || 0, parseInt(req.body.narxi) || 0]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', 
        [parseInt(req.body.soni), parseInt(req.body.narxi), req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// --- BOT LOGIKASI ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text) return;

    if (msg.text === '/start') {
        return bot.sendMessage(chatId, "🍎 **Ombor boshqaruviga xush kelibsiz!**\n\n- Qo'shish: 'Nomi Narxi Soni'\n- Jami summa: /total");
    }
    
    if (msg.text === '/total') {
        const res = await pool.query('SELECT SUM(soni * narxi) as jami FROM mevalar');
        return bot.sendMessage(chatId, `💰 **Umumiy qiymat:** ${res.rows.jami || 0} so'm`);
    }

    const p = msg.text.split(' ');
    // Meva qo'shish (Format: Nomi Narxi Soni)
    if (p.length === 3) {
        await pool.query('INSERT INTO mevalar (nomi, narxi, soni) VALUES ($1, $2, $3)', [p, parseInt(p), parseInt(p)]);
        bot.sendMessage(chatId, "✅ Meva muvaffaqiyatli saqlandi!");
    } 
    // Qidiruv
    else {
        const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
        const reply = res.rows.length 
            ? res.rows.map(m => `🍎 ${m.nomi}: ${m.soni} ta (${m.narxi} so'm)`).join('\n') 
            : "❌ Meva topilmadi.";
        bot.sendMessage(chatId, reply);
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));