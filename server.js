const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL ulanishi (Render muhiti uchun SSL yoqilgan)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') 
        ? { rejectUnauthorized: false } 
        : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessiyani PG bazada saqlash (Logindan otib yubormaslik uchun)
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: 'mevalar_maxfiy_kalit_123', 
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 kun
        secure: false 
    }
}));

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

// LOGIN
app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) return res.redirect('/admin');
    res.render('login', { error: null }); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') {
        req.session.isLoggedIn = true;
        req.session.username = username;
        req.session.save((err) => {
            if (err) console.error(err);
            return res.redirect('/admin');
        });
    } else {
        res.render('login', { error: 'Login yoki parol xato!' });
    }
});

// ADMIN PANEL
app.get('/admin', checkAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mevalar ORDER BY id DESC');
        res.render('admin', { mevalar: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Xatolik yuz berdi');
    }
});

// MEVA QO'SHISH
app.post('/admin/add', checkAuth, async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    try {
        await pool.query(
            'INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)',
            [nomi, parseInt(soni) || 0, parseInt(narxi) || 0]
        );
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Xatolik yuz berdi');
    }
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Server portda ishga tushdi: ${PORT}`);
});