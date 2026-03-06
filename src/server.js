const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const db = require('./config/database');
const cron = require('node-cron');

// ✅ เพิ่ม Model เพื่อให้ใช้งานฟังก์ชัน Clear Data ได้
const OldLog = require('./models/OldLog');

// Controllers
const syncController = require('./controllers/syncController');
const dashboardController = require('./controllers/dashboardController');

// Configs
require('./config/passport');
const setupHelpers = require('./config/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. App Middleware
// ==========================================
app.set('trust proxy', 1);

// ✅ ปรับเพิ่ม Limit เพื่อรองรับการ Import JSON ไฟล์ใหญ่
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'it_helpdesk_secret_key',
    resave: false, saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', './src/views');

// ==========================================
// 2. Global Setup
// ==========================================
app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    next();
});

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
};

// ✅ Setup Helpers (เรียกใช้ฟังก์ชันจากไฟล์ helpers.js)
setupHelpers(app);

// ==========================================
// 3. Routes
// ==========================================

// Auth Routes
app.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('login', { devUsers: passport.allowedUsers || [] });
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/')
);
app.get('/logout', (req, res, next) => {
    req.logout((err) => { if (err) return next(err); res.redirect('/login'); });
});
// Dev Login (Mock)
app.get('/auth/mock/:email', (req, res) => {
    const user = { email: req.params.email, name: req.params.email.split('@')[0], role: 'staff' };
    req.login(user, (err) => { res.redirect('/'); });
});

// --- Main Routes ---

// 1. Sync Data (ดึงจาก API)
app.get('/api/sync', ensureAuthenticated, syncController.syncAllData);

// ✅ 2. Import Data (รับ JSON จากหน้าเว็บ) - เพิ่ม Route นี้
app.post('/api/import', ensureAuthenticated, syncController.importManualData);

// 3. Clear Data (ล้างข้อมูล)
app.post('/api/clear', ensureAuthenticated, async (req, res) => {
    try {
        await OldLog.destroy({ where: {}, truncate: true });
        res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
        console.error('Clear Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ✅ Dashboard Route (เรียกผ่าน Controller)
app.get('/', ensureAuthenticated, dashboardController.getDashboard);

// ==========================================
// 4. Server Start & Cron Job
// ==========================================

// Auto Sync ทุกชั่วโมง (นาทีที่ 0)
cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running Scheduled Sync...');
    if (syncController.runScheduledSync) {
        await syncController.runScheduledSync();
        // อัปเดตเวลาล่าสุดหลัง Sync เสร็จ
        app.locals.lastSyncTime = new Date(); 
        console.log('✅ Time Updated:', app.locals.formatSyncTime(app.locals.lastSyncTime));
    }
});

const startServer = async () => {
    try {
        await db.authenticate();
        console.log('✅ Database Connected & Synced');
        await db.sync({ alter: true });
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    } catch (error) {
        console.error('❌ Server Error:', error);
    }
};

startServer();