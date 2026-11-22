/**
 * StockFlow - Reports Module
 * Generates 7 dynamic business intelligence reports with date filters, summary KPIs, printable views, and CSV exports.
 */

const ReportsModule = {
    activeReport: 'inventory',
    startDate: '',
    endDate: '',
    categoryFilter: '',
    productFilter: '',
    searchQuery: '',

    init() {
        this.populateDropdowns();
        this.bindEvents();
        this.renderActiveReport();
    },

    /**
     * Populate filter dropdowns
     */
    populateDropdowns() {
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);

        const catSelect = document.getElementById('report-category-filter');
        if (catSelect) {
            catSelect.innerHTML = `<option value="">All Categories</option>` +
                categories.map(c => `<option value="${c.id}">${Utils.sanitizeHTML(c.name)}</option>`).join('');
        }

        const prodSelect = document.getElementById('report-product-filter');
        if (prodSelect) {
            prodSelect.innerHTML = `<option value="">All Products</option>` +
                products.map(p => `<option value="${p.id}">${Utils.sanitizeHTML(p.name)} (${p.sku})</option>`).join('');
        }
    },

    /**
     * Switch active report tab
     */
    setReport(type) {
        this.activeReport = type;

        // Update tab styling
        document.querySelectorAll('.report-tab-btn').forEach(btn => {
            const btnType = btn.getAttribute('data-report');
            if (btnType === type) {
                btn.className = 'report-tab-btn px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-sm transition-all flex items-center gap-2';
            } else {
                btn.className = 'report-tab-btn px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-2';
            }
        });

        // Toggle Date filter visibility (category & low-stock reports don't strictly require date range, but transactions do)
        const dateFilterGroup = document.getElementById('report-date-filters');
        if (dateFilterGroup) {
            if (['inventory', 'low-stock'].includes(type)) {
                dateFilterGroup.classList.add('opacity-40', 'pointer-events-none');
            } else {
                dateFilterGroup.classList.remove('opacity-40', 'pointer-events-none');
            }
        }

        this.renderActiveReport();
    },

    /**
     * Render the currently selected report
     */
    renderActiveReport() {
        switch (this.activeReport) {
            case 'inventory':
                this.renderInventoryReport();
                break;
            case 'sales':
                this.renderSalesReport();
                break;
            case 'stock-in':
                this.renderStockInReport();
                break;
            case 'stock-out':
                this.renderStockOutReport();
                break;
            case 'low-stock':
                this.renderLowStockReport();
                break;
            case 'category':
                this.renderCategoryReport();
                break;
            case 'supplier':
                this.renderSupplierReport();
                break;
            default:
                this.renderInventoryReport();
        }
    },

    /**
     * Report 1: Inventory Valuation Report
     */
    renderInventoryReport() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
        const supMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

        let filtered = products;

        if (this.categoryFilter) {
            filtered = filtered.filter(p => p.categoryId === this.categoryFilter);
        }
        if (this.productFilter) {
            filtered = filtered.filter(p => p.id === this.productFilter);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        }

        const totalItems = filtered.length;
        const totalStockUnits = filtered.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0);
        const totalCostValue = filtered.reduce((acc, p) => acc + ((Number(p.currentStock) || 0) * (Number(p.purchasePrice) || 0)), 0);
        const totalSalesValue = filtered.reduce((acc, p) => acc + ((Number(p.currentStock) || 0) * (Number(p.sellingPrice) || 0)), 0);
        const potentialGrossProfit = totalSalesValue - totalCostValue;

        // Render KPI summary cards
        this.renderKPICards([
            { label: 'Catalog Products', value: totalItems.toLocaleString(), icon: 'package' },
            { label: 'Total Units in Stock', value: totalStockUnits.toLocaleString(), icon: 'boxes' },
            { label: 'Total Inventory Valuation', value: Utils.formatCurrency(totalCostValue), icon: 'coins', highlight: true },
            { label: 'Potential Gross Profit', value: Utils.formatCurrency(potentialGrossProfit), icon: 'trending-up' }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Product</th>
                <th class="px-4 py-3 text-left">SKU</th>
                <th class="px-4 py-3 text-left">Category</th>
                <th class="px-4 py-3 text-left">Supplier</th>
                <th class="px-4 py-3 text-right">Stock</th>
                <th class="px-4 py-3 text-right">Purchase Price</th>
                <th class="px-4 py-3 text-right">Selling Price</th>
                <th class="px-4 py-3 text-right">Inventory Valuation</th>
            </tr>
        `;

        const rows = filtered.map(p => {
            const costVal = (Number(p.currentStock) || 0) * (Number(p.purchasePrice) || 0);
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                    <td class="px-4 py-3 font-semibold text-slate-900">${Utils.sanitizeHTML(p.name)}</td>
                    <td class="px-4 py-3 font-mono text-indigo-600">${p.sku}</td>
                    <td class="px-4 py-3">${Utils.sanitizeHTML(catMap[p.categoryId] || 'Unassigned')}</td>
                    <td class="px-4 py-3 max-w-[150px] truncate">${Utils.sanitizeHTML(supMap[p.supplierId] || 'Unassigned')}</td>
                    <td class="px-4 py-3 text-right font-bold text-slate-900">${p.currentStock} ${p.unit || 'units'}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-600">${Utils.formatCurrency(p.purchasePrice)}</td>
                    <td class="px-4 py-3 text-right font-mono text-slate-900">${Utils.formatCurrency(p.sellingPrice)}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">${Utils.formatCurrency(costVal)}</td>
                </tr>
            `;
        }).join('');

        this.setTableContent('Inventory Valuation Report', thead, rows, filtered.length);
    },

    /**
     * Report 2: Sales & Profit Report
     */
    renderSalesReport() {
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        let sales = transactions.filter(t => t.type === 'STOCK_OUT');

        if (this.startDate) {
            sales = sales.filter(s => s.date && s.date.slice(0, 10) >= this.startDate);
        }
        if (this.endDate) {
            sales = sales.filter(s => s.date && s.date.slice(0, 10) <= this.endDate);
        }
        if (this.productFilter) {
            sales = sales.filter(s => s.productId === this.productFilter);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            sales = sales.filter(s => (s.productName && s.productName.toLowerCase().includes(q)) || (s.customerName && s.customerName.toLowerCase().includes(q)));
        }

        const totalOrders = sales.length;
        const totalUnitsSold = sales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
        const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
        const totalGrossProfit = sales.reduce((acc, s) => acc + (Number(s.grossProfit) || 0), 0);

        this.renderKPICards([
            { label: 'Completed Sales Orders', value: totalOrders.toLocaleString(), icon: 'shopping-cart' },
            { label: 'Total Units Sold', value: totalUnitsSold.toLocaleString(), icon: 'boxes' },
            { label: 'Total Sales Revenue', value: Utils.formatCurrency(totalRevenue), icon: 'dollar-sign', highlight: true },
            { label: 'Total Realized Gross Profit', value: Utils.formatCurrency(totalGrossProfit), icon: 'trending-up', profit: true }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Date</th>
                <th class="px-4 py-3 text-left">Reference No.</th>
                <th class="px-4 py-3 text-left">Product</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-right">Qty Sold</th>
                <th class="px-4 py-3 text-right">Selling Price</th>
                <th class="px-4 py-3 text-right">Total Revenue</th>
                <th class="px-4 py-3 text-right">Gross Profit</th>
            </tr>
        `;

        const rows = sales.map(s => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">${Utils.formatDate(s.date, false)}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${s.referenceNo || s.id}</td>
                <td class="px-4 py-3 font-semibold text-slate-900">${Utils.sanitizeHTML(s.productName)}</td>
                <td class="px-4 py-3 text-slate-600">${Utils.sanitizeHTML(s.customerName || 'Walk-in')}</td>
                <td class="px-4 py-3 text-right font-bold text-slate-900">${s.quantity}</td>
                <td class="px-4 py-3 text-right font-mono text-slate-600">${Utils.formatCurrency(s.unitPrice)}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">${Utils.formatCurrency(s.totalAmount)}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-emerald-600">${Utils.formatCurrency(s.grossProfit || 0)}</td>
            </tr>
        `).join('');

        this.setTableContent('Sales & Profitability Report', thead, rows, sales.length);
    },

    /**
     * Report 3: Stock-In Purchases Report
     */
    renderStockInReport() {
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        let stockIns = transactions.filter(t => t.type === 'STOCK_IN');

        if (this.startDate) {
            stockIns = stockIns.filter(s => s.date && s.date.slice(0, 10) >= this.startDate);
        }
        if (this.endDate) {
            stockIns = stockIns.filter(s => s.date && s.date.slice(0, 10) <= this.endDate);
        }
        if (this.productFilter) {
            stockIns = stockIns.filter(s => s.productId === this.productFilter);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            stockIns = stockIns.filter(s => (s.productName && s.productName.toLowerCase().includes(q)) || (s.supplierName && s.supplierName.toLowerCase().includes(q)));
        }

        const totalOrders = stockIns.length;
        const totalUnitsReceived = stockIns.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
        const totalSpend = stockIns.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

        this.renderKPICards([
            { label: 'Purchase Receipts', value: totalOrders.toLocaleString(), icon: 'arrow-down-circle' },
            { label: 'Total Units Received', value: totalUnitsReceived.toLocaleString(), icon: 'boxes' },
            { label: 'Total Purchase Spend', value: Utils.formatCurrency(totalSpend), icon: 'credit-card', highlight: true }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Date</th>
                <th class="px-4 py-3 text-left">PO Reference</th>
                <th class="px-4 py-3 text-left">Product</th>
                <th class="px-4 py-3 text-left">Supplier</th>
                <th class="px-4 py-3 text-right">Qty Received</th>
                <th class="px-4 py-3 text-right">Unit Price</th>
                <th class="px-4 py-3 text-right">Total Cost</th>
            </tr>
        `;

        const rows = stockIns.map(s => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">${Utils.formatDate(s.date, false)}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${s.referenceNo || s.id}</td>
                <td class="px-4 py-3 font-semibold text-slate-900">${Utils.sanitizeHTML(s.productName)}</td>
                <td class="px-4 py-3 text-slate-600">${Utils.sanitizeHTML(s.supplierName || 'Direct')}</td>
                <td class="px-4 py-3 text-right font-bold text-emerald-600">+${s.quantity}</td>
                <td class="px-4 py-3 text-right font-mono text-slate-600">${Utils.formatCurrency(s.unitPrice)}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">${Utils.formatCurrency(s.totalAmount)}</td>
            </tr>
        `).join('');

        this.setTableContent('Stock-In / Replenishment Report', thead, rows, stockIns.length);
    },

    /**
     * Report 4: Stock-Out Reductions Report
     */
    renderStockOutReport() {
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        let stockOuts = transactions.filter(t => t.type === 'STOCK_OUT');

        if (this.startDate) {
            stockOuts = stockOuts.filter(s => s.date && s.date.slice(0, 10) >= this.startDate);
        }
        if (this.endDate) {
            stockOuts = stockOuts.filter(s => s.date && s.date.slice(0, 10) <= this.endDate);
        }
        if (this.productFilter) {
            stockOuts = stockOuts.filter(s => s.productId === this.productFilter);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            stockOuts = stockOuts.filter(s => (s.productName && s.productName.toLowerCase().includes(q)) || (s.customerName && s.customerName.toLowerCase().includes(q)));
        }

        const totalTransactions = stockOuts.length;
        const totalUnitsOut = stockOuts.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
        const totalAmount = stockOuts.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

        this.renderKPICards([
            { label: 'Total Outflow Orders', value: totalTransactions.toLocaleString(), icon: 'arrow-up-circle' },
            { label: 'Total Units Dispatched', value: totalUnitsOut.toLocaleString(), icon: 'boxes' },
            { label: 'Total Value Outflow', value: Utils.formatCurrency(totalAmount), icon: 'dollar-sign', highlight: true }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Date</th>
                <th class="px-4 py-3 text-left">Invoice Ref</th>
                <th class="px-4 py-3 text-left">Product</th>
                <th class="px-4 py-3 text-left">Customer</th>
                <th class="px-4 py-3 text-right">Qty Out</th>
                <th class="px-4 py-3 text-right">Selling Price</th>
                <th class="px-4 py-3 text-right">Total Amount</th>
            </tr>
        `;

        const rows = stockOuts.map(s => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                <td class="px-4 py-3 text-slate-500 whitespace-nowrap">${Utils.formatDate(s.date, false)}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${s.referenceNo || s.id}</td>
                <td class="px-4 py-3 font-semibold text-slate-900">${Utils.sanitizeHTML(s.productName)}</td>
                <td class="px-4 py-3 text-slate-600">${Utils.sanitizeHTML(s.customerName || 'Walk-in')}</td>
                <td class="px-4 py-3 text-right font-bold text-rose-600">-${s.quantity}</td>
                <td class="px-4 py-3 text-right font-mono text-slate-600">${Utils.formatCurrency(s.unitPrice)}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">${Utils.formatCurrency(s.totalAmount)}</td>
            </tr>
        `).join('');

        this.setTableContent('Stock-Out / Reductions Report', thead, rows, stockOuts.length);
    },

    /**
     * Report 5: Low-Stock & Reorder Report
     */
    renderLowStockReport() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
        const supMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

        let lowStockList = products.filter(p => Number(p.currentStock) <= Number(p.minStock));

        if (this.categoryFilter) {
            lowStockList = lowStockList.filter(p => p.categoryId === this.categoryFilter);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            lowStockList = lowStockList.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        }

        const outOfStockCount = lowStockList.filter(p => Number(p.currentStock) <= 0).length;
        const lowStockCount = lowStockList.length - outOfStockCount;

        // Estimated cost to restock each to double minStock
        const estimatedRestockCost = lowStockList.reduce((acc, p) => {
            const needed = Math.max(1, (p.minStock * 2) - p.currentStock);
            return acc + (needed * (Number(p.purchasePrice) || 0));
        }, 0);

        this.renderKPICards([
            { label: 'Out of Stock Products', value: outOfStockCount.toLocaleString(), icon: 'alert-octagon', alert: true },
            { label: 'Low Stock Products', value: lowStockCount.toLocaleString(), icon: 'alert-triangle', warning: true },
            { label: 'Total Reorder Alerts', value: lowStockList.length.toLocaleString(), icon: 'bell' },
            { label: 'Est. Reorder Investment', value: Utils.formatCurrency(estimatedRestockCost), icon: 'shopping-bag' }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Product</th>
                <th class="px-4 py-3 text-left">SKU</th>
                <th class="px-4 py-3 text-left">Category</th>
                <th class="px-4 py-3 text-left">Supplier</th>
                <th class="px-4 py-3 text-right">Current Stock</th>
                <th class="px-4 py-3 text-right">Min Stock Threshold</th>
                <th class="px-4 py-3 text-center">Deficit Status</th>
                <th class="px-4 py-3 text-right">Recommended Reorder</th>
            </tr>
        `;

        const rows = lowStockList.map(p => {
            const isOut = Number(p.currentStock) <= 0;
            const badge = isOut 
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">OUT OF STOCK</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">LOW STOCK</span>`;
            
            const reorderQty = Math.max(5, (p.minStock * 2) - p.currentStock);

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                    <td class="px-4 py-3 font-semibold text-slate-900">${Utils.sanitizeHTML(p.name)}</td>
                    <td class="px-4 py-3 font-mono text-indigo-600">${p.sku}</td>
                    <td class="px-4 py-3">${Utils.sanitizeHTML(catMap[p.categoryId] || 'Unassigned')}</td>
                    <td class="px-4 py-3 max-w-[140px] truncate">${Utils.sanitizeHTML(supMap[p.supplierId] || 'Unassigned')}</td>
                    <td class="px-4 py-3 text-right font-bold ${isOut ? 'text-rose-600' : 'text-amber-600'}">${p.currentStock} ${p.unit || 'units'}</td>
                    <td class="px-4 py-3 text-right text-slate-600 font-mono">${p.minStock}</td>
                    <td class="px-4 py-3 text-center">${badge}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-indigo-600">+${reorderQty} units</td>
                </tr>
            `;
        }).join('');

        this.setTableContent('Low-Stock & Reorder Recommendations Report', thead, rows, lowStockList.length);
    },

    /**
     * Report 6: Category Summary Report
     */
    renderCategoryReport() {
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);

        const categoryStats = categories.map(cat => {
            const catProducts = products.filter(p => p.categoryId === cat.id);
            const totalStockUnits = catProducts.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0);
            const inventoryValue = catProducts.reduce((acc, p) => acc + ((Number(p.currentStock) || 0) * (Number(p.purchasePrice) || 0)), 0);

            // Compute sales revenue for products in this category
            const prodIds = new Set(catProducts.map(p => p.id));
            const salesRevenue = transactions
                .filter(t => t.type === 'STOCK_OUT' && prodIds.has(t.productId))
                .reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0);

            return {
                ...cat,
                productCount: catProducts.length,
                totalStockUnits,
                inventoryValue,
                salesRevenue
            };
        });

        this.renderKPICards([
            { label: 'Active Categories', value: categories.length.toLocaleString(), icon: 'tags' },
            { label: 'Total Catalog Products', value: products.length.toLocaleString(), icon: 'package' }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Category Name</th>
                <th class="px-4 py-3 text-left">Description</th>
                <th class="px-4 py-3 text-right">Products Count</th>
                <th class="px-4 py-3 text-right">Physical Stock Units</th>
                <th class="px-4 py-3 text-right">Inventory Valuation</th>
                <th class="px-4 py-3 text-right">Historical Sales Generated</th>
            </tr>
        `;

        const rows = categoryStats.map(c => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                <td class="px-4 py-3 font-bold text-slate-900">${Utils.sanitizeHTML(c.name)}</td>
                <td class="px-4 py-3 text-slate-500 max-w-xs truncate">${Utils.sanitizeHTML(c.description || '-')}</td>
                <td class="px-4 py-3 text-right font-semibold text-indigo-600">${c.productCount}</td>
                <td class="px-4 py-3 text-right font-bold text-slate-800">${c.totalStockUnits.toLocaleString()}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">${Utils.formatCurrency(c.inventoryValue)}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-emerald-600">${Utils.formatCurrency(c.salesRevenue)}</td>
            </tr>
        `).join('');

        this.setTableContent('Category Performance Report', thead, rows, categoryStats.length);
    },

    /**
     * Report 7: Supplier Performance Report
     */
    renderSupplierReport() {
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);

        const supplierStats = suppliers.map(sup => {
            const suppliedProducts = products.filter(p => p.supplierId === sup.id);
            const supPurchases = transactions.filter(t => t.type === 'STOCK_IN' && t.supplierId === sup.id);

            const totalPurchaseUnits = supPurchases.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
            const totalPurchaseSpend = supPurchases.reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0);

            return {
                ...sup,
                productCount: suppliedProducts.length,
                totalPurchaseUnits,
                totalPurchaseSpend
            };
        });

        this.renderKPICards([
            { label: 'Registered Suppliers', value: suppliers.length.toLocaleString(), icon: 'truck' },
            { label: 'Active Catalog Lines', value: products.length.toLocaleString(), icon: 'package' }
        ]);

        const thead = `
            <tr>
                <th class="px-4 py-3 text-left">Supplier Name</th>
                <th class="px-4 py-3 text-left">Company</th>
                <th class="px-4 py-3 text-left">Contact Phone</th>
                <th class="px-4 py-3 text-right">Products Supplied</th>
                <th class="px-4 py-3 text-right">Total Purchase Units</th>
                <th class="px-4 py-3 text-right">Total Purchase Spend</th>
            </tr>
        `;

        const rows = supplierStats.map(s => `
            <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs text-slate-700">
                <td class="px-4 py-3 font-bold text-slate-900">${Utils.sanitizeHTML(s.name)}</td>
                <td class="px-4 py-3 text-slate-600">${Utils.sanitizeHTML(s.company || '-')}</td>
                <td class="px-4 py-3 font-mono text-slate-500">${Utils.sanitizeHTML(s.phone || '-')}</td>
                <td class="px-4 py-3 text-right font-semibold text-indigo-600">${s.productCount}</td>
                <td class="px-4 py-3 text-right font-bold text-slate-800">${s.totalPurchaseUnits.toLocaleString()}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">${Utils.formatCurrency(s.totalPurchaseSpend)}</td>
            </tr>
        `).join('');

        this.setTableContent('Supplier Procurement Report', thead, rows, supplierStats.length);
    },

    /**
     * Render the top metric KPI cards
     */
    renderKPICards(cards) {
        const container = document.getElementById('report-kpi-cards');
        if (!container) return;

        container.innerHTML = cards.map(c => `
            <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    c.alert ? 'bg-rose-100 text-rose-600' :
                    c.warning ? 'bg-amber-100 text-amber-600' :
                    c.profit ? 'bg-emerald-100 text-emerald-600' :
                    c.highlight ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                }">
                    <i data-lucide="${c.icon || 'bar-chart'}" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-[11px] font-medium text-slate-400 block">${c.label}</span>
                    <span class="text-base sm:text-lg font-bold text-slate-900 leading-tight">${c.value}</span>
                </div>
            </div>
        `).join('');

        App.refreshIcons();
    },

    /**
     * Inject generated headers and rows into report table
     */
    setTableContent(title, theadHtml, rowsHtml, count) {
        const titleEl = document.getElementById('report-table-title');
        if (titleEl) titleEl.textContent = title;

        const thead = document.getElementById('report-table-head');
        if (thead) thead.innerHTML = theadHtml;

        const tbody = document.getElementById('report-table-body');
        if (tbody) {
            if (count === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="px-6 py-12 text-center text-slate-500">
                            <div class="empty-state">
                                <i data-lucide="file-question" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
                                <p class="text-xs font-semibold text-slate-700">No data found for this report period</p>
                                <p class="text-[11px] text-slate-400 mt-0.5">Try widening your date range or adjusting filters.</p>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = rowsHtml;
            }
        }

        App.refreshIcons();
    },

    /**
     * Bind UI event listeners
     */
    bindEvents() {
        // Tab buttons
        document.querySelectorAll('.report-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-report');
                this.setReport(type);
            });
        });

        // Filter changes
        const catSelect = document.getElementById('report-category-filter');
        if (catSelect) {
            catSelect.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.renderActiveReport();
            });
        }

        const prodSelect = document.getElementById('report-product-filter');
        if (prodSelect) {
            prodSelect.addEventListener('change', (e) => {
                this.productFilter = e.target.value;
                this.renderActiveReport();
            });
        }

        const startInput = document.getElementById('report-start-date');
        if (startInput) {
            startInput.addEventListener('change', (e) => {
                this.startDate = e.target.value;
                this.renderActiveReport();
            });
        }

        const endInput = document.getElementById('report-end-date');
        if (endInput) {
            endInput.addEventListener('change', (e) => {
                this.endDate = e.target.value;
                this.renderActiveReport();
            });
        }

        const searchInput = document.getElementById('report-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderActiveReport();
            });
        }

        // Quick date preset buttons
        document.querySelectorAll('.date-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                this.applyDatePreset(preset);
            });
        });

        // Print Report
        const printBtn = document.getElementById('print-report-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }

        // Export CSV
        const exportBtn = document.getElementById('export-report-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }
    },

    /**
     * Preset date ranges (Today, This Week, This Month, All Time)
     */
    applyDatePreset(preset) {
        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        let start = '';
        let end = toDateStr(now);

        if (preset === 'today') {
            start = end;
        } else if (preset === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            start = toDateStr(lastWeek);
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            start = toDateStr(firstDay);
        } else if (preset === 'all') {
            start = '';
            end = '';
        }

        this.startDate = start;
        this.endDate = end;

        if (startInput) startInput.value = start;
        if (endInput) endInput.value = end;

        this.renderActiveReport();
    },

    /**
     * Export active report to CSV
     */
    exportCSV() {
        const table = document.getElementById('report-main-table');
        if (!table) return;

        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        });

        if (rows.length === 0 || (rows.length === 1 && rows[0].length === 1)) {
            Utils.showToast('No report records to export', 'warning');
            return;
        }

        Utils.exportToCSV(`StockFlow_${this.activeReport}_report`, headers, rows);
    }
};

if (typeof window !== 'undefined') {
    window.ReportsModule = ReportsModule;
}
