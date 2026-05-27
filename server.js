const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0';
const ADMIN_ID = '8009669458';

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Telegram Bot Webhook
app.post(`/bot${TOKEN}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

// Web Sahifalar
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
    res.render('index', { mevalar: result.rows });
});

app.post('/meva/qoshish', async (req, res) => {
    await pool.query('INSERT INTO mevalar (nomi, soni) VALUES ($1, $2)', [req.body.nomi, req.body.soni]);
    res.redirect('/');
});

app.post('/meva/tahrirlash/:id', async (req, res) => {
    await pool.query('UPDATE mevalar SET soni = $1 WHERE id = $2', [req.body.soni, req.params.id]);
    res.json({ success: true });
});

app.get('/meva/ochirish/:id', async (req, res) => {
    await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
    res.redirect('/');
});

// Bot Logikasi
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ombor nazorati tizimi:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 Status", callback_data: 'status' }, { text: "🔍 Qidirish", callback_data: 'search' }],
                [{ text: "➕ Mahsulot qo'shish", callback_data: 'add' }]
            ]
        }
    });
});

bot.on('callback_query', async (q) => {
    if (q.data === 'add') {
        bot.sendMessage(q.message.chat.id, "Format: Meva_Nomi soni\nMasalan: Olma 50");
    }
});

bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const parts = msg.text.split(' ');
        if (parts.length === 2) {
            await pool.query('INSERT INTO mevalar (nomi, soni) VALUES ($1, $2)', [parts, parts]);
            bot.sendMessage(msg.chat.id, "✅ Qo'shildi!");
        } else {
            const res = await pool.query('SELECT * FROM mevalar WHERE nomi ILIKE $1', [`%${msg.text}%`]);
            if (res.rows.length > 0) {
                bot.sendMessage(msg.chat.id, res.rows.map(m => `✅ ${m.nomi}: ${m.soni} ta`).join('\n'));
            } else {
                bot.sendMessage(msg.chat.id, "Topilmadi.");
            }
        }
    }
});

app.listen(PORT);