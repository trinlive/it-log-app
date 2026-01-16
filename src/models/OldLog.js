const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OldLog = sequelize.define('OldLog', {
    ticket_no: {
        type: DataTypes.STRING,
        primaryKey: true, 
        field: 'no' // map กับ field 'no' ใน Database เดิม
    },
    category: DataTypes.STRING,
    details: DataTypes.TEXT,
    
    // ✅ เพิ่ม: วิธีแก้ไข
    solution: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // ✅ เพิ่ม: ค่าใช้จ่าย
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },

    reporter_name: DataTypes.STRING,
    reporter_code: DataTypes.STRING,
    
    // ฝ่ายผู้แจ้ง (รองรับ reporter_division_code)
    reporter_dept: DataTypes.STRING, 
    
    created_date: DataTypes.DATE,
    finished_date: DataTypes.DATE,
    
    responsible_person: DataTypes.STRING,
    
    // ✅ เพิ่ม: ฝ่ายผู้รับงาน (รองรับ division_code)
    responsible_dept: DataTypes.STRING, 

    status: DataTypes.STRING,
}, {
    tableName: 'old_helpdesk_logs',
    timestamps: true 
});

module.exports = OldLog;