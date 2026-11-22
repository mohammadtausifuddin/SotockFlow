/**
 * StockFlow - Stock In Module
 * Records incoming replenishment, updates product stock levels, logs STOCK_IN transactions.
 */

const StockInModule = {
    init() {
        this.populateDropdowns();
        this.bindEvents();
        this.checkUrlParams();
        this.renderRecentStockInTable();
        this.setInitialDefaults();
    },

    setInitialDefaults() {
        const dateInput = document.getElementById('stock-in-date');
        if (dateInput) {
            dateInput.value = Utils.formatInputDate(new Date());
        }

        const refInput = document.getElementById('stock-in-ref');
        if (refInput && !refInput.value) {
            refInput.value = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
    },

    /**
     * Check if opened with ?sku=... or ?productId=... from quick restock button
     */
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const sku = urlParams.get('sku');
        const productId = urlParams.get('productId');

        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        let targetProduct = null;

        if (sku) {
            targetProduct = products.find(p => p.sku === sku);
        } else if (productId) {
            targetProduct = products.find(p => p.id === productId);
        }

        if (targetProduct) {
            const selectEl = document.getElementById('stock-in-product');
            if (selectEl) {
                selectEl.value = targetProduct.id;
                this.onProductChange(targetProduct.id);
            }
        }
    },

    /**
     * Populate product and supplier select elements
     */
    populateDropdowns() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);

        const prodSelect = document.getElementById('stock-in-product');
        if (prodSelect) {
            prodSelect.innerHTML = `<option value="">-- Choose Product to Replenish --</option>` +
                products.map(p => `
                    <option value="${p.id}" data-supplier="${p.supplierId || ''}" data-purchase-price="${p.purchasePrice}" data-stock="${p.currentStock}" data-sku="${p.sku}" data-unit="${p.unit || 'Pcs'}">
                        ${Utils.sanitizeHTML(p.name)} (${p.sku}) - Current Stock: ${p.currentStock}
                    </option>
                `).join('');
        }

        const supSelect = document.getElementById('stock-in-supplier');
        if (supSelect) {
            supSelect.innerHTML = `<option value="">-- Select Supplier / Vendor --</option>` +
                suppliers.map(s => `<option value="${s.id}">${Utils.sanitizeHTML(s.name)} (${Utils.sanitizeHTML(s.company || 'Direct')})</option>`).join('');
        }
    },

    /**
     * Handle product selection: auto-populate purchase price, supplier, stock indicator
     */
    onProductChange(productId) {
        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, productId);
        const cardEl = document.getElementById('selected-product-card');
        const priceInput = document.getElementById('stock-in-price');
        const supSelect = document.getElementById('stock-in-supplier');

        if (!product) {
            if (cardEl) cardEl.classList.add('hidden');
            this.updateTotal();
            return;
        }

        // Auto pre-fill price and supplier
        if (priceInput) priceInput.value = product.purchasePrice || 0;
        if (supSelect && product.supplierId) {
            supSelect.value = product.supplierId;
        }

        // Show product summary pill
        if (cardEl) {
            const statusInfo = Utils.calculateStockStatus(product.currentStock, product.minStock);
            cardEl.innerHTML = `
                <div class="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                        <span class="font-bold text-slate-900 block text-sm">${Utils.sanitizeHTML(product.name)}</span>
                        <span class="font-mono text-slate-500">SKU: ${product.sku} | Unit: ${product.unit || 'Pcs'}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-slate-500 block text-[11px]">Current Physical Stock</span>
                        <span class="inline-flex items-center gap-1 font-bold text-slate-900 text-sm">
                            <span class="w-2 h-2 rounded-full ${statusInfo.dotClass}"></span>
                            ${product.currentStock} ${product.unit || 'Pcs'}
                        </span>
                    </div>
                </div>
            `;
            cardEl.classList.remove('hidden');
        }

        this.updateTotal();
    },

    /**
     * Calculate live total cost
     */
    updateTotal() {
        const qty = parseFloat(document.getElementById('stock-in-qty').value) || 0;
        const price = parseFloat(document.getElementById('stock-in-price').value) || 0;
        const total = qty * price;

        const totalEl = document.getElementById('stock-in-total-amount');
        if (totalEl) {
            totalEl.textContent = Utils.formatCurrency(total);
        }
    },

    /**
     * Bind form change and submit events
     */
    bindEvents() {
        const prodSelect = document.getElementById('stock-in-product');
        if (prodSelect) {
            prodSelect.addEventListener('change', (e) => {
                this.onProductChange(e.target.value);
            });
        }

        const qtyInput = document.getElementById('stock-in-qty');
        const priceInput = document.getElementById('stock-in-price');

        if (qtyInput) qtyInput.addEventListener('input', () => this.updateTotal());
        if (priceInput) priceInput.addEventListener('input', () => this.updateTotal());

        const form = document.getElementById('stock-in-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    },

    /**
     * Submit Stock In transaction
     */
    handleSubmit() {
        const productId = document.getElementById('stock-in-product').value;
        const supplierId = document.getElementById('stock-in-supplier').value;
        const quantity = parseInt(document.getElementById('stock-in-qty').value, 10);
        const unitPrice = parseFloat(document.getElementById('stock-in-price').value);
        const date = document.getElementById('stock-in-date').value;
        const referenceNo = document.getElementById('stock-in-ref').value.trim() || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const notes = document.getElementById('stock-in-notes').value.trim();

        // 1. Validations
        if (!productId) {
            Utils.showToast('Please select a product to replenish', 'error');
            return;
        }

        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, productId);
        if (!product) {
            Utils.showToast('Selected product does not exist', 'error');
            return;
        }

        if (isNaN(quantity) || quantity <= 0) {
            Utils.showToast('Quantity must be an integer greater than zero', 'error');
            return;
        }

        if (isNaN(unitPrice) || unitPrice < 0) {
            Utils.showToast('Unit purchase price cannot be negative', 'error');
            return;
        }

        const supplier = supplierId ? window.StorageService.getItemById(window.StorageKeys.SUPPLIERS, supplierId) : null;
        const supplierName = supplier ? supplier.name : 'Direct Purchase';

        const totalAmount = quantity * unitPrice;
        const newStock = (Number(product.currentStock) || 0) + quantity;

        // 2. Update Product Stock and optionally sync latest purchase price
        window.StorageService.updateItem(window.StorageKeys.PRODUCTS, product.id, {
            currentStock: newStock,
            purchasePrice: unitPrice > 0 ? unitPrice : product.purchasePrice
        });

        // 3. Create Transaction Record
        const transactionRecord = {
            id: `TXN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            type: 'STOCK_IN',
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            supplierId: supplier ? supplier.id : null,
            supplierName: supplierName,
            quantity: quantity,
            unitPrice: unitPrice,
            totalAmount: totalAmount,
            referenceNo: referenceNo,
            notes: notes,
            createdAt: new Date().toISOString()
        };

        window.StorageService.addItem(window.StorageKeys.TRANSACTIONS, transactionRecord);

        // 4. Success Toast
        Utils.showToast(`Stock replenished: +${quantity} ${product.unit || 'units'} of "${product.name}". New Stock: ${newStock}`, 'success');

        // 5. Reset form and update UI
        document.getElementById('stock-in-form').reset();
        document.getElementById('selected-product-card').classList.add('hidden');
        this.populateDropdowns();
        this.setInitialDefaults();
        this.updateTotal();
        this.renderRecentStockInTable();
    },

    /**
     * Render the latest stock in transactions table on this page
     */
    renderRecentStockInTable() {
        const tbody = document.getElementById('recent-stock-in-table');
        if (!tbody) return;

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const stockInTxns = transactions
            .filter(t => t.type === 'STOCK_IN')
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 6);

        if (stockInTxns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-xs text-slate-400">
                        No purchase transactions recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = stockInTxns.map(t => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 text-xs text-slate-700">
                <td class="px-3 py-2.5 font-mono font-medium text-slate-600">${t.referenceNo || t.id}</td>
                <td class="px-3 py-2.5 text-slate-500 whitespace-nowrap">${Utils.formatDate(t.date, false)}</td>
                <td class="px-3 py-2.5">
                    <span class="font-semibold text-slate-900 block truncate max-w-[160px]">${Utils.sanitizeHTML(t.productName)}</span>
                    <span class="text-[10px] font-mono text-slate-400">${t.sku}</span>
                </td>
                <td class="px-3 py-2.5 text-slate-600 max-w-[120px] truncate">${Utils.sanitizeHTML(t.supplierName || 'Direct')}</td>
                <td class="px-3 py-2.5 font-bold text-emerald-600 text-right">+${t.quantity}</td>
                <td class="px-3 py-2.5 font-mono font-bold text-slate-900 text-right">${Utils.formatCurrency(t.totalAmount)}</td>
            </tr>
        `).join('');
    }
};

if (typeof window !== 'undefined') {
    window.StockInModule = StockInModule;
}
