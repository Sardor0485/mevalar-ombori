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

// EJS shablonizatorini aynan sizning 'views' papkangizga moslash
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

// LOGIN / LOGOUT
app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/');
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        req.session.isLoggedIn = true;
        res.redirect('/');
    } else {
        res.render('login', { error: "Foydalanuvchi nomi yoki parol noto'g'ri!" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server ${PORT}-portda muvaffaqiyatli ishlamoqda...`);
});