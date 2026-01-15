// src/models/OldLog.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OldLog = sequelize.define('OldLog', {
    ticket_no: {
        type: DataTypes.STRING,
        primaryKey: true, // ใช้เลขใบงานเป็น ID หลัก (ป้องกันข้อมูลซ้ำ)
        field: 'no'       // map กับ field 'no' ใน XML
    },
    category: DataTypes.STRING,
    details: DataTypes.TEXT, // ใช้ TEXT เพราะรายละเอียดอาจจะยาว
    reporter_name: DataTypes.STRING,
    reporter_code: DataTypes.STRING,
    reporter_dept: DataTypes.STRING,
    created_date: DataTypes.DATE,
    finished_date: DataTypes.DATE,
    responsible_person: DataTypes.STRING,
    status: DataTypes.STRING,
}, {
    tableName: 'old_helpdesk_logs',
    timestamps: true // ให้ระบบสร้าง created_at, updated_at ให้ด้วย
});

module.exports = OldLog;