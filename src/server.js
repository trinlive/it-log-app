const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const db = require('./config/database');
const OldLog = require('./models/OldLog');
const syncController = require('./controllers/syncController');
const cron = require('node-cron');

// เรียกใช้ Config Passport
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. App Setup & Middleware
// ==========================================

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'it_helpdesk_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', './src/views');

app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    next();
});

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// ==========================================
// 2. Global Configs & Helpers
// ==========================================

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
    'ขอย้ายจุดติดตั้ง': { label: 'cctv.move', order: 29 },

    // Meeting & Website
    'Meeting': { label: 'meeting.service', order: 30 },
    'Web Site': { label: 'dev.website', order: 31 }
};

app.locals.getStatusLabel = (status) => statusConfig[(status || '').trim()]?.label || status;
app.locals.getStatusOrder = (status) => statusConfig[(status || '').trim()]?.order || 999;
app.locals.getCategoryLabel = (cat) => categoryConfig[(cat || '').trim()]?.label || cat;
app.locals.getCategoryOrder = (cat) => categoryConfig[(cat || '').trim()]?.order || 999;
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
// 3. Routes
// ==========================================

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
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/login');
    });
});

app.get('/auth/mock/:email', (req, res) => {
    const email = req.params.email;
    const user = {
        email: email,
        name: email.split('@')[0],
        role: 'staff',
        photo: null
    };
    req.login(user, (err) => {
        if (err) return res.redirect('/login');
        res.redirect('/');
    });
});

// API Routes
app.get('/api/sync', ensureAuthenticated, syncController.syncAllData);

app.post('/api/clear', ensureAuthenticated, async (req, res) => {
    try {
        await OldLog.destroy({ where: {}, truncate: true });
        res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 📌 Home Dashboard Route (Updated Logic for Monthly Costs)
app.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const logs = await OldLog.findAll({
            order: [['created_date', 'DESC']]
        });

        // ============================================
        // ✅ Dashboard Logic
        // ============================================
        const currentYear = new Date().getFullYear();
        
        let totalCost = 0;
        let monthlyStats = new Array(12).fill(0);
        let monthlyCosts = new Array(12).fill(0); // ✅ 1. เพิ่มตัวแปรเก็บค่าใช้จ่ายรายเดือน
        let catMap = {};
        
        let countTotal = 0;
        let countClosed = 0;
        let countActive = 0;

        logs.forEach(log => {
            if (!log.created_date) return;
            const date = new Date(log.created_date);

            if (date.getFullYear() === currentYear) {
                countTotal++;
                
                const status = (log.status || '').trim();

                if (['closed', 'เสร็จสิ้น', 'เรียบร้อย'].includes(status)) {
                    countClosed++;
                } else if (!['cancelled', 'ยกเลิก', 'cancel'].includes(status)) {
                    countActive++;
                }

                const monthIndex = date.getMonth();
                
                // 1. นับจำนวนงานรายเดือน
                monthlyStats[monthIndex]++;
                
                // 2. รวมค่าใช้จ่าย (Cost) และ บวกยอดรายเดือน
                const cost = parseFloat(log.cost || 0);
                if (!isNaN(cost)) {
                    totalCost += cost;
                    monthlyCosts[monthIndex] += cost; // ✅ 2. บวกค่าใช้จ่ายลงในเดือนนั้นๆ
                }

                const catRaw = (log.category || '').trim();
                const catName = categoryConfig[catRaw]?.label || catRaw;
                catMap[catName] = (catMap[catName] || 0) + 1;
            }
        });

        const sortedCats = Object.entries(catMap)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        const dashData = {
            total: countTotal,
            closed: countClosed,
            active: countActive,
            totalCost: totalCost,
            monthlyStats: monthlyStats,
            monthlyCosts: monthlyCosts, // ✅ 3. ส่งตัวแปรนี้ไปให้หน้าจอ
            categoryLabels: sortedCats.map(([k]) => k),
            categoryCounts: sortedCats.map(([,v]) => {
                const percent = countTotal > 0 ? (v / countTotal) * 100 : 0;
                return percent.toFixed(2);
            })
        };
        // ============================================

        res.render('index', { 
            logs: logs,
            dashData: dashData
        });

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

// ==========================================
// 4. Server Start
// ==========================================

cron.schedule('0 08 * * *', () => {
    console.log('⏰ Running Scheduled Sync...');
    if (syncController.runScheduledSync) {
        syncController.runScheduledSync();
    }
});

const startServer = async () => {
    try {
        await db.authenticate();
        console.log('✅ Database Connected.');
        await db.sync({ alter: true });
        console.log('✅ Database Synced.');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('❌ Database connection error:', error);
    }
};

startServer();