document.addEventListener('DOMContentLoaded', function() {
    // متغيرات النظام
    let products = JSON.parse(localStorage.getItem('products')) || {};
    let sales = JSON.parse(localStorage.getItem('sales')) || [];
    let invoiceItems = [];
    let scannerActive = false;
    let currentInvoiceId = localStorage.getItem('currentInvoiceId')) || 1;
    
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
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const salesPage = document.getElementById('sales-page');
    const managementPage = document.getElementById('management-page');
    const reportsPage = document.getElementById('reports-page');
    const reportTitle = document.getElementById('report-title');
    const reportContent = document.getElementById('report-content');
    const salesDateInput = document.getElementById('sales-date');
    const filterSalesBtn = document.getElementById('filter-sales');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const salesList = document.getElementById('sales-list');
    const printReportBtn = document.getElementById('print-report');
    const exportReportBtn = document.getElementById('export-report');

    // تهيئة تاريخ اليوم كقيمة افتراضية
    salesDateInput.valueAsDate = new Date();
    
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
            addToInvoice(products[barcode]);
        } else {
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
        
        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                invoiceItems.splice(index, 1);
                updateInvoiceDisplay();
            });
        });
    }
    
    // حفظ الفاتورة
    function saveInvoice() {
        if (invoiceItems.length === 0) return;
        
        const total = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const sale = {
            id: currentInvoiceId++,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
            items: invoiceItems,
            total: total
        };
        
        sales.push(sale);
        localStorage.setItem('sales', JSON.stringify(sales));
        localStorage.setItem('currentInvoiceId', currentInvoiceId);
        
        invoiceItems = [];
        updateInvoiceDisplay();
        
        return sale;
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
        
        addToInvoice(products[barcode]);
        updateProductList();
        
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
        
        const sale = saveInvoice();
        
        const printWindow = window.open('', '_blank');
        let invoiceHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة بيع #${sale.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    .total { font-weight: bold; text-align: left; }
                    .date { text-align: left; margin-bottom: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>فاتورة رقم: #${sale.id}</div>
                    <div>التاريخ: ${sale.date} - ${sale.time}</div>
                </div>
                <h1>فاتورة بيع</h1>
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
        sale.items.forEach(item => {
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
                <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px dashed #000;">
                    شكراً لزيارتكم<br>
                    ${new Date().getFullYear()} © جميع الحقوق محفوظة
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.print();
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
    }
    
    // معالجة التقارير
    function generateReport(type) {
        let title = '';
        let reportData = [];
        const today = new Date();
        
        switch(type) {
            case 'daily':
                title = 'تقرير المبيعات اليومي - ' + today.toLocaleDateString();
                reportData = sales.filter(sale => sale.date === today.toISOString().split('T')[0]);
                break;
            case 'weekly':
                title = 'تقرير المبيعات الأسبوعي - الأسبوع ' + getWeekNumber(today);
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                reportData = sales.filter(sale => {
                    const saleDate = new Date(sale.date);
                    return saleDate >= weekStart && saleDate <= weekEnd;
                });
                break;
            case 'monthly':
                title = 'تقرير المبيعات الشهري - ' + today.toLocaleDateString('ar', {month: 'long', year: 'numeric'});
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                reportData = sales.filter(sale => {
                    const saleDate = new Date(sale.date);
                    return saleDate >= monthStart && saleDate <= monthEnd;
                });
                break;
        }
        
        reportTitle.textContent = title;
        displayReport(reportData, type);
        changePage('reports');
    }
    
    // عرض التقرير
    function displayReport(data, type) {
        if (data.length === 0) {
            reportContent.innerHTML = '<p>لا توجد بيانات متاحة</p>';
            return;
        }
        
        let totalAmount = 0;
        let totalItems = 0;
        
        let html = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>عدد العناصر</th>
                        <th>المبلغ</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(sale => {
            const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            totalAmount += sale.total;
            totalItems += itemsCount;
            
            html += `
                <tr>
                    <td>${sale.id}</td>
                    <td>${sale.date} ${sale.time}</td>
                    <td>${itemsCount}</td>
                    <td>${sale.total.toFixed(2)}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <div class="report-summary">
                <p>عدد الفواتير: ${data.length}</p>
                <p>إجمالي المبيعات: ${totalAmount.toFixed(2)}</p>
                <p>إجمالي العناصر المباعة: ${totalItems}</p>
                <p>متوسط قيمة الفاتورة: ${(totalAmount / data.length).toFixed(2)}</p>
            </div>
        `;
        
        if (type === 'monthly') {
            const dailySales = {};
            data.forEach(sale => {
                if (!dailySales[sale.date]) {
                    dailySales[sale.date] = 0;
                }
                dailySales[sale.date] += sale.total;
            });
            
            html += `<h3>تحليل المبيعات اليومية</h3><table class="report-table"><thead><tr><th>اليوم</th><th>المبلغ</th></tr></thead><tbody>`;
            
            Object.entries(dailySales).forEach(([date, amount]) => {
                html += `<tr><td>${date}</td><td>${amount.toFixed(2)}</td></tr>`;
            });
            
            html += `</tbody></table>`;
        }
        
        reportContent.innerHTML = html;
    }
    
    // عرض إدارة المبيعات
    function loadSalesManagement() {
        displaySales(sales);
    }
    
    // عرض المبيعات
    function displaySales(data) {
        if (data.length === 0) {
            salesList.innerHTML = '<p>لا توجد مبيعات مسجلة</p>';
            return;
        }
        
        salesList.innerHTML = '';
        
        data.forEach(sale => {
            const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            
            const saleElement = document.createElement('div');
            saleElement.className = 'sale-item';
            saleElement.innerHTML = `
                <div>فاتورة #${sale.id}</div>
                <div>${sale.date} - ${sale.time}</div>
                <div>${itemsCount} عنصر</div>
                <div>${sale.total.toFixed(2)}</div>
                <div>
                    <button class="view-sale" data-id="${sale.id}">عرض</button>
                </div>
            `;
            
            salesList.appendChild(saleElement);
        });
        
        document.querySelectorAll('.view-sale').forEach(button => {
            button.addEventListener('click', function() {
                const saleId = parseInt(this.getAttribute('data-id'));
                viewSaleDetails(saleId);
            });
        });
    }
    
    // عرض تفاصيل الفاتورة
    function viewSaleDetails(saleId) {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;
        
        let html = `
            <h2>تفاصيل الفاتورة #${sale.id}</h2>
            <p>التاريخ: ${sale.date} - ${sale.time}</p>
            <table class="report-table">
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
        
        sale.items.forEach(item => {
            html += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <div class="report-summary">
                <p>الإجمالي: ${sale.total.toFixed(2)}</p>
            </div>
            <button onclick="window.history.back()">العودة</button>
        `;
        
        const detailsWindow = window.open('', '_blank');
        detailsWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تفاصيل الفاتورة #${sale.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    .report-summary { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-weight: bold; }
                    button { padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `);
        detailsWindow.document.close();
    }
    
    // تصفية المبيعات حسب التاريخ
    function filterSalesByDate() {
        const selectedDate = salesDateInput.value;
        if (!selectedDate) return;
        
        const filteredSales = sales.filter(sale => sale.date === selectedDate);
        displaySales(filteredSales);
    }
    
    // دالة مساعدة لحساب رقم الأسبوع
    function getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
    
    // تصدير التقرير إلى Excel
    function exportToExcel() {
        alert('سيتم تصدير التقرير كملف Excel');
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
    
    manualBarcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const barcode = manualBarcodeInput.value.trim();
            if (barcode) {
                processBarcode(barcode);
                manualBarcodeInput.value = '';
            }
        }
    });
    
    addManualBtn.addEventListener('click', function() {
        const barcode = manualBarcodeInput.value.trim();
        if (barcode) {
            processBarcode(barcode);
            manualBarcodeInput.value = '';
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
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            if (pageId) {
                changePage(pageId);
                
                if (pageId === 'management') {
                    loadSalesManagement();
                }
            }
        });
    });
    
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const reportType = this.getAttribute('data-report');
            generateReport(reportType);
        });
    });
    
    filterSalesBtn.addEventListener('click', filterSalesByDate);
    
    resetFiltersBtn.addEventListener('click', function() {
        salesDateInput.valueAsDate = new Date();
        loadSalesManagement();
    });
    
    printReportBtn.addEventListener('click', function() {
        window.print();
    });
    
    exportReportBtn.addEventListener('click', exportToExcel);
    
    // تهيئة النظام
    updateProductList();
});
