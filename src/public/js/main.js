/**
 * main.js
 * จัดการ Logic Filter, Sorting, Sync, Clear
 */

let currentSort = { column: -1, direction: 'asc' };

// === 🔃 Sort Table ===
function sortTable(columnIndex, type = 'text') {
    const table = document.getElementById("mainTable");
    const tbody = document.getElementById("tableBody");
    const rows = Array.from(tbody.querySelectorAll("tr.table-row"));
    
    let direction = 'asc';
    if (currentSort.column === columnIndex && currentSort.direction === 'asc') {
        direction = 'desc';
    }
    currentSort = { column: columnIndex, direction: direction };

    updateSortIcons(columnIndex, direction);

    rows.sort((a, b) => {
        let aVal = a.children[columnIndex].getAttribute('data-sort') || '';
        let bVal = b.children[columnIndex].getAttribute('data-sort') || '';

        if (type === 'number') {
            return direction === 'asc' ? parseFloat(aVal) - parseFloat(bVal) : parseFloat(bVal) - parseFloat(aVal);
        } else if (type === 'date') {
            let dateA = new Date(aVal || 0);
            let dateB = new Date(bVal || 0);
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
            return direction === 'asc' ? aVal.localeCompare(bVal, 'th') : bVal.localeCompare(aVal, 'th');
        }
    });

    rows.forEach(row => tbody.appendChild(row));
    filterTable();
}

function updateSortIcons(columnIndex, direction) {
    const headers = document.querySelectorAll("#mainTable thead th i");
    headers.forEach(icon => {
        icon.className = "fa-solid fa-sort text-slate-500 ml-1 group-hover:text-white opacity-50";
    });
    const activeHeader = document.querySelectorAll("#mainTable thead th")[columnIndex];
    const activeIcon = activeHeader.querySelector("i");
    activeIcon.className = direction === 'asc' ? "fa-solid fa-sort-up text-white ml-1" : "fa-solid fa-sort-down text-white ml-1";
    activeIcon.style.opacity = "1";
}

// === 🚀 Filter Table (Updated) ===
function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    
    // ❌ เอา selectedStatus ออกแล้ว
    // const selectedStatus = document.getElementById('statusFilter').value;
    
    // ✅ 1. ดึงค่าวันที่
    const startDateVal = document.getElementById('startDateFilter').value;
    const endDateVal = document.getElementById('endDateFilter').value;

    const startDate = startDateVal ? new Date(startDateVal) : null;
    if(startDate) startDate.setHours(0,0,0,0);

    const endDate = endDateVal ? new Date(endDateVal) : null;
    if(endDate) endDate.setHours(23,59,59,999); 

    const selectedLimit = document.getElementById('limitFilter').value;
    const limit = selectedLimit === 'all' ? Infinity : parseInt(selectedLimit);

    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr.table-row'); 
    
    let matchCount = 0;
    let visibleCount = 0;

    rows.forEach(row => {
        const textContent = row.innerText.toLowerCase();
        const rowCategory = row.getAttribute('data-filter-category'); 
        
        // ❌ เอา rowStatus ออกแล้ว
        // const rowStatus = row.getAttribute('data-filter-status');
        
        const rowDateStr = row.getAttribute('data-created-date');
        const rowDate = rowDateStr ? new Date(rowDateStr) : null;

        // เงื่อนไขเดิม
        const matchSearch = textContent.includes(searchText);
        const matchCategory = selectedCategory === "" || rowCategory === selectedCategory;
        
        // ❌ เอา matchStatus ออกแล้ว
        // const matchStatus = selectedStatus === "" || rowStatus === selectedStatus;

        // ✅ 3. เงื่อนไขวันที่
        let matchDate = true;
        if (rowDate) {
            if (startDate && rowDate < startDate) matchDate = false;
            if (endDate && rowDate > endDate) matchDate = false;
        }

        // ❌ ตัด matchStatus ออกจากเงื่อนไข
        if (matchSearch && matchCategory && matchDate) {
            matchCount++;
            if (visibleCount < limit) {
                row.classList.remove('hidden');
                visibleCount++;
            } else {
                row.classList.add('hidden');
            }
        } else {
            row.classList.add('hidden');
        }
    });

    // ... (ส่วนจัดการ No Results และ Footer เหมือนเดิม) ...
    const noResultsRow = document.getElementById('noResultsRow');
    const noDataRow = document.getElementById('noDataRow');
    if(noDataRow) noDataRow.classList.add('hidden');

    if (matchCount === 0 && rows.length > 0) {
        noResultsRow.classList.remove('hidden');
    } else {
        noResultsRow.classList.add('hidden');
    }

    const showingCount = document.getElementById('showingCount');
    if(showingCount) {
        showingCount.textContent = `Displaying ${visibleCount} of ${matchCount} items (from ${rows.length})`;
    }
}

// === 🔄 Sync Data ===
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

// === 🗑️ Clear Data ===
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
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    filterTable();
});