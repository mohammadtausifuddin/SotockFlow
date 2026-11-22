/**
 * StockFlow - Utility Module
 * Common helper functions, formatters, modal management, CSV exports, and toasts.
 */

const Utils = {
    /**
     * Currency symbols dictionary
     */
    currencySymbols: {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
    },

    /**
     * Format a numeric amount according to active currency setting
     */
    formatCurrency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) {
            amount = 0;
        }
        const settings = window.StorageService ? window.StorageService.getSettings() : { currency: 'INR' };
        const currencyCode = settings.currency || 'INR';
        const symbol = this.currencySymbols[currencyCode] || '₹';

        const num = Number(amount);
        let formatted = '';

        if (currencyCode === 'INR') {
            // Indian numbering system format (e.g., 1,00,000.00)
            formatted = num.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else {
            formatted = num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        return `${symbol}${formatted}`;
    },

    /**
     * Get the active currency symbol
     */
    getCurrencySymbol() {
        const settings = window.StorageService ? window.StorageService.getSettings() : { currency: 'INR' };
        return this.currencySymbols[settings.currency || 'INR'] || '₹';
    },

    /**
     * Format ISO date string according to settings format
     */
    formatDate(dateInput, includeTime = false) {
        if (!dateInput) return '-';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '-';

        const settings = window.StorageService ? window.StorageService.getSettings() : { dateFormat: 'DD/MM/YYYY' };
        const format = settings.dateFormat || 'DD/MM/YYYY';

        const pad = (n) => String(n).padStart(2, '0');
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();

        let formattedDate = `${day}/${month}/${year}`;
        if (format === 'MM/DD/YYYY') {
            formattedDate = `${month}/${day}/${year}`;
        } else if (format === 'YYYY-MM-DD') {
            formattedDate = `${year}-${month}-${day}`;
        }

        if (includeTime) {
            let hours = date.getHours();
            const minutes = pad(date.getMinutes());
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? pad(hours) : '12';
            formattedDate += ` ${hours}:${minutes} ${ampm}`;
        }

        return formattedDate;
    },

    /**
     * Format date for input[type="date"]
     */
    formatInputDate(date = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    },

    /**
     * Safe HTML string sanitizer
     */
    sanitizeHTML(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Generate readable unique ID
     */
    generateId(prefix = 'SF') {
        const random = Math.floor(1000 + Math.random() * 9000);
        const dateStr = Date.now().toString().slice(-4);
        return `${prefix}-${dateStr}-${random}`;
    },

    /**
     * Calculate stock status category and badge styling
     */
    calculateStockStatus(stock, minStock) {
        stock = Number(stock) || 0;
        minStock = Number(minStock) || 0;

        if (stock <= 0) {
            return {
                status: 'Out of Stock',
                key: 'out_of_stock',
                badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
                dotClass: 'bg-rose-500'
            };
        } else if (stock <= minStock) {
            return {
                status: 'Low Stock',
                key: 'low_stock',
                badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
                dotClass: 'bg-amber-500'
            };
        } else {
            return {
                status: 'In Stock',
                key: 'in_stock',
                badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                dotClass: 'bg-emerald-500'
            };
        }
    },

    /**
     * Show modern toast notification
     */
    showToast(message, type = 'info', duration = 3500) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: `<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
            error: `<svg class="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
            warning: `<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
            info: `<svg class="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        };

        const borderColors = {
            success: 'border-l-4 border-l-emerald-500',
            error: 'border-l-4 border-l-rose-500',
            warning: 'border-l-4 border-l-amber-500',
            info: 'border-l-4 border-l-indigo-500'
        };

        const toast = document.createElement('div');
        toast.className = `toast-item bg-white shadow-xl rounded-lg p-4 border border-slate-200 ${borderColors[type] || borderColors.info} flex items-start gap-3`;
        
        toast.innerHTML = `
            ${icons[type] || icons.info}
            <div class="flex-1 text-sm font-medium text-slate-800 leading-snug break-words">
                ${this.sanitizeHTML(message)}
            </div>
            <button type="button" class="text-slate-400 hover:text-slate-600 transition-colors ml-2 focus:outline-none" aria-label="Close notification">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;

        const closeBtn = toast.querySelector('button');
        const removeToast = () => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        };

        closeBtn.addEventListener('click', removeToast);

        container.appendChild(toast);
        // Trigger CSS animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto dismiss
        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    },

    /**
     * Modal Management Helpers
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('active');
        document.body.classList.add('overflow-hidden');

        // Focus first input if available
        const firstInput = modal.querySelector('input:not([type=hidden]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        // Add Escape key listener
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                Utils.closeModal(modalId);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
    },

    /**
     * Reusable Confirmation Dialog
     */
    showConfirmModal({
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmColor = 'rose', // 'rose', 'indigo', 'amber'
        onConfirm = () => {}
    }) {
        let modal = document.getElementById('generic-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'generic-confirm-modal';
            modal.className = 'modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="modal-container bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
                    <div class="p-6">
                        <div class="flex items-center gap-3 mb-3">
                            <div id="confirm-icon-wrap" class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <h3 id="confirm-modal-title" class="text-lg font-bold text-slate-800"></h3>
                        </div>
                        <p id="confirm-modal-msg" class="text-sm text-slate-600 mb-6 leading-relaxed"></p>
                        <div class="flex items-center justify-end gap-3">
                            <button type="button" id="confirm-btn-cancel" class="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"></button>
                            <button type="button" id="confirm-btn-ok" class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm"></button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const titleEl = modal.querySelector('#confirm-modal-title');
        const msgEl = modal.querySelector('#confirm-modal-msg');
        const okBtn = modal.querySelector('#confirm-btn-ok');
        const cancelBtn = modal.querySelector('#confirm-btn-cancel');
        const iconWrap = modal.querySelector('#confirm-icon-wrap');

        titleEl.textContent = title;
        msgEl.textContent = message;
        cancelBtn.textContent = cancelText;
        okBtn.textContent = confirmText;

        // Color variants
        if (confirmColor === 'rose') {
            iconWrap.className = 'w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0';
            okBtn.className = 'px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm';
        } else if (confirmColor === 'amber') {
            iconWrap.className = 'w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0';
            okBtn.className = 'px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm';
        } else {
            iconWrap.className = 'w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0';
            okBtn.className = 'px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm';
        }

        const handleCancel = () => {
            Utils.closeModal('generic-confirm-modal');
            cleanup();
        };

        const handleOk = () => {
            Utils.closeModal('generic-confirm-modal');
            cleanup();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };

        const handleBackdrop = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };

        function cleanup() {
            cancelBtn.removeEventListener('click', handleCancel);
            okBtn.removeEventListener('click', handleOk);
            modal.removeEventListener('click', handleBackdrop);
        }

        cancelBtn.addEventListener('click', handleCancel);
        okBtn.addEventListener('click', handleOk);
        modal.addEventListener('click', handleBackdrop);

        Utils.openModal('generic-confirm-modal');
    },

    /**
     * CSV Export Helper
     * Supports escaping commas, quotes, line breaks, and adds UTF-8 BOM
     */
    exportToCSV(filename, headers, rows) {
        if (!rows || !rows.length) {
            Utils.showToast('No records available to export', 'warning');
            return;
        }

        const escapeCSVValue = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val);
            if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return `"${str}"`;
        };

        const headerLine = headers.map(h => escapeCSVValue(h.label || h)).join(',');
        const contentLines = rows.map(row => {
            if (Array.isArray(row)) {
                return row.map(v => escapeCSVValue(v)).join(',');
            }
            return headers.map(h => escapeCSVValue(row[h.key || h])).join(',');
        });

        const csvString = '\uFEFF' + [headerLine, ...contentLines].join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Utils.showToast(`Exported ${rows.length} records to CSV`, 'success');
    },

    /**
     * Pagination Helper
     */
    paginate(items, currentPage = 1, pageSize = 10) {
        const totalItems = items.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const validPage = Math.min(Math.max(1, currentPage), totalPages);

        const startIndex = (validPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedItems = items.slice(startIndex, endIndex);

        return {
            items: paginatedItems,
            totalItems,
            totalPages,
            currentPage: validPage,
            pageSize,
            startIndex: totalItems > 0 ? startIndex + 1 : 0,
            endIndex,
            hasPrev: validPage > 1,
            hasNext: validPage < totalPages
        };
    },

    /**
     * Render reusable pagination controls
     */
    renderPaginationControls(containerId, paginationObj, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { totalItems, totalPages, currentPage, startIndex, endIndex, hasPrev, hasNext } = paginationObj;

        if (totalItems === 0) {
            container.innerHTML = `
                <div class="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 py-3 gap-2 w-full">
                    <span>No entries found</span>
                </div>
            `;
            return;
        }

        // Generate visible page numbers
        let pageNumbersHtml = '';
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            pageNumbersHtml += `
                <button type="button" data-page="${i}" class="pagination-page-btn px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive 
                        ? 'bg-indigo-600 text-white font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100'
                }">
                    ${i}
                </button>
            `;
        }

        container.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 py-3 gap-3 w-full">
                <div>
                    Showing <span class="font-semibold text-slate-900">${startIndex}</span> to <span class="font-semibold text-slate-900">${endIndex}</span> of <span class="font-semibold text-slate-900">${totalItems}</span> entries
                </div>
                <div class="flex items-center gap-1">
                    <button type="button" id="pagination-prev" class="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" ${!hasPrev ? 'disabled' : ''}>
                        Prev
                    </button>
                    <div class="flex items-center gap-1">
                        ${pageNumbersHtml}
                    </div>
                    <button type="button" id="pagination-next" class="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" ${!hasNext ? 'disabled' : ''}>
                        Next
                    </button>
                </div>
            </div>
        `;

        const prevBtn = container.querySelector('#pagination-prev');
        const nextBtn = container.querySelector('#pagination-next');
        const pageBtns = container.querySelectorAll('.pagination-page-btn');

        if (prevBtn && hasPrev) {
            prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
        }
        if (nextBtn && hasNext) {
            nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
        }
        pageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.getAttribute('data-page'), 10);
                if (p !== currentPage) {
                    onPageChange(p);
                }
            });
        });
    }
};

if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
