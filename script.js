document.addEventListener('DOMContentLoaded', function() {
    // متغيرات النظام
    let products = JSON.parse(localStorage.getItem('products')) || {};
    let invoiceItems = [];
    let scannerActive = false;
    
    // عناصر DOM
    const scannerContainer = document.getElementById('interactive');
    const startScannerBtn = document.getElementById('start-scanner');
    const stopScannerBtn = document.getElementById('stop-scanner');
    const manualBarcodeInput = document.getElementById('manual-barcode');
    const addManualBtn = document.getElementById('add-manual');
    const invoiceItemsContainer = document.getElementById('invoice-items');
    const totalAmountSpan = document.getElementById('total-amount');
    const printInvoiceBtn = document.getElementById('print-invoice');
    const clearInvoiceBtn = document.getElementById('clear-invoice');
    const newProductForm = document.getElementById('new-product-form');
    const barcodeInput = document.getElementById('barcode');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const saveProductBtn = document.getElementById('save-product');
    const searchProductInput = document.getElementById('search-product');
    const productListContainer = document.getElementById('product-list');
    
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
        }, function(err) {
            if (err) {
                console.error(err);
                alert("حدث خطأ في تهيئة الماسح الضوئي: " + err);
                return;
            }
            Quagga.start();
            scannerActive = true;
        });
        
        Quagga.onDetected(function(result) {
            const code = result.codeResult.code;
            processBarcode(code);
        });
    }
    
    // معالجة الباركود
    function processBarcode(barcode) {
        if (products[barcode]) {
            // المنتج موجود
            addToInvoice(products[barcode]);
        } else {
            // منتج جديد
            Quagga.stop();
            scannerActive = false;
            barcodeInput.value = barcode;
            newProductForm.style.display = 'block';
            productNameInput.focus();
        }
    }
    
    // إضافة عنصر إلى الفاتورة
    function addToInvoice(product) {
        const existingItem = invoiceItems.find(item => item.barcode === product.barcode);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            invoiceItems.push({
                barcode: product.barcode,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        }
        
        updateInvoiceDisplay();
    }
    
    // تحديث عرض الفاتورة
    function updateInvoiceDisplay() {
        invoiceItemsContainer.innerHTML = '';
        let total = 0;
        
        invoiceItems.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'invoice-item';
            itemElement.innerHTML = `
                <span>${item.name}</span>
                <span>${item.price.toFixed(2)}</span>
                <span>${item.quantity}</span>
                <span>${itemTotal.toFixed(2)}</span>
                <span><button class="delete-item" data-index="${index}">حذف</button></span>
            `;
            
            invoiceItemsContainer.appendChild(itemElement);
        });
        
        totalAmountSpan.textContent = total.toFixed(2);
        
        // إضافة معالجات الأحداث لأزرار الحذف
        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                invoiceItems.splice(index, 1);
                updateInvoiceDisplay();
            });
        });
    }
    
    // حفظ المنتج
    function saveProduct() {
        const barcode = barcodeInput.value;
        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);
        
        if (!name || isNaN(price)) {
            alert('الرجاء إدخال اسم المنتج وسعر صحيح');
            return;
        }
        
        products[barcode] = {
            barcode: barcode,
            name: name,
            price: price
        };
        
        localStorage.setItem('products', JSON.stringify(products));
        newProductForm.style.display = 'none';
        productNameInput.value = '';
        productPriceInput.value = '';
        
        // إضافة المنتج إلى الفاتورة
        addToInvoice(products[barcode]);
        
        // تحديث قائمة المنتجات
        updateProductList();
        
        // إعادة تشغيل الماسح إذا كان متوقفًا
        if (!scannerActive) {
            initScanner();
        }
    }
    
    // تحديث قائمة المنتجات
    function updateProductList(filter = '') {
        productListContainer.innerHTML = '';
        
        const filteredProducts = Object.values(products).filter(product => 
            product.name.toLowerCase().includes(filter.toLowerCase()) || 
            product.barcode.includes(filter)
        );
        
        if (filteredProducts.length === 0) {
            productListContainer.innerHTML = '<p>لا توجد منتجات متطابقة</p>';
            return;
        }
        
        filteredProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-item';
            productElement.innerHTML = `
                <div>
                    <strong>${product.name}</strong><br>
                    <small>باركود: ${product.barcode}</small>
                </div>
                <div>${product.price.toFixed(2)}</div>
                <div class="product-actions">
                    <button class="edit-btn" data-barcode="${product.barcode}">تعديل</button>
                    <button class="delete-btn" data-barcode="${product.barcode}">حذف</button>
                </div>
            `;
            
            productListContainer.appendChild(productElement);
        });
        
        // إضافة معالجات الأحداث لأزرار التعديل والحذف
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const barcode = this.getAttribute('data-barcode');
                editProduct(barcode);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const barcode = this.getAttribute('data-barcode');
                deleteProduct(barcode);
            });
        });
    }
    
    // تعديل المنتج
    function editProduct(barcode) {
        const product = products[barcode];
        if (!product) return;
        
        if (scannerActive) {
            Quagga.stop();
            scannerActive = false;
        }
        
        barcodeInput.value = product.barcode;
        productNameInput.value = product.name;
        productPriceInput.value = product.price;
        newProductForm.style.display = 'block';
        productNameInput.focus();
    }
    
    // حذف المنتج
    function deleteProduct(barcode) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            delete products[barcode];
            localStorage.setItem('products', JSON.stringify(products));
            updateProductList(searchProductInput.value);
        }
    }
    
    // طباعة الفاتورة
    function printInvoice() {
        if (invoiceItems.length === 0) {
            alert('لا توجد عناصر في الفاتورة');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        let invoiceHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة بيع</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    .total { font-weight: bold; text-align: left; }
                    .date { text-align: left; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>فاتورة بيع</h1>
                <div class="date">التاريخ: ${new Date().toLocaleString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>السعر</th>
                            <th>الكمية</th>
                            <th>المجموع</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let total = 0;
        invoiceItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            invoiceHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        });
        
        invoiceHTML += `
                    </tbody>
                </table>
                <div class="total">الإجمالي: ${total.toFixed(2)}</div>
            </body>
            </html>
        `;
        
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.print();
    }
    
    // معالجات الأحداث
    startScannerBtn.addEventListener('click', function() {
        if (!scannerActive) {
            initScanner();
        }
    });
    
    stopScannerBtn.addEventListener('click', function() {
        if (scannerActive) {
            Quagga.stop();
            scannerActive = false;
        }
    });
    
    addManualBtn.addEventListener('click', function() {
        const barcode = manualBarcodeInput.value.trim();
        if (barcode) {
            processBarcode(barcode);
            manualBarcodeInput.value = '';
        }
    });
    
    manualBarcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const barcode = manualBarcodeInput.value.trim();
            if (barcode) {
                processBarcode(barcode);
                manualBarcodeInput.value = '';
            }
        }
    });
    
    printInvoiceBtn.addEventListener('click', printInvoice);
    
    clearInvoiceBtn.addEventListener('click', function() {
        invoiceItems = [];
        updateInvoiceDisplay();
    });
    
    saveProductBtn.addEventListener('click', saveProduct);
    
    searchProductInput.addEventListener('input', function() {
        updateProductList(this.value);
    });
    
    // تهيئة النظام
    updateProductList();
});
