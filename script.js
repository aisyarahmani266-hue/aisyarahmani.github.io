// State now managed by db.js but keeping local state for UI syncing
let products = [];
let cart = [];
let transactions = [];
let currentCategory = 'all';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    populateReportFilter(); // Populate filter first
    renderProducts();
    renderInventory();
    setupEventListeners();
    renderReports();

    // Add global click listener for sparkles
    document.addEventListener('click', (e) => {
        // Only trigger on interactive elements or their children
        if (e.target.closest('button, .nav-links li, .product-card, a, .cat-btn, .cart-header')) {
            createSparkles(e.clientX, e.clientY);
        }
    });
});

function createSparkles(x, y) {
    const colors = ['#B5EAD7', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#C7CEEA'];
    const particleCount = 10;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('click-particle');
        document.body.appendChild(particle);

        // Random position offsets
        const angle = Math.random() * Math.PI * 2;
        const velocity = 30 + Math.random() * 50; // Distance
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.backgroundColor = color;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        // Remove after animation
        setTimeout(() => {
            particle.remove();
        }, 600);
    }
}

function loadData() {
    products = db.getProducts();
    transactions = db.getTransactions();

    console.log('Loaded Products from DB:', products.length);

    // Force load if empty
    if (!products || products.length === 0) {
        if (typeof INITIAL_PRODUCTS !== 'undefined') {
            console.log('Database empty or corrupted. Resetting to Default Products...');
            products = [...INITIAL_PRODUCTS];
            db.saveProducts(products);
            alert('Data produk telah di-reset ke default karena kosong/tidak muncul. Silakan cek kembali.');
        } else {
            console.error('INITIAL_PRODUCTS is undefined!');
            alert('Error Critical: Data awal (data.js) tidak terbaca. Mohon periksa file data.js.');
        }
    }
}

function saveProducts() {
    db.saveProducts(products);
}

function saveTransactions() {
    db.saveAllTransactions(transactions);
}

// PDF Export Logic
async function exportReportToPDF() {
    if (!window.jspdf) return alert('Library PDF belum dimuat!');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('Laporan Penjualan Toko Adila', 14, 20);
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Dicetak pada: ${dateStr}`, 14, 28);

    // Filter context
    const filter = document.getElementById('report-month-filter').value;
    let filteredTransactions = transactions;
    if (filter !== 'all') {
        filteredTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            return key === filter;
        });
        doc.text(`Periode: ${filter}`, 14, 34);
    } else {
        doc.text('Periode: Semua Waktu', 14, 34);
    }

    // Sort
    filteredTransactions.sort((a, b) => b.id - a.id);

    // Prepare Table Data
    const tableBody = filteredTransactions.map(t => {
        const date = new Date(t.date);
        return [
            date.toLocaleDateString('id-ID'),
            date.toLocaleTimeString('id-ID'),
            t.pembeli || '-',
            t.items.length + ' item',
            t.status.toUpperCase(),
            `Rp ${t.total.toLocaleString('id-ID')}`
        ];
    });

    // Generate Table
    doc.autoTable({
        startY: 40,
        head: [['Tanggal', 'Jam', 'Pembeli', 'Jml Barang', 'Status', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [181, 234, 215], textColor: [45, 90, 76] }, // Pastel Mint
        styles: { fontSize: 8 }
    });

    // Total Revenue
    const totalRev = filteredTransactions
        .filter(t => t.status === 'lunas')
        .reduce((sum, t) => sum + t.total, 0);

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Pendapatan (Lunas): Rp ${totalRev.toLocaleString('id-ID')}`, 14, finalY);

    // Save
    doc.save(`Laporan_Toko_Adila_${Date.now()}.pdf`);
}

// Database Modal Functions
function showDatabaseModal() {
    const json = db.exportData();
    document.getElementById('db-json-view').value = json;
    document.getElementById('database-modal').classList.remove('hidden');
}

function closeDatabaseModal() {
    document.getElementById('database-modal').classList.add('hidden');
}

function copyDatabaseData() {
    const text = document.getElementById('db-json-view');
    text.select();
    document.execCommand('copy');
    alert('Data berhasil disalin! Simpan di notepad sebagai backup.');
}

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));

    document.getElementById(`page-${pageId}`).classList.add('active');

    // Update active nav
    const index = ['cashier', 'inventory', 'reports'].indexOf(pageId);
    if (index !== -1) {
        document.querySelectorAll('.nav-links li')[index].classList.add('active');
    }
}

// Mobile Cart Toggle
function toggleMobileCart() {
    const cartSection = document.querySelector('.cart-section');
    const icon = document.getElementById('mobile-cart-toggle-icon');

    // Toggle class
    cartSection.classList.toggle('expanded');

    // Update icon
    if (cartSection.classList.contains('expanded')) {
        if (icon) icon.setAttribute('data-lucide', 'chevron-down');
    } else {
        if (icon) icon.setAttribute('data-lucide', 'chevron-up');
    }
    if (window.lucide) lucide.createIcons();
}

// Cashier Logic
function renderProducts() {
    const container = document.getElementById('product-grid-container');
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                <p>Data barang kosong.</p>
                <button onclick="confirmReset()" class="btn-primary" style="margin-top: 10px; background: #ff8a65;">
                    <i data-lucide="refresh-cw"></i> Reset Data Default
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Filter logic
    const filteredProducts = products.filter(product => {
        const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
        const searchInput = document.getElementById('cashier-input-code');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
            (product.code && product.code.toLowerCase().includes(searchTerm));
        return matchesCategory && matchesSearch;
    });

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        let badgeHTML = '';
        let isDisabled = false;

        // Stock Logic
        const stock = product.stock || 0;
        if (stock === 0) {
            badgeHTML = '<span class="stock-badge stock-out">Habis</span>';
            card.classList.add('disabled');
            isDisabled = true;
        } else if (stock < 5) {
            badgeHTML = `<span class="stock-badge stock-low">Sisa ${stock}</span>`;
        }

        card.innerHTML = `
            ${badgeHTML}
            <div class="product-icon">${getCategoryIcon(product.category)}</div>
            <h3>${product.name}</h3>
            <p class="price">Rp ${product.price.toLocaleString()}</p>
        `;

        if (!isDisabled) {
            card.onclick = () => addToCart(product.id);
        }

        container.appendChild(card);
    });
}

function filterCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Clear search when changing category? Or keep it? keeping it is better usually, 
    // but simplified to clear query for now or re-apply. 
    // Let's just reset input to clean state for user clarity
    document.getElementById('cashier-input-code').value = '';
    renderProducts();
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const cartItem = cart.find(item => item.id === productId);
    const validStock = product.stock || 0;
    const currentQty = cartItem ? cartItem.qty : 0;

    // Check Stock
    if (currentQty + 1 > validStock) {
        alert(`Stok tidak cukup! Tersisa hanya ${validStock}.`);
        return;
    }

    if (cartItem) {
        cartItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    // Auto-expand mobile cart
    if (window.innerWidth <= 768) {
        const cartSection = document.querySelector('.cart-section');
        const icon = document.getElementById('mobile-cart-toggle-icon');
        if (cartSection && !cartSection.classList.contains('expanded')) {
            cartSection.classList.add('expanded');
            if (icon) icon.setAttribute('data-lucide', 'chevron-down');
            lucide.createIcons();
        }
    }

    renderCart();
}

function addToCartByInput() {
    const input = document.getElementById('cashier-input-code');
    const code = input.value.trim();
    if (!code) return;

    // Search by code or strictly by name case-insensitive
    const product = products.find(p =>
        p.code.toLowerCase() === code.toLowerCase() ||
        p.name.toLowerCase() === code.toLowerCase()
    );

    if (product) {
        addToCart(product);
        input.value = '';
        input.focus();
    } else {
        alert('Barang tidak ditemukan!');
    }
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';

    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state">Belum ada pesanan</div>';
    } else {
        cart.forEach(item => {
            total += item.price * item.qty;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>Rp ${item.price.toLocaleString()}</p>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    document.getElementById('cart-total-display').innerText = `Rp ${total.toLocaleString()}`;
}

function updateQty(id, change) {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].qty += change;
        if (cart[itemIndex].qty <= 0) {
            cart.splice(itemIndex, 1);
        }
        renderCart();
    }
}

function confirmReset() {
    if (confirm('Apakah anda yakin ingin mengembalikan semua data produk ke awal? Data transaksi akan tetap aman.')) {
        if (typeof INITIAL_PRODUCTS !== 'undefined') {
            products = [...INITIAL_PRODUCTS];
            db.saveProducts(products);
            alert('Data berhasil di-reset!');
            renderProducts();
            renderInventory();
        } else {
            alert('Gagal: Data awal tidak ditemukan.');
        }
    }
}

function clearCart() {
    if (confirm('Reset belanja ya/tidak?')) {
        cart = [];
        renderCart();
    }
}

// Checkout & Payment Logic
function processCheckout(statusType = 'lunas') {
    if (cart.length === 0) return alert('Keranjang kosong!');

    // Get current total
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (statusType === 'hutang') {
        // Direct flow for debt
        const pembeli = prompt('Masukkan Nama Pembeli (Hutang):');
        if (!pembeli) return;

        saveTransactionToDB(total, 'hutang', pembeli);
    } else {
        // Open Payment Modal for Cash
        openPaymentModal(total);
    }
}

// Payment Modal Variables
let currentPaymentTotal = 0;

function openPaymentModal(total) {
    currentPaymentTotal = total;
    document.getElementById('payment-modal').classList.remove('hidden');

    // Reset UI
    document.getElementById('pay-modal-total').innerText = `Rp ${total.toLocaleString()}`;
    document.getElementById('pay-money-received').value = '';
    document.getElementById('pay-change-display').innerText = 'Rp 0';
    document.getElementById('pay-change-display').style.color = '#888';

    // Focus input
    setTimeout(() => {
        document.getElementById('pay-money-received').focus();
    }, 100);
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
}

function setCashReceived(amount) {
    const input = document.getElementById('pay-money-received');
    if (amount === 'pas') {
        input.value = currentPaymentTotal;
    } else {
        input.value = amount;
    }
    calculateChange();
}

function calculateChange() {
    const received = parseInt(document.getElementById('pay-money-received').value) || 0;
    const change = received - currentPaymentTotal;
    const display = document.getElementById('pay-change-display');

    if (change < 0) {
        display.innerText = `Kurang Rp ${Math.abs(change).toLocaleString()}`;
        display.style.color = '#ff6b6b'; // Red
    } else {
        display.innerText = `Rp ${change.toLocaleString()}`;
        display.style.color = '#2d5a4c'; // Green
    }
}

function finalizePayment() {
    const received = parseInt(document.getElementById('pay-money-received').value) || 0;

    if (received < currentPaymentTotal) {
        alert('Uang tidak cukup!');
        return;
    }

    // Save
    saveTransactionToDB(currentPaymentTotal, 'lunas', 'Umum');

    // Close & Show Success
    closePaymentModal();
    const change = received - currentPaymentTotal;
    if (change > 0) {
        alert(`Transaksi Berhasil!\n\nKembalian: Rp ${change.toLocaleString()}`);
    } else {
        alert('Transaksi Berhasil (Uang Pas)');
    }
}

function saveTransactionToDB(total, status, pembeli) {
    const transaction = {
        id: Date.now(),
        date: new Date().toISOString(),
        items: [...cart],
        total: total,
        status: status,
        pembeli: pembeli
    };

    transactions.push(transaction); // Update local state for UI
    db.saveTransaction(transaction); // Save to DB

    cart = [];
    renderCart();
    populateReportFilter();
    renderReports();
}

// --- BARCODE SCANNER LOGIC ---
let html5QrcodeScanner = null;

function startScanner() {
    // 1. Check Protocol (Browser Security)
    if (window.location.protocol === 'file:') {
        alert('PERHATIAN: Fitur Scan Barcode biasanya TIDAK BERFUNGSI jika dibuka langsung dari file (file://).\n\nBrowser memblokir kamera demi keamanan.\n\nSolusi:\n1. Gunakan "Live Server" di VS Code.\n2. Atau upload ke hosting/localhost.');
        // We continue anyway just in case some browsers allow it, but mostly they won't.
    }

    const modal = document.getElementById('scanner-modal');
    modal.classList.remove('hidden');

    // Check if library loaded
    if (typeof Html5QrcodeScanner === 'undefined') {
        alert('Library Scanner belum siap. Pastikan koneksi internet aktif untuk memuat library.');
        return;
    }

    // Initialize if not already running
    if (!html5QrcodeScanner) {
        try {
            // Render to container 'reader'
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false // verbose
            );
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        } catch (e) {
            console.error(e);
            alert('Error inisialisasi kamera: ' + e.message);
        }
    }
}

function onScanSuccess(decodedText, decodedResult) {
    const product = products.find(p => p.id == decodedText || p.id.toString() === decodedText);

    if (product) {
        addToCart(product.id);
        alert(`Produk ditemukan: ${product.name}`);
    } else {
        alert(`Produk dengan kode "${decodedText}" tidak ditemukan.`);
    }
}

function onScanFailure(error) {
    // handle scan failure
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(_ => {
            html5QrcodeScanner = null;
            document.getElementById('scanner-modal').classList.add('hidden');
        }).catch(error => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
            document.getElementById('scanner-modal').classList.add('hidden');
        });
    } else {
        document.getElementById('scanner-modal').classList.add('hidden');
    }
}

// Inventory Logic
function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.code || '-'}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>Rp ${p.price.toLocaleString()}</td>
            <td>${p.stock || 0}</td>
            <td>
                 <button class="btn-secondary" style="margin-right:4px; padding:4px 8px; font-size:0.8rem;" onclick="editProduct('${p.id}')">Edit</button>
                 <button class="btn-danger-text" onclick="deleteProduct('${p.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

const CATEGORY_PREFIXES = {
    'persabunan': 'S',
    'minuman': 'M',
    'makanan': 'F',
    'bahan': 'B',
    'bumbu': 'C',
    'pulsa': 'P',
    'token': 'T',
    'lainnya': 'L'
};

function generateProductCode(category = 'persabunan') {
    const prefix = CATEGORY_PREFIXES[category.toLowerCase()] || 'X';

    // Filter existing products with this prefix
    const existingCodes = products
        .map(p => p.code)
        .filter(c => c.startsWith(prefix));

    // Find max number
    let maxNum = 0;
    existingCodes.forEach(c => {
        const numStr = c.substring(prefix.length);
        const num = parseInt(numStr);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    });

    const nextNum = maxNum + 1;
    // Format: Prefix + 3 digit number (001)
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
}

function openProductModal() {
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('edit-product-id').value = '';

    // Auto Generate Code for New Product (Default Category)
    const defaultCat = document.getElementById('prod-category').value;
    const newCode = generateProductCode(defaultCat);

    const codeInput = document.getElementById('prod-code');
    codeInput.value = newCode;
    codeInput.readOnly = true;

    document.getElementById('modal-title').innerText = 'Tambah Barang';
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    openProductModal();
    document.getElementById('edit-product-id').value = p.id;
    document.getElementById('modal-title').innerText = 'Edit Barang';

    const codeInput = document.getElementById('prod-code');
    codeInput.value = p.code;
    codeInput.readOnly = true;

    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-stock').value = p.stock;
}

// Add global listener once for optimization? Or just bind it here if safe. 
// It's safer to add it in setupEventListeners, but rewriting that function is expensive. 
// Let's check for existing logic in openProductModal or just add an onchange attribute in HTML? 
// No, let's keep it clean in JS. We'll add it in setupEventListeners via a separate replace.


function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-product-id').value;
    const code = document.getElementById('prod-code').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-category').value;
    const price = parseInt(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value);

    // Check for duplicate code (exclude self if editing)
    const duplicate = products.find(p => p.code === code && p.id !== id);
    if (duplicate) {
        alert('Kode barang sudah ada!');
        return;
    }

    if (id) {
        // Edit
        const index = products.findIndex(p => p.id === id);
        if (index > -1) {
            products[index] = { ...products[index], code, name, category: cat, price, stock };
        }
    } else {
        // Add
        const newProduct = {
            id: Date.now().toString(),
            code, name, category: cat, price, stock
        };
        products.push(newProduct);
    }

    saveProducts();
    renderProducts();
    renderInventory();
    closeProductModal();
}

function deleteProduct(id) {
    if (confirm('Yakin hapus barang ini?')) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderProducts();
        renderInventory();
    }
}

// Reports Logic
function populateReportFilter() {
    const select = document.getElementById('report-month-filter');
    const existingVal = select.value;
    select.innerHTML = '<option value="all">Semua Waktu</option>';

    const months = [...new Set(transactions.map(t => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
    }))];

    // Sort descending
    months.sort().reverse();

    months.forEach(m => {
        const [year, month] = m.split('-');
        const dateObj = new Date(year, month - 1);
        const label = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = label;
        select.appendChild(opt);
    });

    if (months.includes(existingVal)) {
        select.value = existingVal;
    }
}

function renderReports() {
    const tbodyLunas = document.getElementById('report-lunas-body');
    const tbodyHutang = document.getElementById('report-hutang-body');

    tbodyLunas.innerHTML = '';
    tbodyHutang.innerHTML = '';

    const filter = document.getElementById('report-month-filter').value;
    let filteredTransactions = transactions;

    if (filter !== 'all') {
        filteredTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            return key === filter;
        });
    }

    let totalRevenue = 0;
    // Sort new to old
    filteredTransactions.sort((a, b) => b.id - a.id);

    filteredTransactions.forEach(t => {
        const date = new Date(t.date);
        const dateStr = date.toLocaleDateString('id-ID');
        const timeStr = date.toLocaleTimeString('id-ID');
        const status = t.status || 'lunas';
        const pembeli = t.pembeli || '-';

        if (status === 'hutang') {
            // Render to Hutang Table
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${pembeli}</td>
                <td>${t.items.length} jenis</td>
                <td>Rp ${t.total.toLocaleString()}</td>
                <td>
                    <button class="btn-check" style="background:#81c784; border:none; color:#1b5e20; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; gap:4px;" 
                        onclick="markAsPaid(${t.id})">
                        <i data-lucide="check-circle" style="width:16px; height:16px;"></i> Lunasi
                    </button>
                </td>
             `;
            tbodyHutang.appendChild(tr);
        } else {
            // Render to Lunas Table
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${timeStr}</td>
                <td>${pembeli}</td>
                <td>${t.items.length} jenis</td>
                <td>Rp ${t.total.toLocaleString()}</td>
                <td>
                    <span style="
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-size: 0.8rem; 
                        background: #c8e6c9;
                        color: #2e7d32;
                        font-weight: 500;
                    ">LUNAS</span>
                </td>
            `;
            tbodyLunas.appendChild(tr);
            totalRevenue += t.total;
        }
    });

    document.getElementById('report-total-revenue').innerText = `Rp ${totalRevenue.toLocaleString()}`;
    if (window.lucide) lucide.createIcons();
}

function markAsPaid(id) {
    if (!confirm('Tandai transaksi ini sudah lunas?')) return;

    // Find transaction by ID (ensure type safety if ID is string/number mismatch, usually number from Date.now())
    const tx = transactions.find(t => t.id == id);
    if (tx) {
        tx.status = 'lunas';
        saveTransactions();
        renderReports();
    }
}

function setupEventListeners() {
    // Enter key on cashier input
    document.getElementById('cashier-input-code').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
            addToCartByInput();
        } else {
            // Live Search
            renderProducts();
        }
    });

    // Close modal when clicking outside
    window.onclick = function (event) {
        const modal = document.getElementById('product-modal');
        if (event.target == modal) {
            closeProductModal();
        }
    }

    // Dynamic Code Generation on Category Change (Only for New Items)
    document.getElementById('prod-category').addEventListener('change', function () {
        const isEdit = document.getElementById('edit-product-id').value !== '';
        // Only regenerate if adding new item (not editing)
        if (!isEdit) {
            const newCode = generateProductCode(this.value);
            document.getElementById('prod-code').value = newCode;
        }
    });
}

function getCategoryIcon(category) {
    const icons = {
        'persabunan': '<i data-lucide="droplet"></i>',
        'minuman': '<i data-lucide="cup-soda"></i>',
        'makanan': '<i data-lucide="utensils"></i>',
        'bahan': '<i data-lucide="wheat"></i>',
        'bumbu': '<i data-lucide="pepper"></i>', // pepper doesn't exist in all sets, fallback safe
        'pulsa': '<i data-lucide="smartphone"></i>',
        'token': '<i data-lucide="zap"></i>',
        'lainnya': '<i data-lucide="package"></i>'
    };
    return icons[category] || '<i data-lucide="package"></i>';
}
