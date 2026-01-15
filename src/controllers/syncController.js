const axios = require('axios');
const OldLog = require('../models/OldLog');

exports.syncFromLegacy = async (req, res) => {
    try {
        // ใช้ IP Internal ที่คุณทดสอบแล้วว่าดึงข้อมูลได้
        const url = 'http://10.148.0.51:8092/helpdesks/service/closed';
        console.log(`fetching data from ${url}...`);
        
        const response = await axios.get(url);
        
        // ข้อมูลมาเป็น JSON Array อยู่แล้ว ไม่ต้องแปลง XML
        const items = response.data; 

        if (!items || !Array.isArray(items)) {
             return res.status(404).send('No data found or invalid format');
        }

        let count = 0;

        for (const log of items) {
            // Map ข้อมูลจาก JSON ลง Database
            await OldLog.upsert({
                ticket_no: log.no,
                category: log.category,
                details: log.details,
                reporter_name: log.reporter,
                reporter_code: log.reporter_code,
                reporter_dept: log.reporter_department,
                created_date: log.created_date ? new Date(log.created_date) : null,
                finished_date: log.finished_date ? new Date(log.finished_date) : null,
                responsible_person: log.responsible_person,
                status: log.status
            });
            count++;
        }

        res.send({ message: 'Sync Successful!', total_records: count });

    } catch (error) {
        console.error(error);
        res.status(500).send(`Error: ${error.message}`);
    }
};