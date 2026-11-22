/**
 * StockFlow - Application Core Module
 * Manages shared layouts, navigation, responsive drawer, notifications bell, and header.
 */

const App = {
    // Current route identifier
    currentRoute: '',
    // Base path prefix ('.' for root index.html, '..' for pages/*.html)
    basePath: '.',

    /**
     * Determine active page and directory depth
     */
    initPath() {
        const path = window.location.pathname.replace(/\\/g, '/');
        const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        
        if (path.includes('/pages/')) {
            this.basePath = '..';
            this.currentRoute = filename.replace('.html', '');
        } else {
            this.basePath = '.';
            this.currentRoute = filename === '' || filename === 'index.html' ? 'dashboard' : filename.replace('.html', '');
        }
    },

    /**
     * Navigation menu configuration
     */
    navItems: [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', file: 'index.html', isRoot: true },
        { id: 'products', label: 'Products', icon: 'package', file: 'pages/products.html' },
        { id: 'categories', label: 'Categories', icon: 'tags', file: 'pages/categories.html' },
        { id: 'suppliers', label: 'Suppliers', icon: 'truck', file: 'pages/suppliers.html' },
        { id: 'stock-in', label: 'Stock In', icon: 'arrow-down-circle', file: 'pages/stock-in.html', badge: 'IN' },
        { id: 'stock-out', label: 'Stock Out / Sales', icon: 'arrow-up-circle', file: 'pages/stock-out.html', badge: 'OUT' },
        { id: 'transactions', label: 'Transactions', icon: 'history', file: 'pages/transactions.html' },
        { id: 'reports', label: 'Reports', icon: 'bar-chart-3', file: 'pages/reports.html' },
        { id: 'settings', label: 'Settings', icon: 'settings', file: 'pages/settings.html' }
    ],

    /**
     * Render the unified sidebar HTML
     */
    renderSidebar() {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) return;

        const settings = window.StorageService ? window.StorageService.getSettings() : { storeName: 'StockFlow' };
        const homeHref = this.basePath === '.' ? 'index.html' : '../index.html';

        let navLinksHtml = '';
        this.navItems.forEach(item => {
            const isActive = this.currentRoute === item.id;
            let targetHref = '';
            if (this.basePath === '.') {
                targetHref = item.file;
            } else {
                targetHref = item.isRoot ? '../index.html' : `../${item.file}`;
            }

            const activeClass = isActive
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium';
            const iconColor = isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600';

            let badgeHtml = '';
            if (item.badge === 'IN') {
                badgeHtml = `<span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">IN</span>`;
            } else if (item.badge === 'OUT') {
                badgeHtml = `<span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">OUT</span>`;
            }

            navLinksHtml += `
                <a href="${targetHref}" class="group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${activeClass}">
                    <i data-lucide="${item.icon}" class="w-4 h-4 ${iconColor}"></i>
                    <span>${item.label}</span>
                    ${badgeHtml}
                </a>
            `;
        });

        sidebarContainer.innerHTML = `
            <!-- Sidebar Drawer Container -->
            <div id="sidebar-drawer" class="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform -translate-x-full lg:translate-x-0 transition-transform duration-200 ease-in-out">
                <!-- Brand Header -->
                <div>
                    <div class="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
                        <a href="${homeHref}" class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                                <i data-lucide="boxes" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <span class="text-lg font-black tracking-tight text-slate-900 block leading-tight">Stock<span class="text-indigo-600">Flow</span></span>
                                <span class="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block">Inventory System</span>
                            </div>
                        </a>
                        <button type="button" id="mobile-sidebar-close" class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <!-- Store Quick Info Badge -->
                    <div class="px-4 pt-4 pb-2">
                        <div class="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2.5">
                            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div class="overflow-hidden">
                                <div class="text-xs font-semibold text-slate-800 truncate" id="sidebar-store-name">${Utils.sanitizeHTML(settings.storeName)}</div>
                                <div class="text-[10px] text-slate-500">Live Enterprise Edition</div>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation Links -->
                    <nav class="px-3 py-2 space-y-1">
                        ${navLinksHtml}
                    </nav>
                </div>

                <!-- Footer Quick Status -->
                <div class="p-4 border-t border-slate-200 bg-slate-50/50">
                    <div class="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span class="font-medium">System Status</span>
                        <span class="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                        </span>
                    </div>
                    <div class="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>LocalStorage: Active</span>
                        <span class="font-mono text-[10px]">v1.0.0</span>
                    </div>
                </div>
            </div>

            <!-- Mobile Backdrop Overlay -->
            <div id="sidebar-backdrop" class="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm hidden lg:hidden transition-opacity"></div>
        `;
    },

    /**
     * Render the unified Top Navbar HTML
     */
    renderTopbar(pageTitle = 'Dashboard', breadcrumbs = ['Overview']) {
        const topbarContainer = document.getElementById('topbar-container');
        if (!topbarContainer) return;

        const settings = window.StorageService ? window.StorageService.getSettings() : { currency: 'INR' };
        const currencySymbol = Utils.getCurrencySymbol();

        // Calculate low & out of stock products for notifications
        const products = window.StorageService ? window.StorageService.getData(window.StorageKeys.PRODUCTS) : [];
        const alertProducts = products.filter(p => Number(p.currentStock) <= Number(p.minStock));
        const alertCount = alertProducts.length;

        const stockInHref = this.basePath === '.' ? 'pages/stock-in.html' : 'stock-in.html';
        const stockOutHref = this.basePath === '.' ? 'pages/stock-out.html' : 'stock-out.html';
        const productsHref = this.basePath === '.' ? 'pages/products.html' : 'products.html';

        let breadcrumbsHtml = '';
        breadcrumbs.forEach((crumb, idx) => {
            if (idx === breadcrumbs.length - 1) {
                breadcrumbsHtml += `<span class="text-slate-800 font-semibold">${crumb}</span>`;
            } else {
                breadcrumbsHtml += `<span class="hover:text-slate-700">${crumb}</span><i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>`;
            }
        });

        // Generate alert dropdown items
        let alertListHtml = '';
        if (alertCount === 0) {
            alertListHtml = `
                <div class="p-6 text-center text-slate-500">
                    <i data-lucide="check-circle-2" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
                    <p class="text-xs font-semibold text-slate-700">Stock Levels Healthy</p>
                    <p class="text-[11px] text-slate-400">No products are currently low or out of stock.</p>
                </div>
            `;
        } else {
            alertListHtml = alertProducts.slice(0, 5).map(p => {
                const isOut = Number(p.currentStock) === 0;
                const statusTag = isOut 
                    ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">OUT OF STOCK</span>`
                    : `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">LOW STOCK</span>`;
                return `
                    <a href="${stockInHref}?sku=${encodeURIComponent(p.sku)}" class="block px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-semibold text-slate-800 truncate pr-2">${Utils.sanitizeHTML(p.name)}</span>
                            ${statusTag}
                        </div>
                        <div class="flex items-center justify-between text-[11px] text-slate-500">
                            <span>SKU: ${p.sku}</span>
                            <span class="font-medium text-slate-700">Stock: <strong class="${isOut ? 'text-rose-600' : 'text-amber-600'}">${p.currentStock}</strong> / ${p.minStock}</span>
                        </div>
                    </a>
                `;
            }).join('');

            if (alertCount > 5) {
                alertListHtml += `
                    <a href="${productsHref}?filter=low_stock" class="block text-center py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-slate-50">
                        View all ${alertCount} alerts &rarr;
                    </a>
                `;
            }
        }

        topbarContainer.innerHTML = `
            <header class="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
                <!-- Left: Mobile Toggle & Page Info -->
                <div class="flex items-center gap-3">
                    <button type="button" id="mobile-sidebar-open" class="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none">
                        <i data-lucide="menu" class="w-5 h-5"></i>
                    </button>
                    <div>
                        <div class="flex items-center gap-1.5 text-xs text-slate-400">
                            ${breadcrumbsHtml}
                        </div>
                        <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">${pageTitle}</h1>
                    </div>
                </div>

                <!-- Right: Quick Search, Actions, Notifications & User -->
                <div class="flex items-center gap-2 sm:gap-3">
                    <!-- Global Search Bar -->
                    <div class="relative hidden md:block w-48 lg:w-64">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                        <input type="text" id="global-search-input" placeholder="Search product or SKU..." class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                        <div id="global-search-results" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg max-h-72 overflow-y-auto z-50 divide-y divide-slate-100"></div>
                    </div>

                    <!-- Currency Pill -->
                    <div class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                        <span class="text-indigo-600 font-bold">${currencySymbol}</span>
                        <span>${settings.currency || 'INR'}</span>
                    </div>

                    <!-- Quick Action Menu -->
                    <div class="relative">
                        <button type="button" id="quick-action-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Quick Action</span>
                            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                        </button>
                        <div id="quick-action-menu" class="hidden absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 z-50 text-xs">
                            <a href="${stockInHref}" class="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium">
                                <i data-lucide="arrow-down-circle" class="w-4 h-4 text-emerald-500"></i>
                                <span>Record Stock In</span>
                            </a>
                            <a href="${stockOutHref}" class="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium">
                                <i data-lucide="arrow-up-circle" class="w-4 h-4 text-rose-500"></i>
                                <span>Record Stock Out / Sale</span>
                            </a>
                            <a href="${productsHref}?action=new" class="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium border-t border-slate-100">
                                <i data-lucide="package-plus" class="w-4 h-4 text-indigo-500"></i>
                                <span>Add New Product</span>
                            </a>
                        </div>
                    </div>

                    <!-- Low Stock Notification Bell -->
                    <div class="relative">
                        <button type="button" id="notification-bell-btn" class="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors" aria-label="Notifications">
                            <i data-lucide="bell" class="w-5 h-5"></i>
                            ${alertCount > 0 ? `
                                <span class="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                                    ${alertCount > 9 ? '9+' : alertCount}
                                </span>
                            ` : ''}
                        </button>
                        <div id="notification-dropdown" class="hidden absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-50">
                            <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold text-slate-800">Stock Alerts</span>
                                    <span class="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">${alertCount} Attention</span>
                                </div>
                                <span class="text-[11px] text-slate-400">Inventory Status</span>
                            </div>
                            <div class="max-h-72 overflow-y-auto">
                                ${alertListHtml}
                            </div>
                        </div>
                    </div>

                    <!-- User Profile Area -->
                    <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            SF
                        </div>
                        <div class="hidden xl:block text-left">
                            <div class="text-xs font-semibold text-slate-800 leading-tight">Store Manager</div>
                            <div class="text-[10px] text-slate-400">Admin Account</div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    },

    /**
     * Bind Layout Interactivity (Drawers, Dropdowns, Global Search)
     */
    bindEvents() {
        // Mobile Sidebar Drawer
        const openBtn = document.getElementById('mobile-sidebar-open');
        const closeBtn = document.getElementById('mobile-sidebar-close');
        const drawer = document.getElementById('sidebar-drawer');
        const backdrop = document.getElementById('sidebar-backdrop');

        const openDrawer = () => {
            if (drawer) drawer.classList.remove('-translate-x-full');
            if (backdrop) backdrop.classList.remove('hidden');
        };

        const closeDrawer = () => {
            if (drawer) drawer.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
        };

        if (openBtn) openBtn.addEventListener('click', openDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (backdrop) backdrop.addEventListener('click', closeDrawer);

        // Quick Action Dropdown
        const quickBtn = document.getElementById('quick-action-btn');
        const quickMenu = document.getElementById('quick-action-menu');
        if (quickBtn && quickMenu) {
            quickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickMenu.classList.toggle('hidden');
                if (notifDropdown) notifDropdown.classList.add('hidden');
            });
        }

        // Notification Bell Dropdown
        const notifBtn = document.getElementById('notification-bell-btn');
        const notifDropdown = document.getElementById('notification-dropdown');
        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('hidden');
                if (quickMenu) quickMenu.classList.add('hidden');
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (quickMenu && !quickMenu.contains(e.target) && e.target !== quickBtn) {
                quickMenu.classList.add('hidden');
            }
            if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBtn) {
                notifDropdown.classList.add('hidden');
            }
        });

        // Global Search Input
        const searchInput = document.getElementById('global-search-input');
        const searchResults = document.getElementById('global-search-results');
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (!query) {
                    searchResults.innerHTML = '';
                    searchResults.classList.add('hidden');
                    return;
                }

                const products = window.StorageService ? window.StorageService.getData(window.StorageKeys.PRODUCTS) : [];
                const matched = products.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    p.sku.toLowerCase().includes(query) ||
                    (p.id && p.id.toLowerCase().includes(query))
                ).slice(0, 5);

                if (matched.length === 0) {
                    searchResults.innerHTML = `
                        <div class="p-3 text-xs text-slate-500 text-center">No matching products found</div>
                    `;
                } else {
                    const productsUrl = this.basePath === '.' ? 'pages/products.html' : 'products.html';
                    searchResults.innerHTML = matched.map(p => `
                        <a href="${productsUrl}?search=${encodeURIComponent(p.sku)}" class="block px-3 py-2.5 hover:bg-slate-50 transition-colors">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold text-slate-800">${Utils.sanitizeHTML(p.name)}</span>
                                <span class="text-xs font-mono font-bold text-indigo-600">${Utils.formatCurrency(p.sellingPrice)}</span>
                            </div>
                            <div class="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                                <span>SKU: ${p.sku}</span>
                                <span>Stock: ${p.currentStock} ${p.unit || 'units'}</span>
                            </div>
                        </a>
                    `).join('');
                }
                searchResults.classList.remove('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.classList.add('hidden');
                }
            });
        }
    },

    /**
     * Re-run Lucide icon parser
     */
    refreshIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    },

    /**
     * Full initialization of page layout
     */
    init(pageTitle = 'Dashboard', breadcrumbs = ['Overview']) {
        this.initPath();
        this.renderSidebar();
        this.renderTopbar(pageTitle, breadcrumbs);
        this.bindEvents();
        this.refreshIcons();
    }
};

if (typeof window !== 'undefined') {
    window.App = App;
}
