const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser'); // Yangi xavfsiz cookie kutubxonasi

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('meva_maxfiy_kalit_12345')); // Cookieni shifrlash uchun kalit

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Avtorizatsiya himoyasi (Cookie orqali tekshirish)
function checkAuth(req, res, next) {
    if (req.signedCookies && req.signedCookies.isLoggedIn === 'true') {
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
        res.status(500).send(`Xatolik yuz berdi: ${err.message}`);
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

// MEVALARGA MOS MINIMALIST LOGIN SAHIFA
function getLoginHTML(errorMsg = null) {
    return `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tizimga kirish</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background-color: #fcfbf7; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-box { background: white; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; width: 300px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            h2 { font-weight: 600; color: #2d3748; margin-bottom: 25px; font-size: 22px; text-align: center; }
            label { font-size: 13px; color: #718096; display: block; margin-top: 12px; }
            input { width: 100%; padding: 11px; margin-top: 5px; border: 1px solid #cbd5e0; border-radius: 8px; box-sizing: border-box; font-size: 14px; background: #f7fafc; transition: all 0.2s; }
            input:focus { border-color: #48bb78; background: #fff; outline: none; box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.1); }
            .error-msg { color: #e53e3e; font-size: 12px; text-align: center; margin-top: 15px; }
            button { width: 100%; padding: 12px; background: #2f855a; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; margin-top: 25px; transition: background 0.2s; }
            button:hover { background: #22543d; }
        </style>
    </head>
    <body>
    <div class="login-box">
        <h2>🍏 Tizimga kirish</h2>
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
    if (req.signedCookies && req.signedCookies.isLoggedIn === 'true') return res.redirect('/');
    res.send(getLoginHTML());
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        // Tizimda 1 kunga eslab qolish cookie orqali
        res.cookie('isLoggedIn', 'true', { signed: true, maxAge: 1000 * 60 * 60 * 24, httpOnly: true });
        res.redirect('/');
    } else {
        res.send(getLoginHTML("Foydalanuvchi nomi yoki parol noto'g'ri!"));
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('isLoggedIn');
    res.redirect('/login');
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));