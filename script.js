class POS {
    constructor() {
        this.cart = [];
        this.activeCategory = 'All';
        this.taxRate = 0.05;
        this.isTouch = false;
        
        this.settings = { 
            storeName: "NEXUS POS", 
            tableCount: 10, 
            setupDone: false,
            language: "en",
            currency: "USD"
        };

        try {
            const savedData = localStorage.getItem('nexus_products');
            if (savedData) {
                this.products = JSON.parse(savedData);
            } else {
                this.fetchProductsFromAPI(); // Main source of data
            }
            
            const savedSettings = localStorage.getItem('nexus_settings');
            if(savedSettings) this.settings = JSON.parse(savedSettings);
        } catch (e) {
            this.fetchProductsFromAPI();
        }
        
        this.init();
    }

    // --- JSON API FETCH ---
    async fetchProductsFromAPI() {
        try {
            const response = await fetch('https://dummyjson.com/products?limit=15');
            const data = await response.json();
            
            this.products = data.products.map(item => ({
                id: item.id,
                name: item.title,
                price: item.price,
                category: item.category.includes('groceries') ? 'Food' : 'Drinks' 
            }));
            
            this.saveData();
            this.renderProducts();
        } catch (error) {
            console.error("API Error", error);
            this.products = []; // No defaults, empty state
            this.renderProducts();
        }
    }

    // REMOVED HARDCODED DEFAULTS
    getDefaultProducts() {
        return []; 
    }

    getCurrencySymbol() {
        const symbols = { 'USD': '$', 'PHP': '₱', 'EUR': '€', 'JPY': '¥' };
        return symbols[this.settings.currency] || '$';
    }

    init() {
        if (!document.getElementById('productGrid')) return;
        this.detectDevice();
        this.handleSplashScreen();
        this.renderProducts();
        this.renderCart();
        this.applySettings();
    }

    detectDevice() {
        this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    // --- RECEIPT PRINTER ---
    printReceipt(tableNumber, totalAmount) {
        const sym = this.getCurrencySymbol();
        const date = new Date().toLocaleString();
        
        let itemsHtml = '';
        this.cart.forEach(item => {
            itemsHtml += `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>${item.qty}x ${item.name}</span>
                    <span>${sym}${(item.price * item.qty).toFixed(2)}</span>
                </div>
            `;
        });

        const receiptWindow = window.open('', '', 'width=300,height=600');
        receiptWindow.document.write(`
            <html>
            <body style="font-family: monospace; padding: 20px;">
                <h2 style="text-align: center; margin:0;">${this.settings.storeName}</h2>
                <p style="text-align: center; margin:0 0 10px 0;">Official Receipt</p>
                <hr style="border:1px dashed #000;">
                <p>Date: ${date}<br>Table: ${tableNumber}</p>
                <hr style="border:1px dashed #000;">
                ${itemsHtml}
                <hr style="border:1px dashed #000;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;">
                    <span>TOTAL</span>
                    <span>${totalAmount}</span>
                </div>
                <hr style="border:1px dashed #000;">
                <p style="text-align:center;">Thank you!</p>
            </body>
            </html>
        `);
        receiptWindow.document.close();
        receiptWindow.focus();
        receiptWindow.print();
        receiptWindow.close();
    }

    // --- WIZARD LOGIC ---
    nextStep(stepNumber) {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        document.getElementById(`step${stepNumber}`).classList.add('active');
    }

    handleSplashScreen() {
        const splash = document.getElementById('splashScreen');
        const loader = document.getElementById('splashLoader');
        const text = document.getElementById('splashText');
        const wizard = document.getElementById('setupWizard');

        if (!this.settings.setupDone) {
            setTimeout(() => {
                loader.style.display = 'none';
                text.style.display = 'none';
                wizard.style.display = 'block';
            }, 1000);
        } else {
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 500);
            }, 1500); 
        }
    }

    finishSetup() {
        const name = document.getElementById('setupStoreName').value;
        const tables = parseInt(document.getElementById('setupTableCount').value);
        const lang = document.getElementById('setupLang').value;
        const region = document.getElementById('setupRegion').value;

        if(name && tables > 0) {
            this.settings.storeName = name;
            this.settings.tableCount = tables;
            this.settings.language = lang;
            this.settings.currency = region;
            this.settings.setupDone = true;
            
            this.saveData(); 
            location.reload();
        } else {
            this.show3DDialog("Error", "Please complete all fields.", "alert");
        }
    }

    show3DDialog(title, message, type, onConfirm, onPrint) {
        const overlay = document.getElementById('customDialogOverlay');
        const box = document.getElementById('customDialogBox');
        const titleEl = document.getElementById('dialogTitle');
        const msgEl = document.getElementById('dialogMessage');
        const btnsEl = document.getElementById('dialogBtns');

        titleEl.innerText = title;
        msgEl.innerText = message;
        btnsEl.innerHTML = '';

        const closeDialog = () => { overlay.style.display = 'none'; };

        if (type === 'confirm') {
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn-secondary';
            btnCancel.innerText = 'Cancel';
            btnCancel.onclick = closeDialog;
            
            const btnOk = document.createElement('button');
            btnOk.className = 'pay-btn';
            btnOk.innerText = 'Confirm';
            btnOk.style.margin = '0';
            btnOk.onclick = () => { closeDialog(); if(onConfirm) onConfirm(); };
            
            btnsEl.appendChild(btnCancel);
            btnsEl.appendChild(btnOk);
        } else if (type === 'success') {
            const btnPrint = document.createElement('button');
            btnPrint.className = 'btn-secondary';
            btnPrint.innerHTML = '<i class="fas fa-print"></i> Print';
            btnPrint.onclick = () => { if(onPrint) onPrint(); };

            const btnOk = document.createElement('button');
            btnOk.className = 'pay-btn';
            btnOk.innerText = 'New Order';
            btnOk.style.margin = '0';
            btnOk.onclick = closeDialog;

            btnsEl.appendChild(btnPrint);
            btnsEl.appendChild(btnOk);
        } else {
            const btnOk = document.createElement('button');
            btnOk.className = 'pay-btn';
            btnOk.innerText = 'OK';
            btnOk.style.margin = '0';
            btnOk.onclick = closeDialog;
            btnsEl.appendChild(btnOk);
        }

        overlay.style.display = 'flex';
        box.style.animation = 'none';
        box.offsetHeight; 
        box.style.animation = 'dialogPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }

    applySettings() {
        if(this.settings.storeName) {
            document.getElementById('brandName').innerHTML = this.settings.storeName;
            document.getElementById('storeSubtitle').innerText = `${this.settings.currency} SYSTEM ACTIVE`;
        }
        const selector = document.getElementById('tableSelector');
        selector.innerHTML = '<option value="0">Select Table...</option>';
        for(let i=1; i<=this.settings.tableCount; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = `Table ${i}`;
            selector.appendChild(opt);
        }
    }

    saveData() {
        localStorage.setItem('nexus_products', JSON.stringify(this.products));
        localStorage.setItem('nexus_settings', JSON.stringify(this.settings));
    }

    resetSystem() {
        this.show3DDialog("Factory Reset", "Wipe all data?", "confirm", () => {
            localStorage.clear();
            location.reload();
        });
    }

    renderProducts() {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const sym = this.getCurrencySymbol();
        
        const filtered = this.activeCategory === 'All' ? this.products : this.products.filter(p => p.category === this.activeCategory);

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            const eventType = this.isTouch ? 'touchstart' : 'mousedown';
            
            card.innerHTML = `
                <div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-stock">${product.category}</div>
                </div>
                <div class="product-price">${sym}${product.price.toFixed(2)}</div>
            `;
            
            card.addEventListener(eventType, (e) => {
                if(this.isTouch) e.preventDefault(); 
                this.addToCart(product.id);
            });
            grid.appendChild(card);
        });
    }

    filterCategory(category) {
        this.activeCategory = category;
        document.querySelectorAll('.tab-btn').forEach(t => {
            t.classList.remove('active');
            if(t.textContent.includes(category) || (category === 'All' && t.textContent.includes('All'))) {
                t.classList.add('active');
            }
        });
        this.renderProducts();
    }

    addToCart(id) {
        const product = this.products.find(p => p.id === id);
        const existingItem = this.cart.find(i => i.id === id);
        if (existingItem) existingItem.qty++;
        else this.cart.push({ ...product, qty: 1 });
        this.renderCart();
    }

    updateQty(id, change) {
        const item = this.cart.find(i => i.id === id);
        if (!item) return;
        item.qty += change;
        if (item.qty <= 0) this.cart = this.cart.filter(i => i.id !== id);
        this.renderCart();
    }

    renderCart() {
        const container = document.getElementById('cartItems');
        const subTotalEl = document.getElementById('subTotal');
        const taxEl = document.getElementById('taxAmount');
        const totalEl = document.getElementById('finalTotal');
        const mobileTotal = document.getElementById('mobileTotal');
        const sym = this.getCurrencySymbol();

        if (!container) return;
        container.innerHTML = '';
        
        if (this.cart.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:50px; opacity:0.5;">Cart Empty</div>`;
            subTotalEl.innerText = `${sym}0.00`; taxEl.innerText = `${sym}0.00`; totalEl.innerText = `${sym}0.00`; mobileTotal.innerText = `${sym}0.00`;
            return;
        }

        let subTotal = 0;
        this.cart.forEach(item => {
            subTotal += item.price * item.qty;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="item-info"><h4>${item.name}</h4><p>${sym}${item.price.toFixed(2)} x ${item.qty}</p></div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button class="qty-btn" onclick="window.app.updateQty(${item.id}, -1)">-</button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.qty}</span>
                    <button class="qty-btn" onclick="window.app.updateQty(${item.id}, 1)">+</button>
                </div>
            `;
            container.appendChild(el);
        });

        const tax = subTotal * this.taxRate;
        const total = subTotal + tax;
        subTotalEl.innerText = `${sym}${subTotal.toFixed(2)}`;
        taxEl.innerText = `${sym}${tax.toFixed(2)}`;
        totalEl.innerText = `${sym}${total.toFixed(2)}`;
        mobileTotal.innerText = `${sym}${total.toFixed(2)}`;
    }

    toggleAdmin() { document.getElementById('adminModal').classList.toggle('active'); }
    toggleMobileCart() { if(window.innerWidth <= 768) document.getElementById('cartPanel').classList.toggle('expanded'); }

    addProduct() {
        const name = document.getElementById('newProdName').value;
        const price = parseFloat(document.getElementById('newProdPrice').value);
        const cat = document.getElementById('newProdCat').value;
        if(name && price) {
            this.products.push({ id: Date.now(), name, price, category: cat });
            this.saveData(); this.renderProducts(); this.toggleAdmin();
            document.getElementById('newProdName').value = ''; document.getElementById('newProdPrice').value = '';
        } else {
            this.show3DDialog("Missing Info", "Enter valid name and price.", "alert");
        }
    }

    processPayment() {
        if(this.cart.length === 0) return this.show3DDialog("Empty", "Cart is empty!", "alert");
        const table = document.getElementById('tableSelector').value;
        if(table === "0") return this.show3DDialog("Table Required", "Select a Table", "alert");
        const total = document.getElementById('finalTotal').innerText;
        
        this.show3DDialog("Confirm Payment", `Process ${total} for Table ${table}?`, "confirm", () => {
            // Success showing PRINT Button
            this.show3DDialog("Success", `Order sent to Kitchen.`, "success", null, () => {
                this.printReceipt(table, total);
            });
            
            this.cart = []; this.renderCart();
            document.getElementById('tableSelector').value = "0";
            document.getElementById('cartPanel').classList.remove('expanded');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new POS(); });
