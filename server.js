const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 10000;

// Formadan keladigan (POST) ma'lumotlarni o'qish sozlamalari
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessiya sozlamalari (Login holatini saqlash uchun)
app.use(session({
    secret: 'meva_maxfiy_kalit_9876',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 30 } // 30 daqiqa davomida faol
}));

// EJS shablonizatorini sozlash
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// PostgreSQL (Render) ma'lumotlar bazasi ulanishi
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Bazaga ulanish testi
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ BAZAGA ULANISHDA XATO:', err.message);
    } else {
        console.log('✅ Ma\'lumotlar bazasiga muvaffaqiyatli ulandi!');
        release();
    }
});

// Avtorizatsiya himoyasi (Middleware)
function checkAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}

// ================= AMALLAR (ROUTES) =================

// READ - Bosh sahifa (Mevalarni ko'rsatish)
app.get('/', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nomi, soni, narxi FROM mevalar ORDER BY id ASC;');
        res.render('index', { mevalar: result.rows });
    } catch (err) {
        console.error("❌ Xatolik:", err.message);
        res.status(500).send(`Serverda xatolik yuz berdi: ${err.message}`);
    }
});

// CREATE - Yangi meva qo'shish
app.post('/meva/qoshish', checkAuth, async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    try {
        await pool.query(
            'INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3);',
            [nomi, parseInt(soni), parseFloat(narxi)]
        );
        res.redirect('/');
    } catch (err) {
        console.error("❌ Meva qo'shishda xato:", err.message);
        res.status(500).send(`Meva qo'shishda xatolik: ${err.message}`);
    }
});

// UPDATE - Meva narxi va sonini tahrirlash
app.post('/meva/tahrirlash/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const { soni, narxi } = req.body;
    try {
        await pool.query(
            'UPDATE mevalar SET soni = $1, narxi = $2 WHERE id = $3;',
            [parseInt(soni), parseFloat(narxi), id]
        );
        res.redirect('/');
    } catch (err) {
        console.error("❌ Tahrirlashda xato:", err.message);
        res.status(500).send(`Tahrirlashda xatolik: ${err.message}`);
    }
});

// DELETE - Mevani o'chirish
app.get('/meva/ochirish/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM mevalar WHERE id = $1;', [id]);
        res.redirect('/');
    } catch (err) {
        console.error("❌ O'chirishda xato:", err.message);
        res.status(500).send(`O'chirishda xatolik: ${err.message}`);
    }
});

// 📌 LOGIN FORMALARI UCHUN HTML SHABLON FUNKSIYASI (Faylsiz to'g'ridan-to'g'ri ishlashi uchun)
function getLoginHTML(errorMsg = null) {
    return `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tizimga Kirish</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #f4f6f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 320px; }
            h2 { text-align: center; color: #333; margin-bottom: 20px; }
            label { font-size: 14px; color: #555; display: block; margin-top: 10px; }
            input { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; font-size: 14px; }
            input:focus { border-color: #4CAF50; outline: none; }
            .error-msg { color: #e74c3c; font-size: 13px; text-align: center; margin-top: 12px; font-weight: bold; }
            button { width: 100%; padding: 12px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px; font-weight: bold; }
            button:hover { background-color: #45a049; }
        </style>
    </head>
    <body>
    <div class="login-container">
        <h2>🔑 Tizimga Kirish</h2>
        <form action="/login" method="POST">
            <label>Foydalanuvchi nomi:</label>
            <input type="text" name="username" placeholder="admin" required>
            <label>Parol:</label>
            <input type="password" name="password" placeholder="12345" required>
            ${errorMsg ? `<div class="error-msg">${errorMsg}</div>` : ''}
            <button type="submit">Kirish</button>
        </form>
    </div>
    </body>
    </html>`;
}

// LOGIN - GET (Faylsiz HTML qaytaradi)
app.get('/login', (req, res) => {
    if (req.session && req.session.isLoggedIn) return res.redirect('/');
    res.send(getLoginHTML());
});

// LOGIN - POST
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        req.session.isLoggedIn = true;
        res.redirect('/');
    } else {
        res.send(getLoginHTML("Foydalanuvchi nomi yoki parol noto'g'ri!"));
    }
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT}-portda muvaffaqiyatli ishlamoqda...`);
});