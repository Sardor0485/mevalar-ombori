const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// EJS sozlamalari
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static fayllar uchun (agar CSS ishlatsangiz)
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL ulanish hovlasi
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Render uchun shart
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

// Asosiy sahifa
app.get('/', async (req, res) => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL topilmadi. Render Environment'ni tekshiring!");
        }

        // Bazadan sizning aniq ustunlaringizni tartib bilan olamiz
        const result = await pool.query('SELECT id, nomi, soni, narxi FROM mevalar ORDER BY id ASC;');
        
        // Ma'lumotlarni index.ejs shabloniga jo'natamiz
        res.render('index', { mevalar: result.rows });
    } catch (err) {
        console.error("❌ Sahifada xatolik:", err.message);
        // Brauzerda "Internal Server Error" o'rniga aniq muammoni ko'rsatish
        res.status(500).send(`<h3>Serverda xatolik yuz berdi:</h3><p style="color:red;">${err.message}</p>`);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server port ${PORT} da ishlamoqda...`);
});