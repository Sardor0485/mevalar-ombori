const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = '7860298112:AAHI6cB8Jve9Vqez4ShdGhxlY7dNWK3gpm0'; // *Eslatma: Tokeningizni maxfiy saqlang!
const ADMIN_ID = '8009669458';

// EJS sozlamalari
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const bot = new TelegramBot(TOKEN);
// Webhookni o'rnatish
bot.setWebHook(`https://mevalar-ombori.onrender.com/bot${TOKEN}`);

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// Telegram Webhook endpoint
app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Asosiy sahifa
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
        res.render('index', { mevalar: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Ma'lumotlar bazasiga ulanishda xatolik.");
    }
});

// Tahrirlash (Edit)
app.post('/meva/tahrirlash/:id', async (req, res) => {
    try {
        await pool.query('UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3', 
            [req.body.soni, req.body.narxi, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// O'chirish (Delete)
app.get('/meva/ochirish/:id', async (req, res) => {
    try {
        const item = await pool.query('SELECT nomi FROM mevalar WHERE id = $1', [req.params.id]);
        if (item.rows.length > 0) {
            await pool.query('DELETE FROM mevalar WHERE id = $1', [req.params.id]);
            bot.sendMessage(ADMIN_ID, `🗑️ O'chirildi: ${item.rows.nomi}`);
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send("O'chirishda xatolik yuz berdi.");
    }
});

// Telegram bot buyruqlari
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ombor nazorati tizimi ishga tushdi.", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 Status", callback_data: 'status' }]
            ]
        }
    });
});

bot.on('callback_query', async (q) => {
    if (q.data === 'status') {
        const res = await pool.query('SELECT nomi, soni FROM mevalar');
        let text = "<b>📦 Ombor holati:</b>\n" + res.rows.map(m => `• ${m.nomi}: ${m.soni} ta`).join('\n');
        bot.sendMessage(q.message.chat.id, text, { parse_mode: 'HTML' });
    }
});

app.listen(PORT, () => console.log(`Server ${PORT}-portda ishlamoqda.`));