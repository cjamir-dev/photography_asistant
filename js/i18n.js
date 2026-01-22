(function () {
  const textsEn = {
    // Page titles
    pageOrder: 'Order Registration',
    pageProducts: 'Product Management',
    pageSettings: 'Settings',
    
    // Navigation
    navDashboard: 'Dashboard',
    navProducts: 'Manage Products',
    navBack: 'Back to Dashboard',
    navFile: 'File',
    navSettings: 'Settings',
    navLogout: 'Logout',
    
    // Order page
    orderTitle: 'New Order',
    orderSubtitle: 'Last Name + Mobile → Add Product to Cart → Finalize Order',
    customerInfo: 'Customer Information',
    customerLastName: 'Last Name',
    customerPhone: 'Mobile Number',
    customerLastNamePlaceholder: 'Example: Smith',
    customerPhonePlaceholder: 'Example: 09123456789',
    
    // Cart
    cartTitle: 'Customer Cart',
    selectProduct: 'Select Product',
    quantity: 'Quantity',
    itemTotal: 'Item Total',
    addToCart: 'Add to Cart',
    emptyCart: 'Cart is empty',
    totalAmount: 'Total Amount',
    deposit: 'Deposit',
    remainingAmount: 'Remaining',
    description: 'Description',
    descriptionPlaceholder: 'Optional notes for this order',
    clearCart: 'Clear Cart',
    finalizeOrder: 'Finalize Order',
    settlePayment: 'Settle',
    noProductsHelp: 'No products yet. Create a product from the "Manage Products" button.',
    
    // Search
    searchTitle: 'Find Customer',
    searchPhone: 'Mobile Number',
    searchPhonePlaceholder: 'Example: 09123456789',
    searchConfirm: 'Search',
    previousOrders: 'Previous Orders for This Customer',
    
    // Products page
    productsTitle: 'Products',
    productsSubtitle: 'Create/Edit/Delete Products — Saved in Browser',
    addEditProduct: 'Add / Edit Product',
    productName: 'Product Name',
    productPrice: 'Price',
    productImage: 'Product Image (Optional)',
    productDesc: 'Description (Optional)',
    productNamePlaceholder: 'Example: Photo Print 10×15',
    productPricePlaceholder: 'Example: 50000',
    productDescPlaceholder: 'Example: One-day delivery',
    modeAdd: 'Mode: Add',
    modeEdit: 'Mode: Edit',
    resetForm: 'Reset Form',
    saveProduct: 'Save Product',
    productsList: 'Products List',
    productCount: 'products',
    editHelp: 'Click "Edit" to load product information into the form.',
    emptyProducts: 'No products yet. Create a product first so it can be selected on the order page.',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    noImage: 'No Image',
    imageNote: 'Note: Images are saved as DataURL in the browser and may consume browser storage space.',
    
    // Messages
    customerValid: 'Customer information verified',
    orderSaved: 'Order saved successfully',
    productSaved: 'Product saved successfully',
    productUpdated: 'Product updated successfully',
    productDeleted: 'Product deleted successfully',
    productLoaded: 'Product loaded for editing',
    customerNotFound: 'Customer not found',
    ordersFound: 'order found',
    ordersFoundPlural: 'orders found',
    editOrder: 'Edit Order',
    deleteOrder: 'Delete Order',
    editingOrder: 'Editing order…',
    confirmDeleteOrder: 'Delete this order?',
    
    // Errors
    errorLastNameRequired: 'Last name is required',
    errorPhoneInvalid: 'Invalid mobile number (Example: 09123456789)',
    errorPhoneRequired: 'Please enter mobile number',
    errorProductRequired: 'Product name is required',
    errorPriceRequired: 'Price must be greater than zero',
    errorDepositTooHigh: 'Deposit cannot be more than total amount',
    errorSelectProduct: 'Please select a product first',
    errorProductNotFound: 'Product not found',
    errorCartEmpty: 'Add at least one product to cart',
    errorImageRead: 'Failed to read image',
    errorProductEditNotFound: 'Product not found for editing',
    
    // Currency
    currency: 'Toman',
    
    // Actions
    deleteConfirm: 'Delete',
    deleteConfirmQuestion: 'Delete product',
    
    // Cart item
    cartItem: 'Cart',
    deleteItem: 'Delete',
    
    // Data Management
    exportData: 'Export Data',
    importData: 'Import Data',
    exportProducts: 'Export Products',
    exportOrders: 'Export Orders',
    exportOrdersExcel: 'Export Orders (Excel)',
    importProducts: 'Import Products',
    importOrders: 'Import Orders',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully',
    importError: 'Failed to import data',
    confirmImport: 'This will replace all current data. Continue?',
    exportOrdersHelp: 'Export all orders to a JSON file',
    exportOrdersExcelHelp: 'Download Excel-friendly CSV with per-size counts',
    importOrdersHelp: 'Import orders from a JSON file',
    exportProductsHelp: 'Export all products to a JSON file',
    importProductsHelp: 'Import products from a JSON file',
    
    // Settings page
    settingsTitle: 'Settings',
    appearanceSettings: 'Appearance',
    colorMode: 'Color Mode',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    grayMode: 'Gray Mode',
    colorModeHelp: 'Choose your preferred color theme for the application',
    languageSettings: 'Language',
    language: 'Language',
    languageEnglish: 'English',
    languagePersian: 'Persian (فارسی)',
    languageHelp: 'Select your preferred language',
    currencySettings: 'Currency',
    currency: 'Currency Unit',
    currencyToman: 'Toman (تومان)',
    currencyDollar: 'Dollar ($)',
    currencyEuro: 'Euro (€)',
    currencyHelp: 'Select your preferred currency unit',
    otherSettings: 'Other Settings',
    settingsNote: 'More settings will be available in future updates',
    activated: 'activated',
    saved: 'saved successfully',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully',
    logoutConfirm: 'Are you sure you want to logout?',
    securitySettings: 'Security Settings',
    changeUsernameTitle: 'Change Username',
    currentUsername: 'Current Username',
    currentUsernameHelp: 'Your current username (read-only)',
    newUsername: 'New Username',
    newUsernameHelp: 'Enter a new username (minimum 3 characters, letters, numbers, and underscores only)',
    passwordForUsername: 'Password',
    passwordForUsernameHelp: 'Enter your current password to confirm username change',
    changeUsername: 'Change Username',
    usernameChanged: 'Username changed successfully',
    usernameChangeError: 'Failed to change username',
    usernameTooShort: 'Username must be at least 3 characters',
    usernameInvalidChars: 'Username can only contain letters, numbers, and underscores',
    usernameSame: 'New username must be different from current username',
    changePasswordTitle: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    changePassword: 'Change Password',
    changePasswordHelp: 'Enter your current password and choose a new password (minimum 4 characters)',
    passwordChanged: 'Password changed successfully',
    passwordChangeError: 'Failed to change password',
    passwordMismatch: 'New passwords do not match',
    passwordTooShort: 'Password must be at least 4 characters',
    fillAllFields: 'Please fill all fields',
    
    // SMS Settings
    smsSettings: 'SMS Settings',
    smsApiType: 'SMS API Provider',
    smsApiPayamakVip: 'Payamak.vip',
    smsApiNiazpardaz: 'Niazpardaz',
    smsApiTypeHelp: 'Select your SMS service provider',
    smsUsername: 'SMS Username',
    smsUsernameHelp: 'Enter your SMS panel username',
    smsPassword: 'SMS Password',
    smsPasswordHelp: 'Enter your SMS panel password',
    smsFromNumber: 'Sender Number',
    smsFromNumberHelp: 'Enter the sender number (e.g., 500025799991)',
    smsMessageTemplate: 'Message Template',
    smsMessageTemplateHelp: 'Use {lastName}, {totalAmount}, {deposit}, {remainingAmount} as placeholders',
    smsEnabled: 'Enable SMS notifications',
    smsEnabledHelp: 'Send SMS to customer when order is finalized',
    smsSent: 'SMS sent successfully',
    smsError: 'Failed to send SMS',
    smsNotConfigured: 'SMS settings not configured',

    // Receipt settings
    receiptSettings: 'Receipt Settings',
    receiptLayoutSettings: 'Layout',
    receiptTypographySettings: 'Typography',
    receiptColorSettings: 'Colors',
    receiptSize: 'Receipt Size',
    receiptSizeA4: 'A4 (210×297mm)',
    receiptSizeA5: 'A5 (148×210mm)',
    receiptSize80mm: 'Thermal 80mm',
    receiptSize58mm: 'Thermal 58mm',
    receiptSizeBusinessCard: 'Business Card (85×55mm)',
    receiptSizeHelp: 'Select receipt paper size (affects width and padding)',
    receiptFontSize: 'Font Size',
    receiptFontSmall: 'Small',
    receiptFontMedium: 'Medium',
    receiptFontLarge: 'Large',
    receiptFontSizeHelp: 'Controls receipt font sizes (labels/values/titles)',
    receiptTitleWeight: 'Title Weight',
    receiptPriceWeight: 'Price Weight',
    receiptFontWeightHelp: 'Controls boldness for receipt title and prices',
    receiptBgColor: 'Background Color',
    receiptCardBgColor: 'Card Color',
    receiptBorderColor: 'Border Color',
    receiptColorHelp: 'Controls receipt background, card, and border colors',
    receiptLivePreview: 'Live Preview',
    openReceiptPreview: 'Open Receipt Preview',
    
    // Dashboard
    pageDashboard: 'Dashboard',
    dashboardTitle: 'Dashboard',
    statTotalOrders: 'Total Orders',
    statTodayOrders: 'Today Orders',
    statUnpaidOrders: 'Unpaid Orders',
    statTotalRevenue: 'Total Revenue',
    statTotalCustomers: 'Total Customers',
    statRemainingAmount: 'Remaining Amount',
    recentOrders: 'Recent Orders',
    unpaidOrders: 'Unpaid Orders',
    noOrders: 'No orders yet',
    noUnpaidOrders: 'All orders are settled',
    salesCharts: 'Sales Charts',
    pageOrders: 'Orders',
    ordersTitle: 'Orders Management',
    navOrders: 'Orders',
    ordersList: 'Orders List',
    filtersTitle: 'Filters',
    filterSearch: 'Search',
    filterSearchPlaceholder: 'Search by name, phone, order ID, or items...',
    filterPaymentStatus: 'Payment Status',
    filterDateRange: 'Date Range',
    filterSortBy: 'Sort By',
    filterAll: 'All',
    filterPaid: 'Paid',
    filterUnpaid: 'Unpaid',
    filterToday: 'Today',
    filterThisWeek: 'This Week',
    filterThisMonth: 'This Month',
    filterCustom: 'Custom Range',
    filterDateFrom: 'From Date',
    filterDateTo: 'To Date',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortAmountHigh: 'Amount (High to Low)',
    sortAmountLow: 'Amount (Low to High)',
    clearFilters: 'Clear Filters',
    noOrdersFound: 'No orders found',
    of: 'of',
    orders: 'orders',
    settled: 'Settled',
    deleteOrderConfirm: 'Are you sure you want to delete this order?',
    settleOrderConfirm: 'Mark this order as settled?',
    customerName: 'Customer',
    orderDate: 'Date',
    items: 'Items',
    paymentStatus: 'Status',
    actions: 'Actions',
    unpaid: 'Unpaid',
    viewModeList: 'List View',
    viewModeTable: 'Table View',
    viewModeCard: 'Card View',
    chartDaily: 'Daily',
    chartMonthly: 'Monthly',
    chartRevenue: 'Revenue',
    topProducts: 'Top Products',
    noProductsData: 'No product data available',

    // Receipt
    pageReceipt: 'Receipt',
    receiptTitle: 'Receipt',
    printReceipt: 'Print Receipt',
    backToOrders: 'Back',
    appName: 'Photography Tools',
    receiptOrderId: 'Order ID',
    receiptDate: 'Date',
    receiptItems: 'Items',
    receiptSummary: 'Summary',
    receiptThanks: 'Thank you',
    receiptMissingOrderId: 'Missing order id',
    receiptOrderNotFound: 'Order not found',
    receiptPreviewCustomerName: 'Sample Customer',
    receiptPreviewItem1: 'Photo 10×15',
    receiptPreviewItem2: 'Frame 20×30',
    receiptPreviewDescription: 'Preview only'
  }

  const textsFa = {
    // Page titles
    pageOrder: 'ثبت سفارش',
    pageProducts: 'مدیریت محصولات',
    pageSettings: 'تنظیمات',
    
    // Navigation
    navDashboard: 'داشبورد',
    navProducts: 'مدیریت محصولات',
    navBack: 'بازگشت به داشبورد',
    navFile: 'فایل',
    navOrders: 'سفارش‌ها',
    navSettings: 'تنظیمات',
    navLogout: 'خروج',
    
    // Order page
    orderTitle: 'سفارش جدید',
    orderSubtitle: 'نام خانوادگی + موبایل → افزودن محصول به سبد → ثبت نهایی',
    customerInfo: 'اطلاعات مشتری',
    customerLastName: 'نام خانوادگی',
    customerPhone: 'شماره موبایل',
    customerLastNamePlaceholder: 'مثال: احمدی',
    customerPhonePlaceholder: 'مثال: 09123456789',
    
    // Cart
    cartTitle: 'سبد خرید مشتری',
    selectProduct: 'انتخاب محصول',
    quantity: 'تعداد',
    itemTotal: 'جمع آیتم',
    addToCart: 'افزودن به سبد',
    emptyCart: 'سبد خرید خالی است',
    totalAmount: 'مبلغ کل',
    deposit: 'بیعانه',
    remainingAmount: 'مانده حساب',
    description: 'توضیحات',
    descriptionPlaceholder: 'یادداشت اختیاری برای این سفارش',
    clearCart: 'پاک کردن سبد',
    finalizeOrder: 'ثبت نهایی سفارش',
    settlePayment: 'تسویه',
    noProductsHelp: 'هنوز محصولی وجود ندارد. از دکمه "مدیریت محصولات" یک محصول ایجاد کنید.',
    
    // Search
    searchTitle: 'جستجوی مشتری',
    searchPhone: 'شماره موبایل',
    searchPhonePlaceholder: 'مثال: 09123456789',
    searchConfirm: 'جستجو',
    previousOrders: 'سفارش‌های قبلی این مشتری',
    
    // Products page
    productsTitle: 'محصولات',
    productsSubtitle: 'ایجاد/ویرایش/حذف محصولات — ذخیره در مرورگر',
    addEditProduct: 'افزودن / ویرایش محصول',
    productName: 'نام محصول',
    productPrice: 'قیمت',
    productImage: 'تصویر محصول (اختیاری)',
    productDesc: 'توضیحات (اختیاری)',
    productNamePlaceholder: 'مثال: چاپ عکس 10×15',
    productPricePlaceholder: 'مثال: 50000',
    productDescPlaceholder: 'مثال: تحویل یک روزه',
    modeAdd: 'حالت: افزودن',
    modeEdit: 'حالت: ویرایش',
    resetForm: 'بازنشانی فرم',
    saveProduct: 'ذخیره محصول',
    productsList: 'فهرست محصولات',
    productCount: 'محصول',
    editHelp: 'برای بارگذاری اطلاعات محصول در فرم، روی "ویرایش" کلیک کنید.',
    emptyProducts: 'هنوز محصولی وجود ندارد. ابتدا یک محصول ایجاد کنید تا در صفحه سفارش قابل انتخاب باشد.',
    editBtn: 'ویرایش',
    deleteBtn: 'حذف',
    noImage: 'بدون تصویر',
    imageNote: 'توجه: تصاویر به صورت DataURL در مرورگر ذخیره می‌شوند و ممکن است فضای ذخیره‌سازی مرورگر را اشغال کنند.',
    
    // Messages
    customerValid: 'اطلاعات مشتری تأیید شد',
    orderSaved: 'سفارش با موفقیت ذخیره شد',
    productSaved: 'محصول با موفقیت ذخیره شد',
    productUpdated: 'محصول با موفقیت به‌روزرسانی شد',
    productDeleted: 'محصول با موفقیت حذف شد',
    productLoaded: 'محصول برای ویرایش بارگذاری شد',
    customerNotFound: 'مشتری یافت نشد',
    ordersFound: 'سفارش یافت شد',
    ordersFoundPlural: 'سفارش یافت شد',
    editOrder: 'ویرایش سفارش',
    deleteOrder: 'حذف سفارش',
    editingOrder: 'ویرایش سفارش…',
    confirmDeleteOrder: 'این سفارش حذف شود؟',
    
    // Errors
    errorLastNameRequired: 'نام خانوادگی الزامی است',
    errorPhoneInvalid: 'شماره موبایل نامعتبر است (مثال: 09123456789)',
    errorPhoneRequired: 'لطفاً شماره موبایل را وارد کنید',
    errorProductRequired: 'نام محصول الزامی است',
    errorPriceRequired: 'قیمت باید بیشتر از صفر باشد',
    errorDepositTooHigh: 'بیعانه نمی‌تواند بیشتر از مبلغ کل باشد',
    errorSelectProduct: 'لطفاً ابتدا یک محصول انتخاب کنید',
    errorProductNotFound: 'محصول یافت نشد',
    errorCartEmpty: 'حداقل یک محصول به سبد اضافه کنید',
    errorImageRead: 'خواندن تصویر ناموفق بود',
    errorProductEditNotFound: 'محصول برای ویرایش یافت نشد',
    
    // Currency
    currency: 'تومان',
    
    // Actions
    deleteConfirm: 'حذف',
    deleteConfirmQuestion: 'حذف محصول',
    
    // Cart item
    cartItem: 'سبد',
    deleteItem: 'حذف',
    
    // Data Management
    exportData: 'خروجی داده',
    importData: 'وارد کردن داده',
    exportProducts: 'خروجی محصولات',
    exportOrders: 'خروجی سفارش‌ها',
    exportOrdersExcel: 'خروجی سفارش‌ها (Excel)',
    importProducts: 'وارد کردن محصولات',
    importOrders: 'وارد کردن سفارش‌ها',
    dataExported: 'داده با موفقیت خروجی گرفته شد',
    dataImported: 'داده با موفقیت وارد شد',
    importError: 'وارد کردن داده ناموفق بود',
    confirmImport: 'این کار تمام داده‌های فعلی را جایگزین می‌کند. ادامه می‌دهید؟',
    exportOrdersHelp: 'خروجی تمام سفارش‌ها به یک فایل JSON',
    exportOrdersExcelHelp: 'دانلود CSV سازگار با Excel با شمارش بر اساس سایز',
    importOrdersHelp: 'وارد کردن سفارش‌ها از یک فایل JSON',
    exportProductsHelp: 'خروجی تمام محصولات به یک فایل JSON',
    importProductsHelp: 'وارد کردن محصولات از یک فایل JSON',
    
    // Settings page
    settingsTitle: 'تنظیمات',
    appearanceSettings: 'ظاهر',
    colorMode: 'حالت رنگ',
    lightMode: 'حالت روشن',
    darkMode: 'حالت تاریک',
    grayMode: 'حالت خاکستری',
    colorModeHelp: 'تم رنگی مورد علاقه خود را برای برنامه انتخاب کنید',
    languageSettings: 'زبان',
    language: 'زبان',
    languageEnglish: 'انگلیسی',
    languagePersian: 'فارسی',
    languageHelp: 'زبان مورد علاقه خود را انتخاب کنید',
    currencySettings: 'واحد ارز',
    currency: 'واحد ارز',
    currencyToman: 'تومان',
    currencyDollar: 'دلار ($)',
    currencyEuro: 'یورو (€)',
    currencyHelp: 'واحد ارز مورد علاقه خود را انتخاب کنید',
    otherSettings: 'سایر تنظیمات',
    settingsNote: 'تنظیمات بیشتر در به‌روزرسانی‌های آینده در دسترس خواهد بود',
    activated: 'فعال شد',
    saved: 'با موفقیت ذخیره شد',
    saveSettings: 'ذخیره تنظیمات',
    settingsSaved: 'تنظیمات با موفقیت ذخیره شد',
    logoutConfirm: 'آیا مطمئن هستید که می‌خواهید خارج شوید؟',
    securitySettings: 'تنظیمات امنیتی',
    changeUsernameTitle: 'تغییر نام کاربری',
    currentUsername: 'نام کاربری فعلی',
    currentUsernameHelp: 'نام کاربری فعلی شما (فقط خواندنی)',
    newUsername: 'نام کاربری جدید',
    newUsernameHelp: 'یک نام کاربری جدید وارد کنید (حداقل 3 کاراکتر، فقط حروف، اعداد و زیرخط)',
    passwordForUsername: 'رمز عبور',
    passwordForUsernameHelp: 'رمز عبور فعلی خود را برای تأیید تغییر نام کاربری وارد کنید',
    changeUsername: 'تغییر نام کاربری',
    usernameChanged: 'نام کاربری با موفقیت تغییر کرد',
    usernameChangeError: 'تغییر نام کاربری ناموفق بود',
    usernameTooShort: 'نام کاربری باید حداقل 3 کاراکتر باشد',
    usernameInvalidChars: 'نام کاربری فقط می‌تواند شامل حروف، اعداد و زیرخط باشد',
    usernameSame: 'نام کاربری جدید باید با نام کاربری فعلی متفاوت باشد',
    changePasswordTitle: 'تغییر رمز عبور',
    currentPassword: 'رمز عبور فعلی',
    newPassword: 'رمز عبور جدید',
    confirmNewPassword: 'تأیید رمز عبور جدید',
    changePassword: 'تغییر رمز عبور',
    changePasswordHelp: 'رمز عبور فعلی و رمز عبور جدید را وارد کنید (حداقل 4 کاراکتر)',
    passwordChanged: 'رمز عبور با موفقیت تغییر کرد',
    passwordChangeError: 'تغییر رمز عبور ناموفق بود',
    passwordMismatch: 'رمزهای عبور جدید مطابقت ندارند',
    passwordTooShort: 'رمز عبور باید حداقل 4 کاراکتر باشد',
    fillAllFields: 'لطفاً تمام فیلدها را پر کنید',
    
    // SMS Settings
    smsSettings: 'تنظیمات پیامک',
    smsApiType: 'ارائه‌دهنده API پیامک',
    smsApiPayamakVip: 'Payamak.vip',
    smsApiNiazpardaz: 'Niazpardaz',
    smsApiTypeHelp: 'ارائه‌دهنده سرویس پیامک خود را انتخاب کنید',
    smsUsername: 'نام کاربری پیامک',
    smsUsernameHelp: 'نام کاربری پنل پیامک خود را وارد کنید',
    smsPassword: 'رمز عبور پیامک',
    smsPasswordHelp: 'رمز عبور پنل پیامک خود را وارد کنید',
    smsFromNumber: 'شماره فرستنده',
    smsFromNumberHelp: 'شماره فرستنده را وارد کنید (مثال: 500025799991)',
    smsMessageTemplate: 'قالب پیام',
    smsMessageTemplateHelp: 'از {lastName}, {totalAmount}, {deposit}, {remainingAmount} به عنوان متغیر استفاده کنید',
    smsEnabled: 'فعال‌سازی اعلان‌های پیامک',
    smsEnabledHelp: 'ارسال پیامک به مشتری هنگام ثبت نهایی سفارش',
    smsSent: 'پیامک با موفقیت ارسال شد',
    smsError: 'ارسال پیامک ناموفق بود',
    smsNotConfigured: 'تنظیمات پیامک پیکربندی نشده است',

    // Receipt settings
    receiptSettings: 'تنظیمات رسید',
    receiptLayoutSettings: 'چیدمان',
    receiptTypographySettings: 'تایپوگرافی',
    receiptColorSettings: 'رنگ‌ها',
    receiptSize: 'اندازه رسید',
    receiptSizeA4: 'A4 (210×297 میلی‌متر)',
    receiptSizeA5: 'A5 (148×210 میلی‌متر)',
    receiptSize80mm: 'حرارتی 80 میلی‌متر',
    receiptSize58mm: 'حرارتی 58 میلی‌متر',
    receiptSizeBusinessCard: 'کارت ویزیت (85×55 میلی‌متر)',
    receiptSizeHelp: 'انتخاب اندازه کاغذ رسید (عرض و فاصله‌ها را تغییر می‌دهد)',
    receiptFontSize: 'اندازه فونت',
    receiptFontSmall: 'کوچک',
    receiptFontMedium: 'متوسط',
    receiptFontLarge: 'بزرگ',
    receiptFontSizeHelp: 'سایز فونت‌های رسید (عنوان/برچسب/مقدار) را تنظیم می‌کند',
    receiptTitleWeight: 'ضخامت عنوان',
    receiptPriceWeight: 'ضخامت قیمت',
    receiptFontWeightHelp: 'ضخامت عنوان رسید و قیمت‌ها را تنظیم می‌کند',
    receiptBgColor: 'رنگ پس‌زمینه',
    receiptCardBgColor: 'رنگ کارت',
    receiptBorderColor: 'رنگ حاشیه',
    receiptColorHelp: 'رنگ پس‌زمینه، کارت و حاشیه رسید را تنظیم می‌کند',
    receiptLivePreview: 'پیش‌نمایش لحظه‌ای',
    openReceiptPreview: 'پیش‌نمایش رسید',
    
    // Dashboard
    pageDashboard: 'داشبورد',
    dashboardTitle: 'داشبورد',
    statTotalOrders: 'کل سفارش‌ها',
    statTodayOrders: 'سفارش‌های امروز',
    statUnpaidOrders: 'سفارش‌های پرداخت نشده',
    statTotalRevenue: 'کل درآمد',
    statTotalCustomers: 'کل مشتریان',
    statRemainingAmount: 'مبلغ مانده',
    recentOrders: 'سفارش‌های اخیر',
    unpaidOrders: 'سفارش‌های پرداخت نشده',
    noOrders: 'هنوز سفارشی وجود ندارد',
    noUnpaidOrders: 'همه سفارش‌ها تسویه شده‌اند',
    salesCharts: 'نمودارهای فروش',
    chartDaily: 'روزانه',
    chartMonthly: 'ماهانه',
    chartRevenue: 'درآمد',
    topProducts: 'محصولات پرفروش',
    noProductsData: 'داده‌ای برای نمایش وجود ندارد',

    // Receipt
    pageReceipt: 'رسید',
    receiptTitle: 'رسید',
    printReceipt: 'چاپ رسید',
    backToOrders: 'بازگشت',
    appName: 'ابزار عکاسی',
    receiptOrderId: 'کد سفارش',
    receiptDate: 'تاریخ',
    receiptItems: 'اقلام',
    receiptSummary: 'خلاصه',
    receiptThanks: 'با تشکر',
    receiptMissingOrderId: 'کد سفارش نامعتبر است',
    receiptOrderNotFound: 'سفارش پیدا نشد',
    receiptPreviewCustomerName: 'مشتری نمونه',
    receiptPreviewItem1: 'چاپ عکس 10×15',
    receiptPreviewItem2: 'قاب 20×30',
    receiptPreviewDescription: 'فقط پیش‌نمایش',
    
    // Orders page
    pageOrders: 'سفارش‌ها',
    ordersTitle: 'مدیریت سفارش‌ها',
    ordersList: 'لیست سفارش‌ها',
    filtersTitle: 'فیلترها',
    filterSearch: 'جستجو',
    filterSearchPlaceholder: 'جستجو بر اساس نام، شماره تماس، کد سفارش یا محصولات...',
    filterPaymentStatus: 'وضعیت پرداخت',
    filterDateRange: 'بازه زمانی',
    filterSortBy: 'مرتب‌سازی بر اساس',
    filterAll: 'همه',
    filterPaid: 'پرداخت شده',
    filterUnpaid: 'پرداخت نشده',
    filterToday: 'امروز',
    filterThisWeek: 'این هفته',
    filterThisMonth: 'این ماه',
    filterCustom: 'بازه سفارشی',
    filterDateFrom: 'از تاریخ',
    filterDateTo: 'تا تاریخ',
    sortNewest: 'جدیدترین',
    sortOldest: 'قدیمی‌ترین',
    sortAmountHigh: 'مبلغ (زیاد به کم)',
    sortAmountLow: 'مبلغ (کم به زیاد)',
    clearFilters: 'پاک کردن فیلترها',
    noOrdersFound: 'سفارشی یافت نشد',
    of: 'از',
    orders: 'سفارش',
    settled: 'تسویه شده',
    deleteOrderConfirm: 'آیا مطمئن هستید که می‌خواهید این سفارش را حذف کنید؟',
    settleOrderConfirm: 'این سفارش را به عنوان تسویه شده علامت بزنید؟',
    customerName: 'مشتری',
    orderDate: 'تاریخ',
    items: 'محصولات',
    paymentStatus: 'وضعیت',
    actions: 'عملیات',
    unpaid: 'پرداخت نشده',
    viewModeList: 'نمایش لیستی',
    viewModeTable: 'نمایش جدولی',
    viewModeCard: 'نمایش کارتی'
  }

  function getLanguage() {
    return localStorage.getItem('language') || 'en'
  }

  function getCurrency() {
    return localStorage.getItem('currency') || 'toman'
  }

  function getTexts() {
    const lang = getLanguage()
    return lang === 'fa' ? textsFa : textsEn
  }

  function getCurrencyText() {
    const currency = getCurrency()
    const lang = getLanguage()
    if (currency === 'dollar') {
      return lang === 'fa' ? 'دلار' : 'Dollar'
    } else if (currency === 'euro') {
      return lang === 'fa' ? 'یورو' : 'Euro'
    } else {
      return lang === 'fa' ? 'تومان' : 'Toman'
    }
  }
  
  window.i18n = {
    t: (key) => {
      const texts = getTexts()
      if (key === 'currency') {
        return getCurrencyText()
      }
      return texts[key] || key
    },
    getLanguage,
    getCurrency,
    setLanguage: (lang) => {
      localStorage.setItem('language', lang)
      applyLanguage()
    },
    setCurrency: (currency) => {
      localStorage.setItem('currency', currency)
    }
  }

  function applyLanguage() {
    const lang = getLanguage()
    const html = document.documentElement
    html.setAttribute('lang', lang === 'fa' ? 'fa' : 'en')
    html.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr')
    
    // Re-initialize i18n if available
    if (window.PhotoTools && window.PhotoTools.ui && window.PhotoTools.ui.initI18n) {
      window.PhotoTools.ui.initI18n()
    }
  }

  // Apply language on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLanguage)
  } else {
    applyLanguage()
  }
})()
