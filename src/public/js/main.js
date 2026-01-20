/**
 * main.js (Updated: Pagination in Top Filter Bar)
 */

let currentSort = { column: -1, direction: 'asc' };
let currentPage = 1;

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
    currentPage = 1;
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

// === 🚀 Filter Table & Pagination Logic ===
function filterTable(resetPage = false) {
    if (resetPage) currentPage = 1;

    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    
    // Date Filters
    const startDateVal = document.getElementById('startDateFilter').value;
    const endDateVal = document.getElementById('endDateFilter').value;
    const startDate = startDateVal ? new Date(startDateVal) : null;
    if(startDate) startDate.setHours(0,0,0,0);
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if(endDate) endDate.setHours(23,59,59,999); 

    // Pagination Settings
    const selectedLimit = document.getElementById('limitFilter').value;
    const itemsPerPage = selectedLimit === 'all' ? Infinity : parseInt(selectedLimit);
    
    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr.table-row'); 
    
    // ✅ อัปเดต Total Records (จำนวนทั้งหมดในระบบที่โหลดมา)
    const totalRecordsDisplay = document.getElementById('totalRecordsDisplay');
    if(totalRecordsDisplay) {
        // ใช้ toLocaleString ให้มีลูกน้ำคั่น (เช่น 1,250)
        totalRecordsDisplay.textContent = rows.length.toLocaleString(); 
    }

    let matchCount = 0;
    const matchedRows = [];

    // 1. Filter Logic
    rows.forEach(row => {
        const textContent = row.innerText.toLowerCase();
        const rowCategory = row.getAttribute('data-filter-category'); 
        const rowDateStr = row.getAttribute('data-created-date');
        const rowDate = rowDateStr ? new Date(rowDateStr) : null;

        const matchSearch = textContent.includes(searchText);
        const matchCategory = selectedCategory === "" || rowCategory === selectedCategory;
        
        let matchDate = true;
        if (rowDate) {
            if (startDate && rowDate < startDate) matchDate = false;
            if (endDate && rowDate > endDate) matchDate = false;
        }

        if (matchSearch && matchCategory && matchDate) {
            matchedRows.push(row);
        } else {
            row.classList.add('hidden');
        }
    });

    matchCount = matchedRows.length;

    // 2. Pagination Calculation
    const totalPages = Math.ceil(matchCount / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // 3. Show/Hide based on page
    matchedRows.forEach((row, index) => {
        if (index >= startIndex && index < endIndex) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });

    // 4. No Results Handling
    const noResultsRow = document.getElementById('noResultsRow');
    const noDataRow = document.getElementById('noDataRow');
    if(noDataRow) noDataRow.classList.add('hidden');

    if (matchCount === 0 && rows.length > 0) {
        noResultsRow.classList.remove('hidden');
    } else {
        noResultsRow.classList.add('hidden');
    }

    // 5. Render Controls
    renderPaginationControls(totalPages);
}

// ✅ วาดปุ่ม Pagination ในตำแหน่งใหม่ (ข้างบน)
function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    // ถ้ามีหน้าเดียว หรือไม่มีข้อมูล ไม่ต้องโชว์ปุ่มกด
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = `
        <div class="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5">
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors">
                <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            
            <span class="text-[10px] text-slate-600 font-semibold px-2 min-w-[50px] text-center select-none">
                ${currentPage} / ${totalPages}
            </span>

            <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} 
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
        </div>
    `;

    paginationContainer.innerHTML = html;
}

function changePage(newPage) {
    currentPage = newPage;
    filterTable(false);
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
    filterTable(true);
});