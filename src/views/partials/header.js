<div class="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
    <div>
        <div class="flex items-center gap-3 mb-1">
            <div class="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                <i class="fa-solid fa-server text-xl"></i>
            </div>
            <h1 class="text-2xl font-bold text-slate-800 tracking-tight">IT Helpdesk Logs</h1>
        </div>
        <p class="text-sm text-slate-500 ml-1">ระบบข้อมูลย้อนหลัง (Legacy Data Management)</p>
    </div>
    
    <div class="flex gap-3">
        <button id="btnClear" onclick="clearData()" 
            class="group bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-medium py-2.5 px-5 rounded-lg shadow-sm border border-red-200 hover:border-red-300 transition-all duration-200 flex items-center gap-2">
            <i class="fa-solid fa-trash-can"></i>
            <span>Clear Data</span>
        </button>

        <button id="btnSync" onclick="syncData()" 
            class="group bg-slate-800 hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 border border-transparent hover:border-blue-500">
            <i class="fa-solid fa-rotate group-hover:animate-spin"></i>
            <span>Sync Data</span>
        </button>
    </div>
</div>