/**
 * StockFlow - Suppliers Management Module
 * Handles supplier directory, contact info validation, product association protection, and CSV export.
 */

const SuppliersModule = {
    searchQuery: '',

    init() {
        this.bindEvents();
        this.renderTable();
    },

    /**
     * Get suppliers with dynamic calculation of products supplied
     */
    getSuppliersWithStats() {
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);

        return suppliers.map(sup => {
            const suppliedProducts = products.filter(p => p.supplierId === sup.id);
            return {
                ...sup,
                productsCount: suppliedProducts.length,
                productsList: suppliedProducts
            };
        });
    },

    /**
     * Render the suppliers table
     */
    renderTable() {
        const tbody = document.getElementById('suppliers-table-body');
        if (!tbody) return;

        let suppliers = this.getSuppliersWithStats();

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            suppliers = suppliers.filter(s =>
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.company && s.company.toLowerCase().includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.phone && s.phone.toLowerCase().includes(q))
            );
        }

        const countEl = document.getElementById('suppliers-count');
        if (countEl) countEl.textContent = suppliers.length;

        if (suppliers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-slate-500">
                        <div class="empty-state">
                            <i data-lucide="truck" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                            <p class="text-sm font-semibold text-slate-700">No suppliers found</p>
                            <p class="text-xs text-slate-400 mt-1">Add a vendor or supplier to track stock intake.</p>
                        </div>
                    </td>
                </tr>
            `;
            App.refreshIcons();
            return;
        }

        tbody.innerHTML = suppliers.map(sup => `
            <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs text-slate-700">
                <td class="px-4 py-3 font-mono font-medium text-slate-500">${sup.id}</td>
                <td class="px-4 py-3">
                    <span class="font-bold text-slate-900 text-sm block">${Utils.sanitizeHTML(sup.name)}</span>
                    <span class="text-[11px] text-slate-400 font-medium">${Utils.sanitizeHTML(sup.company || '-')}</span>
                </td>
                <td class="px-4 py-3 font-medium text-slate-700">${Utils.sanitizeHTML(sup.company || '-')}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${Utils.sanitizeHTML(sup.phone || '-')}</td>
                <td class="px-4 py-3 text-slate-600">${Utils.sanitizeHTML(sup.email || '-')}</td>
                <td class="px-4 py-3 text-center">
                    <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${sup.productsCount > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}">
                        ${sup.productsCount} products
                    </span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                        <button type="button" onclick="SuppliersModule.viewSupplier('${sup.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="View Supplier">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="SuppliersModule.openEditModal('${sup.id}')" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Edit Supplier">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="SuppliersModule.deleteSupplier('${sup.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Supplier">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        App.refreshIcons();
    },

    /**
     * Bind form and search events
     */
    bindEvents() {
        const searchInput = document.getElementById('supplier-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.renderTable();
            });
        }

        const supplierForm = document.getElementById('supplier-form');
        if (supplierForm) {
            supplierForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSupplier();
            });
        }

        const exportBtn = document.getElementById('export-suppliers-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }
    },

    /**
     * Open Modal to Add Supplier
     */
    openAddModal() {
        const form = document.getElementById('supplier-form');
        if (form) form.reset();
        document.getElementById('supplier-modal-id').value = '';
        document.getElementById('supplier-modal-title').textContent = 'Add New Supplier';
        Utils.openModal('supplier-modal');
    },

    /**
     * Open Modal to Edit Supplier
     */
    openEditModal(id) {
        const supplier = window.StorageService.getItemById(window.StorageKeys.SUPPLIERS, id);
        if (!supplier) return;

        document.getElementById('supplier-modal-id').value = supplier.id;
        document.getElementById('supplier-modal-title').textContent = 'Edit Supplier';
        document.getElementById('sup-name').value = supplier.name;
        document.getElementById('sup-company').value = supplier.company || '';
        document.getElementById('sup-phone').value = supplier.phone || '';
        document.getElementById('sup-email').value = supplier.email || '';
        document.getElementById('sup-address').value = supplier.address || '';
        document.getElementById('sup-notes').value = supplier.notes || '';

        Utils.openModal('supplier-modal');
    },

    /**
     * View Supplier Details Modal
     */
    viewSupplier(id) {
        const suppliers = this.getSuppliersWithStats();
        const sup = suppliers.find(s => s.id === id);
        if (!sup) return;

        const content = document.getElementById('view-supplier-content');
        if (content) {
            let productsListHtml = '';
            if (sup.productsList.length === 0) {
                productsListHtml = `<p class="text-xs text-slate-400 py-2">No catalog items linked to this supplier yet.</p>`;
            } else {
                productsListHtml = `
                    <div class="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        ${sup.productsList.map(p => `
                            <div class="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                                <div>
                                    <span class="font-semibold text-slate-800">${Utils.sanitizeHTML(p.name)}</span>
                                    <span class="text-[11px] text-slate-400 font-mono ml-2">SKU: ${p.sku}</span>
                                </div>
                                <div class="text-right">
                                    <span class="font-mono text-slate-600 block">${Utils.formatCurrency(p.purchasePrice)}</span>
                                    <span class="text-[10px] text-slate-400">Stock: ${p.currentStock}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            content.innerHTML = `
                <div class="space-y-4 text-xs">
                    <div class="pb-3 border-b border-slate-100">
                        <h4 class="text-base font-bold text-slate-900">${Utils.sanitizeHTML(sup.name)}</h4>
                        <p class="text-slate-500 font-medium">${Utils.sanitizeHTML(sup.company || 'Direct Supplier')} | ID: ${sup.id}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Phone Number</span>
                            <span class="font-mono font-semibold text-slate-800">${Utils.sanitizeHTML(sup.phone || '-')}</span>
                        </div>
                        <div class="p-3 bg-slate-50 rounded-lg">
                            <span class="text-slate-400 block text-[11px]">Email Address</span>
                            <span class="font-semibold text-slate-800">${Utils.sanitizeHTML(sup.email || '-')}</span>
                        </div>
                    </div>

                    <div class="p-3 bg-slate-50 rounded-lg">
                        <span class="text-slate-400 block text-[11px] mb-1">Office / Warehouse Address</span>
                        <p class="text-slate-700 leading-relaxed">${Utils.sanitizeHTML(sup.address || 'No physical address provided')}</p>
                    </div>

                    <div class="p-3 bg-slate-50 rounded-lg">
                        <span class="text-slate-400 block text-[11px] mb-1">Internal Notes & Terms</span>
                        <p class="text-slate-700 leading-relaxed">${Utils.sanitizeHTML(sup.notes || 'No internal notes recorded')}</p>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h5 class="font-bold text-slate-800">Supplied Products</h5>
                            <span class="text-indigo-600 font-semibold text-xs">${sup.productsCount} items</span>
                        </div>
                        ${productsListHtml}
                    </div>
                </div>
            `;
            Utils.openModal('view-supplier-modal');
        }
    },

    /**
     * Save Supplier with validation
     */
    saveSupplier() {
        const id = document.getElementById('supplier-modal-id').value;
        const name = document.getElementById('sup-name').value.trim();
        const company = document.getElementById('sup-company').value.trim();
        const phone = document.getElementById('sup-phone').value.trim();
        const email = document.getElementById('sup-email').value.trim();
        const address = document.getElementById('sup-address').value.trim();
        const notes = document.getElementById('sup-notes').value.trim();

        if (!name) {
            Utils.showToast('Supplier name is required', 'error');
            return;
        }

        // Email validation if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Utils.showToast('Please enter a valid email address', 'error');
                return;
            }

            // Check duplicate email
            const allSuppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
            const dupEmail = allSuppliers.find(s => s.email && s.email.toLowerCase() === email.toLowerCase() && s.id !== id);
            if (dupEmail) {
                Utils.showToast(`Email '${email}' is already registered for supplier '${dupEmail.name}'`, 'error');
                return;
            }
        }

        const payload = {
            name,
            company,
            phone,
            email,
            address,
            notes
        };

        if (id) {
            window.StorageService.updateItem(window.StorageKeys.SUPPLIERS, id, payload);
            Utils.showToast(`Supplier "${name}" updated`, 'success');
        } else {
            payload.id = Utils.generateId('SUP');
            payload.createdAt = new Date().toISOString();
            window.StorageService.addItem(window.StorageKeys.SUPPLIERS, payload);
            Utils.showToast(`Supplier "${name}" created`, 'success');
        }

        Utils.closeModal('supplier-modal');
        this.renderTable();
    },

    /**
     * Safe Supplier Deletion: Prevent deleting suppliers linked to active products!
     */
    deleteSupplier(id) {
        const supplier = window.StorageService.getItemById(window.StorageKeys.SUPPLIERS, id);
        if (!supplier) return;

        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const suppliedProducts = products.filter(p => p.supplierId === id);

        if (suppliedProducts.length > 0) {
            Utils.showConfirmModal({
                title: 'Cannot Delete Supplier',
                message: `This supplier is currently associated with ${suppliedProducts.length} product(s) (including "${suppliedProducts[0].name}"). Please reassign these products to another supplier before deleting.`,
                confirmText: 'Understood',
                cancelText: 'Close',
                confirmColor: 'amber',
                onConfirm: () => {}
            });
            return;
        }

        Utils.showConfirmModal({
            title: 'Delete Supplier',
            message: `Are you sure you want to delete supplier "${supplier.name}"? This action cannot be reversed.`,
            confirmText: 'Delete Supplier',
            confirmColor: 'rose',
            onConfirm: () => {
                window.StorageService.deleteItem(window.StorageKeys.SUPPLIERS, id);
                Utils.showToast(`Supplier "${supplier.name}" deleted`, 'success');
                this.renderTable();
            }
        });
    },

    /**
     * Export Suppliers to CSV
     */
    exportCSV() {
        const suppliers = this.getSuppliersWithStats();
        const headers = [
            { label: 'Supplier ID', key: 'id' },
            { label: 'Supplier Name', key: 'name' },
            { label: 'Company', key: 'company' },
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Address', key: 'address' },
            { label: 'Products Supplied Count', key: 'productsCount' },
            { label: 'Created Date', key: 'createdAt' }
        ];

        const rows = suppliers.map(s => ({
            id: s.id,
            name: s.name,
            company: s.company || '',
            phone: s.phone || '',
            email: s.email || '',
            address: s.address || '',
            productsCount: s.productsCount,
            createdAt: Utils.formatDate(s.createdAt, false)
        }));

        Utils.exportToCSV('StockFlow_Suppliers', headers, rows);
    }
};

if (typeof window !== 'undefined') {
    window.SuppliersModule = SuppliersModule;
}
