const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL ulanishi (Render uchun SSL yoqilgan)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') 
        ? { rejectUnauthorized: false } 
        : false
});

// Ma'lumotlarni o'qish uchun sozlamalar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessiyani PostgreSQL bazasida xavfsiz saqlash (Logindan otib yubormaslik uchun)
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session' // Bazadagi maxsus session jadvali
    }),
    secret: 'mevalar_maxfiy_kalit_123', 
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 kun saqlaydi
        secure: false 
    }
}));

// Papka va shablon sozlamalari
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Avtorizatsiya middleware
function checkAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}

// 1. ASOSIY SAHIFA
app.get('/', (req, res) => {
    res.redirect('/login');
});

// 2. LOGIN (GET va POST)
app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/admin');
    res.render('login', { error: null }); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Kirish ma'lumotlari
    if (username === 'admin' && password === '12345') {
        req.session.isLoggedIn = true;
        req.session.username = username;
        
        // Render barqaror ishlashi uchun sessiyani saqlab, keyin yo'naltiramiz
        req.session.save((err) => {
            if (err) console.error("Sessiya saqlashda xato:", err);
            return res.redirect('/admin');
        });
    } else {
        res.render('login', { error: 'Login yoki parol xato!' });
    }
});

// 3. ADMIN PANEL (Faqat login qilganlar kiradi)
app.get('/admin', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mevalar ORDER BY id DESC');
        res.render('admin', { mevalar: result.rows });
    } catch (err) {
        console.error("Bazadan ma'lumot olishda xato:", err);
        res.status(500).send('Internal Server Error: Bazadan maʼlumot olishda xatolik.');
    }
});

// 4. MEVA QO'SHISH (POST /admin/add)
app.post('/admin/add', checkAuth, async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    try {
        await pool.query(
            'INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)',
            [nomi, parseInt(soni) || 0, parseInt(narxi) || 0]
        );
        res.redirect('/admin');
    } catch (err) {
        console.error("Meva qo'shishda xato:", err);
        res.status(500).send('Internal Server Error: Meva qoʻshishda xatolik yuz berdi.');
    }
});

// 5. TIZIMDAN CHIQISH (LOGOUT)
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/login');
    });
});

// Serverni ishga tushirish
app.listen(PORT, () => {
    console.log(`Server portda ishga tushdi: ${PORT}`);
});