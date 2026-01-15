const axios = require('axios');
const OldLog = require('../models/OldLog');

exports.syncFromLegacy = async (req, res) => {
    try {
        // URL ของ API Legacy (เพิ่ม limit เพื่อให้ดึงข้อมูลได้เยอะขึ้น)
        const url = 'http://10.148.0.51:8092/helpdesks/service/closed?limit=5000';
        console.log(`fetching data from ${url}...`);
        
        const response = await axios.get(url);
        const items = response.data; 

        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (!items || !Array.isArray(items)) {
             return res.status(404).json({ message: 'No data found or invalid format from legacy API' });
        }

        let count = 0;

        for (const log of items) {
            // ข้ามรายการที่ไม่มีเลข Ticket (JSON ใหม่ใช้ key: ticket_on)
            if (!log.ticket_on) continue; 

            await OldLog.upsert({
                // ✅ 1. ข้อมูลพื้นฐาน
                ticket_no: log.ticket_on,               // <ticket_on>
                category: log.category || 'Uncategorized',
                details: log.details || '',
                status: log.status || 'closed',

                // ✅ 2. ข้อมูลใหม่ (Solution & Cost)
                solution: log.manage_comment || '',     // <manage_comment>
                cost: parseFloat(log.total_all) || 0.00, // <total_all>

                // ✅ 3. ข้อมูลผู้แจ้ง (Reporter)
                reporter_name: log.create_user || 'Unknown', // <create_user>
                reporter_code: null,                         // ไม่มีใน JSON ใหม่
                reporter_dept: log.reporter_division_code || '', // <reporter_division_code> ฝ่ายผู้แจ้ง

                // ✅ 4. วันที่ (Dates)
                created_date: log.create_date ? new Date(log.create_date) : null,
                finished_date: log.write_date ? new Date(log.write_date) : null, // <write_date>

                // ✅ 5. ผู้รับผิดชอบ (Responsible)
                responsible_person: log.assigned_user,       // <assigned_user>
                responsible_dept: log.division_code || '',   // <division_code> ฝ่ายผู้รับงาน
            });
            count++;
        }

        // ส่งผลลัพธ์กลับเป็น JSON
        res.json({ message: 'Sync Successful!', total_records: count });

    } catch (error) {
        console.error('Sync Error:', error);
        // ส่ง Error กลับเป็น JSON เพื่อให้ Frontend แสดงผลได้ถูกต้อง
        res.status(500).json({ 
            message: `Server Error: ${error.message}`,
            details: error.response ? error.response.data : null 
        });
    }
};