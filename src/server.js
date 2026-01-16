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

// ==========================================
// ✅ Global Configs & Helpers for Views
// (ย้ายมาจาก partials/config.ejs)
// ==========================================

// 1. Config Data
const statusConfig = {
    'fix': { label: 'helpdesk.fix', order: 1 },
    'claim': { label: 'helpdesk.claim', order: 2 },
    'closed': { label: 'helpdesk.closed', order: 3 },
    'cancel': { label: 'helpdesk.cancel', order: 4 },
    'เรียบร้อย': { label: 'permission.success', order: 5 },
    'ยกเลิก': { label: 'permission.cancel', order: 6 },
    'รอเจ้าหน้าที่ IT ดำเนินการ': { label: 'cctv.pending_it', order: 7 },
    'เสร็จสิ้น': { label: 'cctv.success', order: 8 },
    'ดราฟ': { label: 'cctv.draft', order: 9 }
};

const categoryConfig = {
    // Permission
    'ลงทะเบียนพนักงานใหม่': { label: 'permission.registerUser', order: 1 },
    'Admin Social Media': { label: 'permission.social', order: 2 },
    'Drive Center': { label: 'permission.NasDrive', order: 3 },
    'Email': { label: 'permisssion.email', order: 4 },
    'Cloud Drive Center (Shared drives)': { label: 'permission.Gdrive', order: 5 },
    'LINE': { label: 'permission.line', order: 6 },
    'SSH-KEY': { label: 'permission.ssh', order: 7 },
    'USB Thumdrive': { label: 'permission.thumbDrive', order: 8 },
    'WIFI': { label: 'permission.wifi', order: 9 },
    'VPN': { label: 'permission.vpn', order: 10 },
    'Vender Support': { label: 'permission.vender', order: 11 },
    'Remote Desktop': { label: 'permission.remoteDesktop', order: 12 },
    // Helpdesk
    'Computer': { label: 'helpdesk.computer', order: 13 },
    'Computers': { label: 'helpdesk.computer', order: 13 },
    'Internet': { label: 'helpdesk.internet', order: 14 },
    'Laptops': { label: 'helpdesk.laptop', order: 15 },
    'Laptop': { label: 'helpdesk.laptop', order: 15 },
    'Network': { label: 'helpdesk.network', order: 16 },
    'Other': { label: 'helpdesk.other', order: 17 },
    'Printers': { label: 'helpdesk.printer', order: 18 },
    'Printer': { label: 'helpdesk.printer', order: 18 },
    'Recovery Data': { label: 'helpdesk.recoveryData', order: 19 },
    'SAP': { label: 'helpdesk.sap', order: 20 },
    'Scaner': { label: 'helpdesk.scaner', order: 21 },
    'Scanner': { label: 'helpdesk.scaner', order: 21 },
    'Software': { label: 'helpdesk.software', order: 22 },
    'UPS': { label: 'helpdesk.ups', order: 23 },
    'Telephone': { label: 'helpdesk.telephone', order: 24 },
    'USB': { label: 'helpdesk.usb', order: 25 },
    // CCTV
    'CCTV': { label: 'cctv.cctv', order: 26 },
    'ขอดูย้อนหลัง': { label: 'cctv.playback', order: 27 },
    'ขอติดตั้ง': { label: 'cctv.install', order: 28 },
    'ขอย้ายจุดติดตั้ง': { label: 'cctv.move', order: 29 }
};

// 2. Attach Helpers to app.locals (Available in all views)
app.locals.getStatusLabel = (status) => {
    const s = (status || '').trim();
    return statusConfig[s] ? statusConfig[s].label : s;
};

app.locals.getStatusOrder = (status) => {
    const s = (status || '').trim();
    return statusConfig[s] ? statusConfig[s].order : 999;
};

app.locals.getCategoryLabel = (cat) => {
    const c = (cat || '').trim();
    return categoryConfig[c] ? categoryConfig[c].label : c;
};

app.locals.getCategoryOrder = (cat) => {
    const c = (cat || '').trim();
    return categoryConfig[c] ? categoryConfig[c].order : 999;
};

app.locals.formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hour}:${min}`;
};

// ==========================================

// --- Routes ---

// 1. Sync Data
app.get('/api/sync', syncController.syncAllData);

// 2. Clear Data
app.post('/api/clear', async (req, res) => {
    try {
        await OldLog.destroy({ where: {}, truncate: true });
        res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
        console.error('Clear Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Home Dashboard
app.get('/', async (req, res) => {
    try {
        const logs = await OldLog.findAll({
            limit: 1000,
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

// --- Scheduled Tasks ---
cron.schedule('0 08 * * *', () => {
    console.log('⏰ Running Scheduled Sync...');
    if (syncController.runScheduledSync) {
        syncController.runScheduledSync();
    }
});

// --- Start Server ---
const startServer = async () => {
    try {
        await db.authenticate();
        console.log('✅ Connection to MariaDB has been established successfully.');
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