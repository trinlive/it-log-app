/**
 * main.js (Updated: Grouping Chart Logic - Merge Server & Dev)
 */

let currentSort = { column: -1, direction: 'asc' };
let currentPage = 1;

function sortTable(columnIndex, type = 'text') {
    const tbody = document.getElementById("tableBody");
    const rows = Array.from(tbody.querySelectorAll("tr.table-row"));
    let direction = 'asc';
    if (currentSort.column === columnIndex && currentSort.direction === 'asc') direction = 'desc';
    currentSort = { column: columnIndex, direction: direction };
    updateSortIcons(columnIndex, direction);
    rows.sort((a, b) => {
        let aVal = a.children[columnIndex].getAttribute('data-sort') || '';
        let bVal = b.children[columnIndex].getAttribute('data-sort') || '';
        if (type === 'number') return direction === 'asc' ? parseFloat(aVal) - parseFloat(bVal) : parseFloat(bVal) - parseFloat(aVal);
        else if (type === 'date') {
            let dateA = new Date(aVal || 0);
            let dateB = new Date(bVal || 0);
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else return direction === 'asc' ? aVal.localeCompare(bVal, 'th') : bVal.localeCompare(aVal, 'th');
    });
    rows.forEach(row => tbody.appendChild(row));
    currentPage = 1;
    filterTable(); 
}

function updateSortIcons(columnIndex, direction) {
    const headers = document.querySelectorAll("#mainTable thead th i");
    headers.forEach(icon => icon.className = "fa-solid fa-sort text-slate-500 ml-1 group-hover:text-white opacity-50");
    const activeHeader = document.querySelectorAll("#mainTable thead th")[columnIndex];
    const activeIcon = activeHeader.querySelector("i");
    activeIcon.className = direction === 'asc' ? "fa-solid fa-sort-up text-white ml-1" : "fa-solid fa-sort-down text-white ml-1";
    activeIcon.style.opacity = "1";
}

function filterTable(resetPage = false) {
    if (resetPage) currentPage = 1;
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    const startDateVal = document.getElementById('startDateFilter').value;
    const endDateVal = document.getElementById('endDateFilter').value;
    const startDate = startDateVal ? new Date(startDateVal) : null;
    if(startDate) startDate.setHours(0,0,0,0);
    const endDate = endDateVal ? new Date(endDateVal) : null;
    if(endDate) endDate.setHours(23,59,59,999); 
    const selectedLimit = document.getElementById('limitFilter').value;
    const itemsPerPage = selectedLimit === 'all' ? Infinity : parseInt(selectedLimit);
    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr.table-row'); 

    let matchCount = 0;
    const matchedRows = [];

    rows.forEach(row => {
        const textContent = row.innerText.toLowerCase();
        const rowCategory = row.getAttribute('data-filter-category'); 
        const rowDateStr = row.getAttribute('data-created-date');
        let rowDate = null;
        if (rowDateStr) { const d = new Date(rowDateStr); if (!isNaN(d)) rowDate = d; }

        const matchSearch = textContent.includes(searchText);
        const matchCategory = selectedCategory === "" || rowCategory === selectedCategory;
        
        let matchDate = true;
        if (startDate || endDate) {
            if (!rowDate) matchDate = false; 
            else {
                if (startDate && rowDate < startDate) matchDate = false;
                if (endDate && rowDate > endDate) matchDate = false;
            }
        }
        if (matchSearch && matchCategory && matchDate) matchedRows.push(row);
        else row.classList.add('hidden');
    });

    matchCount = matchedRows.length;
    const totalRecordsDisplay = document.getElementById('totalRecordsDisplay');
    if(totalRecordsDisplay) totalRecordsDisplay.textContent = matchCount.toLocaleString(); 
    
    updateDashboard(matchedRows);

    const totalPages = Math.ceil(matchCount / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    matchedRows.forEach((row, index) => {
        if (index >= startIndex && index < endIndex) row.classList.remove('hidden');
        else row.classList.add('hidden');
    });

    const noResultsRow = document.getElementById('noResultsRow');
    const noDataRow = document.getElementById('noDataRow');
    if(noDataRow) noDataRow.classList.add('hidden');
    if (matchCount === 0 && rows.length > 0) noResultsRow.classList.remove('hidden');
    else noResultsRow.classList.add('hidden');

    renderPaginationControls(totalPages);
}

// 🛠️ ฟังก์ชันช่วยจัดกลุ่ม (Grouping Helper) - รวม Server & Dev
function getCategoryGroup(categoryLabelCode) {
    if (!categoryLabelCode) return 'Other (อื่นๆ)';
    const cat = categoryLabelCode.trim();
    
    // 1. Server System Development (Server + Dev)
    if (cat === 'helpdesk.server' || cat.startsWith('dev.')) {
        return 'Server System Development (พัฒนาระบบคอมพิวเตอร์แม่ข่าย)';
    }

    // 2. Service (Meeting)
    if (cat.startsWith('meeting.')) return 'Service (กลุ่มงานบริการ)';

    // 3. CCTV
    if (cat.startsWith('cctv.')) return 'CCTV (งานกล้องวงจรปิด)';

    // 4. Permission
    if (cat.startsWith('permission.') || cat.startsWith('permisssion.')) return 'Permission (การจัดการสิทธิ์)';
    
    // 5. Helpdesk (ทั่วไป) - เช็คสุดท้าย
    if (cat.startsWith('helpdesk.')) return 'Helpdesk (งานสนับสนุน)';
    
    return 'Other (อื่นๆ)';
}

function updateDashboard(visibleRows) {
    let countTotal = visibleRows.length;
    let countClosed = 0;
    let countActive = 0;
    let countFix = 0;
    let totalCost = 0;
    
    let monthlyStats = new Array(12).fill(0);
    let monthlyCosts = new Array(12).fill(0);
    let catMap = {};

    visibleRows.forEach(row => {
        const status = row.getAttribute('data-filter-status') || '';
        const cost = parseFloat(row.getAttribute('data-cost')) || 0;
        const dateStr = row.getAttribute('data-created-date');
        const catLabelCode = row.getAttribute('data-category-label') || ''; 

        if (['closed', 'เสร็จสิ้น', 'เรียบร้อย'].includes(status)) {
            countClosed++;
        } else if (!['cancelled', 'ยกเลิก', 'cancel'].includes(status)) {
            if (status !== 'fix') countActive++;
        }

        totalCost += cost;

        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const monthIdx = d.getMonth();
                if(monthIdx >= 0 && monthIdx < 12) {
                    monthlyStats[monthIdx]++;
                    monthlyCosts[monthIdx] += cost;
                }
            }
        }

        // ✅ เรียกใช้ฟังก์ชันจัดกลุ่มใหม่
        const groupName = getCategoryGroup(catLabelCode);
        catMap[groupName] = (catMap[groupName] || 0) + 1;
    });

    countFix = countTotal - countClosed - countActive;

    if(document.getElementById('dashDisplayTotal')) document.getElementById('dashDisplayTotal').innerText = countTotal.toLocaleString();
    if(document.getElementById('dashDisplayClosed')) document.getElementById('dashDisplayClosed').innerText = countClosed.toLocaleString();
    if(document.getElementById('dashDisplayActive')) document.getElementById('dashDisplayActive').innerText = countActive.toLocaleString();
    if(document.getElementById('dashDisplayFix')) document.getElementById('dashDisplayFix').innerText = countFix.toLocaleString();
    if(document.getElementById('dashDisplayCost')) document.getElementById('dashDisplayCost').innerText = '฿' + totalCost.toLocaleString('th-TH', {maximumFractionDigits: 0});

    const elRate = document.getElementById('dashDisplaySuccessRate');
    if(elRate) {
        const rate = countTotal > 0 ? (countClosed / countTotal) * 100 : 0;
        elRate.innerText = `${rate.toFixed(0)}% สำเร็จ`;
    }

    if (window.combinedChart) {
        window.combinedChart.data.datasets[0].data = monthlyStats;
        window.combinedChart.data.datasets[1].data = monthlyCosts;
        window.combinedChart.update();
    }

    if (window.categoryChart) {
        const sortedCats = Object.entries(catMap).sort(([,a], [,b]) => b - a);
        const labels = sortedCats.map(([k]) => k);
        const counts = sortedCats.map(([,v]) => {
            return countTotal > 0 ? ((v / countTotal) * 100).toFixed(2) : 0;
        });

        window.categoryChart.data.labels = labels;
        window.categoryChart.data.datasets[0].data = counts;
        window.categoryChart.update();
    }
}

function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
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
        </div>`;
    paginationContainer.innerHTML = html;
}
function changePage(newPage) { currentPage = newPage; filterTable(false); }
async function syncData() {
    Swal.fire({ title: 'กำลัง Sync ข้อมูล...', html: 'ระบบกำลังดึงข้อมูลจาก Server เก่า<br>กรุณารอสักครู่ ห้ามปิดหน้าต่างนี้', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    try {
        const res = await fetch('/api/sync');
        const data = await res.json();
        if(res.ok) { await Swal.fire({ title: 'Sync เสร็จสิ้น!', text: `ดึงข้อมูลมาทั้งหมด ${data.total_records} รายการ`, icon: 'success', timer: 2000, timerProgressBar: true }); location.reload(); } 
        else { throw new Error(data.message || 'Error syncing'); }
    } catch (err) { Swal.fire({ title: 'Sync ล้มเหลว', text: err.message, icon: 'error', confirmButtonColor: '#dc2626' }); }
}
async function clearData() {
    const result = await Swal.fire({ title: 'ยืนยันการลบข้อมูล?', text: "ข้อมูลทั้งหมดใน Database จะหายไป! (ใช้สำหรับทดสอบเท่านั้น)", icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'ใช่, ลบทั้งหมด!', cancelButtonText: 'ยกเลิก' });
    if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const res = await fetch('/api/clear', { method: 'POST' });
            const data = await res.json();
            if (res.ok) { await Swal.fire({ title: 'ลบข้อมูลเรียบร้อย!', icon: 'success', timer: 1500, showConfirmButton: false }); location.reload(); } 
            else { throw new Error(data.message); }
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    }
}
document.addEventListener('DOMContentLoaded', () => { filterTable(true); });