const axios = require('axios');
const OldLog = require('../models/OldLog');

// ==========================================
// Helper Function: Save data to DB
// ==========================================
// Returns: true if Insert/Update occurred, false if no change
const saveLogToDB = async (data) => {
    try {
        // 1. Find existing data by Ticket No.
        const existingLog = await OldLog.findByPk(data.ticket_no);

        if (existingLog) {
            // 2. If exists: Update values
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

            // 3. Check for changes
            if (existingLog.changed()) {
                await existingLog.save(); // Save changes
                return true; // ✅ Changed
            }
            
            return false; // ❌ No change
        } else {
            // 4. If not exists: Create new
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
            return true; // ✅ Created new
        }
    } catch (err) {
        console.error(`Error saving ticket ${data.ticket_no}:`, err.message);
        return false;
    }
};

// ==========================================
// ✅ Main Function: Sync All Data (Manual Click)
// ==========================================
exports.syncAllData = async (req, res) => {
    console.log('[Sync] Starting Manual Sync Process...');
    
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

        console.log(`[Sync] Finished. Updated/Inserted: ${updatedCount}`);
        
        // ✅ 1. Update last sync time immediately (for Manual Sync)
        req.app.locals.lastSyncTime = new Date();

        // ✅ 2. Send Response back
        res.json({ 
            success: true,
            message: 'Sync All Data Successful!', 
            total_records: updatedCount,
            timestamp: req.app.locals.formatSyncTime(req.app.locals.lastSyncTime)
        });

    } catch (error) {
        console.error('Sync All Error:', error);
        res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
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

        // Helper for Loop in Cron (Same Logic as above)
        const processItems = async (items, type) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (!item.ticket_on) continue;
                let logData = {};

                // Map Data by Type
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
        
        return true; // ✅ Return true to server.js to indicate success (so time can be updated)

    } catch (error) {
        console.error("❌ Scheduled Sync Failed:", error.message);
        return false;
    }
};

// ==========================================
// 📥 Function for Import JSON File (Manual Upload)
// ==========================================
exports.importManualData = async (req, res) => {
    try {
        const logs = req.body; // Receive JSON Array data

        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid data format or empty list' });
        }

        let importedCount = 0;

        for (const item of logs) {
            // ✅ Use findOrCreate: If Ticket No exists, do not duplicate (prevent duplicates)
            const [log, created] = await OldLog.findOrCreate({
                where: { ticket_no: item.ticket_no },
                defaults: {
                    category: item.category || 'dev.app',
                    details: item.details || '',
                    solution: item.solution || '',
                    cost: parseFloat(item.cost) || 0,
                    reporter_name: item.reporter_name || 'System Import',
                    reporter_dept: item.reporter_dept || '',
                    
                    // ✅ Map fields as requested (assigned_name -> responsible_person)
                    responsible_person: item.assigned_name || item.responsible_person || '', 
                    responsible_dept: item.assigned_dept || item.responsible_dept || '',
                    
                    created_date: item.created_date ? new Date(item.created_date) : new Date(),
                    finished_date: item.finished_date ? new Date(item.finished_date) : null,
                    status: item.status || 'closed'
                }
            });

            if (created) {
                importedCount++;
            } 
            // 💡 If you want to update old data too, add logic: else { await log.update(item); }
        }

        console.log(`📥 Imported ${importedCount} records from JSON.`);

        // Update last sync time of the system
        req.app.locals.lastSyncTime = new Date();

        res.json({ 
            success: true, 
            message: `Import successfully! Added ${importedCount} new records`,
            count: importedCount 
        });

    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};