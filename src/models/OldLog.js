const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OldLog = sequelize.define('OldLog', {
    ticket_no: {
        type: DataTypes.STRING,
        primaryKey: true, 
        field: 'no' // ชื่อคอลัมน์จริงใน Database ชื่อ 'no'
    },
    category: DataTypes.STRING,
    details: DataTypes.TEXT,
    
    // ✅ เพิ่ม: วิธีแก้ไข (manage_comment)
    solution: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // ✅ เพิ่ม: ค่าใช้จ่าย (total_all)
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },

    reporter_name: DataTypes.STRING,
    reporter_code: DataTypes.STRING,
    
    // ✅ ฝ่ายผู้แจ้ง (reporter_division_code)
    reporter_dept: DataTypes.STRING, 
    
    created_date: DataTypes.DATE,
    finished_date: DataTypes.DATE,
    
    responsible_person: DataTypes.STRING,
    
    // ✅ เพิ่ม: ฝ่ายผู้รับงาน (division_code)
    responsible_dept: DataTypes.STRING, 

    status: DataTypes.STRING,
}, {
    tableName: 'old_helpdesk_logs',
    timestamps: true // ให้ระบบสร้าง created_at, updated_at ให้ด้วย
});

module.exports = OldLog;