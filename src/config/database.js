const Sequelize = require('sequelize');
require('dotenv').config(); // เรียกใช้ dotenv เพื่อให้อ่านไฟล์ .env ได้ตอนรัน Local

const sequelize = new Sequelize(
    process.env.DB_NAME,       // ไม่ต้องใส่ Default
    process.env.DB_USER,       
    process.env.DB_PASS,       // ให้ไปอ่านจาก .env หรือ docker-compose เท่านั้น
    {
        host: process.env.DB_HOST, 
        dialect: 'mariadb',
        logging: false,
        timezone: '+07:00'
    }
);

module.exports = sequelize;