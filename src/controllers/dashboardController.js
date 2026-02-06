// src/controllers/dashboardController.js
const OldLog = require('../models/OldLog');
const { categoryConfig } = require('../config/constants'); 

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

        // 🛠️ ฟังก์ชันจัดกลุ่ม (Grouping Helper)
        const getCategoryGroup = (categoryRaw) => {
            if (!categoryRaw) return 'Other (อื่นๆ)';
            
            // แปลงชื่อไทย/อังกฤษเดิม ให้เป็น Label กลางก่อน
            const configLabel = categoryConfig[categoryRaw.trim()]?.label || categoryRaw.trim();
            
            // ----------------------------------------------------
            // 1. กลุ่มงานพัฒนาระบบคอมพิวเตอร์แม่ข่าย (Server + Dev)
            // ----------------------------------------------------
            if (configLabel === 'helpdesk.server' || configLabel.startsWith('dev.')) {
                return 'Server System Development (พัฒนาระบบคอมพิวเตอร์แม่ข่าย)';
            }

            // ----------------------------------------------------
            // 2. กลุ่มงานบริการ (Service/Meeting)
            // ----------------------------------------------------
            if (configLabel.startsWith('meeting.')) {
                return 'Service (กลุ่มงานบริการ)';
            }

            // ----------------------------------------------------
            // 3. กลุ่มงานกล้องวงจรปิด (CCTV)
            // ----------------------------------------------------
            if (configLabel.startsWith('cctv.')) {
                return 'CCTV (งานกล้องวงจรปิด)';
            }

            // ----------------------------------------------------
            // 4. การจัดการสิทธิ์ (Permission)
            // ----------------------------------------------------
            if (configLabel.startsWith('permission.') || configLabel.startsWith('permisssion.')) { 
                return 'Permission (การจัดการสิทธิ์)';
            }
            
            // ----------------------------------------------------
            // 5. งานสนับสนุน (Helpdesk) - *ไม่รวม Server แล้ว*
            // ----------------------------------------------------
            if (configLabel.startsWith('helpdesk.')) {
                return 'Helpdesk (งานสนับสนุน)';
            }
            
            return 'Other (อื่นๆ)';
        };

        logs.forEach(log => {
            if (!log.created_date) return;
            const date = new Date(log.created_date);

            if (date.getFullYear() === currentYear) {
                countTotal++; 
                
                const status = (log.status || '').trim();
                
                if (['closed', 'เสร็จสิ้น', 'เรียบร้อย'].includes(status)) {
                    countClosed++;
                } else if (!['cancelled', 'ยกเลิก', 'cancel', 'fix'].includes(status)) {
                    countActive++;
                }

                const monthIndex = date.getMonth();
                monthlyStats[monthIndex]++;
                
                const cost = parseFloat(log.cost || 0);
                if (!isNaN(cost)) {
                    totalCost += cost;
                    monthlyCosts[monthIndex] += cost;
                }

                // นับหมวดหมู่แบบกลุ่ม
                const groupName = getCategoryGroup(log.category); 
                catMap[groupName] = (catMap[groupName] || 0) + 1;
            }
        });

        countFix = countTotal - countClosed - countActive;

        const sortedCats = Object.entries(catMap).sort(([,a], [,b]) => b - a);
        
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