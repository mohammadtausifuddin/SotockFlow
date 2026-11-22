/**
 * StockFlow - Products Management Module
 * Handles CRUD operations, searching, filtering, sorting, pagination, and CSV exports for products.
 */

const ProductsModule = {
    currentPage: 1,
    pageSize: 10,
    searchQuery: '',
    categoryFilter: '',
    supplierFilter: '',
    statusFilter: '',
    sortBy: 'name-asc',

    init() {
        this.populateDropdowns();
        this.bindEvents();
        this.checkUrlParams();
        this.renderTable();
    },

    /**
     * Check if opened with query parameter (e.g. ?action=new or ?search=SKU or ?filter=low_stock)
     */
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const search = urlParams.get('search');
        const filter = urlParams.get('filter');

        if (action === 'new') {
            setTimeout(() => this.openAddModal(), 200);
        }
        if (search) {
            this.searchQuery = search;
            const searchInput = document.getElementById('product-search');
            if (searchInput) searchInput.value = search;
        }
        if (filter) {
            this.statusFilter = filter;
            const statusSelect = document.getElementById('filter-status');
            if (statusSelect) statusSelect.value = filter;
        }
    },

    /**
     * Populate Category and Supplier dropdowns in filter bar & forms
     */
    populateDropdowns() {
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);

        // Filter category dropdown
        const filterCat = document.getElementById('filter-category');
        if (filterCat) {
            filterCat.innerHTML = `<option value="">All Categories</option>` +
                categories.map(c => `<option value="${c.id}">${Utils.sanitizeHTML(c.name)}</option>`).join('');
        }

        // Filter supplier dropdown
        const filterSup = document.getElementById('filter-supplier');
        if (filterSup) {
            filterSup.innerHTML = `<option value="">All Suppliers</option>` +
                suppliers.map(s => `<option value="${s.id}">${Utils.sanitizeHTML(s.name)}</option>`).join('');
        }

        // Modal category dropdown
        const modalCat = document.getElementById('prod-category');
        if (modalCat) {
            modalCat.innerHTML = `<option value="">Select Category</option>` +
                categories.map(c => `<option value="${c.id}">${Utils.sanitizeHTML(c.name)}</option>`).join('');
        }

        // Modal supplier dropdown
        const modalSup = document.getElementById('prod-supplier');
        if (modalSup) {
            modalSup.innerHTML = `<option value="">Select Supplier</option>` +
                suppliers.map(s => `<option value="${s.id}">${Utils.sanitizeHTML(s.name)}</option>`).join('');
        }
    },

    /**
     * Get processed products according to active search, filters, and sort
     */
    getFilteredProducts() {
        let products = window.StorageService.getData(window.StorageKeys.PRODUCTS);

        // Search by Name, SKU, ID
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            products = products.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.sku && p.sku.toLowerCase().includes(q)) ||
                (p.id && p.id.toLowerCase().includes(q))
            );
        }

        // Filter by Category
        if (this.categoryFilter) {
            products = products.filter(p => p.categoryId === this.categoryFilter);
        }

        // Filter by Supplier
        if (this.supplierFilter) {
            products = products.filter(p => p.supplierId === this.supplierFilter);
        }

        // Filter by Stock Status
        if (this.statusFilter) {
            products = products.filter(p => {
                const stock = Number(p.currentStock) || 0;
                const min = Number(p.minStock) || 0;
                if (this.statusFilter === 'out_of_stock') return stock <= 0;
                if (this.statusFilter === 'low_stock') return stock > 0 && stock <= min;
                if (this.statusFilter === 'in_stock') return stock > min;
                return true;
            });
        }

        // Sorting
        products.sort((a, b) => {
            switch (this.sortBy) {
                case 'name-asc':
                    return (a.name || '').localeCompare(b.name || '');
                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '');
                case 'stock-asc':
                    return (Number(a.currentStock) || 0) - (Number(b.currentStock) || 0);
                case 'stock-desc':
                    return (Number(b.currentStock) || 0) - (Number(a.currentStock) || 0);
                case 'price-asc':
                    return (Number(a.sellingPrice) || 0) - (Number(b.sellingPrice) || 0);
                case 'price-desc':
                    return (Number(b.sellingPrice) || 0) - (Number(a.sellingPrice) || 0);
                case 'newest':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                default:
                    return 0;
            }
        });

        return products;
    },

    /**
     * Render the table with paginated items
     */
    renderTable() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const filtered = this.getFilteredProducts();
        const pagination = Utils.paginate(filtered, this.currentPage, this.pageSize);
        this.currentPage = pagination.currentPage;

        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
        const supMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

        if (pagination.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="px-6 py-12 text-center text-slate-500">
                        <div class="empty-state">
                            <i data-lucide="package-x" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                            <p class="text-sm font-semibold text-slate-700">No products match your criteria</p>
                            <p class="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            Utils.renderPaginationControls('products-pagination', pagination, (p) => {
                this.currentPage = p;
                this.renderTable();
            });
            App.refreshIcons();
            return;
        }

        tbody.innerHTML = pagination.items.map(p => {
            const statusInfo = Utils.calculateStockStatus(p.currentStock, p.minStock);
            const categoryName = catMap[p.categoryId] || 'Unassigned';
            const supplierName = supMap[p.supplierId] || 'Unassigned';

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs text-slate-700">
                    <td class="px-4 py-3 font-mono font-medium text-slate-500">${p.id}</td>
                    <td class="px-4 py-3">
                        <div class="font-semibold text-slate-900">${Utils.sanitizeHTML(p.name)}</div>
                        <div class="text-[11px] text-slate-400 max-w-xs truncate">${Utils.sanitizeHTML(p.description || '-')}</div>
                    </td>
                    <td class="px-4 py-3 font-mono font-medium text-indigo-600">${p.sku}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">${Utils.sanitizeHTML(categoryName)}</span>
                    </td>
                    <td class="px-4 py-3 text-slate-600 max-w-[130px] truncate">${Utils.sanitizeHTML(supplierName)}</td>
                    <td class="px-4 py-3 font-mono text-right text-slate-600">${Utils.formatCurrency(p.purchasePrice)}</td>
                    <td class="px-4 py-3 font-mono font-semibold text-right text-slate-900">${Utils.formatCurrency(p.sellingPrice)}</td>
                    <td class="px-4 py-3 text-right">
                        <span class="font-bold text-slate-900 text-sm">${p.currentStock}</span>
                        <span class="text-[10px] text-slate-400 block">${p.unit || 'Pcs'}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusInfo.badgeClass}">
                            <span class="w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}"></span>
                            ${statusInfo.status}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1">
                            <button type="button" onclick="ProductsModule.viewProduct('${p.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Details">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                            <button type="button" onclick="ProductsModule.openEditModal('${p.id}')" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Product">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button type="button" onclick="ProductsModule.deleteProduct('${p.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Product">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        Utils.renderPaginationControls('products-pagination', pagination, (p) => {
            this.currentPage = p;
            this.renderTable();
        });

        App.refreshIcons();
    },

    /**
     * Bind filters, search, and form submit events
     */
    bindEvents() {
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const filterCat = document.getElementById('filter-category');
        if (filterCat) {
            filterCat.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const filterSup = document.getElementById('filter-supplier');
        if (filterSup) {
            filterSup.addEventListener('change', (e) => {
                this.supplierFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const filterStat = document.getElementById('filter-status');
        if (filterStat) {
            filterStat.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.renderTable();
            });
        }

        const sortSelect = document.getElementById('sort-products');
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

        // Export CSV button
        const exportBtn = document.getElementById('export-products-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }

        // Add Product Form submit
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }
    },

    /**
     * Open Modal to Add Product
     */
    openAddModal() {
        const form = document.getElementById('product-form');
        if (form) form.reset();
        document.getElementById('product-modal-id').value = '';
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        document.getElementById('prod-stock-wrapper').classList.remove('hidden'); // allow initial stock
        Utils.openModal('product-modal');
    },

    /**
     * Open Modal to Edit Product
     */
    openEditModal(id) {
        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, id);
        if (!product) {
            Utils.showToast('Product not found', 'error');
            return;
        }

        document.getElementById('product-modal-id').value = product.id;
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-sku').value = product.sku;
        document.getElementById('prod-category').value = product.categoryId || '';
        document.getElementById('prod-supplier').value = product.supplierId || '';
        document.getElementById('prod-purchase-price').value = product.purchasePrice;
        document.getElementById('prod-selling-price').value = product.sellingPrice;
        document.getElementById('prod-stock').value = product.currentStock;
        document.getElementById('prod-min-stock').value = product.minStock;
        document.getElementById('prod-unit').value = product.unit || 'Pcs';
        document.getElementById('prod-description').value = product.description || '';

        // Current stock can still be adjusted or monitored
        document.getElementById('prod-stock-wrapper').classList.remove('hidden');

        Utils.openModal('product-modal');
    },

    /**
     * View Product Details Modal
     */
    viewProduct(id) {
        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, id);
        if (!product) {
            Utils.showToast('Product not found', 'error');
            return;
        }

        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);

        const category = categories.find(c => c.id === product.categoryId);
        const supplier = suppliers.find(s => s.id === product.supplierId);
        const statusInfo = Utils.calculateStockStatus(product.currentStock, product.minStock);

        const prodTransactions = transactions.filter(t => t.productId === product.id);
        const inventoryValuation = (Number(product.currentStock) || 0) * (Number(product.purchasePrice) || 0);
        const marginPercent = product.purchasePrice > 0 
            ? (((product.sellingPrice - product.purchasePrice) / product.purchasePrice) * 100).toFixed(1)
            : '0.0';

        const content = document.getElementById('view-product-content');
        if (content) {
            content.innerHTML = `
                <div class="space-y-4 text-xs">
                    <div class="flex items-start justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h4 class="text-base font-bold text-slate-900">${Utils.sanitizeHTML(product.name)}</h4>
                            <p class="text-slate-500 font-mono mt-0.5">SKU: ${product.sku} | ID: ${product.id}</p>
                        </div>
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.badgeClass}">
                            <span class="w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}"></span>
                            ${statusInfo.status}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Category</span>
                            <span class="font-semibold text-slate-800 text-xs">${Utils.sanitizeHTML(category ? category.name : 'Unassigned')}</span>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Supplier</span>
                            <span class="font-semibold text-slate-800 text-xs truncate block">${Utils.sanitizeHTML(supplier ? supplier.name : 'Unassigned')}</span>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Unit of Measure</span>
                            <span class="font-semibold text-slate-800 text-xs">${product.unit || 'Pcs'}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <span class="text-indigo-600 block text-[11px]">Purchase Price</span>
                            <span class="font-mono font-bold text-slate-900 text-sm">${Utils.formatCurrency(product.purchasePrice)}</span>
                        </div>
                        <div class="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <span class="text-indigo-600 block text-[11px]">Selling Price</span>
                            <span class="font-mono font-bold text-slate-900 text-sm">${Utils.formatCurrency(product.sellingPrice)}</span>
                        </div>
                        <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span class="text-emerald-700 block text-[11px]">Gross Margin</span>
                            <span class="font-bold text-emerald-700 text-sm">${marginPercent}%</span>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span class="text-slate-500 block text-[11px]">Total Stock Value</span>
                            <span class="font-mono font-bold text-slate-900 text-sm">${Utils.formatCurrency(inventoryValuation)}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Current Physical Stock</span>
                            <span class="font-bold text-slate-900 text-base">${product.currentStock} ${product.unit || 'Pcs'}</span>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Min. Safety Reorder Level</span>
                            <span class="font-bold text-slate-900 text-base">${product.minStock} ${product.unit || 'Pcs'}</span>
                        </div>
                    </div>

                    <div class="p-3 bg-slate-50 rounded-lg">
                        <span class="text-slate-400 block text-[11px] mb-1">Product Description</span>
                        <p class="text-slate-700 leading-relaxed">${Utils.sanitizeHTML(product.description || 'No detailed description provided.')}</p>
                    </div>

                    <div class="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                        <span>Created: ${Utils.formatDate(product.createdAt, true)}</span>
                        <span>Total Movements: <strong>${prodTransactions.length}</strong> transactions</span>
                    </div>
                </div>
            `;
            Utils.openModal('view-product-modal');
        }
    },

    /**
     * Save Product (Create or Update) with thorough validation
     */
    saveProduct() {
        const id = document.getElementById('product-modal-id').value;
        const name = document.getElementById('prod-name').value.trim();
        const sku = document.getElementById('prod-sku').value.trim().toUpperCase();
        const categoryId = document.getElementById('prod-category').value;
        const supplierId = document.getElementById('prod-supplier').value;
        const purchasePrice = parseFloat(document.getElementById('prod-purchase-price').value);
        const sellingPrice = parseFloat(document.getElementById('prod-selling-price').value);
        const currentStock = parseInt(document.getElementById('prod-stock').value, 10);
        const minStock = parseInt(document.getElementById('prod-min-stock').value, 10);
        const unit = document.getElementById('prod-unit').value.trim() || 'Pcs';
        const description = document.getElementById('prod-description').value.trim();

        // 1. Validation
        if (!name) {
            Utils.showToast('Product name is required', 'error');
            return;
        }
        if (!sku) {
            Utils.showToast('SKU code is required', 'error');
            return;
        }
        if (!categoryId) {
            Utils.showToast('Please select a category', 'error');
            return;
        }
        if (isNaN(purchasePrice) || purchasePrice < 0) {
            Utils.showToast('Purchase price must be zero or a positive amount', 'error');
            return;
        }
        if (isNaN(sellingPrice) || sellingPrice < 0) {
            Utils.showToast('Selling price must be zero or a positive amount', 'error');
            return;
        }
        if (isNaN(currentStock) || currentStock < 0) {
            Utils.showToast('Stock quantity cannot be negative', 'error');
            return;
        }
        if (isNaN(minStock) || minStock < 0) {
            Utils.showToast('Minimum stock level cannot be negative', 'error');
            return;
        }

        // SKU Uniqueness check
        const allProducts = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const duplicateSku = allProducts.find(p => p.sku === sku && p.id !== id);
        if (duplicateSku) {
            Utils.showToast(`SKU '${sku}' is already assigned to '${duplicateSku.name}'`, 'error');
            return;
        }

        const productPayload = {
            name,
            sku,
            categoryId,
            supplierId,
            purchasePrice,
            sellingPrice,
            currentStock,
            minStock,
            unit,
            description
        };

        if (id) {
            // Update
            window.StorageService.updateItem(window.StorageKeys.PRODUCTS, id, productPayload);
            Utils.showToast(`Product '${name}' updated successfully`, 'success');
        } else {
            // Create
            productPayload.id = Utils.generateId('PRD');
            productPayload.createdAt = new Date().toISOString();
            window.StorageService.addItem(window.StorageKeys.PRODUCTS, productPayload);
            Utils.showToast(`Product '${name}' added successfully`, 'success');
        }

        Utils.closeModal('product-modal');
        this.renderTable();
    },

    /**
     * Delete Product with validation of transaction history
     */
    deleteProduct(id) {
        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, id);
        if (!product) return;

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const relatedTxns = transactions.filter(t => t.productId === id);

        let confirmMsg = `Are you sure you want to delete "${product.name}" (${product.sku})?`;
        if (relatedTxns.length > 0) {
            confirmMsg += ` WARNING: This product has ${relatedTxns.length} recorded transactions. Historical transactions will retain the product snapshot for reporting accuracy.`;
        }

        Utils.showConfirmModal({
            title: 'Delete Product',
            message: confirmMsg,
            confirmText: 'Delete Permanently',
            confirmColor: 'rose',
            onConfirm: () => {
                window.StorageService.deleteItem(window.StorageKeys.PRODUCTS, id);
                Utils.showToast(`Product "${product.name}" deleted successfully`, 'success');
                this.renderTable();
            }
        });
    },

    /**
     * Export Products to CSV
     */
    exportCSV() {
        const products = this.getFilteredProducts();
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
        const supMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

        const headers = [
            { label: 'Product ID', key: 'id' },
            { label: 'Product Name', key: 'name' },
            { label: 'SKU', key: 'sku' },
            { label: 'Category', key: 'category' },
            { label: 'Supplier', key: 'supplier' },
            { label: 'Purchase Price', key: 'purchasePrice' },
            { label: 'Selling Price', key: 'sellingPrice' },
            { label: 'Stock Quantity', key: 'currentStock' },
            { label: 'Unit', key: 'unit' },
            { label: 'Min Stock Level', key: 'minStock' },
            { label: 'Status', key: 'status' },
            { label: 'Inventory Cost Value', key: 'inventoryValue' },
            { label: 'Created Date', key: 'createdAt' }
        ];

        const rows = products.map(p => {
            const statusInfo = Utils.calculateStockStatus(p.currentStock, p.minStock);
            return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                category: catMap[p.categoryId] || 'Unassigned',
                supplier: supMap[p.supplierId] || 'Unassigned',
                purchasePrice: p.purchasePrice,
                sellingPrice: p.sellingPrice,
                currentStock: p.currentStock,
                unit: p.unit || 'Pcs',
                minStock: p.minStock,
                status: statusInfo.status,
                inventoryValue: (p.currentStock * p.purchasePrice),
                createdAt: Utils.formatDate(p.createdAt, true)
            };
        });

        Utils.exportToCSV('StockFlow_Products', headers, rows);
    }
};

if (typeof window !== 'undefined') {
    window.ProductsModule = ProductsModule;
}
