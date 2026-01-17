class POS {
    constructor() {
        this.cart = [];
        this.activeCategory = 'All';
        this.taxRate = 0.05; // 5%
        this.isTouch = false;
        
        // Settings Default
        this.settings = {
            storeName: "NEXUS POS",
            tableCount: 10,
            setupDone: false
        };

        // Load Data
        try {
            const savedData = localStorage.getItem('nexus_products');
            this.products = savedData ? JSON.parse(savedData) : this.getDefaultProducts();
            
            const savedSettings = localStorage.getItem('nexus_settings');
            if(savedSettings) this.settings = JSON.parse(savedSettings);

        } catch (e) {
            console.error("Data load error", e);
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

    // --- Splash & Setup ---
    handleSplashScreen() {
        const splash = document.getElementById('splashScreen');
        const loader = document.getElementById('splashLoader');
        const text = document.getElementById('splashText');
        const form = document.getElementById('setupForm');

        if (!this.settings.setupDone) {
            // Show Setup Form
            loader.style.display = 'none';
            text.style.display = 'none';
            form.style.display = 'block';
        } else {
            // Normal Load
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 500);
            }, 1500); // Fake loading time
        }
    }

    finishSetup() {
        const name = document.getElementById('setupStoreName').value;
        const tables = parseInt(document.getElementById('setupTableCount').value);

        if(name && tables > 0) {
            this.settings.storeName = name;
            this.settings.tableCount = tables;
            this.settings.setupDone = true;
            this.saveSettings();
            
            location.reload(); // Reload to apply
        } else {
            alert("Please enter valid Store Name and Tables");
        }
    }

    applySettings() {
        // Apply Store Name
        if(this.settings.storeName) {
            document.getElementById('brandName').innerHTML = this.settings.storeName;
            document.getElementById('storeSubtitle').innerText = "POS Active // " + (new Date().toLocaleDateString());
        }

        // Populate Table Selector
        const selector = document.getElementById('tableSelector');
        selector.innerHTML = '<option value="0">Select Table...</option>';
        for(let i=1; i<=this.settings.tableCount; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.innerText = `Table ${i}`;
            selector.appendChild(opt);
        }
    }

    saveSettings() {
        localStorage.setItem('nexus_settings', JSON.stringify(this.settings));
    }

    // --- Core Logic ---
    detectDevice() {
        this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (this.isTouch) {
            document.body.classList.add('touch-mode');
        } else {
            document.body.classList.add('desktop-mode');
        }
    }

    saveData() {
        localStorage.setItem('nexus_products', JSON.stringify(this.products));
    }

    resetSystem() {
        if(confirm("FULL RESET: This will wipe Products and Settings. Continue?")) {
            localStorage.removeItem('nexus_products');
            localStorage.removeItem('nexus_settings');
            location.reload();
        }
    }

    renderProducts() {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const filtered = this.activeCategory === 'All' ? this.products : this.products.filter(p => p.category === this.activeCategory);

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-stock">${product.category}</div>
                </div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
            `;
            const eventType = this.isTouch ? 'touchstart' : 'click';
            card.addEventListener(eventType, (e) => {
                if (this.isTouch) e.preventDefault(); 
                this.addToCart(product.id);
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.style.transform = 'scale(1)', 100);
            });
            grid.appendChild(card);
        });
    }

    filterCategory(category) {
        this.activeCategory = category;
        document.querySelectorAll('.category-tabs .tab').forEach(t => {
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
        if (existingItem) {
            existingItem.qty++;
        } else {
            this.cart.push({ ...product, qty: 1 });
        }
        this.renderCart();
    }

    updateQty(id, change) {
        const item = this.cart.find(i => i.id === id);
        if (!item) return;
        item.qty += change;
        if (item.qty <= 0) {
            this.cart = this.cart.filter(i => i.id !== id);
        }
        this.renderCart();
    }

    renderCart() {
        const container = document.getElementById('cartItems');
        const subTotalEl = document.getElementById('subTotal');
        const taxEl = document.getElementById('taxAmount');
        const totalEl = document.getElementById('finalTotal');
        const mobileTotal = document.getElementById('mobileTotal');

        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; color:var(--text-muted); margin-top:50px;">
                    <i class="fas fa-shopping-basket" style="font-size: 2rem; margin-bottom:10px; opacity:0.5;"></i>
                    <p>Cart is empty</p>
                </div>
            `;
            subTotalEl.innerText = '$0.00';
            taxEl.innerText = '$0.00';
            totalEl.innerText = '$0.00';
            mobileTotal.innerText = '$0.00';
            return;
        }

        container.innerHTML = '';
        let subTotal = 0;

        this.cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            subTotal += itemTotal;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" data-id="${item.id}" data-action="-1"><i class="fas fa-minus"></i></button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.qty}</span>
                    <button class="qty-btn" data-id="${item.id}" data-action="1"><i class="fas fa-plus"></i></button>
                </div>
            `;
            container.appendChild(el);
        });
        
        const eventType = this.isTouch ? 'touchstart' : 'click';
        container.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener(eventType, (e) => {
                if (this.isTouch) e.preventDefault();
                const id = parseInt(btn.getAttribute('data-id'));
                const action = parseInt(btn.getAttribute('data-action'));
                this.updateQty(id, action);
            });
        });

        const tax = subTotal * this.taxRate;
        const total = subTotal + tax;
        subTotalEl.innerText = `$${subTotal.toFixed(2)}`;
        taxEl.innerText = `$${tax.toFixed(2)}`;
        totalEl.innerText = `$${total.toFixed(2)}`;
        mobileTotal.innerText = `$${total.toFixed(2)}`;
    }

    toggleAdmin() {
        const modal = document.getElementById('adminModal');
        if(modal) modal.classList.toggle('active');
    }

    addProduct() {
        const nameInput = document.getElementById('newProdName');
        const priceInput = document.getElementById('newProdPrice');
        const catInput = document.getElementById('newProdCat');
        const name = nameInput.value;
        const price = parseFloat(priceInput.value);
        const category = catInput.value;

        if(name && price) {
            const newId = Date.now();
            this.products.push({ id: newId, name, price, category });
            this.saveData();
            this.renderProducts();
            this.toggleAdmin();
            nameInput.value = ''; priceInput.value = '';
        } else {
            alert('Please enter valid name and price');
        }
    }

    processPayment() {
        if(this.cart.length === 0) return alert("Cart is empty!");
        
        const table = document.getElementById('tableSelector').value;
        if(table === "0") return alert("Please Select a Table Number");

        const total = document.getElementById('finalTotal').innerText;
        
        if(confirm(`Process payment of ${total} for Table ${table}?`)) {
            alert(`Payment Successful!\n\nOrder sent to Kitchen for Table ${table}.`);
            this.cart = [];
            this.renderCart();
            document.getElementById('tableSelector').value = "0";
            document.getElementById('cartPanel').classList.remove('expanded');
        }
    }
    
    toggleMobileCart() {
        if(window.innerWidth <= 768) {
            document.getElementById('cartPanel').classList.toggle('expanded');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new POS();
});
