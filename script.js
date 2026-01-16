class POS {
    constructor() {
        this.products = JSON.parse(localStorage.getItem('nexus_products')) || [
            { id: 1, name: "Neon Burger", price: 12.50, category: "Food" },
            { id: 2, name: "Cyber Fries", price: 5.00, category: "Food" },
            { id: 3, name: "Quantum Cola", price: 3.50, category: "Drinks" },
            { id: 4, name: "Void Coffee", price: 4.00, category: "Drinks" },
            { id: 5, name: "Plasma Cake", price: 6.00, category: "Dessert" },
        ];
        
        this.cart = [];
        this.activeCategory = 'All';
        this.taxRate = 0.05; // 5%
        
        this.init();
    }

    init() {
        this.renderProducts();
        this.renderCart();
    }

    // --- Data Management ---
    saveData() {
        localStorage.setItem('nexus_products', JSON.stringify(this.products));
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
            // Add touch feedback
            card.addEventListener('click', () => {
                this.addToCart(product.id);
                // Simple ripple visual effect could go here
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
                    <button class="qty-btn" onclick="app.updateQty(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.qty}</span>
                    <button class="qty-btn" onclick="app.updateQty(${item.id}, 1)"><i class="fas fa-plus"></i></button>
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

    // --- Admin & Payments ---
    toggleAdmin() {
        const modal = document.getElementById('adminModal');
        modal.classList.toggle('active');
    }

    addProduct() {
        const name = document.getElementById('newProdName').value;
        const price = parseFloat(document.getElementById('newProdPrice').value);
        const category = document.getElementById('newProdCat').value;

        if(name && price) {
            const newId = Date.now(); // Simple ID generation
            this.products.push({ id: newId, name, price, category });
            this.saveData();
            this.renderProducts();
            this.toggleAdmin();
            
            // Clear inputs
            document.getElementById('newProdName').value = '';
            document.getElementById('newProdPrice').value = '';
        } else {
            alert('Please enter valid name and price');
        }
    }

    processPayment() {
        if(this.cart.length === 0) return alert("Cart is empty!");
        
        // In a real app, this would connect to Stripe/Square API
        // For this demo, we simulate a successful transaction
        
        const total = document.getElementById('finalTotal').innerText;
        
        if(confirm(`Process payment of ${total}?`)) {
            alert("Payment Successful! Receipt sent.");
            this.cart = [];
            this.renderCart();
            // Contract mobile cart if open
            document.getElementById('cartPanel').classList.remove('expanded');
        }
    }
    
    toggleMobileCart() {
        if(window.innerWidth <= 768) {
            document.getElementById('cartPanel').classList.toggle('expanded');
        }
    }
}

// Initialize App
const app = new POS();