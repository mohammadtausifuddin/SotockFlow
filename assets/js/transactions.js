/**
 * StockFlow - Transactions History Module
 * Full audit log of all STOCK_IN and STOCK_OUT movements with filtering, sorting, details modal, and CSV export.
 */

const TransactionsModule = {
    currentPage: 1,
    pageSize: 10,
    searchQuery: '',
    typeFilter: '',
    productFilter: '',
    startDate: '',
    endDate: '',
    sortBy: 'date-desc',

    init() {
        this.populateDropdowns();
        this.bindEvents();
        this.renderTable();
    },

    /**
     * Populate filter dropdowns
     */
    populateDropdowns() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const prodSelect = document.getElementById('filter-txn-product');
        if (prodSelect) {
            prodSelect.innerHTML = `<option value="">All Products</option>` +
                products.map(p => `<option value="${p.id}">${Utils.sanitizeHTML(p.name)} (${p.sku})</option>`).join('');
        }
    },

    /**
     * Get processed transactions based on search, filters, and sort
     */
    getFilteredTransactions() {
        let transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);

        // Search by Product name, SKU, Reference No, Transaction ID, Customer or Supplier
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            transactions = transactions.filter(t =>
                (t.id && t.id.toLowerCase().includes(q)) ||
                (t.productName && t.productName.toLowerCase().includes(q)) ||
                (t.sku && t.sku.toLowerCase().includes(q)) ||
                (t.referenceNo && t.referenceNo.toLowerCase().includes(q)) ||
                (t.customerName && t.customerName.toLowerCase().includes(q)) ||
                (t.supplierName && t.supplierName.toLowerCase().includes(q))
            );
        }

        // Type filter (STOCK_IN or STOCK_OUT)
        if (this.typeFilter) {
            transactions = transactions.filter(t => t.type === this.typeFilter);
        }

        // Product filter
        if (this.productFilter) {
            transactions = transactions.filter(t => t.productId === this.productFilter);
        }

        // Date range filters
        if (this.startDate) {
            transactions = transactions.filter(t => t.date && t.date.slice(0, 10) >= this.startDate);
        }
        if (this.endDate) {
            transactions = transactions.filter(t => t.date && t.date.slice(0, 10) <= this.endDate);
        }

        // Sorting
        transactions.sort((a, b) => {
            switch (this.sortBy) {
                case 'date-desc':
                    return new Date(b.date || 0) - new Date(a.date || 0);
                case 'date-asc':
                    return new Date(a.date || 0) - new Date(b.date || 0);
                case 'amount-desc':
                    return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
                case 'amount-asc':
                    return (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0);
                case 'qty-desc':
                    return (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
                default:
                    return 0;
            }
        });

        return transactions;
    },

    /**
     * Render the table
     */
    renderTable() {
        const tbody = document.getElementById('transactions-table-body');
        if (!tbody) return;

        const filtered = this.getFilteredTransactions();
        const pagination = Utils.paginate(filtered, this.currentPage, this.pageSize);
        this.currentPage = pagination.currentPage;

        const countEl = document.getElementById('transactions-count');
        if (countEl) countEl.textContent = filtered.length;

        if (pagination.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="px-6 py-12 text-center text-slate-500">
                        <div class="empty-state">
                            <i data-lucide="history" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                            <p class="text-sm font-semibold text-slate-700">No transactions match your search</p>
                            <p class="text-xs text-slate-400 mt-1">Try resetting filters or record a stock intake or sale.</p>
                        </div>
                    </td>
                </tr>
            `;
            Utils.renderPaginationControls('transactions-pagination', pagination, (p) => {
                this.currentPage = p;
                this.renderTable();
            });
            App.refreshIcons();
            return;
        }

        tbody.innerHTML = pagination.items.map(t => {
            const isStockIn = t.type === 'STOCK_IN';
            const typeBadge = isStockIn
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                     <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Stock In
                   </span>`
                : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                     <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Stock Out
                   </span>`;

            const partyName = isStockIn ? (t.supplierName || 'Direct Vendor') : (t.customerName || 'Walk-in');

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs text-slate-700">
                    <td class="px-4 py-3 font-mono font-medium text-slate-500">${t.id}</td>
                    <td class="px-4 py-3 text-slate-500 whitespace-nowrap">${Utils.formatDate(t.date, true)}</td>
                    <td class="px-4 py-3">
                        <span class="font-semibold text-slate-900 block truncate max-w-xs">${Utils.sanitizeHTML(t.productName)}</span>
                        <span class="text-[10px] text-slate-400 font-mono">${partyName}</span>
                    </td>
                    <td class="px-4 py-3 font-mono font-medium text-indigo-600">${t.sku}</td>
                    <td class="px-4 py-3">${typeBadge}</td>
                    <td class="px-4 py-3 font-bold text-right ${isStockIn ? 'text-emerald-600' : 'text-slate-900'}">
                        ${isStockIn ? '+' : '-'}${t.quantity}
                    </td>
                    <td class="px-4 py-3 font-mono text-right text-slate-600">${Utils.formatCurrency(t.unitPrice)}</td>
                    <td class="px-4 py-3 font-mono font-bold text-right text-slate-900">${Utils.formatCurrency(t.totalAmount)}</td>
                    <td class="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">${t.referenceNo || '-'}</td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                        <button type="button" onclick="TransactionsModule.viewTransaction('${t.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Transaction Details">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        Utils.renderPaginationControls('transactions-pagination', pagination, (p) => {
            this.currentPage = p;
            this.renderTable();
        });

        App.refreshIcons();
    },

    /**
     * Bind filters, search, and page size controls
     */
    bindEvents() {
        const searchInput = document.getElementById('txn-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const typeSelect = document.getElementById('filter-txn-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.typeFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const prodSelect = document.getElementById('filter-txn-product');
        if (prodSelect) {
            prodSelect.addEventListener('change', (e) => {
                this.productFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const startInput = document.getElementById('filter-start-date');
        if (startInput) {
            startInput.addEventListener('change', (e) => {
                this.startDate = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const endInput = document.getElementById('filter-end-date');
        if (endInput) {
            endInput.addEventListener('change', (e) => {
                this.endDate = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const sortSelect = document.getElementById('sort-transactions');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderTable();
            });
        }

        const pageSizeSelect = document.getElementById('page-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value, 10);
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const resetBtn = document.getElementById('reset-txn-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.searchQuery = '';
                this.typeFilter = '';
                this.productFilter = '';
                this.startDate = '';
                this.endDate = '';
                this.sortBy = 'date-desc';

                if (searchInput) searchInput.value = '';
                if (typeSelect) typeSelect.value = '';
                if (prodSelect) prodSelect.value = '';
                if (startInput) startInput.value = '';
                if (endInput) endInput.value = '';
                if (sortSelect) sortSelect.value = 'date-desc';

                this.currentPage = 1;
                this.renderTable();
                Utils.showToast('Filters reset', 'info');
            });
        }

        const exportBtn = document.getElementById('export-transactions-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }
    },

    /**
     * View detailed receipt of transaction in modal
     */
    viewTransaction(id) {
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const txn = transactions.find(t => t.id === id);
        if (!txn) return;

        const isStockIn = txn.type === 'STOCK_IN';
        const modalContent = document.getElementById('view-txn-content');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="space-y-4 text-xs">
                <!-- Header Receipt Style -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                        <span class="text-slate-400 block text-[11px]">Transaction ID</span>
                        <span class="font-mono font-bold text-slate-900 text-sm">${txn.id}</span>
                        <span class="text-slate-500 block text-[11px] mt-0.5">Ref / Invoice: ${txn.referenceNo || 'None'}</span>
                    </div>
                    <div class="text-right">
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            isStockIn ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                        }">
                            ${isStockIn ? 'STOCK REPLENISHMENT (IN)' : 'STOCK SALE / OUTFLOW'}
                        </span>
                        <span class="text-slate-400 block text-[11px] mt-1">${Utils.formatDate(txn.date, true)}</span>
                    </div>
                </div>

                <!-- Product Details -->
                <div class="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Product</span>
                            <span class="font-bold text-slate-900 text-sm">${Utils.sanitizeHTML(txn.productName)}</span>
                            <span class="font-mono text-slate-500 text-xs">SKU: ${txn.sku}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-slate-400 block text-[10px] uppercase font-semibold">${isStockIn ? 'Supplier / Source' : 'Customer'}</span>
                            <span class="font-semibold text-slate-800 text-xs">${Utils.sanitizeHTML(isStockIn ? (txn.supplierName || 'Direct Vendor') : (txn.customerName || 'Retail Customer'))}</span>
                        </div>
                    </div>
                </div>

                <!-- Breakdown Calculation -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-mono">
                    <div class="flex justify-between text-slate-600">
                        <span>Quantity Moved:</span>
                        <span class="font-bold text-slate-900">${txn.quantity} units</span>
                    </div>
                    <div class="flex justify-between text-slate-600">
                        <span>Unit ${isStockIn ? 'Purchase' : 'Sale'} Price:</span>
                        <span class="text-slate-900">${Utils.formatCurrency(txn.unitPrice)}</span>
                    </div>
                    ${!isStockIn && txn.grossProfit !== undefined ? `
                        <div class="flex justify-between text-emerald-600">
                            <span>Estimated Gross Profit:</span>
                            <span class="font-bold">${Utils.formatCurrency(txn.grossProfit)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                        <span>Total Transaction Amount:</span>
                        <span class="text-indigo-600">${Utils.formatCurrency(txn.totalAmount)}</span>
                    </div>
                </div>

                <!-- Notes / Remarks -->
                <div class="p-3 bg-slate-50 rounded-lg">
                    <span class="text-slate-400 block text-[11px] mb-1">Notes / Remarks</span>
                    <p class="text-slate-700 leading-relaxed">${Utils.sanitizeHTML(txn.notes || 'No remarks entered')}</p>
                </div>

                <div class="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <i data-lucide="info" class="w-4 h-4 flex-shrink-0 text-amber-600"></i>
                    <span>This transaction is a permanent audit record. Historical entries maintain accounting integrity.</span>
                </div>
            </div>
        `;

        Utils.openModal('view-txn-modal');
        App.refreshIcons();
    },

    /**
     * Export Transactions to CSV
     */
    exportCSV() {
        const transactions = this.getFilteredTransactions();
        const headers = [
            { label: 'Transaction ID', key: 'id' },
            { label: 'Date', key: 'date' },
            { label: 'Type', key: 'type' },
            { label: 'Product Name', key: 'productName' },
            { label: 'SKU', key: 'sku' },
            { label: 'Party (Supplier/Customer)', key: 'party' },
            { label: 'Quantity', key: 'quantity' },
            { label: 'Unit Price', key: 'unitPrice' },
            { label: 'Total Amount', key: 'totalAmount' },
            { label: 'Gross Profit', key: 'grossProfit' },
            { label: 'Reference Number', key: 'referenceNo' },
            { label: 'Notes', key: 'notes' }
        ];

        const rows = transactions.map(t => ({
            id: t.id,
            date: Utils.formatDate(t.date, true),
            type: t.type,
            productName: t.productName,
            sku: t.sku,
            party: t.type === 'STOCK_IN' ? (t.supplierName || 'Direct Vendor') : (t.customerName || 'Retail Customer'),
            quantity: t.quantity,
            unitPrice: t.unitPrice,
            totalAmount: t.totalAmount,
            grossProfit: t.grossProfit !== undefined ? t.grossProfit : 'N/A',
            referenceNo: t.referenceNo || '',
            notes: t.notes || ''
        }));

        Utils.exportToCSV('StockFlow_Transactions', headers, rows);
    }
};

if (typeof window !== 'undefined') {
    window.TransactionsModule = TransactionsModule;
}
