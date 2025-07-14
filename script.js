document.addEventListener('DOMContentLoaded', function() {
    // متغيرات النظام
    let products = JSON.parse(localStorage.getItem('products')) || {};
    let sales = JSON.parse(localStorage.getItem('sales')) || [];
    let currentInvoice = {
        items: [],
        total: 0
    };
    let scannerActive = false;
    let lightActive = false;
    let currentScannedBarcode = '';

    // عناصر DOM
    const toggleScannerBtn = document.getElementById('toggle-scanner');
    const toggleLightBtn = document.getElementById('toggle-light');
    const scannerStatus = document.getElementById('scanner-status');
    const lightStatus = document.getElementById('light-status');
    const lightIndicator = document.getElementById('light-indicator');
    const scannerContainer = document.getElementById('interactive');
    const invoiceItemsContainer = document.getElementById('invoice-items');
    const totalAmountSpan = document.getElementById('total-amount');
    const completeSaleBtn = document.getElementById('complete-sale');
    const clearSaleBtn = document.getElementById('clear-sale');
    const addProductModal = document.getElementById('add-product-modal');
    const productBarcodeInput = document.getElementById('product-barcode');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const saveProductBtn = document.getElementById('save-product');
    const cancelProductBtn = document.getElementById('cancel-product');
    const closeModalBtn = document.getElementById('close-modal');

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
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "code_39_vin_reader", "codabar_reader", "upc_reader", "upc_e_reader"]
            },
            locate: true
        }, function(err) {
            if (err) {
                console.error(err);
                alert("حدث خطأ في تهيئة الماسح الضوئي");
                return;
            }
            Quagga.start();
            scannerActive = true;
            updateScannerStatus();
            toggleScannerBtn.innerHTML = '<span class="icon">📷</span><span>إيقاف الماسح</span>';
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
            toggleScannerBtn.innerHTML = '<span class="icon">📷</span><span>تشغيل الماسح</span>';
        }
    }

    function toggleScanner() {
        if (scannerActive) {
            stopScanner();
        } else {
            initScanner();
        }
    }

    function updateScannerStatus() {
        if (scannerActive) {
            scannerStatus.textContent = "الماسح: نشط";
            scannerStatus.classList.remove('status-off');
            scannerStatus.classList.add('status-on');
        } else {
            scannerStatus.textContent = "الماسح: متوقف";
            scannerStatus.classList.remove('status-on');
            scannerStatus.classList.add('status-off');
        }
    }

    // التحكم في المصباح
    function toggleLight() {
        lightActive = !lightActive;
        updateLightStatus();
        
        if (lightActive) {
            toggleLightBtn.innerHTML = '<span class="icon">💡</span><span>إيقاف المصباح</span>';
            lightIndicator.classList.add('on');
            
            // محاكاة تشغيل المصباح (في الواقع يحتاج لدعم الجهاز)
            try {
                const track = scannerContainer.querySelector('video').srcObject.getVideoTracks()[0];
                if (track && track.getCapabilities().torch) {
                    track.applyConstraints({
                        advanced: [{torch: true}]
                    });
                }
            } catch (e) {
                console.log("لا يدعم الجهاز تشغيل المصباح");
            }
        } else {
            toggleLightBtn.innerHTML = '<span class="icon">💡</span><span>تشغيل المصباح</span>';
            lightIndicator.classList.remove('on');
            
            // محاكاة إيقاف المصباح
            try {
                const track = scannerContainer.querySelector('video').srcObject.getVideoTracks()[0];
                if (track && track.getCapabilities().torch) {
                    track.applyConstraints({
                        advanced: [{torch: false}]
                    });
                }
            } catch (e) {
                console.log("لا يدعم الجهاز إيقاف المصباح");
            }
        }
    }

    function updateLightStatus() {
        if (lightActive) {
            lightStatus.textContent = "المصباح: مفتوح";
            lightStatus.classList.remove('status-off');
            lightStatus.classList.add('status-on');
        } else {
            lightStatus.textContent = "المصباح: مغلق";
            lightStatus.classList.remove('status-on');
            lightStatus.classList.add('status-off');
        }
    }

    // معالجة الباركود الممسوح
    function processScannedBarcode(barcode) {
        if (products[barcode]) {
            // المنتج موجود - إضافته للفاتورة
            addItemToInvoice(products[barcode]);
        } else {
            // المنتج غير موجود - فتح نموذج الإضافة
            stopScanner();
            showAddProductForm(barcode);
        }
    }

    // عرض نموذج إضافة منتج جديد
    function showAddProductForm(barcode = '') {
        productBarcodeInput.value = barcode;
        productNameInput.value = '';
        productPriceInput.value = '';
        addProductModal.classList.add('show');
        productNameInput.focus();
    }

    function hideAddProductForm() {
        addProductModal.classList.remove('show');
    }

    // إضافة منتج جديد
    function addNewProduct() {
        const barcode = productBarcodeInput.value.trim();
        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);

        if (!barcode) {
            alert('الرجاء إدخال باركود المنتج');
            productBarcodeInput.focus();
            return;
        }

        if (!name) {
            alert('الرجاء إدخال اسم المنتج');
            productNameInput.focus();
            return;
        }

        if (isNaN(price) || price <= 0) {
            alert('الرجاء إدخال سعر صحيح للمنتج');
            productPriceInput.focus();
            return;
        }

        products[barcode] = {
            barcode: barcode,
            name: name,
            price: price
        };

        localStorage.setItem('products', JSON.stringify(products));
        hideAddProductForm();
        
        // إذا كان الباركود من المسح الضوئي، أضف المنتج للفاتورة
        if (currentScannedBarcode === barcode) {
            addItemToInvoice(products[barcode]);
            initScanner(); // إعادة تشغيل الماسح
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
        totalAmountSpan.textContent = currentInvoice.total.toFixed(2) + ' ر.س';
    }

    function renderInvoiceItems() {
        invoiceItemsContainer.innerHTML = '';

        if (currentInvoice.items.length === 0) {
            invoiceItemsContainer.innerHTML = '<div class="empty-message">لا توجد عناصر في الفاتورة</div>';
            return;
        }

        currentInvoice.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'invoice-item';
            itemElement.innerHTML = `
                <span class="col-product">${item.name}</span>
                <span class="col-price">${item.price.toFixed(2)} ر.س</span>
                <span class="col-qty">${item.quantity}</span>
                <span class="col-total">${item.total.toFixed(2)} ر.س</span>
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
        alert(`تم حفظ الفاتورة بنجاح! رقم الفاتورة: ${sale.id}`);
    }

    function clearSale() {
        if (confirm('هل أنت متأكد من مسح الفاتورة الحالية؟')) {
            currentInvoice = {
                items: [],
                total: 0
            };

            updateInvoiceTotal();
            renderInvoiceItems();
        }
    }

    // معالجات الأحداث
    toggleScannerBtn.addEventListener('click', toggleScanner);
    toggleLightBtn.addEventListener('click', toggleLight);
    completeSaleBtn.addEventListener('click', completeSale);
    clearSaleBtn.addEventListener('click', clearSale);
    saveProductBtn.addEventListener('click', addNewProduct);
    cancelProductBtn.addEventListener('click', hideAddProductForm);
    closeModalBtn.addEventListener('click', hideAddProductForm);

    // إغلاق النافذة عند النقر خارجها
    addProductModal.addEventListener('click', function(e) {
        if (e.target === addProductModal) {
            hideAddProductForm();
        }
    });

    // تهيئة التطبيق
    updateScannerStatus();
    updateLightStatus();
    renderInvoiceItems();
});
