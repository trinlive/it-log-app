/**
 * main.js
 * จัดการ Logic การ Filter ตาราง และการ Sync ข้อมูล
 */

// === 🚀 Logic Filter Table ===
function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    const selectedStatus = document.getElementById('statusFilter').value;

    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.querySelectorAll('tr.table-row'); 
    let visibleCount = 0;

    rows.forEach(row => {
        // ดึงค่าจาก attribute ที่เราฝังไว้ใน tr
        const textContent = row.innerText.toLowerCase();
        const rowCategory = row.getAttribute('data-filter-category'); 
        const rowStatus = row.getAttribute('data-filter-status');

        // ตรวจสอบเงื่อนไข
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

    // จัดการหน้าจอ "ไม่พบข้อมูล" (Empty State)
    const noResultsRow = document.getElementById('noResultsRow');
    const noDataRow = document.getElementById('noDataRow');
    
    // ถ้ามีการ Filter ให้ซ่อน row "ไม่มีข้อมูลใน Database" ไปก่อน
    if(noDataRow) noDataRow.classList.add('hidden');

    // ถ้า Filter แล้วไม่เจออะไรเลย ให้โชว์หน้า No Results
    if (visibleCount === 0 && rows.length > 0) {
        noResultsRow.classList.remove('hidden');
    } else {
        noResultsRow.classList.add('hidden');
    }

    // อัปเดตตัวเลขที่ Footer
    const showingCount = document.getElementById('showingCount');
    if(showingCount) {
        showingCount.textContent = `Displaying ${visibleCount} of ${rows.length} items`;
    }
}

// === 🔄 Logic Sync Data ===
async function syncData() {
    const btn = document.getElementById('btnSync');
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span');
    
    // Loading State
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    icon.classList.remove('fa-rotate');
    icon.classList.add('fa-circle-notch', 'animate-spin');
    text.textContent = 'Syncing...';

    try {
        const res = await fetch('/api/sync');
        const data = await res.json();
        
        if(res.ok) {
            await Swal.fire({
                title: 'Sync Completed!',
                text: `Updated ${data.total_records} records successfully.`,
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
            title: 'Sync Failed',
            text: err.message,
            icon: 'error',
            confirmButtonColor: '#dc2626'
        });
    } finally {
        // Reset State
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        icon.classList.remove('fa-circle-notch', 'animate-spin');
        icon.classList.add('fa-rotate');
        text.textContent = 'Sync Data';
    }
}