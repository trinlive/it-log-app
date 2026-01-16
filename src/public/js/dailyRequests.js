/**
 * dailyRequests.js
 * จัดการ Logic การ Sync ข้อมูล Daily Requests
 */

async function syncDailyRequests() {
    Swal.fire({
        title: 'ดึงข้อมูลสิทธิ์ประจำวัน...',
        text: 'กำลังดึงข้อมูลจาก Daily Request API',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // เรียก API ที่ Backend
        const res = await fetch('/api/sync-daily-requests');
        const data = await res.json();
        
        if(res.ok) {
            await Swal.fire({
                title: 'สำเร็จ!',
                text: `อัปเดตข้อมูล ${data.total_records} รายการ`,
                icon: 'success',
                timer: 2000,
                timerProgressBar: true
            });
            location.reload(); 
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}