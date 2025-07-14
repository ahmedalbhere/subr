document.addEventListener('DOMContentLoaded', function() {
    // متغيرات التطبيق
    let products = JSON.parse(localStorage.getItem('products')) || {};
    let sales = JSON.parse(localStorage.getItem('sales')) || [];
    let currentInvoice = {
        items: [],
        total: 0
    };
    let scannerActive = false;
    let currentScannedBarcode = '';
    let isAddingNewProduct = false;

    // عناصر DOM
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const scannerStatus = document.getElementById('scanner-status');
    const startScannerBtn = document.getElementById('start-scanner');
    const stopScannerBtn = document.getElementById('stop-scanner');
    const scannerContainer = document.getElementById('interactive');
    const invoiceItemsContainer = document.getElementById('invoice-items');
    const totalAmountSpan = document.getElementById('total-amount');
    const completeSaleBtn = document.getElementById('complete-sale');
    const cancelSaleBtn = document.getElementById('cancel-sale');
    const productSearch = document.getElementById('product-search');
    const addProductBtn = document.getElementById('add-product');
    const productsList = document.getElementById('products-list');
    const productForm = document.getElementById('product-form');
    const productBarcode = document.getElementById('product-barcode');
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const saveProductBtn = document.getElementById('save-product');
    const cancelProductBtn = document.getElementById('cancel-product');

    // تهيئة الماسح الضوئي
    function initScanner() {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerContainer,
                constraints: {
                    width: 480,
                    height: 320,
                    facingMode: "environment"
                },
            },
            decoder: {
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "code_39_vin_reader", "codabar_reader", "upc_reader", "upc_e_reader"],
                multiple: false
            },
            locate: true,
            debug: {
                drawBoundingBox: true,
                showFrequency: false,
                drawScanline: true,
                showPattern: false
            }
        }, function(err) {
            if (err) {
                console.error(err);
                alert("حدث خطأ في تهيئة الماسح الضوئي: " + err.message);
                return;
            }
            Quagga.start();
            scannerActive = true;
            updateScannerStatus();
            startScannerBtn.disabled = true;
            stopScannerBtn.disabled = false;
        });
        
        Quagga.onDetected(function(result) {
            const code = result.codeResult.code;
            currentScannedBarcode = code;
            processScannedBarcode(code);
        });
    }

    function stopScanner() {
        if (scannerActive) {
            Quagga.stop();
            scannerActive = false;
            updateScannerStatus();
            startScannerBtn.disabled = false;
            stopScannerBtn.disabled = true;
        }
    }

    function updateScannerStatus() {
        if (scannerActive) {
            scannerStatus.textContent = "الماسح نشط";
            scannerStatus.classList.remove('error');
            scannerStatus.classList.add('active');
        } else {
            scannerStatus.textContent = "الماسح متوقف";
            scannerStatus.classList.remove('active');
            scannerStatus.classList.add('error');
        }
    }

    // معالجة الباركود الممسوح
    function processScannedBarcode(barcode) {
        if (products[barcode]) {
            // المنتج موجود - إضافته للفاتورة
            addItemToInvoice(products[barcode]);
        } else {
            // المنتج غير موجود - الانتقال لإضافة المنتج
            stopScanner();
            isAddingNewProduct = true;
            showAddProductForm(barcode);
            changePage('products');
        }
    }

    // عرض نموذج إضافة منتج جديد
    function showAddProductForm(barcode = '') {
        productBarcode.value = barcode;
        productName.value = '';
        productPrice.value = '';
        productForm.classList.add('show');
        
        if (barcode) {
            productName.focus();
        } else {
            productBarcode.focus();
        }
    }

    function hideAddProductForm() {
        productForm.classList.remove('show');
        isAddingNewProduct = false;
    }

    // إضافة منتج جديد
    function addNewProduct() {
        const barcode = productBarcode.value.trim();
        const name = productName.value.trim();
        const price = parseFloat(productPrice.value);

        if (!barcode) {
            alert('الرجاء إدخال باركود المنتج');
            productBarcode.focus();
            return;
        }

        if (!name) {
            alert('الرجاء إدخال اسم المنتج');
            productName.focus();
            return;
        }

        if (isNaN(price) || price <= 0) {
            alert('الرجاء إدخال سعر صحيح للمنتج');
            productPrice.focus();
            return;
        }

        products[barcode] = {
            barcode: barcode,
            name: name,
            price: price
        };

        localStorage.setItem('products', JSON.stringify(products));
        hideAddProductForm();
        renderProductsList();

        // إذا كان الباركود من المسح الضوئي، عد لصفحة المبيعات وأضف المنتج
        if (isAddingNewProduct && currentScannedBarcode === barcode) {
            changePage('sales');
            initScanner();
            addItemToInvoice(products[barcode]);
        }
    }

    // تغيير الصفحات
    function changePage(pageId) {
        pages.forEach(page => {
            page.classList.remove('active-page');
            if (page.id === `${pageId}-page`) {
                page.classList.add('active-page');
            }
        });

        navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-page') === pageId) {
                btn.classList.add('active');
            }
        });

        if (pageId === 'sales') {
            if (!scannerActive && !isAddingNewProduct) {
                initScanner();
            }
        } else {
            stopScanner();
        }
    }

    // إدارة الفاتورة
    function addItemToInvoice(product) {
        const existingItem = currentInvoice.items.find(item => item.barcode === product.barcode);

        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.total = existingItem.quantity * product.price;
        } else {
            currentInvoice.items.push({
                barcode: product.barcode,
                name: product.name,
                price: product.price,
                quantity: 1,
                total: product.price
            });
        }

        updateInvoiceTotal();
        renderInvoiceItems();
    }

    function updateInvoiceTotal() {
        currentInvoice.total = currentInvoice.items.reduce((sum, item) => sum + item.total, 0);
        totalAmountSpan.textContent = currentInvoice.total.toFixed(2);
    }

    function renderInvoiceItems() {
        invoiceItemsContainer.innerHTML = '';

        if (currentInvoice.items.length === 0) {
            invoiceItemsContainer.innerHTML = `
                <div class="empty-invoice">
                    <p>لا توجد عناصر في الفاتورة</p>
                    <p>قم بمسح الباركود لإضافة منتجات</p>
                </div>
            `;
            return;
        }

        currentInvoice.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'invoice-item';
            itemElement.innerHTML = `
                <span class="item-name">${item.name}</span>
                <span class="item-price">${item.price.toFixed(2)}</span>
                <span class="item-qty">${item.quantity}</span>
                <span class="item-total">${item.total.toFixed(2)}</span>
            `;
            invoiceItemsContainer.appendChild(itemElement);
        });
    }

    function completeSale() {
        if (currentInvoice.items.length === 0) {
            alert('لا توجد عناصر في الفاتورة');
            return;
        }

        const sale = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            items: [...currentInvoice.items],
            total: currentInvoice.total
        };

        sales.push(sale);
        localStorage.setItem('sales', JSON.stringify(sales));

        currentInvoice = {
            items: [],
            total: 0
        };

        updateInvoiceTotal();
        renderInvoiceItems();
        alert('تم حفظ الفاتورة بنجاح! رقم الفاتورة: #' + sale.id);
    }

    function cancelSale() {
        if (confirm('هل أنت متأكد من إلغاء الفاتورة الحالية؟ سيتم حذف جميع العناصر.')) {
            currentInvoice = {
                items: [],
                total: 0
            };

            updateInvoiceTotal();
            renderInvoiceItems();
        }
    }

    // إدارة المنتجات
    function renderProductsList(filter = '') {
        productsList.innerHTML = '';

        const filteredProducts = Object.values(products).filter(product => 
            product.name.toLowerCase().includes(filter.toLowerCase()) || 
            product.barcode.includes(filter)
        );

        if (filteredProducts.length === 0) {
            productsList.innerHTML = `
                <div class="empty-products">
                    <p>لا توجد منتجات مسجلة</p>
                    <button id="add-first-product" class="add-product-btn">إضافة منتج جديد</button>
                </div>
            `;
            
            document.getElementById('add-first-product')?.addEventListener('click', () => {
                showAddProductForm();
            });
            
            return;
        }

        filteredProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-item';
            productElement.innerHTML = `
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-barcode">${product.barcode}</div>
                </div>
                <div class="product-price">${product.price.toFixed(2)}</div>
                <div class="product-actions">
                    <button class="edit-btn" data-barcode="${product.barcode}">تعديل</button>
                    <button class="delete-btn" data-barcode="${product.barcode}">حذف</button>
                </div>
            `;
            productsList.appendChild(productElement);
        });

        // إضافة معالجات الأحداث لأزرار التعديل والحذف
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const barcode = this.getAttribute('data-barcode');
                editProduct(barcode);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const barcode = this.getAttribute('data-barcode');
                deleteProduct(barcode);
            });
        });
    }

    function editProduct(barcode) {
        const product = products[barcode];
        if (product) {
            productBarcode.value = product.barcode;
            productName.value = product.name;
            productPrice.value = product.price;
            showAddProductForm();
        }
    }

    function deleteProduct(barcode) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذه العملية.')) {
            delete products[barcode];
            localStorage.setItem('products', JSON.stringify(products));
            renderProductsList(productSearch.value);
        }
    }

    // معالجات الأحداث
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            changePage(pageId);
        });
    });

    startScannerBtn.addEventListener('click', initScanner);
    stopScannerBtn.addEventListener('click', stopScanner);
    completeSaleBtn.addEventListener('click', completeSale);
    cancelSaleBtn.addEventListener('click', cancelSale);
    productSearch.addEventListener('input', function() {
        renderProductsList(this.value);
    });
    addProductBtn.addEventListener('click', function() {
        showAddProductForm();
    });
    saveProductBtn.addEventListener('click', addNewProduct);
    cancelProductBtn.addEventListener('click', hideAddProductForm);

    // تهيئة التطبيق
    changePage('sales');
    renderProductsList();
    renderInvoiceItems();
});
