const express = require('express');
const path = require('path');
const db = require('./config/database');
const OldLog = require('./models/OldLog'); // ✅ Import Model เพื่อใช้ดึงข้อมูล
const app = express();
const syncController = require('./controllers/syncController');

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config View Engine (ตั้งค่าให้ใช้ EJS)
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', './src/views');

// --- Routes ---

// 1. Route สำหรับ API Sync (ทำงานเบื้องหลัง)
app.get('/api/sync', syncController.syncFromLegacy);

// 2. Route หน้าแรก (Dashboard แสดงตาราง)
app.get('/', async (req, res) => {
    try {
        // ดึงข้อมูลจาก Database (MariaDB)
        // limit: 500 รายการล่าสุด เพื่อไม่ให้โหลดนานเกินไป
        const logs = await OldLog.findAll({
            limit: 500,
            order: [['created_date', 'DESC']] // เรียงจากวันที่ล่าสุดก่อน
        });

        // ส่งข้อมูล (logs) ไปที่ไฟล์ views/index.ejs
        res.render('index', { logs: logs });

    } catch (error) {
        console.error('❌ Error fetching data:', error);
        // แสดง Error บนหน้าเว็บถ้ามีปัญหา
        res.status(500).send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h1 style="color:red;">❌ Database Error</h1>
                <p>${error.message}</p>
            </div>
        `);
    }
});

// --- Start Server Function ---
const startServer = async () => {
    try {
        // 1. เชื่อมต่อ Database
        await db.authenticate();
        console.log('✅ Connection to MariaDB has been established successfully.');

        // 2. Sync Table (สร้างตารางถ้ายังไม่มี)
        await db.sync(); 
        console.log('✅ Database Synced.');

        // 3. เริ่มรัน Server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`🌐 Visit: http://localhost:${process.env.EXTERNAL_PORT || 38000}`);
        });

    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
};

startServer();