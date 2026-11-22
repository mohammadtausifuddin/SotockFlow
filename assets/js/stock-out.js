/**
 * StockFlow - Stock Out / Sales Module
 * Records product sales, ensures inventory cannot go negative, calculates gross profit, and logs STOCK_OUT transactions.
 */

const StockOutModule = {
    selectedProduct: null,

    init() {
        this.populateDropdowns();
        this.bindEvents();
        this.checkUrlParams();
        this.setInitialDefaults();
        this.renderRecentSalesTable();
    },

    setInitialDefaults() {
        const dateInput = document.getElementById('stock-out-date');
        if (dateInput) {
            dateInput.value = Utils.formatInputDate(new Date());
        }

        const refInput = document.getElementById('stock-out-ref');
        if (refInput && !refInput.value) {
            refInput.value = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
    },

    /**
     * Check if opened with ?sku=... or ?productId=...
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
            const selectEl = document.getElementById('stock-out-product');
            if (selectEl) {
                selectEl.value = targetProduct.id;
                this.onProductChange(targetProduct.id);
            }
        }
    },

    /**
     * Populate products dropdown
     */
    populateDropdowns() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const prodSelect = document.getElementById('stock-out-product');

        if (prodSelect) {
            prodSelect.innerHTML = `<option value="">-- Choose Product for Sale / Out --</option>` +
                products.map(p => {
                    const isOut = (Number(p.currentStock) || 0) <= 0;
                    return `
                        <option value="${p.id}" ${isOut ? 'class="text-rose-600 font-semibold"' : ''}>
                            ${Utils.sanitizeHTML(p.name)} (${p.sku}) - Stock: ${p.currentStock} ${p.unit || 'units'} ${isOut ? '[OUT OF STOCK]' : ''}
                        </option>
                    `;
                }).join('');
        }
    },

    /**
     * Product change event handler
     */
    onProductChange(productId) {
        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, productId);
        this.selectedProduct = product || null;

        const cardEl = document.getElementById('selected-product-card');
        const priceInput = document.getElementById('stock-out-price');
        const qtyInput = document.getElementById('stock-out-qty');
        const submitBtn = document.getElementById('stock-out-submit-btn');

        if (!product) {
            if (cardEl) cardEl.classList.add('hidden');
            if (priceInput) priceInput.value = '';
            this.updateCalculations();
            return;
        }

        const stock = Number(product.currentStock) || 0;
        const minStock = Number(product.minStock) || 0;
        const statusInfo = Utils.calculateStockStatus(stock, minStock);

        if (priceInput) {
            priceInput.value = product.sellingPrice || 0;
        }

        if (qtyInput) {
            qtyInput.max = stock;
            if (stock <= 0) {
                qtyInput.value = '0';
                qtyInput.disabled = true;
                if (submitBtn) submitBtn.disabled = true;
            } else {
                qtyInput.disabled = false;
                if (submitBtn) submitBtn.disabled = false;
                if (parseInt(qtyInput.value, 10) > stock) {
                    qtyInput.value = stock;
                }
            }
        }

        if (cardEl) {
            cardEl.innerHTML = `
                <div class="p-4 ${stock <= 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'} border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-slate-900 text-sm">${Utils.sanitizeHTML(product.name)}</span>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusInfo.badgeClass}">
                                <span class="w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}"></span>
                                ${statusInfo.status}
                            </span>
                        </div>
                        <span class="font-mono text-slate-500">SKU: ${product.sku} | Unit: ${product.unit || 'Pcs'}</span>
                    </div>

                    <div class="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        <div>
                            <span class="text-slate-400 block text-[11px]">Cost Price</span>
                            <span class="font-mono text-slate-700 font-semibold">${Utils.formatCurrency(product.purchasePrice)}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[11px]">Available Stock</span>
                            <span class="font-bold text-base ${stock <= 0 ? 'text-rose-600' : 'text-slate-900'}">${stock} ${product.unit || 'units'}</span>
                        </div>
                    </div>
                </div>
            `;
            cardEl.classList.remove('hidden');
        }

        this.updateCalculations();
    },

    /**
     * Compute live sale total and gross profit
     */
    updateCalculations() {
        const qty = parseFloat(document.getElementById('stock-out-qty').value) || 0;
        const sellingPrice = parseFloat(document.getElementById('stock-out-price').value) || 0;
        const purchasePrice = this.selectedProduct ? (Number(this.selectedProduct.purchasePrice) || 0) : 0;

        const totalSale = qty * sellingPrice;
        const grossProfit = (sellingPrice - purchasePrice) * qty;

        const totalSaleEl = document.getElementById('calc-total-sale');
        const profitEl = document.getElementById('calc-gross-profit');
        const profitBadgeEl = document.getElementById('calc-profit-badge');

        if (totalSaleEl) totalSaleEl.textContent = Utils.formatCurrency(totalSale);
        if (profitEl) profitEl.textContent = Utils.formatCurrency(grossProfit);

        if (profitBadgeEl) {
            if (grossProfit >= 0) {
                profitBadgeEl.className = 'text-[11px] font-bold text-emerald-600';
                profitBadgeEl.textContent = 'Profitable Sale';
            } else {
                profitBadgeEl.className = 'text-[11px] font-bold text-rose-600';
                profitBadgeEl.textContent = 'Selling below cost!';
            }
        }
    },

    /**
     * Bind form input events
     */
    bindEvents() {
        const prodSelect = document.getElementById('stock-out-product');
        if (prodSelect) {
            prodSelect.addEventListener('change', (e) => {
                this.onProductChange(e.target.value);
            });
        }

        const qtyInput = document.getElementById('stock-out-qty');
        const priceInput = document.getElementById('stock-out-price');

        if (qtyInput) {
            qtyInput.addEventListener('input', () => {
                if (this.selectedProduct) {
                    const stock = Number(this.selectedProduct.currentStock) || 0;
                    const val = parseInt(qtyInput.value, 10);
                    if (val > stock) {
                        Utils.showToast(`Warning: Cannot exceed available stock of ${stock} units`, 'warning');
                        qtyInput.value = stock;
                    }
                }
                this.updateCalculations();
            });
        }

        if (priceInput) priceInput.addEventListener('input', () => this.updateCalculations());

        const form = document.getElementById('stock-out-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    },

    /**
     * Submit Stock Out / Sale transaction
     */
    handleSubmit() {
        const productId = document.getElementById('stock-out-product').value;
        const quantity = parseInt(document.getElementById('stock-out-qty').value, 10);
        const sellingPrice = parseFloat(document.getElementById('stock-out-price').value);
        const customerName = document.getElementById('stock-out-customer').value.trim() || 'Walk-in Customer';
        const referenceNo = document.getElementById('stock-out-ref').value.trim() || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const date = document.getElementById('stock-out-date').value;
        const notes = document.getElementById('stock-out-notes').value.trim();

        // 1. Validations
        if (!productId) {
            Utils.showToast('Please select a product for stock removal/sale', 'error');
            return;
        }

        const product = window.StorageService.getItemById(window.StorageKeys.PRODUCTS, productId);
        if (!product) {
            Utils.showToast('Selected product does not exist', 'error');
            return;
        }

        if (isNaN(quantity) || quantity <= 0) {
            Utils.showToast('Quantity must be greater than zero', 'error');
            return;
        }

        const availableStock = Number(product.currentStock) || 0;

        // INVENTORY NEVER BECOMES NEGATIVE!
        if (quantity > availableStock) {
            Utils.showToast(`Insufficient stock! Available stock is only ${availableStock} units. Cannot complete sale.`, 'error');
            return;
        }

        if (isNaN(sellingPrice) || sellingPrice < 0) {
            Utils.showToast('Selling price cannot be negative', 'error');
            return;
        }

        const purchasePrice = Number(product.purchasePrice) || 0;
        const totalAmount = quantity * sellingPrice;
        const grossProfit = (sellingPrice - purchasePrice) * quantity;
        const newStock = availableStock - quantity;

        // 2. Reduce product currentStock
        window.StorageService.updateItem(window.StorageKeys.PRODUCTS, product.id, {
            currentStock: newStock
        });

        // 3. Create Transaction Record
        const transactionRecord = {
            id: `TXN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            type: 'STOCK_OUT',
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            customerName: customerName,
            quantity: quantity,
            unitPrice: sellingPrice,
            purchasePriceAtSale: purchasePrice,
            totalAmount: totalAmount,
            grossProfit: grossProfit,
            referenceNo: referenceNo,
            notes: notes,
            createdAt: new Date().toISOString()
        };

        window.StorageService.addItem(window.StorageKeys.TRANSACTIONS, transactionRecord);

        // 4. Notification
        Utils.showToast(`Sale recorded successfully! -${quantity} ${product.unit || 'units'} of "${product.name}". Remaining: ${newStock}`, 'success');

        // 5. Reset UI
        document.getElementById('stock-out-form').reset();
        this.selectedProduct = null;
        document.getElementById('selected-product-card').classList.add('hidden');
        this.populateDropdowns();
        this.setInitialDefaults();
        this.updateCalculations();
        this.renderRecentSalesTable();
    },

    /**
     * Render the latest sales transactions table on this page
     */
    renderRecentSalesTable() {
        const tbody = document.getElementById('recent-sales-table');
        if (!tbody) return;

        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);
        const salesTxns = transactions
            .filter(t => t.type === 'STOCK_OUT')
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .slice(0, 6);

        if (salesTxns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-xs text-slate-400">
                        No sales recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = salesTxns.map(t => `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 text-xs text-slate-700">
                <td class="px-3 py-2.5 font-mono font-medium text-slate-600">${t.referenceNo || t.id}</td>
                <td class="px-3 py-2.5 text-slate-500 whitespace-nowrap">${Utils.formatDate(t.date, false)}</td>
                <td class="px-3 py-2.5">
                    <span class="font-semibold text-slate-900 block truncate max-w-[160px]">${Utils.sanitizeHTML(t.productName)}</span>
                    <span class="text-[10px] font-mono text-slate-400">${t.sku}</span>
                </td>
                <td class="px-3 py-2.5 text-slate-600 max-w-[120px] truncate">${Utils.sanitizeHTML(t.customerName || 'Walk-in')}</td>
                <td class="px-3 py-2.5 font-bold text-rose-600 text-right">-${t.quantity}</td>
                <td class="px-3 py-2.5 font-mono font-bold text-slate-900 text-right">${Utils.formatCurrency(t.totalAmount)}</td>
            </tr>
        `).join('');
    }
};

if (typeof window !== 'undefined') {
    window.StockOutModule = StockOutModule;
}
