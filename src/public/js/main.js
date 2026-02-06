/**
 * main.js (Updated: Fix Status Formula & Labels)
 */

let currentSort = { column: -1, direction: 'asc' };
let currentPage = 1;

// === 🔃 Sort Table ===
function sortTable(columnIndex, type = 'text') {
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
    
    // เรียก filterTable อีกครั้งเพื่ออัปเดตหน้า Dashboard หลังเรียงลำดับ
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

// === 🚀 Filter Table & Update Dashboard ===
function filterTable(resetPage = false) {
    if (resetPage) currentPage = 1;

    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    
    // Date Filters
    const startDateVal = document.getElementById('startDateFilter').value;
    const endDateVal = document.getElementById('endDateFilter').value;
    
    // แปลงวันที่เริ่มต้น (00:00:00)
    const startDate = startDateVal ? new Date(startDateVal) : null;
    if(startDate) startDate.setHours(0,0,0,0);
    
    // แปลงวันที่สิ้นสุด (23:59:59)
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if(endDate) endDate.setHours(23,59,59,999); 

    // Pagination Settings
    const selectedLimit = document.getElementById('limitFilter').value;
    const itemsPerPage = selectedLimit === 'all' ? Infinity : parseInt(selectedLimit);
    
    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr.table-row'); 

    let matchCount = 0;
    const matchedRows = [];

    // 1. Filter Logic
    rows.forEach(row => {
        const textContent = row.innerText.toLowerCase();
        const rowCategory = row.getAttribute('data-filter-category'); 
        const rowDateStr = row.getAttribute('data-created-date');
        
        // แปลงวันที่ของแถว (เช็คว่ามีค่าหรือไม่)
        let rowDate = null;
        if (rowDateStr) {
            const d = new Date(rowDateStr);
            if (!isNaN(d)) rowDate = d;
        }

        const matchSearch = textContent.includes(searchText);
        const matchCategory = selectedCategory === "" || rowCategory === selectedCategory;
        
        // Logic วันที่: ถ้ามีการเลือกช่วงเวลา แต่แถวนั้น "ไม่มีวันที่" -> ต้องซ่อน
        let matchDate = true;
        if (startDate || endDate) {
            if (!rowDate) {
                matchDate = false; 
            } else {
                if (startDate && rowDate < startDate) matchDate = false;
                if (endDate && rowDate > endDate) matchDate = false;
            }
        }

        if (matchSearch && matchCategory && matchDate) {
            matchedRows.push(row);
        } else {
            row.classList.add('hidden');
        }
    });

    matchCount = matchedRows.length;

    // อัปเดตตัวเลข "รายการ" ให้ตรงกับที่ Filter ได้จริง
    const totalRecordsDisplay = document.getElementById('totalRecordsDisplay');
    if(totalRecordsDisplay) {
        totalRecordsDisplay.textContent = matchCount.toLocaleString(); 
    }

    // ✅ เรียกฟังก์ชันคำนวณ Dashboard ใหม่ตามข้อมูลที่กรองได้ (Real-time)
    updateDashboard(matchedRows);

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

    renderPaginationControls(totalPages);
}

// === 📊 Real-time Dashboard Update Function ===
function updateDashboard(visibleRows) {
    let countTotal = visibleRows.length;
    let countClosed = 0;
    let countActive = 0;
    let countFix = 0;
    let totalCost = 0;
    
    // ตัวแปรสำหรับกราฟ (12 เดือน)
    let monthlyStats = new Array(12).fill(0);
    let monthlyCosts = new Array(12).fill(0);
    let catMap = {};

    visibleRows.forEach(row => {
        // ดึงข้อมูลจาก Data Attribute
        const status = row.getAttribute('data-filter-status') || '';
        const cost = parseFloat(row.getAttribute('data-cost')) || 0;
        const dateStr = row.getAttribute('data-created-date');
        const catLabel = row.getAttribute('data-category-label') || 'Other';

        // นับสถานะ
        if (['closed', 'เสร็จสิ้น', 'เรียบร้อย'].includes(status)) {
            countClosed++;
        } else if (!['cancelled', 'ยกเลิก', 'cancel'].includes(status)) {
            // ✅ ปรับปรุง: ถ้าเป็น 'fix' ไม่นับเป็น Active (จะไปรวมใน Fix แทน)
            if (status !== 'fix') {
                countActive++;
            }
        }

        // รวมค่าใช้จ่าย
        totalCost += cost;

        // ข้อมูลกราฟรายเดือน
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const monthIdx = d.getMonth(); // 0-11
                if(monthIdx >= 0 && monthIdx < 12) {
                    monthlyStats[monthIdx]++;
                    monthlyCosts[monthIdx] += cost;
                }
            }
        }

        // ข้อมูลกราฟหมวดหมู่
        catMap[catLabel] = (catMap[catLabel] || 0) + 1;
    });

    // ✅ สูตรใหม่: Fix = TOTAL - CLOSED - ACTIVE
    countFix = countTotal - countClosed - countActive;

    // 1. อัปเดตตัวเลขหน้าจอ (Dashboard Stats)
    if(document.getElementById('dashDisplayTotal')) 
        document.getElementById('dashDisplayTotal').innerText = countTotal.toLocaleString();
    
    if(document.getElementById('dashDisplayClosed')) 
        document.getElementById('dashDisplayClosed').innerText = countClosed.toLocaleString();
    
    if(document.getElementById('dashDisplayActive')) 
        document.getElementById('dashDisplayActive').innerText = countActive.toLocaleString();

    // ✅ อัปเดตตัวเลข Fix
    if(document.getElementById('dashDisplayFix')) 
        document.getElementById('dashDisplayFix').innerText = countFix.toLocaleString();
    
    if(document.getElementById('dashDisplayCost')) 
        document.getElementById('dashDisplayCost').innerText = '฿' + totalCost.toLocaleString('th-TH', {maximumFractionDigits: 0});

    const elRate = document.getElementById('dashDisplaySuccessRate');
    if(elRate) {
        const rate = countTotal > 0 ? (countClosed / countTotal) * 100 : 0;
        // ✅ เปลี่ยนคำว่า Success เป็น สำเร็จ
        elRate.innerText = `${rate.toFixed(0)}% สำเร็จ`;
    }

    // 2. อัปเดต Combined Chart (แท่ง/เส้น)
    if (window.combinedChart) {
        window.combinedChart.data.datasets[0].data = monthlyStats;
        window.combinedChart.data.datasets[1].data = monthlyCosts;
        window.combinedChart.update();
    }

    // 3. อัปเดต Category Chart (โดนัท)
    if (window.categoryChart) {
        const sortedCats = Object.entries(catMap).sort(([,a], [,b]) => b - a);
        const labels = sortedCats.map(([k]) => k);
        const counts = sortedCats.map(([,v]) => {
            // คำนวณเป็น % สำหรับกราฟ Doughnut
            return countTotal > 0 ? ((v / countTotal) * 100).toFixed(2) : 0;
        });

        window.categoryChart.data.labels = labels;
        window.categoryChart.data.datasets[0].data = counts;
        window.categoryChart.update();
    }
}

// ✅ วาดปุ่ม Pagination
function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

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
    // เรียกใช้ครั้งแรกเพื่ออัปเดต Dashboard ทันที
    filterTable(true);
});