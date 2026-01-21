// src/config/constants.js

const statusConfig = {
    'fix': { label: 'helpdesk.fix', order: 1 },
    'claim': { label: 'helpdesk.claim', order: 2 },
    'closed': { label: 'helpdesk.closed', order: 3 },
    'cancel': { label: 'helpdesk.cancel', order: 4 },
    'เรียบร้อย': { label: 'permission.success', order: 5 },
    'ยกเลิก': { label: 'permission.cancel', order: 6 },
    'รอเจ้าหน้าที่ IT ดำเนินการ': { label: 'cctv.pending_it', order: 7 },
    'เสร็จสิ้น': { label: 'cctv.success', order: 8 },
    'ดราฟ': { label: 'cctv.draft', order: 9 }
};

const categoryConfig = {
    // ===========================
    // 1. Permission (สิทธิ์การใช้งาน) [Order 1-16]
    // ===========================
    'ลงทะเบียนพนักงานใหม่': { label: 'permission.registerUser', order: 1 },
    'Admin Social Media': { label: 'permission.social', order: 2 },
    'Adobe': { label: 'permission.adobe', order: 3 },
    'Express': { label: 'permission.express', order: 4 },
    'Email': { label: 'permisssion.email', order: 5 },
    'LINE': { label: 'permission.line', order: 6 },
    'Drive Center': { label: 'permission.NasDrive', order: 7 },
    'Cloud Drive Center (Shared drives)': { label: 'permission.Gdrive', order: 8 },
    'SSH-KEY': { label: 'permission.ssh', order: 9 },
    'Super User': { label: 'permission.ssh', order: 9 },
    'VPN': { label: 'permission.vpn', order: 10 },
    'Remote Desktop': { label: 'permission.remoteDesktop', order: 11 },
    'WIFI': { label: 'permission.wifi', order: 12 },
    'USB Thumdrive': { label: 'permission.thumbDrive', order: 13 },
    'Vender Support': { label: 'permission.vender', order: 14 },
    'VOIP': { label: 'permission.voip', order: 15 },
    'Cyber Payroll': { label: 'permission.payroll', order: 16 },

    // ===========================
    // 2. Helpdesk (แจ้งซ่อม/ปัญหา) [Order 17-31]
    // ===========================
    'Computer': { label: 'helpdesk.computer', order: 17 },
    'Computers': { label: 'helpdesk.computer', order: 17 },
    'Laptops': { label: 'helpdesk.laptop', order: 18 },
    'Laptop': { label: 'helpdesk.laptop', order: 18 },
    'Server': { label: 'helpdesk.server', order: 19 },
    'Monitor': { label: 'helpdesk.monitor', order: 20 },
    'Projectors': { label: 'helpdesk.monitor', order: 20 },
    'Printers': { label: 'helpdesk.printer', order: 21 },
    'Printer': { label: 'helpdesk.printer', order: 21 },
    'Scaner': { label: 'helpdesk.scaner', order: 22 },
    'Scanner': { label: 'helpdesk.scaner', order: 22 },
    'UPS': { label: 'helpdesk.ups', order: 23 },
    'Telephone': { label: 'helpdesk.telephone', order: 24 },
    'USB': { label: 'helpdesk.usb', order: 25 },
    'Software': { label: 'helpdesk.software', order: 26 },
    'BIC E-Office': { label: 'helpdesk.software', order: 26 },
    'E-OFFICE': { label: 'helpdesk.software', order: 26 },
    'Internal Software': { label: 'helpdesk.software', order: 26 },
    'SAP': { label: 'helpdesk.sap', order: 27 },
    'Recovery Data': { label: 'helpdesk.recoveryData', order: 28 },
    'Internet': { label: 'helpdesk.internet', order: 29 },
    'Network': { label: 'helpdesk.network', order: 30 },
    'Other': { label: 'helpdesk.other', order: 31 },

    // ===========================
    // 3. Services / Request (ส่วนเสริม) [Order 32-37]
    // ===========================
    'CCTV': { label: 'cctv.cctv', order: 32 },
    'ขอดูย้อนหลัง': { label: 'cctv.playback', order: 33 },
    'ขอติดตั้ง': { label: 'cctv.install', order: 34 },
    'ขอย้ายจุดติดตั้ง': { label: 'cctv.move', order: 35 },
    'Meeting': { label: 'meeting.service', order: 36 },
    'Web Site': { label: 'dev.website', order: 37 }
};

// ส่งออกตัวแปรเพื่อให้ไฟล์อื่นเรียกใช้ได้
module.exports = { statusConfig, categoryConfig };