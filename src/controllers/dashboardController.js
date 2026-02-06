// src/controllers/dashboardController.js
const OldLog = require('../models/OldLog');
const { categoryConfig } = require('../config/constants'); // เรียกใช้ Config

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
        let catMap = {};
        
        let countTotal = 0;
        let countClosed = 0;
        let countActive = 0;
        let countFix = 0;

        logs.forEach(log => {
            if (!log.created_date) return;
            const date = new Date(log.created_date);

            if (date.getFullYear() === currentYear) {
                countTotal++; // นับทั้งหมด
                
                const status = (log.status || '').trim();
                
                // 1. เช็คสถานะ Closed (สำเร็จ/ปิดงาน)
                if (['closed', 'เสร็จสิ้น', 'เรียบร้อย'].includes(status)) {
                    countClosed++;
                } 
                // 2. เช็คสถานะ Active (กำลังดำเนินการ)
                // เงื่อนไข: ต้องไม่ใช่ Cancel และไม่ใช่ Fix
                else if (!['cancelled', 'ยกเลิก', 'cancel', 'fix'].includes(status)) {
                    countActive++;
                }

                // 3. จัดการข้อมูลกราฟรายเดือน
                const monthIndex = date.getMonth();
                monthlyStats[monthIndex]++;
                
                const cost = parseFloat(log.cost || 0);
                if (!isNaN(cost)) {
                    totalCost += cost;
                    monthlyCosts[monthIndex] += cost;
                }

                // 4. นับหมวดหมู่
                const catRaw = (log.category || '').trim();
                const catName = categoryConfig[catRaw]?.label || catRaw;
                catMap[catName] = (catMap[catName] || 0) + 1;
            }
        });

        // ✅ สูตรใหม่: Fix = TOTAL - CLOSED - ACTIVE
        // (ค่าที่ได้จะรวมทั้งงานสถานะ 'fix' และ 'cancelled' เพื่อให้ยอดรวมเท่ากับ Total)
        countFix = countTotal - countClosed - countActive;

        const sortedCats = Object.entries(catMap)
            .sort(([,a], [,b]) => b - a);
        
        const dashData = {
            total: countTotal,
            closed: countClosed,
            active: countActive,
            fix: countFix, // ส่งค่า Fix ที่คำนวณใหม่ไปแสดงผล
            totalCost: totalCost,
            monthlyStats: monthlyStats,
            monthlyCosts: monthlyCosts,
            categoryLabels: sortedCats.map(([k]) => k),
            categoryCounts: sortedCats.map(([,v]) => {
                const percent = countTotal > 0 ? (v / countTotal) * 100 : 0;
                return percent.toFixed(2);
            })
        };

        // Render หน้า index พร้อมข้อมูล
        res.render('index', { 
            logs: logs,
            dashData: dashData
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
};