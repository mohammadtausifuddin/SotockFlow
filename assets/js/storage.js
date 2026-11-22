/**
 * StockFlow - Centralized Storage Module
 * Handles all LocalStorage interactions, data persistence, and sample data seeding.
 */

const StorageKeys = {
    PRODUCTS: 'ims_products',
    CATEGORIES: 'ims_categories',
    SUPPLIERS: 'ims_suppliers',
    TRANSACTIONS: 'ims_transactions',
    SETTINGS: 'ims_settings'
};

const DefaultSettings = {
    storeName: 'StockFlow Retail & Tech Solutions',
    storePhone: '+91 98765 43210',
    storeEmail: 'support@stockflow.internal',
    storeAddress: 'Suite 402, Tech Hub Plaza, Bengaluru, Karnataka 560001',
    taxId: 'GSTIN29AAACB1234F1Z8',
    defaultLowStockThreshold: 10,
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY'
};

const StorageService = {
    /**
     * Retrieve data from LocalStorage
     */
    getData(key) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return [];
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return [];
        }
    },

    /**
     * Save data array or object to LocalStorage
     */
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error writing ${key} to localStorage:`, error);
            return false;
        }
    },

    /**
     * Add a single item to an array collection
     */
    addItem(key, item) {
        const collection = this.getData(key);
        if (!item.id) {
            item.id = StorageService.generateUUID();
        }
        if (!item.createdAt) {
            item.createdAt = new Date().toISOString();
        }
        collection.push(item);
        this.saveData(key, collection);
        return item;
    },

    /**
     * Update an existing item by its ID
     */
    updateItem(key, id, updatedItem) {
        const collection = this.getData(key);
        const index = collection.findIndex(item => item.id === id);
        if (index !== -1) {
            collection[index] = { ...collection[index], ...updatedItem, updatedAt: new Date().toISOString() };
            this.saveData(key, collection);
            return collection[index];
        }
        return null;
    },

    /**
     * Delete an item by its ID
     */
    deleteItem(key, id) {
        const collection = this.getData(key);
        const filtered = collection.filter(item => item.id !== id);
        this.saveData(key, filtered);
        return filtered.length < collection.length;
    },

    /**
     * Retrieve a single item by its ID
     */
    getItemById(key, id) {
        const collection = this.getData(key);
        return collection.find(item => item.id === id) || null;
    },

    /**
     * Get Settings object
     */
    getSettings() {
        try {
            const raw = localStorage.getItem(StorageKeys.SETTINGS);
            if (!raw) {
                this.saveData(StorageKeys.SETTINGS, DefaultSettings);
                return { ...DefaultSettings };
            }
            return { ...DefaultSettings, ...JSON.parse(raw) };
        } catch (e) {
            console.error('Error fetching settings:', e);
            return { ...DefaultSettings };
        }
    },

    /**
     * Save Settings object
     */
    saveSettings(settings) {
        return this.saveData(StorageKeys.SETTINGS, { ...DefaultSettings, ...settings });
    },

    /**
     * Reset settings to default without touching products or transactions
     */
    resetSettings() {
        return this.saveData(StorageKeys.SETTINGS, DefaultSettings);
    },

    /**
     * Helper to generate unique UUID with fallback
     */
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
    },

    /**
     * Export all data as a single JSON object for backup
     */
    exportAllJSON() {
        return {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            settings: this.getSettings(),
            categories: this.getData(StorageKeys.CATEGORIES),
            suppliers: this.getData(StorageKeys.SUPPLIERS),
            products: this.getData(StorageKeys.PRODUCTS),
            transactions: this.getData(StorageKeys.TRANSACTIONS)
        };
    },

    /**
     * Import JSON data and restore into LocalStorage
     */
    importAllJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed.settings) this.saveData(StorageKeys.SETTINGS, parsed.settings);
            if (Array.isArray(parsed.categories)) this.saveData(StorageKeys.CATEGORIES, parsed.categories);
            if (Array.isArray(parsed.suppliers)) this.saveData(StorageKeys.SUPPLIERS, parsed.suppliers);
            if (Array.isArray(parsed.products)) this.saveData(StorageKeys.PRODUCTS, parsed.products);
            if (Array.isArray(parsed.transactions)) this.saveData(StorageKeys.TRANSACTIONS, parsed.transactions);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    /**
     * Clear all application data
     */
    clearAllData() {
        localStorage.removeItem(StorageKeys.PRODUCTS);
        localStorage.removeItem(StorageKeys.CATEGORIES);
        localStorage.removeItem(StorageKeys.SUPPLIERS);
        localStorage.removeItem(StorageKeys.TRANSACTIONS);
        localStorage.removeItem(StorageKeys.SETTINGS);
    },

    /**
     * Initialize sample demo data only on first launch or when forced
     */
    initSampleData(force = false) {
        const existingProducts = localStorage.getItem(StorageKeys.PRODUCTS);
        if (existingProducts && !force) {
            return false; // Already initialized, keep existing user data intact
        }

        // 1. Five Categories
        const sampleCategories = [
            {
                id: 'cat-elec',
                name: 'Electronics',
                description: 'Computers, display panels, monitors and computing equipment',
                createdAt: '2026-01-10T09:00:00.000Z'
            },
            {
                id: 'cat-acc',
                name: 'Accessories',
                description: 'Cables, keyboards, mice, adapters and computer peripherals',
                createdAt: '2026-01-10T09:05:00.000Z'
            },
            {
                id: 'cat-stat',
                name: 'Stationery',
                description: 'Notebooks, writing instruments, paper products and desk accessories',
                createdAt: '2026-01-10T09:10:00.000Z'
            },
            {
                id: 'cat-off',
                name: 'Office Supplies',
                description: 'Printing hardware, consumables, inks, staplers and shredders',
                createdAt: '2026-01-10T09:15:00.000Z'
            },
            {
                id: 'cat-furn',
                name: 'Furniture',
                description: 'Ergonomic chairs, executive desks, filing cabinets and stands',
                createdAt: '2026-01-10T09:20:00.000Z'
            }
        ];

        // 2. Five Suppliers
        const sampleSuppliers = [
            {
                id: 'sup-tech',
                name: 'Techtronics India Pvt Ltd',
                company: 'Techtronics Distribution Corp',
                phone: '+91 80 2345 6789',
                email: 'sales@techtronicsindia.com',
                address: 'Plot 45, Electronic City Phase 1, Bengaluru, Karnataka 560100',
                notes: 'Primary authorized distributor for computing hardware and displays.',
                createdAt: '2026-01-12T10:00:00.000Z'
            },
            {
                id: 'sup-prec',
                name: 'Precision Peripherals LLP',
                company: 'Precision Peripherals Supplies',
                phone: '+91 22 4567 8901',
                email: 'orders@precisionperiph.in',
                address: 'Gala 12, Andheri Industrial Estate, Mumbai, Maharashtra 400053',
                notes: 'High-speed delivery for mice, keyboards, webcams and USB components.',
                createdAt: '2026-01-12T10:30:00.000Z'
            },
            {
                id: 'sup-apex',
                name: 'Apex Paper & Stationery Works',
                company: 'Apex Mercantile Syndicate',
                phone: '+91 11 2890 1234',
                email: 'contact@apexstationery.org',
                address: 'Chawri Bazar Wholesale Market, Old Delhi, Delhi 110006',
                notes: 'Bulk pricing supplier for premium notebooks and office pens.',
                createdAt: '2026-01-12T11:00:00.000Z'
            },
            {
                id: 'sup-ergo',
                name: 'Ergonomix Office Solutions',
                company: 'Ergonomix Workspaces Ltd',
                phone: '+91 44 3322 1100',
                email: 'support@ergonomixwork.in',
                address: 'Guindy Industrial Estate, Chennai, Tamil Nadu 600032',
                notes: 'Certified ergonomic furniture manufacturer and importer.',
                createdAt: '2026-01-12T11:30:00.000Z'
            },
            {
                id: 'sup-prime',
                name: 'Prime Hardware & Components',
                company: 'Prime Global Logistics',
                phone: '+91 40 6789 0123',
                email: 'info@primehardware.co.in',
                address: 'Madhapur High-Tech Enclave, Hyderabad, Telangana 500081',
                notes: 'Audio hardware, headphones and printing consumables distributor.',
                createdAt: '2026-01-12T12:00:00.000Z'
            }
        ];

        // 3. Twelve Products (Normal stock, Low stock, Out of stock)
        const sampleProducts = [
            {
                id: 'prod-001',
                name: 'Business Pro Laptop 15.6"',
                sku: 'LAP-PRO-15',
                categoryId: 'cat-elec',
                supplierId: 'sup-tech',
                purchasePrice: 42000,
                sellingPrice: 56500,
                currentStock: 16,
                minStock: 5,
                unit: 'Pcs',
                description: 'Intel Core i5, 16GB DDR5 RAM, 512GB NVMe SSD, FHD Anti-glare Display',
                createdAt: '2026-01-15T08:00:00.000Z'
            },
            {
                id: 'prod-002',
                name: 'Ergonomic Wireless Mouse',
                sku: 'MOU-WL-01',
                categoryId: 'cat-acc',
                supplierId: 'sup-prec',
                purchasePrice: 480,
                sellingPrice: 850,
                currentStock: 4, // LOW STOCK
                minStock: 10,
                unit: 'Pcs',
                description: '2.4GHz & Bluetooth dual-mode wireless mouse with silent clicks and DPI toggle',
                createdAt: '2026-01-15T08:10:00.000Z'
            },
            {
                id: 'prod-003',
                name: 'Mechanical RGB Keyboard',
                sku: 'KB-MEC-RGB',
                categoryId: 'cat-acc',
                supplierId: 'sup-prec',
                purchasePrice: 1600,
                sellingPrice: 2899,
                currentStock: 24,
                minStock: 8,
                unit: 'Pcs',
                description: 'Hot-swappable tactile brown switches with braided type-C cable',
                createdAt: '2026-01-15T08:20:00.000Z'
            },
            {
                id: 'prod-004',
                name: '27-inch IPS Ultra-Slim Monitor',
                sku: 'MON-27-IPS',
                categoryId: 'cat-elec',
                supplierId: 'sup-tech',
                purchasePrice: 12500,
                sellingPrice: 17200,
                currentStock: 3, // LOW STOCK
                minStock: 6,
                unit: 'Pcs',
                description: 'Full HD 100Hz Refresh Rate, 99% sRGB color gamut, HDMI & DisplayPort',
                createdAt: '2026-01-15T08:30:00.000Z'
            },
            {
                id: 'prod-005',
                name: 'Active Noise Cancelling Headphones',
                sku: 'AUD-ANC-HP',
                categoryId: 'cat-acc',
                supplierId: 'sup-prime',
                purchasePrice: 2800,
                sellingPrice: 4999,
                currentStock: 0, // OUT OF STOCK
                minStock: 5,
                unit: 'Pcs',
                description: '40mm Neodymium dynamic drivers, 35h battery life, hybrid ANC',
                createdAt: '2026-01-15T08:40:00.000Z'
            },
            {
                id: 'prod-006',
                name: 'Braided Fast Charging USB-C Cable (2m)',
                sku: 'CAB-USBC-2M',
                categoryId: 'cat-acc',
                supplierId: 'sup-prec',
                purchasePrice: 140,
                sellingPrice: 349,
                currentStock: 52,
                minStock: 15,
                unit: 'Pcs',
                description: '100W Power Delivery certified nylon braided heavy duty cord',
                createdAt: '2026-01-15T08:50:00.000Z'
            },
            {
                id: 'prod-007',
                name: 'Hardcover Ruled Executive Notebook (200 Pgs)',
                sku: 'ST-NOT-200',
                categoryId: 'cat-stat',
                supplierId: 'sup-apex',
                purchasePrice: 85,
                sellingPrice: 195,
                currentStock: 80,
                minStock: 25,
                unit: 'Pcs',
                description: '80 GSM acid-free ivory pages with ribbon bookmark and elastic closure band',
                createdAt: '2026-01-15T09:00:00.000Z'
            },
            {
                id: 'prod-008',
                name: 'Rollerball Gel Ink Pens (Pack of 10)',
                sku: 'ST-PEN-PK10',
                categoryId: 'cat-stat',
                supplierId: 'sup-apex',
                purchasePrice: 120,
                sellingPrice: 260,
                currentStock: 110,
                minStock: 30,
                unit: 'Box',
                description: '0.5mm precision tip, smudge-free waterproof quick-drying blue ink',
                createdAt: '2026-01-15T09:10:00.000Z'
            },
            {
                id: 'prod-009',
                name: 'Ergonomic Mesh High-Back Chair',
                sku: 'FUR-CHR-ERG',
                categoryId: 'cat-furn',
                supplierId: 'sup-ergo',
                purchasePrice: 5800,
                sellingPrice: 9450,
                currentStock: 2, // LOW STOCK
                minStock: 5,
                unit: 'Pcs',
                description: 'Breathable korean mesh, 3D adjustable armrests, multi-lock synchro tilt',
                createdAt: '2026-01-15T09:20:00.000Z'
            },
            {
                id: 'prod-010',
                name: 'Motorized Dual-Motor Standing Desk',
                sku: 'FUR-DSK-STD',
                categoryId: 'cat-furn',
                supplierId: 'sup-ergo',
                purchasePrice: 14500,
                sellingPrice: 22800,
                currentStock: 7,
                minStock: 3,
                unit: 'Pcs',
                description: 'Electric height adjustable 140x70cm engineered walnut top with memory presets',
                createdAt: '2026-01-15T09:30:00.000Z'
            },
            {
                id: 'prod-011',
                name: 'Full HD 1080p Streaming Webcam',
                sku: 'CAM-FHD-108',
                categoryId: 'cat-elec',
                supplierId: 'sup-prec',
                purchasePrice: 1850,
                sellingPrice: 3200,
                currentStock: 0, // OUT OF STOCK
                minStock: 5,
                unit: 'Pcs',
                description: 'Dual noise-cancelling microphones with physical privacy shutter',
                createdAt: '2026-01-15T09:40:00.000Z'
            },
            {
                id: 'prod-012',
                name: 'Heavy-Duty Wireless Laser Printer',
                sku: 'OFF-PRT-LSR',
                categoryId: 'cat-off',
                supplierId: 'sup-prime',
                purchasePrice: 11200,
                sellingPrice: 16400,
                currentStock: 8,
                minStock: 3,
                unit: 'Pcs',
                description: 'Monochrome auto duplex laser printing with WiFi direct and mobile app print',
                createdAt: '2026-01-15T09:50:00.000Z'
            }
        ];

        // 4. Over 15 Realistic Historical Transactions
        const sampleTransactions = [
            {
                id: 'TXN-2026-001',
                date: '2026-01-16T10:15:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-001',
                productName: 'Business Pro Laptop 15.6"',
                sku: 'LAP-PRO-15',
                supplierId: 'sup-tech',
                supplierName: 'Techtronics India Pvt Ltd',
                quantity: 20,
                unitPrice: 42000,
                totalAmount: 840000,
                referenceNo: 'PO-2026-1001',
                notes: 'Initial bulk inventory replenishment for Q1',
                createdAt: '2026-01-16T10:15:00.000Z'
            },
            {
                id: 'TXN-2026-002',
                date: '2026-01-17T11:30:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-002',
                productName: 'Ergonomic Wireless Mouse',
                sku: 'MOU-WL-01',
                supplierId: 'sup-prec',
                supplierName: 'Precision Peripherals LLP',
                quantity: 30,
                unitPrice: 480,
                totalAmount: 14400,
                referenceNo: 'PO-2026-1002',
                notes: 'Received batch in good condition',
                createdAt: '2026-01-17T11:30:00.000Z'
            },
            {
                id: 'TXN-2026-003',
                date: '2026-01-18T14:20:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-001',
                productName: 'Business Pro Laptop 15.6"',
                sku: 'LAP-PRO-15',
                customerName: 'Infosys Developer Lab',
                quantity: 4,
                unitPrice: 56500,
                totalAmount: 226000,
                grossProfit: 58000,
                referenceNo: 'INV-2026-5001',
                notes: 'Corporate procurement batch sale',
                createdAt: '2026-01-18T14:20:00.000Z'
            },
            {
                id: 'TXN-2026-004',
                date: '2026-01-19T09:45:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-003',
                productName: 'Mechanical RGB Keyboard',
                sku: 'KB-MEC-RGB',
                supplierId: 'sup-prec',
                supplierName: 'Precision Peripherals LLP',
                quantity: 40,
                unitPrice: 1600,
                totalAmount: 64000,
                referenceNo: 'PO-2026-1003',
                notes: 'Stock received from Mumbai logistics',
                createdAt: '2026-01-19T09:45:00.000Z'
            },
            {
                id: 'TXN-2026-005',
                date: '2026-01-20T16:00:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-002',
                productName: 'Ergonomic Wireless Mouse',
                sku: 'MOU-WL-01',
                customerName: 'NexGen Infotech',
                quantity: 15,
                unitPrice: 850,
                totalAmount: 12750,
                grossProfit: 5550,
                referenceNo: 'INV-2026-5002',
                notes: 'Workstation upgrade bundle sale',
                createdAt: '2026-01-20T16:00:00.000Z'
            },
            {
                id: 'TXN-2026-006',
                date: '2026-01-22T13:10:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-004',
                productName: '27-inch IPS Ultra-Slim Monitor',
                sku: 'MON-27-IPS',
                supplierId: 'sup-tech',
                supplierName: 'Techtronics India Pvt Ltd',
                quantity: 10,
                unitPrice: 12500,
                totalAmount: 125000,
                referenceNo: 'PO-2026-1004',
                notes: 'Direct warehouse delivery',
                createdAt: '2026-01-22T13:10:00.000Z'
            },
            {
                id: 'TXN-2026-007',
                date: '2026-01-23T15:40:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-003',
                productName: 'Mechanical RGB Keyboard',
                sku: 'KB-MEC-RGB',
                customerName: 'Vikas Sharma (Retail)',
                quantity: 6,
                unitPrice: 2899,
                totalAmount: 17394,
                grossProfit: 7794,
                referenceNo: 'INV-2026-5003',
                notes: 'Counter retail sale',
                createdAt: '2026-01-23T15:40:00.000Z'
            },
            {
                id: 'TXN-2026-008',
                date: '2026-01-25T11:00:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-007',
                productName: 'Hardcover Ruled Executive Notebook (200 Pgs)',
                sku: 'ST-NOT-200',
                supplierId: 'sup-apex',
                supplierName: 'Apex Paper & Stationery Works',
                quantity: 100,
                unitPrice: 85,
                totalAmount: 8500,
                referenceNo: 'PO-2026-1005',
                notes: 'Wholesale stationary lot',
                createdAt: '2026-01-25T11:00:00.000Z'
            },
            {
                id: 'TXN-2026-009',
                date: '2026-01-26T14:50:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-004',
                productName: '27-inch IPS Ultra-Slim Monitor',
                sku: 'MON-27-IPS',
                customerName: 'Creative Pixel Studios',
                quantity: 7,
                unitPrice: 17200,
                totalAmount: 120400,
                grossProfit: 32900,
                referenceNo: 'INV-2026-5004',
                notes: 'Video editing suite setup',
                createdAt: '2026-01-26T14:50:00.000Z'
            },
            {
                id: 'TXN-2026-010',
                date: '2026-01-28T10:30:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-009',
                productName: 'Ergonomic Mesh High-Back Chair',
                sku: 'FUR-CHR-ERG',
                supplierId: 'sup-ergo',
                supplierName: 'Ergonomix Office Solutions',
                quantity: 8,
                unitPrice: 5800,
                totalAmount: 46400,
                referenceNo: 'PO-2026-1006',
                notes: 'Factory shipment delivered to showroom',
                createdAt: '2026-01-28T10:30:00.000Z'
            },
            {
                id: 'TXN-2026-011',
                date: '2026-01-30T17:15:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-009',
                productName: 'Ergonomic Mesh High-Back Chair',
                sku: 'FUR-CHR-ERG',
                customerName: 'Rahul Verma Consulting',
                quantity: 6,
                unitPrice: 9450,
                totalAmount: 56700,
                grossProfit: 21900,
                referenceNo: 'INV-2026-5005',
                notes: 'B2B office delivery',
                createdAt: '2026-01-30T17:15:00.000Z'
            },
            {
                id: 'TXN-2026-012',
                date: '2026-02-02T12:00:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-005',
                productName: 'Active Noise Cancelling Headphones',
                sku: 'AUD-ANC-HP',
                supplierId: 'sup-prime',
                supplierName: 'Prime Hardware & Components',
                quantity: 12,
                unitPrice: 2800,
                totalAmount: 33600,
                referenceNo: 'PO-2026-1007',
                notes: 'Audio gadgets restock',
                createdAt: '2026-02-02T12:00:00.000Z'
            },
            {
                id: 'TXN-2026-013',
                date: '2026-02-04T16:30:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-005',
                productName: 'Active Noise Cancelling Headphones',
                sku: 'AUD-ANC-HP',
                customerName: 'Ananya Enterprises',
                quantity: 12,
                unitPrice: 4999,
                totalAmount: 59988,
                grossProfit: 26388,
                referenceNo: 'INV-2026-5006',
                notes: 'Bulk stock cleared out - pending restock',
                createdAt: '2026-02-04T16:30:00.000Z'
            },
            {
                id: 'TXN-2026-014',
                date: '2026-02-06T10:10:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-012',
                productName: 'Heavy-Duty Wireless Laser Printer',
                sku: 'OFF-PRT-LSR',
                supplierId: 'sup-prime',
                supplierName: 'Prime Hardware & Components',
                quantity: 10,
                unitPrice: 11200,
                totalAmount: 112000,
                referenceNo: 'PO-2026-1008',
                notes: 'Printers received and tested',
                createdAt: '2026-02-06T10:10:00.000Z'
            },
            {
                id: 'TXN-2026-015',
                date: '2026-02-08T15:20:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-012',
                productName: 'Heavy-Duty Wireless Laser Printer',
                sku: 'OFF-PRT-LSR',
                customerName: 'Apex Law Associates',
                quantity: 2,
                unitPrice: 16400,
                totalAmount: 32800,
                grossProfit: 10400,
                referenceNo: 'INV-2026-5007',
                notes: 'Law firm office installation',
                createdAt: '2026-02-08T15:20:00.000Z'
            },
            {
                id: 'TXN-2026-016',
                date: '2026-02-10T11:45:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-002',
                productName: 'Ergonomic Wireless Mouse',
                sku: 'MOU-WL-01',
                customerName: 'Zenith Tech Works',
                quantity: 11,
                unitPrice: 850,
                totalAmount: 9350,
                grossProfit: 4070,
                referenceNo: 'INV-2026-5008',
                notes: 'Brought inventory down to low stock',
                createdAt: '2026-02-10T11:45:00.000Z'
            },
            {
                id: 'TXN-2026-017',
                date: '2026-02-12T14:00:00.000Z',
                type: 'STOCK_IN',
                productId: 'prod-010',
                productName: 'Motorized Dual-Motor Standing Desk',
                sku: 'FUR-DSK-STD',
                supplierId: 'sup-ergo',
                supplierName: 'Ergonomix Office Solutions',
                quantity: 10,
                unitPrice: 14500,
                totalAmount: 145000,
                referenceNo: 'PO-2026-1009',
                notes: 'Motorized standing desk models',
                createdAt: '2026-02-12T14:00:00.000Z'
            },
            {
                id: 'TXN-2026-018',
                date: '2026-02-14T16:20:00.000Z',
                type: 'STOCK_OUT',
                productId: 'prod-010',
                productName: 'Motorized Dual-Motor Standing Desk',
                sku: 'FUR-DSK-STD',
                customerName: 'TechVibe Coworking',
                quantity: 3,
                unitPrice: 22800,
                totalAmount: 68400,
                grossProfit: 24900,
                referenceNo: 'INV-2026-5009',
                notes: 'Standing desk installment',
                createdAt: '2026-02-14T16:20:00.000Z'
            }
        ];

        // Save collections into localStorage
        this.saveData(StorageKeys.SETTINGS, DefaultSettings);
        this.saveData(StorageKeys.CATEGORIES, sampleCategories);
        this.saveData(StorageKeys.SUPPLIERS, sampleSuppliers);
        this.saveData(StorageKeys.PRODUCTS, sampleProducts);
        this.saveData(StorageKeys.TRANSACTIONS, sampleTransactions);

        return true;
    }
};

// Auto-seed sample data if clean install
if (typeof window !== 'undefined') {
    window.StorageKeys = StorageKeys;
    window.StorageService = StorageService;
    StorageService.initSampleData(false);
}
