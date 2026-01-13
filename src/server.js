const express = require('express');
const db = require('./config/database');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware สำหรับอ่านค่าจาก Form
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Route ทดสอบ
app.get('/', (req, res) => {
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h1>🚀 IT Log System Ready!</h1>
            <p>Status: <span style="color: green; font-weight: bold;">Connected to MariaDB</span></p>
        </div>
    `);
});

// ฟังก์ชันเริ่มระบบ
const startServer = async () => {
    try {
        // 1. ลองเชื่อมต่อ Database
        await db.authenticate();
        console.log('✅ Connection to MariaDB has been established successfully.');

        // 2. สร้างตารางถ้ายังไม่มี (Sync)
        await db.sync(); 
        console.log('✅ Database Synced.');

        // 3. เริ่มรัน Server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
};

startServer();