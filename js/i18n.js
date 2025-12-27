(function () {
  const texts = {
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
    productPrice: 'Price (Toman)',
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
    colorModeHelp: 'Choose your preferred color theme for the application',
    otherSettings: 'Other Settings',
    settingsNote: 'More settings will be available in future updates',
    activated: 'activated',
    saved: 'saved successfully',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully',
    logoutConfirm: 'Are you sure you want to logout?',
    
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
    noUnpaidOrders: 'All orders are settled'
  }
  
  window.i18n = {
    t: (key) => texts[key] || key
  }
})()
