class POS {
    constructor() {
        this.cart = [];
        this.activeCategory = 'All';
        this.taxRate = 0.05;
        this.isTouch = false;
        
        this.settings = { storeName: "NEXUS POS", tableCount: 10, setupDone: false };

        try {
            const savedData = localStorage.getItem('nexus_products');
            this.products = savedData ? JSON.parse(savedData) : this.getDefaultProducts();
            const savedSettings = localStorage.getItem('nexus_settings');
            if(savedSettings) this.settings = JSON.parse(savedSettings);
        } catch (e) {
            this.products = this.getDefaultProducts();
        }
        
        this.init();
    }

    getDefaultProducts() {
        return [
            { id: 1, name: "Neon Burger", price: 12.50, category: "Food" },
            { id: 2, name: "Cyber Fries", price: 5.00, category: "Food" },
            { id: 3, name: "Quantum Cola", price: 3.50, category: "Drinks" },
            { id: 4, name: "Void Coffee", price: 4.00, category: "Drinks" },
            { id: 5, name: "Plasma Cake", price: 6.00, category: "Dessert" },
        ];
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

    // --- NEW: 3D Dialog System ---
    show3DDialog(title, message, type, onConfirm) {
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
            // Cancel Button
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn-secondary';
            btnCancel.innerText = 'Cancel';
            btnCancel.onclick = closeDialog;
            
            // Confirm Button
            const btnOk = document.createElement('button');
            btnOk.className = 'pay-btn';
            btnOk.innerText = 'Confirm';
            btnOk.style.margin = '0';
            btnOk.onclick = () => {
                closeDialog();
                if(onConfirm) onConfirm();
            };
            
            btnsEl.appendChild(btnCancel);
            btnsEl.appendChild(btnOk);
        } else {
            // Alert (OK only)
            const btnOk = document.createElement('button');
            btnOk.className = 'pay-btn';
            btnOk.innerText = 'OK';
            btnOk.style.margin = '0';
            btnOk.onclick = closeDialog;
            btnsEl.appendChild(btnOk);
        }

        overlay.style.display = 'flex';
        
        // Re-trigger animation
        box.style.animation = 'none';
        box.offsetHeight; /* trigger reflow */
        box.style.animation = 'dialogPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }

    handleSplashScreen() {
        const splash = document.getElementById('splashScreen');
        const loader = document.getElementById('splashLoader');
        const text = document.getElementById('splashText');
        const form = document.getElementById('setupForm');

        if (!this.settings.setupDone) {
            setTimeout(() => {
                loader.style.display = 'none';
                text.style.display = 'none';
                form.style.display = 'block';
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

        if(name && tables > 0) {
            this.settings.storeName = name;
            this.settings.tableCount = tables;
            this.settings.setupDone = true;
            this.saveData(); 
            localStorage.setItem('nexus_settings', JSON.stringify(this.settings));
            location.reload();
        } else {
            this.show3DDialog("Error", "Please enter valid Store Name and Tables", "alert");
        }
    }

    applySettings() {
        if(this.settings.storeName) {
            document.getElementById('brandName').innerHTML = this.settings.storeName;
            document.getElementById('storeSubtitle').innerText = "POS ONLINE // " + (new Date().toLocaleDateString());
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
        this.show3DDialog("Factory Reset", "This will wipe all data. Are you sure?", "confirm", () => {
            localStorage.clear();
            location.reload();
        });
    }

    renderProducts() {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        grid.innerHTML = '';
        
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
                <div class="product-price">$${product.price.toFixed(2)}</div>
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

        if (!container) return;
        container.innerHTML = '';
        
        if (this.cart.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:50px; opacity:0.5;">Cart Empty</div>`;
            subTotalEl.innerText = '$0.00'; taxEl.innerText = '$0.00'; totalEl.innerText = '$0.00'; mobileTotal.innerText = '$0.00';
            return;
        }

        let subTotal = 0;
        this.cart.forEach(item => {
            subTotal += item.price * item.qty;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="item-info"><h4>${item.name}</h4><p>$${item.price.toFixed(2)} x ${item.qty}</p></div>
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
        subTotalEl.innerText = `$${subTotal.toFixed(2)}`;
        taxEl.innerText = `$${tax.toFixed(2)}`;
        totalEl.innerText = `$${total.toFixed(2)}`;
        mobileTotal.innerText = `$${total.toFixed(2)}`;
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
            this.show3DDialog("Missing Info", "Please enter valid name and price.", "alert");
        }
    }

    processPayment() {
        if(this.cart.length === 0) return this.show3DDialog("Empty", "Cart is empty!", "alert");
        
        const table = document.getElementById('tableSelector').value;
        if(table === "0") return this.show3DDialog("Table Required", "Please Select a Table Number", "alert");

        const total = document.getElementById('finalTotal').innerText;
        
        this.show3DDialog("Confirm Payment", `Process ${total} for Table ${table}?`, "confirm", () => {
            this.show3DDialog("Success", `Order sent to Kitchen for Table ${table}.`, "alert");
            this.cart = []; this.renderCart();
            document.getElementById('tableSelector').value = "0";
            document.getElementById('cartPanel').classList.remove('expanded');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new POS(); });
