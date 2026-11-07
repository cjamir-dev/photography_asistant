const { storage, ui, file, auth, logic } = window.PhotoTools
const { loadProducts, loadOrders, replaceProducts, replaceOrders, requestBackup } = storage
const { downloadJson, downloadTextFile, readJsonFile } = file
const { $, setText, setHidden, setupSidebar } = ui
const { formatMoney } = logic
const t = window.i18n?.t || ((k) => k)

const els = {
  exportOrdersBtn: $('#exportOrdersBtn'),
  importOrdersBtn: $('#importOrdersBtn'),
  importOrdersFile: $('#importOrdersFile'),
  exportProductsBtn: $('#exportProductsBtn'),
  importProductsBtn: $('#importProductsBtn'),
  importProductsFile: $('#importProductsFile'),
  exportOrdersCsvBtn: $('#exportOrdersCsvBtn'),
  backupNowBtn: $('#backupNowBtn'),
  exportOrdersError: $('#exportOrdersError'),
  exportOrdersOk: $('#exportOrdersOk'),
  importOrdersError: $('#importOrdersError'),
  importOrdersOk: $('#importOrdersOk'),
  exportProductsError: $('#exportProductsError'),
  exportProductsOk: $('#exportProductsOk'),
  importProductsError: $('#importProductsError'),
  importProductsOk: $('#importProductsOk'),
  backupOk: $('#backupOk'),
  backupError: $('#backupError'),
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
    showError(els.exportOrdersError, t('noOrders'))
    showOk(els.exportOrdersOk, '')
    return
  }
  downloadJson(`orders_${new Date().toISOString().slice(0, 10)}.json`, orders)
  showOk(els.exportOrdersOk, t('dataExported'))
  showError(els.exportOrdersError, '')
}

function ordersToCsv(list) {
  const header = ['id', 'date', 'lastName', 'phone', 'status', 'totalAmount', 'deposit', 'remainingAmount', 'items']
  const rows = list.map(o => {
    const items = JSON.stringify((o.items || []).map(it => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })))
    return [o.id, o.createdAt, o.customer?.lastName, o.customer?.phone, o.status, o.totalAmount, o.deposit, o.remainingAmount, items]
      .map(v => {
        const s = String(v ?? '')
        return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
      }).join(',')
  })
  return [header.join(','), ...rows].join('\n')
}

function exportOrdersCsv() {
  if (orders.length === 0) {
    showError(els.exportOrdersError, t('noOrders'))
    return
  }
  downloadTextFile(`orders_${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(orders), 'text/csv;charset=utf-8')
  showOk(els.exportOrdersOk, t('dataExported'))
  showError(els.exportOrdersError, '')
}

async function importOrders() {
  const selected = els.importOrdersFile.files?.[0]
  if (!selected) {
    els.importOrdersFile.click()
    return
  }
  try {
    const data = await readJsonFile(selected)
    if (!Array.isArray(data)) throw new Error('Invalid data format')
    if (!confirm(t('confirmImport'))) return
    await requestBackup()
    await replaceOrders(data)
    orders = await loadOrders()
    showOk(els.importOrdersOk, t('dataImported'))
    showError(els.importOrdersError, '')
    els.importOrdersFile.value = ''
  } catch (e) {
    showError(els.importOrdersError, `${t('importError')}: ${e.message || ''}`)
    showOk(els.importOrdersOk, '')
    els.importOrdersFile.value = ''
  }
}

function exportProducts() {
  if (products.length === 0) {
    showError(els.exportProductsError, t('emptyProducts'))
    showOk(els.exportProductsOk, '')
    return
  }
  downloadJson(`products_${new Date().toISOString().slice(0, 10)}.json`, products)
  showOk(els.exportProductsOk, t('dataExported'))
  showError(els.exportProductsError, '')
}

async function importProducts() {
  const selected = els.importProductsFile.files?.[0]
  if (!selected) {
    els.importProductsFile.click()
    return
  }
  try {
    const data = await readJsonFile(selected)
    if (!Array.isArray(data)) throw new Error('Invalid data format')
    if (!confirm(t('confirmImport'))) return
    await requestBackup()
    await replaceProducts(data)
    products = await loadProducts()
    showOk(els.importProductsOk, t('dataImported'))
    showError(els.importProductsError, '')
    els.importProductsFile.value = ''
  } catch (e) {
    showError(els.importProductsError, `${t('importError')}: ${e.message || ''}`)
    showOk(els.importProductsOk, '')
    els.importProductsFile.value = ''
  }
}

async function backupNow() {
  try {
    await requestBackup()
    showOk(els.backupOk, t('backupDone'))
    showError(els.backupError, '')
  } catch (e) {
    showError(els.backupError, e.message)
    showOk(els.backupOk, '')
  }
}

async function init() {
  const me = await auth.requireAuth()
  if (!me) return
  ui.initI18n()
  setupSidebar(els, t)
  await initData()

  els.exportOrdersBtn.addEventListener('click', exportOrders)
  els.importOrdersBtn.addEventListener('click', importOrders)
  els.importOrdersFile.addEventListener('change', importOrders)
  els.exportProductsBtn.addEventListener('click', exportProducts)
  els.importProductsBtn.addEventListener('click', importProducts)
  els.importProductsFile.addEventListener('change', importProducts)
  if (els.exportOrdersCsvBtn) els.exportOrdersCsvBtn.addEventListener('click', exportOrdersCsv)
  if (els.backupNowBtn) els.backupNowBtn.addEventListener('click', backupNow)
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (confirm(t('logoutConfirm'))) auth.logout()
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
