/**
 * Toko Adila - Client Side Database
 * Uses localStorage to persist data
 */

class StorageDB {
    constructor() {
        this.PRODUCT_KEY = 'toko_adila_products';
        this.TRANSACTION_KEY = 'toko_adila_transactions';
    }

    // --- PRODUCTS ---
    getProducts() {
        try {
            const data = localStorage.getItem(this.PRODUCT_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error parsing products from localStorage:', e);
            localStorage.removeItem(this.PRODUCT_KEY); // Clear corrupted data
            return [];
        }
    }

    saveProducts(products) {
        localStorage.setItem(this.PRODUCT_KEY, JSON.stringify(products));
    }

    addProduct(product) {
        const products = this.getProducts();
        products.push(product);
        this.saveProducts(products);
    }

    updateProduct(id, updatedData) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === id);
        if (index > -1) {
            products[index] = { ...products[index], ...updatedData };
            this.saveProducts(products);
            return true;
        }
        return false;
    }

    deleteProduct(id) {
        let products = this.getProducts();
        products = products.filter(p => p.id !== id);
        this.saveProducts(products);
    }

    // --- TRANSACTIONS ---
    getTransactions() {
        const data = localStorage.getItem(this.TRANSACTION_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveTransaction(transaction) {
        const transactions = this.getTransactions();
        transactions.push(transaction);
        localStorage.setItem(this.TRANSACTION_KEY, JSON.stringify(transactions));
    }

    updateTransaction(id, updatedData) {
        const transactions = this.getTransactions();
        const index = transactions.findIndex(t => t.id == id); // Loose equality for ID
        if (index > -1) {
            transactions[index] = { ...transactions[index], ...updatedData };
            localStorage.setItem(this.TRANSACTION_KEY, JSON.stringify(transactions));
            return true;
        }
        return false;
    }

    saveAllTransactions(transactions) {
        localStorage.setItem(this.TRANSACTION_KEY, JSON.stringify(transactions));
    }

    // --- UTILS ---
    /**
     * Export all data as a JSON string (for backup)
     */
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            products: this.getProducts(),
            transactions: this.getTransactions()
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import data from JSON string
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.products) this.saveProducts(data.products);
            if (data.transactions) this.saveAllTransactions(data.transactions);
            return true;
        } catch (e) {
            console.error('Import Error:', e);
            return false;
        }
    }

    /**
     * Nuke everything (Factory Reset)
     */
    resetDatabase() {
        localStorage.removeItem(this.PRODUCT_KEY);
        localStorage.removeItem(this.TRANSACTION_KEY);
    }
}

// Attach to window for global access
window.db = new StorageDB();
