/**
 * StockFlow - Dashboard Logic Module
 * Calculates dynamic metrics, renders Chart.js visualizations, and manages dashboard sections.
 */

const DashboardModule = {
    // Chart instances references for clean destruction/updating
    charts: {
        categoryDoughnut: null,
        monthlySalesLine: null,
        stockMovementBar: null,
        topSellingBar: null
    },

    /**
     * Initialize dashboard
     */
    init() {
        this.renderMetrics();
        this.renderCharts();
        this.renderRecentTransactions();
        this.renderStockAlerts();
    },

    /**
     * Compute and display the 8 dynamic dashboard metric cards
     */
    renderMetrics() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);

        // 1. Total Products
        const totalProducts = products.length;

        // 2. Total Stock Units
        const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.currentStock) || 0), 0);

        // 3. Total Inventory Value (Current Stock * Purchase Price)
        const totalInventoryValue = products.reduce((acc, p) => {
            const stock = Number(p.currentStock) || 0;
            const price = Number(p.purchasePrice) || 0;
            return acc + (stock * price);
        }, 0);

        // 4. Low Stock Products (stock > 0 and stock <= minStock)
        const lowStockProducts = products.filter(p => {
            const stock = Number(p.currentStock) || 0;
            const min = Number(p.minStock) || 0;
            return stock > 0 && stock <= min;
        }).length;

        // 5. Out of Stock Products (stock == 0)
        const outOfStockProducts = products.filter(p => (Number(p.currentStock) || 0) <= 0).length;

        // 6. Total Categories
        const totalCategories = categories.length;

        // 7. Total Suppliers
        const totalSuppliers = suppliers.length;

        // 8. Today's Sales
        const todayStr = new Date().toISOString().slice(0, 10);
        const todaySalesAmount = transactions
            .filter(t => t.type === 'STOCK_OUT' && t.date && t.date.slice(0, 10) === todayStr)
            .reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0);

        // Set card texts
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl('stat-total-products', totalProducts.toLocaleString());
        setEl('stat-total-stock', totalStockUnits.toLocaleString());
        setEl('stat-inventory-value', Utils.formatCurrency(totalInventoryValue));
        setEl('stat-low-stock', lowStockProducts.toLocaleString());
        setEl('stat-out-of-stock', outOfStockProducts.toLocaleString());
        setEl('stat-total-categories', totalCategories.toLocaleString());
        setEl('stat-total-suppliers', totalSuppliers.toLocaleString());
        setEl('stat-today-sales', Utils.formatCurrency(todaySalesAmount));
    },

    /**
     * Render the 4 Chart.js charts
     */
    renderCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        this.renderCategoryChart();
        this.renderMonthlySalesChart();
        this.renderStockMovementChart();
        this.renderTopSellingChart();
    },

    /**
     * Chart A: Inventory Distribution by Category (Doughnut)
     */
    renderCategoryChart() {
        const ctx = document.getElementById('chart-category-dist');
        if (!ctx) return;

        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);

        // Map category ID to name and compute stock per category
        const catMap = {};
        categories.forEach(c => {
            catMap[c.id] = { name: c.name, stock: 0 };
        });

        products.forEach(p => {
            if (p.categoryId && catMap[p.categoryId]) {
                catMap[p.categoryId].stock += (Number(p.currentStock) || 0);
            } else {
                if (!catMap['other']) catMap['other'] = { name: 'Unassigned', stock: 0 };
                catMap['other'].stock += (Number(p.currentStock) || 0);
            }
        });

        const labels = Object.values(catMap).filter(c => c.stock > 0).map(c => c.name);
        const dataValues = Object.values(catMap).filter(c => c.stock > 0).map(c => c.stock);

        if (this.charts.categoryDoughnut) {
            this.charts.categoryDoughnut.destroy();
        }

        const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

        this.charts.categoryDoughnut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['No stock'],
                datasets: [{
                    data: dataValues.length ? dataValues : [1],
                    backgroundColor: colors.slice(0, Math.max(1, labels.length)),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 12,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return ` ${context.label}: ${context.raw} units`;
                            }
                        }
                    }
                },
                cutout: '68%'
            }
        });
    },

    /**
     * Chart B: Monthly Sales Performance (Line Chart)
     */
    renderMonthlySalesChart() {
        const ctx = document.getElementById('chart-monthly-sales');
        if (!ctx) return;

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const sales = transactions.filter(t => t.type === 'STOCK_OUT');

        // Build last 6 months buckets
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
            monthsData.push({ key, label, total: 0 });
        }

        sales.forEach(s => {
            if (!s.date) return;
            const sMonth = s.date.slice(0, 7);
            const found = monthsData.find(m => m.key === sMonth);
            if (found) {
                found.total += (Number(s.totalAmount) || 0);
            }
        });

        if (this.charts.monthlySalesLine) {
            this.charts.monthlySalesLine.destroy();
        }

        this.charts.monthlySalesLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthsData.map(m => m.label),
                datasets: [{
                    label: 'Sales Revenue',
                    data: monthsData.map(m => m.total),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return ` Revenue: ${Utils.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 10 },
                            callback: (val) => Utils.formatCurrency(val)
                        }
                    }
                }
            }
        });
    },

    /**
     * Chart C: Stock Movement (Bar Chart comparing Stock In vs Stock Out)
     */
    renderStockMovementChart() {
        const ctx = document.getElementById('chart-stock-movement');
        if (!ctx) return;

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = monthNames[d.getMonth()];
            monthsData.push({ key, label, stockIn: 0, stockOut: 0 });
        }

        transactions.forEach(t => {
            if (!t.date) return;
            const tMonth = t.date.slice(0, 7);
            const bucket = monthsData.find(m => m.key === tMonth);
            if (bucket) {
                if (t.type === 'STOCK_IN') {
                    bucket.stockIn += (Number(t.quantity) || 0);
                } else if (t.type === 'STOCK_OUT') {
                    bucket.stockOut += (Number(t.quantity) || 0);
                }
            }
        });

        if (this.charts.stockMovementBar) {
            this.charts.stockMovementBar.destroy();
        }

        this.charts.stockMovementBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthsData.map(m => m.label),
                datasets: [
                    {
                        label: 'Stock In (Purchases)',
                        data: monthsData.map(m => m.stockIn),
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Stock Out (Sales)',
                        data: monthsData.map(m => m.stockOut),
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return ` ${context.dataset.label}: ${context.raw} units`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    }
                }
            }
        });
    },

    /**
     * Chart D: Top Selling Products
     */
    renderTopSellingChart() {
        const ctx = document.getElementById('chart-top-selling');
        const listContainer = document.getElementById('dashboard-top-selling-list');

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const sales = transactions.filter(t => t.type === 'STOCK_OUT');

        const productSales = {};
        sales.forEach(s => {
            const key = s.productName || s.productId;
            if (!productSales[key]) {
                productSales[key] = { name: s.productName || 'Unknown Product', qty: 0, revenue: 0 };
            }
            productSales[key].qty += (Number(s.quantity) || 0);
            productSales[key].revenue += (Number(s.totalAmount) || 0);
        });

        const sorted = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

        // Horizontal bar chart
        if (ctx) {
            if (this.charts.topSellingBar) {
                this.charts.topSellingBar.destroy();
            }

            this.charts.topSellingBar = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(p => p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name),
                    datasets: [{
                        label: 'Units Sold',
                        data: sorted.map(p => p.qty),
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label(context) {
                                    const item = sorted[context.dataIndex];
                                    return ` Sold: ${item.qty} units (${Utils.formatCurrency(item.revenue)})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { color: '#f1f5f9' },
                            ticks: { precision: 0 }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                        }
                    }
                }
            });
        }

        // Top selling table list
        if (listContainer) {
            if (sorted.length === 0) {
                listContainer.innerHTML = `
                    <div class="py-8 text-center text-xs text-slate-400">
                        No sales recorded yet
                    </div>
                `;
            } else {
                listContainer.innerHTML = sorted.map((p, index) => `
                    <div class="flex items-center justify-between py-2.5 ${index !== sorted.length - 1 ? 'border-b border-slate-100' : ''}">
                        <div class="flex items-center gap-2.5 overflow-hidden pr-2">
                            <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                                ${index + 1}
                            </span>
                            <span class="text-xs font-medium text-slate-800 truncate">${Utils.sanitizeHTML(p.name)}</span>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <div class="text-xs font-bold text-slate-900">${p.qty} units</div>
                            <div class="text-[10px] text-slate-400">${Utils.formatCurrency(p.revenue)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    },

    /**
     * Render Recent Transactions on the Dashboard
     */
    renderRecentTransactions() {
        const tbody = document.getElementById('dashboard-recent-transactions');
        if (!tbody) return;

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        // Sort descending by date
        const sorted = [...transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 6);

        if (sorted.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-xs text-slate-400">
                        No transactions recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sorted.map(t => {
            const isStockIn = t.type === 'STOCK_IN';
            const badge = isStockIn
                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                     <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Stock In
                   </span>`
                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                     <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Stock Out
                   </span>`;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs">
                    <td class="px-4 py-3 font-mono font-medium text-slate-700">${t.id}</td>
                    <td class="px-4 py-3 text-slate-500 whitespace-nowrap">${Utils.formatDate(t.date, false)}</td>
                    <td class="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">${Utils.sanitizeHTML(t.productName)}</td>
                    <td class="px-4 py-3">${badge}</td>
                    <td class="px-4 py-3 font-bold text-slate-800 text-right">${t.quantity}</td>
                    <td class="px-4 py-3 font-bold text-slate-900 text-right">${Utils.formatCurrency(t.totalAmount)}</td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render Low & Out of Stock Alerts Table
     */
    renderStockAlerts() {
        const container = document.getElementById('dashboard-stock-alerts');
        if (!container) return;

        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const alerts = products.filter(p => Number(p.currentStock) <= Number(p.minStock));

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="check" class="w-6 h-6"></i>
                    </div>
                    <p class="text-sm font-semibold text-slate-800">Inventory Levels Optimal</p>
                    <p class="text-xs text-slate-500 mt-1">All catalog products are above minimum safety thresholds.</p>
                </div>
            `;
            App.refreshIcons();
            return;
        }

        container.innerHTML = alerts.map(p => {
            const isOut = Number(p.currentStock) === 0;
            const badge = isOut 
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">OUT OF STOCK</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">LOW STOCK</span>`;
            
            return `
                <div class="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all">
                    <div class="overflow-hidden pr-3">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-slate-800 truncate">${Utils.sanitizeHTML(p.name)}</span>
                            ${badge}
                        </div>
                        <div class="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>SKU: <strong class="font-mono text-slate-700">${p.sku}</strong></span>
                            <span>Stock: <strong class="${isOut ? 'text-rose-600' : 'text-amber-600'} font-bold">${p.currentStock}</strong> / Min: ${p.minStock}</span>
                        </div>
                    </div>
                    <a href="pages/stock-in.html?sku=${encodeURIComponent(p.sku)}" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1">
                        <span>Restock</span> &rarr;
                    </a>
                </div>
            `;
        }).join('');

        App.refreshIcons();
    }
};

if (typeof window !== 'undefined') {
    window.DashboardModule = DashboardModule;
}
