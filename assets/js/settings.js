/**
 * StockFlow - Settings & Data Management Module
 * Manages store profile, inventory configurations, currency/date formats, and backup/restore.
 */

const SettingsModule = {
    init() {
        this.loadSettings();
        this.bindEvents();
    },

    /**
     * Load settings into form inputs
     */
    loadSettings() {
        const settings = window.StorageService.getSettings();

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) el.value = val;
        };

        setVal('setting-store-name', settings.storeName || '');
        setVal('setting-store-phone', settings.storePhone || '');
        setVal('setting-store-email', settings.storeEmail || '');
        setVal('setting-store-address', settings.storeAddress || '');
        setVal('setting-tax-id', settings.taxId || '');
        setVal('setting-low-stock-threshold', settings.defaultLowStockThreshold || 10);
        setVal('setting-currency', settings.currency || 'INR');
        setVal('setting-date-format', settings.dateFormat || 'DD/MM/YYYY');

        // Update storage statistics
        this.updateDataStats();
    },

    /**
     * Display database record counters
     */
    updateDataStats() {
        const products = window.StorageService.getData(window.StorageKeys.PRODUCTS);
        const categories = window.StorageService.getData(window.StorageKeys.CATEGORIES);
        const suppliers = window.StorageService.getData(window.StorageKeys.SUPPLIERS);
        const transactions = window.StorageService.getData(window.StorageKeys.TRANSACTIONS);

        const setStat = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setStat('stat-db-products', products.length);
        setStat('stat-db-categories', categories.length);
        setStat('stat-db-suppliers', suppliers.length);
        setStat('stat-db-transactions', transactions.length);
    },

    /**
     * Bind form submissions and action buttons
     */
    bindEvents() {
        // Save Settings Form
        const form = document.getElementById('settings-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Reset Settings Only
        const resetSettingsBtn = document.getElementById('reset-settings-btn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.confirmResetSettings());
        }

        // Reset Demo Sample Data
        const resetDemoDataBtn = document.getElementById('reset-demo-data-btn');
        if (resetDemoDataBtn) {
            resetDemoDataBtn.addEventListener('click', () => this.confirmResetDemoData());
        }

        // Factory Clear All Data
        const clearAllDataBtn = document.getElementById('clear-all-data-btn');
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => this.confirmClearAllData());
        }

        // Export JSON Backup
        const exportJsonBtn = document.getElementById('export-json-backup-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportBackupJSON());
        }

        // Import JSON Backup File
        const importInput = document.getElementById('import-json-input');
        if (importInput) {
            importInput.addEventListener('change', (e) => this.handleFileImport(e));
        }
    },

    /**
     * Save settings to LocalStorage
     */
    saveSettings() {
        const storeName = document.getElementById('setting-store-name').value.trim();
        const storePhone = document.getElementById('setting-store-phone').value.trim();
        const storeEmail = document.getElementById('setting-store-email').value.trim();
        const storeAddress = document.getElementById('setting-store-address').value.trim();
        const taxId = document.getElementById('setting-tax-id').value.trim();
        const defaultLowStockThreshold = parseInt(document.getElementById('setting-low-stock-threshold').value, 10);
        const currency = document.getElementById('setting-currency').value;
        const dateFormat = document.getElementById('setting-date-format').value;

        if (!storeName) {
            Utils.showToast('Store name cannot be empty', 'error');
            return;
        }

        const payload = {
            storeName,
            storePhone,
            storeEmail,
            storeAddress,
            taxId,
            defaultLowStockThreshold: isNaN(defaultLowStockThreshold) ? 10 : defaultLowStockThreshold,
            currency,
            dateFormat
        };

        window.StorageService.saveSettings(payload);
        Utils.showToast('Settings saved successfully', 'success');

        // Update header and sidebar store name dynamically
        const headerStore = document.getElementById('sidebar-store-name');
        if (headerStore) headerStore.textContent = storeName;

        setTimeout(() => {
            window.location.reload();
        }, 800);
    },

    /**
     * Revert settings to defaults
     */
    confirmResetSettings() {
        Utils.showConfirmModal({
            title: 'Reset Store Settings',
            message: 'Are you sure you want to revert store and inventory settings to system defaults? Your products, categories, suppliers, and transaction records will NOT be deleted.',
            confirmText: 'Reset Settings',
            confirmColor: 'amber',
            onConfirm: () => {
                window.StorageService.resetSettings();
                Utils.showToast('Settings reverted to defaults', 'success');
                setTimeout(() => window.location.reload(), 600);
            }
        });
    },

    /**
     * Reload Initial Demo Sample Data
     */
    confirmResetDemoData() {
        Utils.showConfirmModal({
            title: 'Reload Demo Sample Data',
            message: 'This will reset products, categories, suppliers, and transactions back to the original demo dataset (12 products, 5 categories, 5 suppliers, 18 transactions). Any custom changes will be overwritten. Proceed?',
            confirmText: 'Reload Sample Data',
            confirmColor: 'rose',
            onConfirm: () => {
                window.StorageService.initSampleData(true);
                Utils.showToast('Demo sample data successfully reloaded', 'success');
                setTimeout(() => window.location.reload(), 800);
            }
        });
    },

    /**
     * Factory Clear All Data
     */
    confirmClearAllData() {
        Utils.showConfirmModal({
            title: 'DANGER: Factory Reset',
            message: 'Are you completely sure? This will permanently delete ALL products, transactions, categories, suppliers, and configuration from browser LocalStorage! This cannot be undone.',
            confirmText: 'Delete Everything',
            confirmColor: 'rose',
            onConfirm: () => {
                window.StorageService.clearAllData();
                Utils.showToast('All data has been cleared from LocalStorage', 'warning');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
            }
        });
    },

    /**
     * Export complete database as JSON backup
     */
    exportBackupJSON() {
        const backupData = window.StorageService.exportAllJSON();
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `StockFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showToast('JSON Backup downloaded successfully', 'success');
    },

    /**
     * Handle JSON file import
     */
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const result = window.StorageService.importAllJSON(content);
                if (result.success) {
                    Utils.showToast('Data restored successfully! Refreshing...', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    Utils.showToast(`Import failed: ${result.error}`, 'error');
                }
            } catch (err) {
                Utils.showToast(`Invalid JSON file format: ${err.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }
};

if (typeof window !== 'undefined') {
    window.SettingsModule = SettingsModule;
}
