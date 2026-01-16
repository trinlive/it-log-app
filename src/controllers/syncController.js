const axios = require('axios');
const OldLog = require('../models/OldLog');

// === Helper Function: บันทึกข้อมูลลง DB ===
const saveLogToDB = async (data) => {
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
// ✅ Main Function: Sync All Data
// ==========================================
exports.syncAllData = async (req, res) => {
    console.log('[Sync] Starting Full Sync Process...');
    
    try {
        const [helpdeskRes, requestRes, cctvRes] = await Promise.all([
            axios.get('http://10.148.0.51:8092/helpdesks/service/all'),
            axios.get('http://10.148.0.51:8092/empauth/request/all'),
            axios.get('http://10.148.0.51:8092/cctv/request/all')
        ]);

        let count = 0;

        // 1. Helpdesk Items
        const helpdeskItems = helpdeskRes.data;
        if (Array.isArray(helpdeskItems)) {
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

        // 2. Request Items (EmpAuth) - ✅ เพิ่ม close_memo
        const requestItems = requestRes.data;
        if (Array.isArray(requestItems)) {
            for (const item of requestItems) {
                if (!item.ticket_on) continue;
                await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.request, 
                    details: `คำร้องขอ: ${item.request}`, 
                    // ✅ Map close_memo ไปที่ solution
                    solution: item.close_memo || '', 
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

        // 3. CCTV Items
        const cctvItems = cctvRes.data;
        if (Array.isArray(cctvItems)) {
            for (const item of cctvItems) {
                if (!item.ticket_on) continue;
                let detailsInfo = item.details || '';
                if (item.cctv_ref) detailsInfo += ` (จุด: ${item.cctv_ref})`;
                if (item.date_range) detailsInfo += ` [ช่วงเวลา: ${item.date_range}]`;
                if (item.company) detailsInfo += ` [${item.company}]`;

                await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.request_type,
                    details: detailsInfo,
                    solution: '', // CCTV ยังไม่มี field ตอบกลับในตัวอย่าง
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

        console.log(`[Sync] Finished. Updated: ${count}`);
        res.json({ message: 'Sync All Data Successful!', total_records: count });

    } catch (error) {
        console.error('Sync All Error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// ... (Cron Job Function ตามเดิม)
exports.runScheduledSync = async () => {
    // ...
};