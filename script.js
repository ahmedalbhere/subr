document.addEventListener('DOMContentLoaded', function() {
    // متغيرات التطبيق
    let products = JSON.parse(localStorage.getItem('products')) || {};
    let sales = JSON.parse(localStorage.getItem('sales')) || [];
    let currentInvoice = {
        items: [],
        total: 0
    };
    let currentProductId = null;

    // عناصر DOM
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const barcodeInput = document.getElementById('barcode-input');
    const addItemBtn = document.getElementById('add-item');
    const invoiceItemsContainer = document.getElementById('invoice-items');
    const totalAmountSpan = document.getElementById('total-amount');
    const completeSaleBtn = document.getElementById('complete-sale');
    const cancelSaleBtn = document.getElementById('cancel-sale');
    const productSearch = document.getElementById('product-search');
    const addProductBtn = document.getElementById('add-product');
    const productsList = document.getElementById('products-list');
    const productForm = document.getElementById('product-form');
    const productFormTitle = document.getElementById('product-form-title');
    const productBarcode = document.getElementById('product-barcode');
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const saveProductBtn = document.getElementById('save-product');
    const cancelProductBtn = document.getElementById('cancel-product');
    const reportType = document.getElementById('report-type');
    const reportDate = document.getElementById('report-date');
    const generateReportBtn = document.getElementById('generate-report');
    const reportSummary = document.getElementById('report-summary');
    const reportDetails = document.getElementById('report-details');
    const currentTimeElement = document.getElementById('current-time');

    // تحديث الوقت الحالي
    function updateCurrentTime() {
        const now = new Date();
        currentTimeElement.textContent = now.toLocaleString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

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

        // إعادة التركيز على حقل الباركود عند العودة لصفحة المبيعات
        if (pageId === 'sales') {
            barcodeInput.focus();
        }
    }

    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            changePage(pageId);

            if (pageId === 'products') {
                renderProductsList();
            } else if (pageId === 'reports') {
                reportDate.valueAsDate = new Date();
            }
        });
    });

    // إدارة الفاتورة
    function addItemToInvoice(barcode) {
        if (!products[barcode]) {
            alert('المنتج غير موجود، الرجاء إضافته أولاً من صفحة إدارة المنتجات');
            return;
        }

        const existingItem = currentInvoice.items.find(item => item.barcode === barcode);
        const product = products[barcode];

        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.total = existingItem.quantity * product.price;
        } else {
            currentInvoice.items.push({
                barcode: barcode,
                name: product.name,
                price: product.price,
                quantity: 1,
                total: product.price
            });
        }

        updateInvoiceTotal();
        renderInvoiceItems();
        barcodeInput.value = '';
        barcodeInput.focus();
    }

    function updateInvoiceTotal() {
        currentInvoice.total = currentInvoice.items.reduce((sum, item) => sum + item.total, 0);
        totalAmountSpan.textContent = currentInvoice.total.toFixed(2);
    }

    function renderInvoiceItems() {
        invoiceItemsContainer.innerHTML = '';

        currentInvoice.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'invoice-item';
            itemElement.innerHTML = `
                <span>${item.name}</span>
                <span>${item.price.toFixed(2)}</span>
                <span>${item.quantity}</span>
                <span>${item.total.toFixed(2)}</span>
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
            id: sales.length + 1,
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
        alert('تم حفظ الفاتورة بنجاح');
    }

    function cancelSale() {
        if (confirm('هل أنت متأكد من إلغاء الفاتورة الحالية؟')) {
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
            productsList.innerHTML = '<div class="product-item" style="justify-content: center;">لا توجد منتجات</div>';
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

    function showProductForm(barcode = '', name = '', price = '') {
        if (barcode) {
            productFormTitle.textContent = 'تعديل المنتج';
            currentProductId = barcode;
        } else {
            productFormTitle.textContent = 'إضافة منتج جديد';
            currentProductId = null;
        }

        productBarcode.value = barcode;
        productName.value = name;
        productPrice.value = price;
        productForm.style.display = 'flex';
        productName.focus();
    }

    function saveProduct() {
        const barcode = productBarcode.value.trim();
        const name = productName.value.trim();
        const price = parseFloat(productPrice.value);

        if (!barcode || !name || isNaN(price)) {
            alert('الرجاء إدخال جميع البيانات بشكل صحيح');
            return;
        }

        // إذا كان منتج جديد أو تم تغيير الباركود
        if (!currentProductId || currentProductId !== barcode) {
            if (products[barcode]) {
                alert('هذا الباركود موجود بالفعل');
                return;
            }

            // إذا كان تعديلاً ولم يتم تغيير الباركود، احذف القديم
            if (currentProductId) {
                delete products[currentProductId];
            }
        }

        products[barcode] = {
            barcode: barcode,
            name: name,
            price: price
        };

        localStorage.setItem('products', JSON.stringify(products));
        productForm.style.display = 'none';
        renderProductsList(productSearch.value);
    }

    function editProduct(barcode) {
        const product = products[barcode];
        if (product) {
            showProductForm(product.barcode, product.name, product.price);
        }
    }

    function deleteProduct(barcode) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            delete products[barcode];
            localStorage.setItem('products', JSON.stringify(products));
            renderProductsList(productSearch.value);
        }
    }

    // إدارة التقارير
    function generateReport() {
        const type = reportType.value;
        const date = new Date(reportDate.value);
        
        let filteredSales = [];
        let title = '';
        let period = '';

        if (type === 'daily') {
            const dateStr = date.toISOString().split('T')[0];
            filteredSales = sales.filter(sale => sale.date === dateStr);
            title = 'تقرير يومي';
            period = date.toLocaleDateString('ar-EG');
        } else if (type === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            filteredSales = sales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= weekStart && saleDate <= weekEnd;
            });
            
            title = 'تقرير أسبوعي';
            period = `من ${weekStart.toLocaleDateString('ar-EG')} إلى ${weekEnd.toLocaleDateString('ar-EG')}`;
        } else if (type === 'monthly') {
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            filteredSales = sales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= monthStart && saleDate <= monthEnd;
            });
            
            title = 'تقرير شهري';
            period = date.toLocaleDateString('ar-EG', {month: 'long', year: 'numeric'});
        }

        displayReport(title, period, filteredSales);
    }

    function displayReport(title, period, salesData) {
        const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
        const totalItems = salesData.reduce((sum, sale) => 
            sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        
        reportSummary.innerHTML = `
            <h3>${title}</h3>
            <p>الفترة: ${period}</p>
            <p>عدد الفواتير: ${salesData.length}</p>
            <p>إجمالي المبيعات: ${totalSales.toFixed(2)}</p>
            <p>عدد العناصر المباعة: ${totalItems}</p>
        `;

        reportDetails.innerHTML = '';
        
        if (salesData.length === 0) {
            reportDetails.innerHTML = '<p>لا توجد بيانات للعرض</p>';
            return;
        }

        const headerRow = document.createElement('div');
        headerRow.className = 'report-row header';
        headerRow.innerHTML = `
            <div class="report-cell">رقم الفاتورة</div>
            <div class="report-cell">التاريخ</div>
            <div class="report-cell">عدد العناصر</div>
            <div class="report-cell">المبلغ</div>
        `;
        reportDetails.appendChild(headerRow);

        salesData.forEach(sale => {
            const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            
            const row = document.createElement('div');
            row.className = 'report-row';
            row.innerHTML = `
                <div class="report-cell">${sale.id}</div>
                <div class="report-cell">${sale.date}</div>
                <div class="report-cell">${itemsCount}</div>
                <div class="report-cell">${sale.total.toFixed(2)}</div>
            `;
            reportDetails.appendChild(row);
        });
    }

    // معالجات الأحداث
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const barcode = barcodeInput.value.trim();
            if (barcode) {
                addItemToInvoice(barcode);
            }
        }
    });

    addItemBtn.addEventListener('click', function() {
        const barcode = barcodeInput.value.trim();
        if (barcode) {
            addItemToInvoice(barcode);
        }
    });

    completeSaleBtn.addEventListener('click', completeSale);
    cancelSaleBtn.addEventListener('click', cancelSale);

    productSearch.addEventListener('input', function() {
        renderProductsList(this.value);
    });

    addProductBtn.addEventListener('click', function() {
        showProductForm();
    });

    saveProductBtn.addEventListener('click', saveProduct);

    cancelProductBtn.addEventListener('click', function() {
        productForm.style.display = 'none';
    });

    generateReportBtn.addEventListener('click', generateReport);

    // تهيئة التطبيق
    renderProductsList();
    barcodeInput.focus();
});
