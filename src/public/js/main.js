/**
 * main.js
 * จัดการ Logic การ Filter, Sync, Clear Data และ Sorting
 */

// เก็บสถานะการ Sort ปัจจุบัน
let currentSort = { column: -1, direction: 'asc' };

// === 🔃 Logic Sort Table ===
function sortTable(columnIndex, type = 'text') {
    const table = document.getElementById("mainTable");
    const tbody = document.getElementById("tableBody");
    // เลือกเฉพาะแถวข้อมูล (ไม่เอาแถว No Data/No Results)
    const rows = Array.from(tbody.querySelectorAll("tr.table-row"));
    
    // สลับทิศทาง (Ascending <-> Descending)
    let direction = 'asc';
    if (currentSort.column === columnIndex && currentSort.direction === 'asc') {
        direction = 'desc';
    }
    currentSort = { column: columnIndex, direction: direction };

    // อัปเดตไอคอนหัวตาราง
    updateSortIcons(columnIndex, direction);

    // ทำการเรียงลำดับ
    rows.sort((a, b) => {
        // ดึงค่าจาก data-sort ที่ฝังไว้ใน td
        let aVal = a.children[columnIndex].getAttribute('data-sort') || '';
        let bVal = b.children[columnIndex].getAttribute('data-sort') || '';

        if (type === 'number') {
            return direction === 'asc' 
                ? parseFloat(aVal) - parseFloat(bVal) 
                : parseFloat(bVal) - parseFloat(aVal);
        } else if (type === 'date') {
            let dateA = new Date(aVal || 0); // ถ้าไม่มีวันที่ให้เป็น 0
            let dateB = new Date(bVal || 0);
            return direction === 'asc' 
                ? dateA - dateB 
                : dateB - dateA;
        } else {
            // เรียงแบบตัวอักษร
            return direction === 'asc' 
                ? aVal.localeCompare(bVal, 'th') 
                : bVal.localeCompare(aVal, 'th');
        }
    });

    // ใส่แถวที่เรียงแล้วกลับเข้าไปใหม่
    rows.forEach(row => tbody.appendChild(row));
}

// ฟังก์ชันเปลี่ยนไอคอน Sort
function updateSortIcons(columnIndex, direction) {
    // รีเซ็ตทุกไอคอนเป็นค่าเริ่มต้น (ลูกศรจางๆ)
    const headers = document.querySelectorAll("#mainTable thead th i");
    headers.forEach(icon => {
        icon.className = "fa-solid fa-sort text-slate-500 ml-1 group-hover:text-white opacity-50";
    });

    // เปลี่ยนไอคอนคอลัมน์ที่เลือกให้ชัดเจน
    const activeHeader = document.querySelectorAll("#mainTable thead th")[columnIndex];
    const activeIcon = activeHeader.querySelector("i");
    activeIcon.className = direction === 'asc' 
        ? "fa-solid fa-sort-up text-white ml-1" 
        : "fa-solid fa-sort-down text-white ml-1";
    activeIcon.style.opacity = "1";
}

// === 🚀 Logic Filter Table ===
function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    const selectedStatus = document.getElementById('statusFilter').value;

    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr.table-row'); 
    let visibleCount = 0;

    rows.forEach(row => {
        const textContent = row.innerText.toLowerCase();
        const rowCategory = row.getAttribute('data-filter-category'); 
        const rowStatus = row.getAttribute('data-filter-status');

        const matchSearch = textContent.includes(searchText);
        const matchCategory = selectedCategory === "" || rowCategory === selectedCategory;
        const matchStatus = selectedStatus === "" || rowStatus === selectedStatus;

        if (matchSearch && matchCategory && matchStatus) {
            row.classList.remove('hidden');
            visibleCount++;
        } else {
            row.classList.add('hidden');
        }
    });

    const noResultsRow = document.getElementById('noResultsRow');
    const noDataRow = document.getElementById('noDataRow');
    
    if(noDataRow) noDataRow.classList.add('hidden');

    if (visibleCount === 0 && rows.length > 0) {
        noResultsRow.classList.remove('hidden');
    } else {
        noResultsRow.classList.add('hidden');
    }

    const showingCount = document.getElementById('showingCount');
    if(showingCount) {
        showingCount.textContent = `Displaying ${visibleCount} of ${rows.length} items`;
    }
}

// === 🔄 Logic Sync Data ===
async function syncData() {
    Swal.fire({
        title: 'กำลัง Sync ข้อมูล...',
        html: 'ระบบกำลังดึงข้อมูลจาก Server เก่า<br>กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const res = await fetch('/api/sync');
        const data = await res.json();
        
        if(res.ok) {
            await Swal.fire({
                title: 'Sync เสร็จสิ้น!',
                text: `ดึงข้อมูลมาทั้งหมด ${data.total_records} รายการ`,
                icon: 'success',
                confirmButtonColor: '#2563eb',
                timer: 2000,
                timerProgressBar: true
            });
            location.reload(); 
        } else {
            throw new Error(data.message || 'Error syncing');
        }
    } catch (err) {
        Swal.fire({
            title: 'Sync ล้มเหลว',
            text: err.message,
            icon: 'error',
            confirmButtonColor: '#dc2626'
        });
    }
}

// === 🗑️ Logic Clear Data ===
async function clearData() {
    const result = await Swal.fire({
        title: 'ยืนยันการลบข้อมูล?',
        text: "ข้อมูลทั้งหมดใน Database จะหายไป! (ใช้สำหรับทดสอบเท่านั้น)",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ใช่, ลบทั้งหมด!',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        Swal.fire({
            title: 'กำลังลบข้อมูล...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res = await fetch('/api/clear', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                await Swal.fire({
                    title: 'ลบข้อมูลเรียบร้อย!',
                    text: 'Database ว่างเปล่าแล้ว',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        }
    }
}