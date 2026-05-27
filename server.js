const express = require('express');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render buni o'zi beradi
    ssl: {
        rejectUnauthorized: false // Internetda xavfsiz ulanish uchun shart
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessiyani sozlash (Brauzerda login holatini eslab qoladi)
app.use(session({
    secret: 'maxfiy-kalit-soz', 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 6000 } // 10 daqiqa faol bo'lmasa, avtomatik chiqib ketadi
}));

// 🔐 HIMOYACHI (Middleware): Ismlar mosligi to'g'rilandi
const faqatAdminlarUchun = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        next(); // Admin bo'lsa, sahifani ochishga ruxsat
    } else {
        res.redirect('/login'); // Aks holda, login sahifasiga haydash
    }
};

// ================= MARSHRUTLAR =================

// 1. LOGIN SAHIFASI (Ko'rinishi)
app.get('/login', (req, res) => {
    res.send(`
        <style>
            body { font-family: Arial, sans-serif; background-color: #e9ecef; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 300px; text-align: center; }
            input, button { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            button { background: #009879; color: white; border: none; cursor: pointer; font-weight: bold; }
            .error { color: red; font-size: 14px; }
        </style>
        <div class="login-card">
            <h2>🔐 Tizimga kirish</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Login (admin)" required>
                <input type="password" name="password" placeholder="Parol (12345)" required>
                <button type="submit">Kirish</button>
            </form>
            ${req.query.error ? '<p class="error">Login yoki parol xato!</p>' : ''}
        </div>
    `);
});

// 2. LOGIN TEKSHIRISH (POST)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Login: admin, Parol: 12345
    if (username === 'admin' && password === '12345') {
        req.session.isAdmin = true; // Sessiyaga yozildi
        res.redirect('/');
    } else {
        res.redirect('/login?error=true'); // Xato bo'lsa qaytaradi
    }
});

// 3. TIZIMDAN CHIQISH (LOGOUT)
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            console.log(err);
        }
        res.redirect('/login');
    });
});

// 4. BOSH SAHIFA (Himoyalangan - O'zgaruvchilar to'g'rilandi)
app.get('/', faqatAdminlarUchun, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mevalar ORDER BY id ASC');
        const ombor = result.rows; 

        let rows = '';
        ombor.forEach(item => {
            rows += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.nomi}</td>
                    <td>${item.soni} ta</td>
                    <td>${item.narxi} so'm</td>
                    <td><a href="/delete/${item.id}" style="color: red; text-decoration:none;">[O'chirish]</a></td>
                </tr>`;
        });

        res.send(`
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f7f6; }
                .header-area { display: flex; justify-content: space-between; align-items: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
                th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
                th { background-color: #009879; color: white; }
                form { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                input, button { padding: 10px; margin: 5px; border: 1px solid #ccc; border-radius: 4px; }
                button { background: #009879; color: white; border: none; cursor: pointer; }
                .logout-btn { background: #dc3545; text-decoration: none; color: white; padding: 10px 15px; border-radius: 4px; font-size: 14px; }
            </style>
            <div class="header-area">
                <h2>👑 Admin Panel (PostgreSQL)</h2>
                <a href="/logout" class="logout-btn">🔴 Tizimdan chiqish</a>
            </div>
            <form action="/add" method="POST">
                <input type="text" name="nomi" placeholder="Meva nomi" required>
                <input type="number" name="soni" placeholder="Soni" required>
                <input type="number" name="narxi" placeholder="Narxi" required>
                <button type="submit">Qo'shish</button>
            </form>
            <table>
                <thead>
                    <tr><th>ID</th><th>Nomi</th><th>Soni</th><th>Narxi</th><th>Amallar</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `);
    } catch (err) {
        res.status(500).send("Xatolik: " + err.message);
    }
});

// 5. MAHSULOT QO'SHISH (Himoyalangan)
app.post('/add', faqatAdminlarUchun, async (req, res) => {
    const { nomi, soni, narxi } = req.body;
    try {
        await pool.query('INSERT INTO mevalar (nomi, soni, narxi) VALUES ($1, $2, $3)', [nomi, parseInt(soni), parseInt(narxi)]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Xatolik: " + err.message);
    }
});

// 6. MAHSULOT O'CHIRISH (Himoyalangan)
app.get('/delete/:id', faqatAdminlarUchun, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await pool.query('DELETE FROM mevalar WHERE id = $1', [id]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Xatolik: " + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Admin panel ishga tushdi: http://localhost:${PORT}`);
});