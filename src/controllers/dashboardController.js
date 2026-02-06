// src/controllers/dashboardController.js
const OldLog = require('../models/OldLog');
// const { categoryConfig } = require('../config/constants'); // ❌ ไม่จำเป็นต้องใช้ Config เดิมสำหรับการจัดกลุ่มนี้

exports.getDashboard = async (req, res) => {
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
        let monthlyCosts = new Array(12).fill(0);
        let catMap = {}; // ตัวแปรเก็บจำนวนของแต่ละกลุ่ม
        
        let countTotal = 0;
        let countClosed = 0;
        let countActive = 0;
        let countFix = 0;

        // 🛠️ ฟังก์ชันจัดกลุ่ม (Grouping Helper)
        const getCategoryGroup = (category) => {
            if (!category) return 'Other (อื่นๆ)';
            const cat = category.trim();
            
            // Group 1: Permission (การจัดการสิทธิ์)
            if (cat.startsWith('permission.') || cat.startsWith('permisssion.')) { // เช็ค permisssion (s 3 ตัว) เผื่อไว้
                return 'Permission (การจัดการสิทธิ์)';
            }
            // Group 2: Helpdesk (งานสนับสนุน)
            if (cat.startsWith('helpdesk.')) {
                return 'Helpdesk (งานสนับสนุน)';
            }
            // Group 3: Services & Dev (บริการ & พัฒนา)
            if (cat.startsWith('cctv.') || cat.startsWith('meeting.') || cat.startsWith('dev.')) {
                return 'Services & Dev (บริการ & พัฒนา)';
            }
            
            return 'Other (อื่นๆ)';
        };

        logs.forEach(log => {
            if (!log.created_date) return;
            const date = new Date(log.created_date);

            if (date.getFullYear() === currentYear) {
                countTotal++; 
                
                const status = (log.status || '').trim();
                
                // 1. เช็คสถานะ Closed
                if (['closed', 'เสร็จสิ้น', 'เรียบร้อย'].includes(status)) {
                    countClosed++;
                } 
                // 2. เช็คสถานะ Active (ไม่รวม Cancel และ Fix)
                else if (!['cancelled', 'ยกเลิก', 'cancel', 'fix'].includes(status)) {
                    countActive++;
                }

                // 3. กราฟรายเดือน & Cost
                const monthIndex = date.getMonth();
                monthlyStats[monthIndex]++;
                
                const cost = parseFloat(log.cost || 0);
                if (!isNaN(cost)) {
                    totalCost += cost;
                    monthlyCosts[monthIndex] += cost;
                }

                // 4. ✅ นับหมวดหมู่แบบกลุ่ม (Group Counting)
                const catRaw = (log.category || '').trim();
                const groupName = getCategoryGroup(catRaw); // แปลงเป็นชื่อกลุ่มก่อนนับ
                catMap[groupName] = (catMap[groupName] || 0) + 1;
            }
        });

        // คำนวณ Fix = Total - Closed - Active
        countFix = countTotal - countClosed - countActive;

        // เรียงลำดับจากมากไปน้อย
        const sortedCats = Object.entries(catMap)
            .sort(([,a], [,b]) => b - a);
        
        const dashData = {
            total: countTotal,
            closed: countClosed,
            active: countActive,
            fix: countFix,
            totalCost: totalCost,
            monthlyStats: monthlyStats,
            monthlyCosts: monthlyCosts,
            categoryLabels: sortedCats.map(([k]) => k),
            categoryCounts: sortedCats.map(([,v]) => {
                const percent = countTotal > 0 ? (v / countTotal) * 100 : 0;
                return percent.toFixed(2);
            })
        };

        res.render('index', { 
            logs: logs,
            dashData: dashData
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
};