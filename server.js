const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessiya sozlamalari kuchaytirildi (Renderda o'chib ketmasligi uchun)
app.use(session({
    secret: 'meva_maxfiy_kalit_9876',
    resave: true, // true qilindi - har bir so'rovda sessiyani yangilaydi
    saveUninitialized: true, // true qilindi - login holatini yo'qotmaydi
    cookie: { 
        secure: false, // Bepul HTTP muhitlar uchun shart
        maxAge: 1000 * 60 * 60 * 24 // 1 kunlik aktivlik
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ BAZAGA ULANISHDA XATO:', err.message);
    } else {
        console.log('✅ Ma\'lutmotlar bazasiga ulandi!');
        release();
    }
});

function checkAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}

// READ
app.get('/', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nomi, soni, narxi FROM mevalar ORDER BY id ASC;');
        res.render('index', { mevalar: result.rows });
    } catch (err) {
        res.status(500).send(`Xatolik: ${err.message}`);
    }
});

// CREATE
app.post('/meva/qoshish', checkAuth, async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    try {
        await pool.query(
            'INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3);',
            [nomi, parseInt(soni), parseFloat(narxi)]
        );
        res.redirect('/');
    } catch (err) {
        res.status(500).send(`Xato: ${err.message}`);
    }
});

// UPDATE
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
        res.status(500).send(`Xato: ${err.message}`);
    }
});

// DELETE
app.get('/meva/ochirish/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM mevalar WHERE id = $1;', [id]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send(`Xato: ${err.message}`);
    }
});

// LOGIN INLINE HTML (Bu ham minimalist oq rangga o'tkazildi)
function getLoginHTML(errorMsg = null) {
    return `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kirish</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #fafafa; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-box { background: white; padding: 40px; border-radius: 12px; border: 1px solid #e5e7eb; width: 300px; }
            h2 { font-weight: 600; color: #111; margin-bottom: 25px; font-size: 22px; text-align: center; }
            label { font-size: 13px; color: #666; display: block; margin-top: 12px; }
            input { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; background: #f9fafb; transition: all 0.2s; }
            input:focus { border-color: #000; background: #fff; outline: none; }
            .error-msg { color: #ef4444; font-size: 12px; text-align: center; margin-top: 15px; }
            button { width: 100%; padding: 12px; background: #111; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-top: 25px; transition: background 0.2s; }
            button:hover { background: #333; }
        </style>
    </head>
    <body>
    <div class="login-box">
        <h2>Tizimga kirish</h2>
        <form action="/login" method="POST">
            <label>Foydalanuvchi nomi</label>
            <input type="text" name="username" placeholder="admin" required>
            <label>Parol</label>
            <input type="password" name="password" placeholder="12345" required>
            ${errorMsg ? `<div class="error-msg">${errorMsg}</div>` : ''}
            <button type="submit">Kirish</button>
        </form>
    </div>
    </body>
    </html>`;
}

app.get('/login', (req, res) => {
    if (req.session && req.session.isLoggedIn) return res.redirect('/');
    res.send(getLoginHTML());
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        req.session.isLoggedIn = true;
        res.redirect('/');
    } else {
        res.send(getLoginHTML("Foydalanuvchi nomi yoki parol noto'g'ri!"));
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));