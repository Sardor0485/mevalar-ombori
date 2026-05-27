const jwt = require('jsonwebtoken');

// Maxfiy kalit so'z (Faqat sizning serveringiz bilishi kerak, muhr bosish uchun)
const MAXFIY_KALIT = 'mening_juda_maxfiy_kalitim_123';

// 1. Foydalanuvchi ma'lumotlari (Chiptaning ichiga yoziladigan yuk)
const user = {
    id: 1,
    username: 'admin',
    role: 'director'
};

// 2. JWT yaratish (Sign/Muhrlash)
// Bu chipta 2 soat davomida amal qiladi
const token = jwt.sign(user, MAXFIY_KALIT, { expiresIn: '2h' });

console.log("Sizning Raqamli Chiptangiz (JWT): \n", token);