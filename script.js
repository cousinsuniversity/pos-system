class POS {
    constructor() {
        this.cart = [];
        this.activeCategory = 'All';
        this.taxRate = 0.05; // 5%
        this.isTouch = false; // Flag to store device mode

        // Safety check for loading data
        try {
            const savedData = localStorage.getItem('nexus_products');
            this.products = savedData ? JSON.parse(savedData) : this.getDefaultProducts();
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
        // Ensure DOM elements exist before running
        if (!document.getElementById('productGrid')) return;

        // Detect if device supports touch events
        this.detectDevice();
        
        this.renderProducts();
        this.renderCart();
    }

    detectDevice() {
        // Check for touch capability
        this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        // Add a class to body for CSS specific tweaks if needed (optional)
        if (this.isTouch) {
            document.body.classList.add('touch-mode');
        } else {
            document.body.classList.add('desktop-mode');
        }
    }

    // --- Data Management ---
    saveData() {
        try {
            localStorage.setItem('nexus_products', JSON.stringify(this.products));
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    resetSystem() {
        if(confirm("This will delete all custom products. Continue?")) {
            localStorage.removeItem('nexus_products');
            location.reload();
        }
    }

    // --- Product Logic ---
    renderProducts() {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        
        grid.innerHTML = '';

        const filtered = this.activeCategory === 'All' 
            ? this.products 
            : this.products.filter(p => p.category === this.activeCategory);

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
            
            // --- PATCH: Dynamic Event Listener ---
            // If Touch Device: use 'touchstart' for instant reaction
            // If Desktop: use 'click' for standard mouse interaction
            const eventType = this.isTouch ? 'touchstart' : 'click';

            card.addEventListener(eventType, (e) => {
                // Prevent ghost clicks on touch devices
                if (this.isTouch) e.preventDefault(); 
                
                this.addToCart(product.id);
                
                // Visual Feedback
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.style.transform = 'scale(1)', 100);
            });

            grid.appendChild(card);
        });
    }

    filterCategory(category) {
        this.activeCategory = category;
        
        // Update UI tabs
        document.querySelectorAll('.category-tabs .tab').forEach(t => {
            t.classList.remove('active');
            if(t.textContent.includes(category) || (category === 'All' && t.textContent.includes('All'))) {
                t.classList.add('active');
            }
        });
        
        this.renderProducts();
    }

    // --- Cart Logic ---
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
            
            // Build Controls HTML
            // We use inline onclick for simplicity, but for the +/- buttons we want
            // the same touch optimization.
            
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
        
        // --- PATCH: Add listeners to new cart buttons ---
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

    // --- Admin & Payments ---
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
            
            // Clear inputs
            nameInput.value = '';
            priceInput.value = '';
        } else {
            alert('Please enter valid name and price');
        }
    }

    processPayment() {
        if(this.cart.length === 0) return alert("Cart is empty!");
        
        const total = document.getElementById('finalTotal').innerText;
        
        if(confirm(`Process payment of ${total}?`)) {
            alert("Payment Successful! Receipt sent.");
            this.cart = [];
            this.renderCart();
            document.getElementById('cartPanel').classList.remove('expanded');
        }
    }
    
    toggleMobileCart() {
        // Always allow toggle on mobile layout, regardless of input type
        if(window.innerWidth <= 768) {
            document.getElementById('cartPanel').classList.toggle('expanded');
        }
    }
}

// Start App when page is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new POS();
});
