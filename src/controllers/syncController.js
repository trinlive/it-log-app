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
// ✅ Main Function: Sync All Data (Helpdesk + Requests)
// ==========================================
exports.syncAllData = async (req, res) => {
    console.log('[Sync] Starting Full Sync Process...');
    
    try {
        // 1. ยิง Request ไปหา 2 API พร้อมกัน (Parallel Fetching) เพื่อความรวดเร็ว
        const [helpdeskRes, requestRes] = await Promise.all([
            axios.get('http://10.148.0.51:8092/helpdesks/service/all'),
            axios.get('http://10.148.0.51:8092/empauth/request/all')
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
                    // Map 'request' ไปเป็น 'category' เพื่อให้แสดงใน Filter ได้
                    category: item.request, 
                    // ระบุใน details ว่าเป็นคำร้องขอ
                    details: `คำร้องขอ: ${item.request}`, 
                    solution: '', // ไม่มีข้อมูล
                    cost: 0,      // ไม่มีข้อมูล
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

        console.log(`[Sync] Finished. Total records updated: ${count}`);
        res.json({ message: 'Sync All Data Successful!', total_records: count });

    } catch (error) {
        console.error('Sync All Error:', error);
        // ส่ง HTTP 500 กลับไปพร้อมข้อความ Error
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// ==========================================
// 🕒 Cron Job Function (Optional)
// ==========================================
// หากต้องการเปิด Auto Sync ในอนาคต สามารถใช้ฟังก์ชันนี้ได้
exports.runScheduledSync = async () => {
    console.log("⏰ Scheduled Sync Started...");
    try {
        // เรียก Logic เดียวกับ syncAllData แต่ไม่มี req, res
        // (สามารถ Copy Logic มาใส่ หรือ Refactor เพิ่มเติมได้ถ้าต้องการเปิดใช้งานจริงจัง)
        console.log("Note: Scheduled sync logic needs to be implemented separately if needed without req/res.");
    } catch (error) {
        console.error("❌ Scheduled Sync Failed:", error.message);
    }
};