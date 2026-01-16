const axios = require('axios');
const OldLog = require('../models/OldLog');

// === Helper Function: บันทึกข้อมูลลง DB ===
const saveLogToDB = async (data) => {
    // แปลงค่าว่างหรือ Null ให้เป็นค่า Default ที่ปลอดภัย
    await OldLog.upsert({
        ticket_no: data.ticket_no,
        category: data.category || 'Uncategorized',
        details: data.details || '',
        solution: data.solution || '',
        cost: parseFloat(data.cost) || 0.00,
        
        reporter_name: data.reporter_name || 'Unknown',
        reporter_dept: data.reporter_dept || '',
        
        created_date: data.created_date ? new Date(data.created_date) : null,
        finished_date: data.finished_date ? new Date(data.finished_date) : null,
        
        responsible_person: data.responsible_person,
        responsible_dept: data.responsible_dept || '',
        
        status: data.status || 'closed'
    });
};

// ==========================================
// ✅ Main Function: Sync All Data (Helpdesk + Requests + CCTV)
// ==========================================
exports.syncAllData = async (req, res) => {
    console.log('[Sync] Starting Full Sync Process...');
    
    try {
        // 1. ยิง Request ไปหา 3 API พร้อมกัน (Parallel Fetching)
        const [helpdeskRes, requestRes, cctvRes] = await Promise.all([
            axios.get('http://10.148.0.51:8092/helpdesks/service/all'),
            axios.get('http://10.148.0.51:8092/empauth/request/all'),
            axios.get('http://10.148.0.51:8092/cctv/request/all') // ✅ เพิ่ม API CCTV
        ]);

        let count = 0;

        // 2. จัดการข้อมูลชุดที่ 1: Helpdesk Logs (แจ้งซ่อม)
        const helpdeskItems = helpdeskRes.data;
        if (Array.isArray(helpdeskItems)) {
            console.log(`[Sync] Processing ${helpdeskItems.length} Helpdesk items...`);
            for (const item of helpdeskItems) {
                if (!item.ticket_on) continue;

                await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.category,
                    details: item.details,
                    solution: item.manage_comment,
                    cost: item.total_all,
                    reporter_name: item.create_user,
                    reporter_dept: item.reporter_division_code,
                    created_date: item.create_date,
                    finished_date: item.write_date,
                    responsible_person: item.assigned_user,
                    responsible_dept: item.division_code,
                    status: item.status
                });
                count++;
            }
        }

        // 3. จัดการข้อมูลชุดที่ 2: Requests (ขอสิทธิ์/User)
        const requestItems = requestRes.data;
        if (Array.isArray(requestItems)) {
            console.log(`[Sync] Processing ${requestItems.length} Request items...`);
            for (const item of requestItems) {
                if (!item.ticket_on) continue;

                await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.request, // Map Request -> Category
                    details: `คำร้องขอ: ${item.request}`, 
                    solution: '',
                    cost: 0,
                    reporter_name: item.employee_name,
                    reporter_dept: item.reporter_division_code,
                    created_date: item.create_date,
                    finished_date: item.write_date,
                    responsible_person: item.operator,
                    responsible_dept: item.division_code,
                    status: item.status
                });
                count++;
            }
        }

        // 4. ✅ จัดการข้อมูลชุดที่ 3: CCTV Requests (กล้องวงจรปิด)
        const cctvItems = cctvRes.data;
        if (Array.isArray(cctvItems)) {
            console.log(`[Sync] Processing ${cctvItems.length} CCTV items...`);
            for (const item of cctvItems) {
                if (!item.ticket_on) continue;

                // รวมข้อมูลรายละเอียดต่างๆ ไว้ใน field details
                let detailsInfo = item.details || '';
                if (item.cctv_ref) detailsInfo += ` (จุด: ${item.cctv_ref})`;
                if (item.date_range) detailsInfo += ` [ช่วงเวลา: ${item.date_range}]`;
                if (item.company) detailsInfo += ` [${item.company}]`;

                await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.request_type, // "ขอติดตั้ง", "ขอดูย้อนหลัง" -> Category
                    details: detailsInfo,
                    solution: '',
                    cost: 0,
                    reporter_name: item.create_user,
                    reporter_dept: item.reporter_division_code,
                    created_date: item.create_date,
                    finished_date: item.write_date,
                    responsible_person: item.operator,
                    responsible_dept: item.division_code,
                    status: item.status
                });
                count++;
            }
        }

        console.log(`[Sync] Finished. Total records updated: ${count}`);
        res.json({ message: 'Sync All Data Successful!', total_records: count });

    } catch (error) {
        console.error('Sync All Error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// ==========================================
// 🕒 Cron Job Function
// ==========================================
exports.runScheduledSync = async () => {
    console.log("⏰ Scheduled Sync Started...");
    try {
        // สามารถนำ Logic ของ syncAllData มาใส่ที่นี่หากต้องการให้ Cron Job ทำงานด้วย
        // (ในตัวอย่างนี้ปล่อยไว้เป็น Placeholder ตามเดิม)
        console.log("Note: Scheduled sync logic needs to be implemented separately if needed without req/res.");
    } catch (error) {
        console.error("❌ Scheduled Sync Failed:", error.message);
    }
};