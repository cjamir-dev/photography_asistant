(function () {
  const texts = {
    // Page titles
    pageOrder: 'Order Registration',
    pageProducts: 'Product Management',
    
    // Navigation
    navProducts: 'Manage Products',
    navBack: 'Back to Orders',
    
    // Order page
    orderTitle: 'Order Registration',
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
    productsTitle: 'Product Management',
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
    importProducts: 'Import Products',
    importOrders: 'Import Orders',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully',
    importError: 'Failed to import data',
    confirmImport: 'This will replace all current data. Continue?'
  }
  
  window.i18n = {
    t: (key) => texts[key] || key
  }
})()
