const axios = require('axios');
const OldLog = require('../models/OldLog');

// === Helper Function: บันทึกข้อมูลลง DB (Updated Logic) ===
// Return: true ถ้ามีการ Insert/Update, false ถ้าไม่มีการเปลี่ยนแปลง
const saveLogToDB = async (data) => {
    try {
        // 1. ค้นหาข้อมูลเดิมจาก Ticket No.
        const existingLog = await OldLog.findByPk(data.ticket_no);

        if (existingLog) {
            // 2. ถ้ามีอยู่แล้ว: ลอง Set ค่าใหม่เข้าไป
            existingLog.set({
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

            // 3. เช็คว่ามี Field ไหนเปลี่ยนไปหรือไม่?
            if (existingLog.changed()) {
                await existingLog.save(); // บันทึกการแก้ไข
                return true; // ✅ มีการเปลี่ยนแปลง
            }
            
            return false; // ❌ ข้อมูลเหมือนเดิม ไม่นับ
        } else {
            // 4. ถ้ายังไม่มี: สร้างใหม่เลย
            await OldLog.create({
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
            return true; // ✅ สร้างใหม่ (นับ)
        }
    } catch (err) {
        console.error(`Error saving ticket ${data.ticket_no}:`, err.message);
        return false;
    }
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

        let updatedCount = 0;

        // 1. Helpdesk Items
        const helpdeskItems = helpdeskRes.data;
        if (Array.isArray(helpdeskItems)) {
            for (const item of helpdeskItems) {
                if (!item.ticket_on) continue;
                const isUpdated = await saveLogToDB({
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
                if (isUpdated) updatedCount++;
            }
        }

        // 2. Request Items (EmpAuth)
        const requestItems = requestRes.data;
        if (Array.isArray(requestItems)) {
            for (const item of requestItems) {
                if (!item.ticket_on) continue;
                const isUpdated = await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.request, 
                    details: `คำร้องขอ: ${item.request}`, 
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
                if (isUpdated) updatedCount++;
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

                const isUpdated = await saveLogToDB({
                    ticket_no: item.ticket_on,
                    category: item.request_type,
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
                if (isUpdated) updatedCount++;
            }
        }

        console.log(`[Sync] Finished. Actually Updated/Inserted: ${updatedCount}`);
        
        // ส่งจำนวนที่อัปเดตจริงกลับไป
        res.json({ message: 'Sync All Data Successful!', total_records: updatedCount });

    } catch (error) {
        console.error('Sync All Error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// ==========================================
// 🕒 Cron Job Function (Auto Sync)
// ==========================================
exports.runScheduledSync = async () => {
    console.log("⏰ Scheduled Sync Started...");
    try {
        const [helpdeskRes, requestRes, cctvRes] = await Promise.all([
            axios.get('http://10.148.0.51:8092/helpdesks/service/all'),
            axios.get('http://10.148.0.51:8092/empauth/request/all'),
            axios.get('http://10.148.0.51:8092/cctv/request/all')
        ]);

        let updatedCount = 0;

        // Helper สำหรับ Loop ใน Cron (ใช้ Logic เดียวกับด้านบน)
        const processItems = async (items, type) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (!item.ticket_on) continue;
                let logData = {};

                // Map Data ตามประเภท
                if (type === 'helpdesk') {
                    logData = {
                        ticket_no: item.ticket_on, category: item.category, details: item.details,
                        solution: item.manage_comment, cost: item.total_all, reporter_name: item.create_user,
                        reporter_dept: item.reporter_division_code, created_date: item.create_date, finished_date: item.write_date,
                        responsible_person: item.assigned_user, responsible_dept: item.division_code, status: item.status
                    };
                } else if (type === 'request') {
                    logData = {
                        ticket_no: item.ticket_on, category: item.request, details: `คำร้องขอ: ${item.request}`,
                        solution: item.close_memo || '', cost: 0, reporter_name: item.employee_name,
                        reporter_dept: item.reporter_division_code, created_date: item.create_date, finished_date: item.write_date,
                        responsible_person: item.operator, responsible_dept: item.division_code, status: item.status
                    };
                } else if (type === 'cctv') {
                    let det = item.details || '';
                    if (item.cctv_ref) det += ` (จุด: ${item.cctv_ref})`;
                    if (item.date_range) det += ` [ช่วงเวลา: ${item.date_range}]`;
                    if (item.company) det += ` [${item.company}]`;
                    logData = {
                        ticket_no: item.ticket_on, category: item.request_type, details: det,
                        solution: '', cost: 0, reporter_name: item.create_user,
                        reporter_dept: item.reporter_division_code, created_date: item.create_date, finished_date: item.write_date,
                        responsible_person: item.operator, responsible_dept: item.division_code, status: item.status
                    };
                }

                const isUpdated = await saveLogToDB(logData);
                if (isUpdated) updatedCount++;
            }
        };

        await processItems(helpdeskRes.data, 'helpdesk');
        await processItems(requestRes.data, 'request');
        await processItems(cctvRes.data, 'cctv');

        console.log(`✅ Scheduled Sync Finished. Records Updated: ${updatedCount}`);

    } catch (error) {
        console.error("❌ Scheduled Sync Failed:", error.message);
    }
};