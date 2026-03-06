// src/config/helpers.js
const { statusConfig, categoryConfig } = require('./constants');

module.exports = (app) => {
    // ==========================================
    // 1. ตัวแปรและฟังก์ชันสำหรับ Sync Time
    // ==========================================
    
    // ตัวแปรเก็บเวลา Sync ล่าสุด (เริ่มมาให้เป็นเวลาปัจจุบัน)
    app.locals.lastSyncTime = new Date(); 

    // ฟังก์ชันจัดรูปแบบวันที่ (เช่น "Sync Data 21.01.26 16:35")
    app.locals.formatSyncTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2); // เอาแค่ 2 ตัวท้าย (2026 -> 26)
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');

        return `Sync Data ${day}.${month}.${year} ${hour}:${min}`;
    };

    // ==========================================
    // 2. Helper Functions อื่นๆ (สำหรับ View)
    // ==========================================

    // แปลงสถานะ (Status) เป็นภาษาไทยหรือ Label ที่ตั้งไว้
    app.locals.getStatusLabel = (status) => {
        return statusConfig[(status || '').trim()]?.label || status;
    };

    // ดึงลำดับความสำคัญของสถานะ (ใช้เรียงลำดับ)
    app.locals.getStatusOrder = (status) => {
        return statusConfig[(status || '').trim()]?.order || 999;
    };

    // แปลงหมวดหมู่ (Category) เป็น Label ที่ตั้งไว้
    app.locals.getCategoryLabel = (cat) => {
        return categoryConfig[(cat || '').trim()]?.label || cat;
    };

    // ดึงลำดับของหมวดหมู่
    app.locals.getCategoryOrder = (cat) => {
        return categoryConfig[(cat || '').trim()]?.order || 999;
    };

    // ฟังก์ชันจัดรูปแบบวันที่ทั่วไป (เช่นในตาราง)
    app.locals.formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hour}:${min}`;
    };
};