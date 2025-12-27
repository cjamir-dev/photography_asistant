const { storage, logic, ui, file } = window.PhotoTools
const { loadProducts, loadOrders, saveProducts, saveOrders } = storage
const { downloadJson, readJsonFile } = file
const { $, setText, setHidden } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  exportOrdersBtn: $('#exportOrdersBtn'),
  importOrdersBtn: $('#importOrdersBtn'),
  importOrdersFile: $('#importOrdersFile'),
  exportProductsBtn: $('#exportProductsBtn'),
  importProductsBtn: $('#importProductsBtn'),
  importProductsFile: $('#importProductsFile'),
  exportOrdersError: $('#exportOrdersError'),
  exportOrdersOk: $('#exportOrdersOk'),
  importOrdersError: $('#importOrdersError'),
  importOrdersOk: $('#importOrdersOk'),
  exportProductsError: $('#exportProductsError'),
  exportProductsOk: $('#exportProductsOk'),
  importProductsError: $('#importProductsError'),
  importProductsOk: $('#importProductsOk'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  settingsBtn: $('#settingsBtn'),
  logoutBtn: $('#logoutBtn')
}

let orders = []
let products = []

async function initData() {
  orders = await loadOrders()
  products = await loadProducts()
}

function showError(element, msg) {
  setText(element, msg)
  setHidden(element, !msg)
}

function showOk(element, msg) {
  setText(element, msg)
  setHidden(element, !msg)
}

function exportOrders() {
  if (orders.length === 0) {
    showError(els.exportOrdersError, 'No orders to export')
    showOk(els.exportOrdersOk, '')
    return
  }
  const date = new Date().toISOString().slice(0, 10)
  downloadJson(`orders_${date}.json`, orders)
  showOk(els.exportOrdersOk, t('dataExported'))
  showError(els.exportOrdersError, '')
}

async function importOrders() {
  const file = els.importOrdersFile.files?.[0]
  if (!file) {
    els.importOrdersFile.click()
    return
  }
  
  try {
    const data = await readJsonFile(file)
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format')
    }
    
    const confirmed = confirm(t('confirmImport'))
    if (!confirmed) return
    
    orders = data
    await saveOrders(orders)
    
    showOk(els.importOrdersOk, t('dataImported'))
    showError(els.importOrdersError, '')
    els.importOrdersFile.value = ''
  } catch (e) {
    showError(els.importOrdersError, t('importError') + ': ' + (e.message || 'Unknown error'))
    showOk(els.importOrdersOk, '')
    els.importOrdersFile.value = ''
  }
}

function exportProducts() {
  if (products.length === 0) {
    showError(els.exportProductsError, 'No products to export')
    showOk(els.exportProductsOk, '')
    return
  }
  const date = new Date().toISOString().slice(0, 10)
  downloadJson(`products_${date}.json`, products)
  showOk(els.exportProductsOk, t('dataExported'))
  showError(els.exportProductsError, '')
}

async function importProducts() {
  const file = els.importProductsFile.files?.[0]
  if (!file) {
    els.importProductsFile.click()
    return
  }
  
  try {
    const data = await readJsonFile(file)
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format')
    }
    
    const confirmed = confirm(t('confirmImport'))
    if (!confirmed) return
    
    products = data
    await saveProducts(products)
    
    showOk(els.importProductsOk, t('dataImported'))
    showError(els.importProductsError, '')
    els.importProductsFile.value = ''
  } catch (e) {
    showError(els.importProductsError, t('importError') + ': ' + (e.message || 'Unknown error'))
    showOk(els.importProductsOk, '')
    els.importProductsFile.value = ''
  }
}

function handleSettings() {
  alert('Settings feature coming soon!')
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('username')
    window.location.href = './login.html'
  }
}

function checkAuth() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  if (!isAuthenticated) {
    window.location.href = './login.html'
    return false
  }
  return true
}

async function init() {
  if (!checkAuth()) return
  
  ui.initI18n()
  
  await initData()
  
  els.exportOrdersBtn.addEventListener('click', exportOrders)
  els.importOrdersBtn.addEventListener('click', importOrders)
  els.importOrdersFile.addEventListener('change', importOrders)
  els.exportProductsBtn.addEventListener('click', exportProducts)
  els.importProductsBtn.addEventListener('click', importProducts)
  els.importProductsFile.addEventListener('change', importProducts)
  els.settingsBtn.addEventListener('click', handleSettings)
  els.logoutBtn.addEventListener('click', handleLogout)
  
  if (els.sidebarToggle && els.sidebar) {
    els.sidebarToggle.addEventListener('click', () => {
      els.sidebar.classList.toggle('collapsed')
      const isCollapsed = els.sidebar.classList.contains('collapsed')
      localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false')
    })
    
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState === 'true') {
      els.sidebar.classList.add('collapsed')
    }
    
    // Set tooltips for sidebar items
    const sidebarItems = els.sidebar.querySelectorAll('.sidebar-item')
    sidebarItems.forEach(item => {
      const textSpan = item.querySelector('.sidebar-text')
      if (textSpan && textSpan.hasAttribute('data-i18n')) {
        const i18nKey = textSpan.getAttribute('data-i18n')
        item.setAttribute('data-tooltip', t(i18nKey))
      }
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

