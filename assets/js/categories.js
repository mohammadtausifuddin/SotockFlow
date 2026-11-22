/**
 * StockFlow - Categories Management Module
 * Handles category CRUD operations, dynamic product/stock counts, validation, and CSV export.
 */

const CategoriesModule = {
    searchQuery: '',

    init() {
        this.bindEvents();
        this.renderTable();
    },

    /**
     * Compute dynamic statistics for categories
     */
    getCategoriesWithStats() {
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);

        return categories.map(cat => {
            const catProducts = products.filter(p => p.categoryId === cat.id);
            const totalProducts = catProducts.length;
            const totalStockUnits = catProducts.reduce((sum, p) => sum + (Number(p.currentStock) || 0), 0);
            const totalValue = catProducts.reduce((sum, p) => sum + ((Number(p.currentStock) || 0) * (Number(p.purchasePrice) || 0)), 0);

            return {
                ...cat,
                totalProducts,
                totalStockUnits,
                totalValue,
                productsList: catProducts
            };
        });
    },

    /**
     * Render category table
     */
    renderTable() {
        const tbody = document.getElementById('categories-table-body');
        if (!tbody) return;

        let categories = this.getCategoriesWithStats();

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            categories = categories.filter(c => 
                c.name.toLowerCase().includes(q) || 
                (c.description && c.description.toLowerCase().includes(q))
            );
        }

        const countEl = document.getElementById('categories-count');
        if (countEl) countEl.textContent = categories.length;

        if (categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                        <div class="empty-state">
                            <i data-lucide="tags" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                            <p class="text-sm font-semibold text-slate-700">No categories found</p>
                            <p class="text-xs text-slate-400 mt-1">Add a new category to organize your products.</p>
                        </div>
                    </td>
                </tr>
            `;
            App.refreshIcons();
            return;
        }

        tbody.innerHTML = categories.map(cat => `
            <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs text-slate-700">
                <td class="px-4 py-3 font-mono font-medium text-slate-500">${cat.id}</td>
                <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 text-sm">${Utils.sanitizeHTML(cat.name)}</span>
                </td>
                <td class="px-4 py-3 text-slate-600 max-w-sm truncate">${Utils.sanitizeHTML(cat.description || '-')}</td>
                <td class="px-4 py-3 text-center">
                    <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        ${cat.totalProducts} items
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    ${cat.totalStockUnits.toLocaleString()} units
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                        <button type="button" onclick="CategoriesModule.viewCategory('${cat.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Category">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="CategoriesModule.openEditModal('${cat.id}')" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Category">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="CategoriesModule.deleteCategory('${cat.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Category">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        App.refreshIcons();
    },

    /**
     * Bind input and modal events
     */
    bindEvents() {
        const searchInput = document.getElementById('category-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderTable();
            });
        }

        const categoryForm = document.getElementById('category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCategory();
            });
        }

        const exportBtn = document.getElementById('export-categories-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }
    },

    /**
     * Open Modal to Add Category
     */
    openAddModal() {
        const form = document.getElementById('category-form');
        if (form) form.reset();
        document.getElementById('category-modal-id').value = '';
        document.getElementById('category-modal-title').textContent = 'Add Category';
        Utils.openModal('category-modal');
    },

    /**
     * Open Modal to Edit Category
     */
    openEditModal(id) {
        const category = window.StorageService.getItemById(window.StorageKeys.CATEGORIES, id);
        if (!category) return;

        document.getElementById('category-modal-id').value = category.id;
        document.getElementById('category-modal-title').textContent = 'Edit Category';
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-description').value = category.description || '';

        Utils.openModal('category-modal');
    },

    /**
     * View Category Details Modal
     */
    viewCategory(id) {
        const categories = this.getCategoriesWithStats();
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        const content = document.getElementById('view-category-content');
        if (content) {
            let productsHtml = '';
            if (cat.productsList.length === 0) {
                productsHtml = `<p class="text-xs text-slate-400 py-2">No products currently assigned to this category.</p>`;
            } else {
                productsHtml = `
                    <div class="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        ${cat.productsList.map(p => `
                            <div class="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                                <div>
                                    <span class="font-semibold text-slate-800">${Utils.sanitizeHTML(p.name)}</span>
                                    <span class="text-[11px] text-slate-400 font-mono ml-2">SKU: ${p.sku}</span>
                                </div>
                                <span class="font-bold text-slate-700">${p.currentStock} ${p.unit || 'units'}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            content.innerHTML = `
                <div class="space-y-4 text-xs">
                    <div class="pb-3 border-b border-slate-100">
                        <h4 class="text-base font-bold text-slate-900">${Utils.sanitizeHTML(cat.name)}</h4>
                        <p class="text-slate-500 font-mono mt-0.5">ID: ${cat.id}</p>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-lg">
                        <span class="text-slate-400 block text-[11px] mb-1">Description</span>
                        <p class="text-slate-700">${Utils.sanitizeHTML(cat.description || 'No description provided')}</p>
                    </div>
                    <div class="grid grid-cols-3 gap-3 text-center">
                        <div class="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                            <span class="text-indigo-600 block text-[11px]">Total Products</span>
                            <span class="text-base font-bold text-slate-900">${cat.totalProducts}</span>
                        </div>
                        <div class="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                            <span class="text-emerald-700 block text-[11px]">Total Stock Units</span>
                            <span class="text-base font-bold text-slate-900">${cat.totalStockUnits.toLocaleString()}</span>
                        </div>
                        <div class="p-3 bg-slate-100 rounded-lg border border-slate-200">
                            <span class="text-slate-600 block text-[11px]">Total Valuation</span>
                            <span class="text-xs font-mono font-bold text-slate-900">${Utils.formatCurrency(cat.totalValue)}</span>
                        </div>
                    </div>
                    <div>
                        <h5 class="font-bold text-slate-800 mb-2">Assigned Products</h5>
                        ${productsHtml}
                    </div>
                </div>
            `;
            Utils.openModal('view-category-modal');
        }
    },

    /**
     * Save Category (Unique name check)
     */
    saveCategory() {
        const id = document.getElementById('category-modal-id').value;
        const name = document.getElementById('category-name').value.trim();
        const description = document.getElementById('category-description').value.trim();

        if (!name) {
            Utils.showToast('Category name is required', 'error');
            return;
        }

        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const duplicate = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
        if (duplicate) {
            Utils.showToast(`A category named "${name}" already exists`, 'error');
            return;
        }

        if (id) {
            window.StorageService.updateItem(window.StorageKeys.CATEGORIES, id, { name, description });
            Utils.showToast(`Category "${name}" updated`, 'success');
        } else {
            const newCat = {
                id: Utils.generateId('CAT'),
                name,
                description,
                createdAt: new Date().toISOString()
            };
            window.StorageService.addItem(window.StorageKeys.CATEGORIES, newCat);
            Utils.showToast(`Category "${name}" created`, 'success');
        }

        Utils.closeModal('category-modal');
        this.renderTable();
    },

    /**
     * Safe Category Deletion: Prevent deleting categories with associated products!
     */
    deleteCategory(id) {
        const category = window.StorageService.getItemById(window.StorageKeys.CATEGORIES, id);
        if (!category) return;

        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const associatedProducts = products.filter(p => p.categoryId === id);

        if (associatedProducts.length > 0) {
            Utils.showConfirmModal({
                title: 'Cannot Delete Category',
                message: `This category is currently linked to ${associatedProducts.length} product(s) (such as "${associatedProducts[0].name}"). Please reassign or update these products to another category before deleting.`,
                confirmText: 'Understood',
                cancelText: 'Close',
                confirmColor: 'amber',
                onConfirm: () => {}
            });
            return;
        }

        Utils.showConfirmModal({
            title: 'Delete Category',
            message: `Are you sure you want to delete category "${category.name}"? This action cannot be undone.`,
            confirmText: 'Delete Category',
            confirmColor: 'rose',
            onConfirm: () => {
                window.StorageService.deleteItem(window.StorageKeys.CATEGORIES, id);
                Utils.showToast(`Category "${category.name}" removed`, 'success');
                this.renderTable();
            }
        });
    },

    /**
     * Export Categories to CSV
     */
    exportCSV() {
        const categories = this.getCategoriesWithStats();
        const headers = [
            { label: 'Category ID', key: 'id' },
            { label: 'Category Name', key: 'name' },
            { label: 'Description', key: 'description' },
            { label: 'Total Products', key: 'totalProducts' },
            { label: 'Total Stock Units', key: 'totalStockUnits' },
            { label: 'Total Inventory Value', key: 'totalValue' },
            { label: 'Created Date', key: 'createdAt' }
        ];

        const rows = categories.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            totalProducts: c.totalProducts,
            totalStockUnits: c.totalStockUnits,
            totalValue: c.totalValue,
            createdAt: Utils.formatDate(c.createdAt, false)
        }));

        Utils.exportToCSV('StockFlow_Categories', headers, rows);
    }
};

if (typeof window !== 'undefined') {
    window.CategoriesModule = CategoriesModule;
}
