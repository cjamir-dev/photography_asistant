const { storage, logic, ui, file } = window.PhotoTools
const { loadProducts, loadOrders, saveProducts, saveOrders } = storage
const { downloadJson, readJsonFile } = file
const { $, setText, setHidden } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  exportOrdersBtn: $('#exportOrdersBtn'),
  exportOrdersExcelBtn: $('#exportOrdersExcelBtn'),
  importOrdersBtn: $('#importOrdersBtn'),
  importOrdersFile: $('#importOrdersFile'),
  exportProductsBtn: $('#exportProductsBtn'),
  importProductsBtn: $('#importProductsBtn'),
  importProductsFile: $('#importProductsFile'),
  exportOrdersError: $('#exportOrdersError'),
  exportOrdersOk: $('#exportOrdersOk'),
  exportOrdersExcelError: $('#exportOrdersExcelError'),
  exportOrdersExcelOk: $('#exportOrdersExcelOk'),
  importOrdersError: $('#importOrdersError'),
  importOrdersOk: $('#importOrdersOk'),
  exportProductsError: $('#exportProductsError'),
  exportProductsOk: $('#exportProductsOk'),
  importProductsError: $('#importProductsError'),
  importProductsOk: $('#importProductsOk'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
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

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(v) {
  const s = String(v ?? '')
  const needs = /[",\n\r]/.test(s)
  const escaped = s.replaceAll('"', '""')
  return needs ? `"${escaped}"` : escaped
}

function normalizeItemType(name) {
  const n = String(name ?? '').toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')
  if (n.includes('3x4') || n.includes('3٭4') || n.includes('3در4')) return '3x4'
  if (n.includes('2x3') || n.includes('2در3') || n.includes('2٭3')) return '2x3'
  if (n.includes('4x6') || n.includes('6x4') || n.includes('4در6')) return '4x6'
  if (n.includes('مجدد') || n.includes('retake')) return 'retake'
  if (n.includes('بزرگ') || n.includes('large')) return 'large'
  return 'other'
}

function ordersToExcelCsv(list) {
  const header = [
    'lastName',
    'phone',
    'qty_3x4',
    'qty_2x3',
    'qty_4x6',
    'qty_retake',
    'qty_large',
    'totalAmount',
    'deposit',
    'remainingAmount',
    'description',
    'date'
  ]

  const rows = list.map(order => {
    const counters = {
      '3x4': 0,
      '2x3': 0,
      '4x6': 0,
      retake: 0,
      large: 0
    }

    const items = Array.isArray(order.items) ? order.items : []
    items.forEach(it => {
      const type = normalizeItemType(it.name)
      if (counters[type] !== undefined) {
        counters[type] += Number(it.quantity ?? 0) || 0
      }
    })

    const totalAmount = Number(order.totalAmount ?? 0) || 0
    const deposit = Number(order.deposit ?? 0) || 0
    const remainingAmount = order.remainingAmount !== undefined
      ? Number(order.remainingAmount) || 0
      : Math.max(0, totalAmount - deposit)

    return [
      order.customer?.lastName ?? '',
      order.customer?.phone ?? '',
      counters['3x4'],
      counters['2x3'],
      counters['4x6'],
      counters.retake,
      counters.large,
      totalAmount,
      deposit,
      remainingAmount,
      order.description ?? '',
      order.createdAt ?? ''
    ].map(escapeCsvCell).join(',')
  })

  return [header.join(','), ...rows].join('\n')
}

function exportOrdersExcel() {
  if (orders.length === 0) {
    showError(els.exportOrdersExcelError, 'No orders to export')
    showOk(els.exportOrdersExcelOk, '')
    return
  }

  const csv = ordersToExcelCsv(orders)
  const date = new Date().toISOString().slice(0, 10)
  downloadTextFile(`orders_${date}.csv`, csv)
  showOk(els.exportOrdersExcelOk, t('dataExported'))
  showError(els.exportOrdersExcelError, '')
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
  if (els.exportOrdersExcelBtn) {
    els.exportOrdersExcelBtn.addEventListener('click', exportOrdersExcel)
  }
  els.importOrdersBtn.addEventListener('click', importOrders)
  els.importOrdersFile.addEventListener('change', importOrders)
  els.exportProductsBtn.addEventListener('click', exportProducts)
  els.importProductsBtn.addEventListener('click', importProducts)
  els.importProductsFile.addEventListener('change', importProducts)
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

