const express = require('express');
const path = require('path');
const db = require('./config/database');
const OldLog = require('./models/OldLog');
const app = express();
const syncController = require('./controllers/syncController');
const cron = require('node-cron'); 

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', './src/views');

// --- Routes ---

// 1. ✅ Route สำหรับ Sync Data (รวม Helpdesk + Request)
// ปุ่ม "Sync Data" หน้าเว็บจะยิงมาที่นี่
app.get('/api/sync', syncController.syncAllData);

// 2. ✅ Route สำหรับ Clear Data
// ปุ่ม "Clear Data" หน้าเว็บจะยิงมาที่นี่
app.post('/api/clear', async (req, res) => {
    try {
        // ลบข้อมูลทั้งหมดและรีเซ็ต ID
        await OldLog.destroy({ where: {}, truncate: true });
        res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
        console.error('Clear Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Route หน้าแรก (Dashboard)
app.get('/', async (req, res) => {
    try {
        const logs = await OldLog.findAll({
            limit: 1000, // เพิ่ม limit ให้เห็นข้อมูลเยอะขึ้นตอน test
            order: [['created_date', 'DESC']]
        });
        res.render('index', { logs: logs });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send(`
            <div style="text-align:center; margin-top:50px;">
                <h1>❌ Database Error</h1>
                <p>${error.message}</p>
            </div>
        `);
    }
});

// --- Scheduled Tasks (Cron Job) ---
// ตั้งเวลาทำงานอัตโนมัติ (เช่น ทุกวัน 08:00 น.)
cron.schedule('0 08 * * *', () => { 
    console.log('⏰ Running Scheduled Sync...');
    // ตรวจสอบว่ามีฟังก์ชันนี้ไหมก่อนเรียกใช้
    if (syncController.runScheduledSync) {
        syncController.runScheduledSync(); 
    }
});

// --- Start Server ---
const startServer = async () => {
    try {
        await db.authenticate();
        console.log('✅ Connection to MariaDB has been established successfully.');

        // ✅ สำคัญ: ใช้ { alter: true } เพื่ออัปเดตโครงสร้างตาราง (เพิ่ม cost, solution ฯลฯ)
        await db.sync({ alter: true }); 
        console.log('✅ Database Synced (Altered).');

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`🌐 Visit: http://localhost:${process.env.EXTERNAL_PORT || 38000}`);
        });

    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
};

startServer();