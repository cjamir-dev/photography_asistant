const { storage, logic, ui, formatMoneyInput, file } = window.PhotoTools
const { loadProducts, loadOrders, saveOrders } = storage
const { downloadJson, readJsonFile } = file
const {
  createOrderDraft,
  setCustomer,
  addItemByProduct,
  updateItemQty,
  removeItem,
  validateFinalOrder,
  formatMoney,
  parseMoney,
  parseQty
} = logic
const { $, setText, setHidden, escapeHtml } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  searchPhone: $('#searchPhone'),
  searchBtn: $('#searchBtn'),
  searchError: $('#searchError'),
  searchOk: $('#searchOk'),
  customerOrdersContainer: $('#customerOrdersContainer'),
  customerOrdersList: $('#customerOrdersList'),

  lastName: $('#cLastName'),
  phone: $('#cPhone'),
  customerOk: $('#customerOk'),
  customerError: $('#customerError'),

  productSelect: $('#productSelect'),
  qtyInput: $('#qtyInput'),
  itemTotalInput: $('#itemTotalInput'),
  addBtn: $('#addBtn'),

  cartList: $('#cartList'),
  totalAmount: $('#totalAmount'),
  depositInput: $('#depositInput'),
  remainingAmount: $('#remainingAmount'),
  clearDraftBtn: $('#clearDraftBtn'),
  finalizeBtn: $('#finalizeBtn'),
  finalError: $('#finalError'),
  finalOk: $('#finalOk'),

  exportOrdersBtn: $('#exportOrdersBtn'),
  importOrdersBtn: $('#importOrdersBtn'),
  importOrdersFile: $('#importOrdersFile'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle')
}

let products = []
let orders = []
let draft = createOrderDraft()
let customerIsValid = false

async function initData() {
  products = await loadProducts()
  orders = await loadOrders()
  renderProductsSelect()
  renderCart()
  if (els.searchPhone.value) {
    onSearchCustomer()
  }
}

function showCustomerError(msg) {
  setText(els.customerError, msg)
  setHidden(els.customerError, !msg)
  setHidden(els.customerOk, true)
}

function showCustomerOk(msg) {
  setText(els.customerOk, msg)
  setHidden(els.customerOk, !msg)
  setHidden(els.customerError, true)
}

function showFinalError(msg) {
  setText(els.finalError, msg)
  setHidden(els.finalError, !msg)
  setHidden(els.finalOk, true)
}

function showFinalOk(msg) {
  setText(els.finalOk, msg)
  setHidden(els.finalOk, !msg)
  setHidden(els.finalError, true)
}

function canAddToCart() {
  return customerIsValid && products.length > 0
}

function renderProductsSelect() {
  const options = [
    `<option value=""></option>`,
    ...products
      .slice()
      .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
      .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
  ].join('')

  els.productSelect.innerHTML = options
}

function renderCart() {
  const items = draft.items ?? []

  const rows = items
    .map(it => {
      const total = formatMoney(it.totalPrice)
      const unit = formatMoney(it.unitPrice)
      const currency = t('currency')
      return `
        <div class="item" data-id="${escapeHtml(it.id)}">
          <div class="meta">
            <div class="title">${escapeHtml(it.name)}</div>
            <div class="sub">${unit} ${currency} ×
              <input data-role="qty" inputmode="numeric" value="${escapeHtml(it.quantity)}" type="number" min="1" step="1" style="width: 90px; margin: 0 6px" />
              = ${total} ${currency}
            </div>
          </div>
          <div class="actions">
            <button class="btn danger" data-action="del" type="button">${t('deleteItem')}</button>
          </div>
        </div>
      `
    })
    .join('')

  els.cartList.innerHTML = rows
  
  draft = logic.recomputeOrder(draft)
  
  setText(els.totalAmount, `${formatMoney(draft.totalAmount)} ${t('currency')}`)
  setText(els.remainingAmount, `${formatMoney(draft.remainingAmount ?? draft.totalAmount)} ${t('currency')}`)

  els.productSelect.disabled = !customerIsValid
  els.qtyInput.disabled = !customerIsValid
  els.itemTotalInput.disabled = !customerIsValid
  els.addBtn.disabled = !canAddToCart()
  els.depositInput.disabled = !customerIsValid
  els.finalizeBtn.disabled = !customerIsValid
  els.clearDraftBtn.disabled = !customerIsValid
  
  updateItemTotal()
  
  if (!customerIsValid) {
    els.productSelect.value = ''
    els.qtyInput.value = '1'
    els.depositInput.value = '0'
    els.itemTotalInput.value = ''
  }
}

function updateItemTotal() {
  const productId = els.productSelect.value
  const qty = parseQty(els.qtyInput.value)
  
  if (!productId || qty <= 0) {
    els.itemTotalInput.value = ''
    return
  }
  
  const product = products.find(p => p.id === productId)
  if (!product) {
    els.itemTotalInput.value = ''
    return
  }
  
  const total = product.price * qty
  els.itemTotalInput.value = `${formatMoney(total)} ${t('currency')}`
}

function findOrdersByPhone(phone) {
  const normalized = logic.normalizeIranMobile(phone)
  if (!logic.isValidIranMobile(normalized)) return []
  
  return orders.filter(o => {
    const orderPhone = logic.normalizeIranMobile(o.customer?.phone ?? '')
    return orderPhone === normalized
  })
}

function renderCustomerOrders(customerOrders) {
  if (customerOrders.length === 0) {
    setHidden(els.customerOrdersContainer, true)
    return
  }

  setHidden(els.customerOrdersContainer, false)

  const rows = customerOrders
    .slice()
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .map(o => {
      const itemText = (o.items ?? [])
        .map(it => `${it.name} × ${it.quantity}`)
        .join(', ')
      const date = new Date(o.createdAt).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      const currency = t('currency')
      const total = formatMoney(o.totalAmount ?? 0)
      const deposit = formatMoney(o.deposit ?? 0)
      const totalAmount = o.totalAmount ?? 0
      const depositAmount = o.deposit ?? 0
      const remainingAmount = o.remainingAmount !== undefined ? o.remainingAmount : (totalAmount - depositAmount)
      const remaining = formatMoney(remainingAmount)
      const isSettled = remainingAmount <= 0 && totalAmount > 0
      return `
        <div class="item" style="margin-bottom: 8px" data-order-id="${escapeHtml(o.id)}">
          <div class="meta">
            <div class="title">${escapeHtml(o.customer?.lastName ?? '')}</div>
            <div class="sub">${escapeHtml(date)}</div>
            <div class="sub">${escapeHtml(itemText)}</div>
            <div class="sub" style="margin-top: 4px">
              <span style="color: var(--accent)">Total: ${total} ${currency}</span>
              ${(o.deposit ?? 0) > 0 ? `<span style="margin-left: 12px">Deposit: ${deposit} ${currency}</span>` : ''}
            </div>
            ${!isSettled ? `<div class="sub" style="color: var(--danger); margin-top: 4px; font-weight: 600">Remaining: ${remaining} ${currency}</div>` : '<div class="sub" style="color: var(--ok); margin-top: 4px">Settled</div>'}
          </div>
          ${!isSettled ? `<div class="actions"><button class="btn primary" data-action="settle" type="button">${t('settlePayment')}</button></div>` : ''}
        </div>
      `
    })
    .join('')

  els.customerOrdersList.innerHTML = rows
}

function onSearchCustomer() {
  const phoneInput = els.searchPhone.value.trim()
  setText(els.searchError, '')
  setText(els.searchOk, '')
  setHidden(els.customerOrdersContainer, true)

  if (!phoneInput) {
    setText(els.searchError, t('errorPhoneRequired'))
    setHidden(els.searchError, false)
    return
  }

  const normalized = logic.normalizeIranMobile(phoneInput)
  if (!logic.isValidIranMobile(normalized)) {
    setText(els.searchError, t('errorPhoneInvalid'))
    setHidden(els.searchError, false)
    return
  }

  const foundOrders = findOrdersByPhone(normalized)
  
  if (foundOrders.length === 0) {
    setText(els.searchOk, t('customerNotFound'))
    setHidden(els.searchOk, true)
    setHidden(els.searchError, true)
    return
  }

  const customer = foundOrders[0].customer
  els.lastName.value = customer?.lastName ?? ''
  els.phone.value = normalized
  
  onCustomerChange()

  const count = foundOrders.length
  const msg = count === 1 ? `${count} ${t('ordersFound')}` : `${count} ${t('ordersFoundPlural')}`
  setText(els.searchOk, msg)
  setHidden(els.searchOk, false)
  setHidden(els.searchError, true)
  
  renderCustomerOrders(foundOrders)
}

function onCustomerChange() {
  const res = setCustomer(draft, {
    lastName: els.lastName.value,
    phone: els.phone.value
  })

  if (!res.ok) {
    customerIsValid = false
    showCustomerError(t(res.error) || res.error)
    showCustomerOk('')
    
    els.productSelect.disabled = true
    els.qtyInput.disabled = true
    els.itemTotalInput.disabled = true
    els.addBtn.disabled = true
    els.depositInput.disabled = true
    els.clearDraftBtn.disabled = true
    
    renderCart()
    return
  }

  customerIsValid = true
  draft = res.order
  showCustomerError('')
  showCustomerOk(t('customerValid'))
  
  els.productSelect.disabled = false
  els.qtyInput.disabled = false
  els.itemTotalInput.disabled = false
  els.addBtn.disabled = false
  els.depositInput.disabled = false
  els.clearDraftBtn.disabled = false
  
  renderCart()
}

function onAddToCart() {
  showFinalError('')
  showFinalOk('')

  if (!canAddToCart()) return
  const productId = els.productSelect.value
  if (!productId) return showFinalError(t('errorSelectProduct'))

  const product = products.find(p => p.id === productId)
  if (!product) return showFinalError(t('errorProductNotFound'))

  const qty = parseQty(els.qtyInput.value)
  if (qty <= 0) {
    els.qtyInput.value = '1'
    return showFinalError(t('errorSelectProduct'))
  }
  
  draft = addItemByProduct(draft, product, qty)
  els.qtyInput.value = '1'
  showFinalOk('')
  renderCart()
}

function onCartClick(e) {
  const btn = e.target?.closest('button[data-action]')
  if (!btn) return
  const row = e.target?.closest('.item')
  const id = row?.getAttribute('data-id')
  if (!id) return

  const action = btn.getAttribute('data-action')
  if (action === 'del') {
    draft = removeItem(draft, id)
    renderCart()
  }
}

function onCartInput(e) {
  const input = e.target
  if (!(input instanceof HTMLInputElement)) return
  if (input.getAttribute('data-role') !== 'qty') return

  const row = input.closest('.item')
  const id = row?.getAttribute('data-id')
  if (!id) return

  const qty = parseQty(input.value)
  if (qty <= 0) {
    input.value = '1'
    draft = updateItemQty(draft, id, 1)
  } else {
    input.value = String(qty)
    draft = updateItemQty(draft, id, qty)
  }
  renderCart()
}

function clearDraft() {
  draft = createOrderDraft()
  customerIsValid = false
  els.lastName.value = ''
  els.phone.value = ''
  els.searchPhone.value = ''
  els.productSelect.value = ''
  els.qtyInput.value = '1'
  els.itemTotalInput.value = ''
  els.depositInput.value = '0'
  showCustomerError('')
  showCustomerOk('')
  showFinalError('')
  showFinalOk('')
  setText(els.searchError, '')
  setText(els.searchOk, '')
  setHidden(els.customerOrdersContainer, true)
  
  els.productSelect.disabled = true
  els.qtyInput.disabled = true
  els.itemTotalInput.disabled = true
  els.addBtn.disabled = true
  els.depositInput.disabled = true
  els.clearDraftBtn.disabled = true
  
  renderCart()
}

async function finalizeOrder() {
  showFinalError('')
  showFinalOk('')

  const deposit = parseMoney(els.depositInput.value)
  draft.deposit = deposit
  draft = logic.recomputeOrder(draft)

  const res = validateFinalOrder(draft)
  if (!res.ok) return showFinalError(t(res.error) || res.error)

  orders = [res.order, ...orders]
  await saveOrders(orders)

  const foundOrders = findOrdersByPhone(res.order.customer.phone)
  renderCustomerOrders(foundOrders)
  const count = foundOrders.length
  const msg = count === 1 ? `${count} ${t('ordersFound')}` : `${count} ${t('ordersFoundPlural')}`
  setText(els.searchOk, msg)
  setHidden(els.searchOk, false)

  showFinalOk(t('orderSaved'))
  
  draft = createOrderDraft()
  customerIsValid = false
  els.productSelect.value = ''
  els.qtyInput.value = '1'
  els.itemTotalInput.value = ''
  els.depositInput.value = '0'
  showCustomerError('')
  showCustomerOk('')
  showFinalError('')
  renderCart()
}

function escapeCsvCell(v) {
  const s = String(v ?? '')
  const needs = /[",\n\r]/.test(s)
  const escaped = s.replaceAll('"', '""')
  return needs ? `"${escaped}"` : escaped
}

function ordersToCsv(list) {
  const header = [
    'id',
    'date',
    'lastName',
    'phone',
    'totalAmount',
    'items'
  ]

  const rows = list.map(o => {
    const items = (o.items ?? []).map(it => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice }))
    return [
      o.id,
      o.createdAt,
      o.customer?.lastName,
      o.customer?.phone,
      o.totalAmount,
      JSON.stringify(items)
    ].map(escapeCsvCell).join(',')
  })

  return [header.join(','), ...rows].join('\n')
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

function exportCsv() {
  if (orders.length === 0) return alert('سفارشی برای خروجی وجود ندارد')
  const csv = ordersToCsv(orders)
  const date = new Date().toISOString().slice(0, 10)
  downloadTextFile(`orders_${date}.csv`, csv)
}

async function clearOrders() {
  const ok = confirm('همه سفارش‌ها پاک شوند؟')
  if (!ok) return
  orders = []
  await saveOrders(orders)
}

async function refreshProducts() {
  products = await loadProducts()
  renderProductsSelect()
  renderCart()
}

function formatPriceInput(input) {
  const cursorPos = input.selectionStart
  const oldValue = input.value
  const formatted = formatMoneyInput(input.value)
  
  if (formatted !== oldValue) {
    input.value = formatted
    const diff = formatted.length - oldValue.length
    const newPos = Math.max(0, Math.min(cursorPos + diff, formatted.length))
    input.setSelectionRange(newPos, newPos)
  }
}

function onDepositChange() {
  const depositValue = els.depositInput.value
  const deposit = parseMoney(depositValue)
  draft.deposit = deposit
  draft = logic.recomputeOrder(draft)
  setText(els.remainingAmount, `${formatMoney(draft.remainingAmount ?? draft.totalAmount)} ${t('currency')}`)
}

async function onCustomerOrdersClick(e) {
  const btn = e.target?.closest('button[data-action]')
  if (!btn) return
  const row = e.target?.closest('.item')
  const orderId = row?.getAttribute('data-order-id')
  if (!orderId) return

  const action = btn.getAttribute('data-action')
  if (action === 'settle') {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    
    order.deposit = order.totalAmount
    order.remainingAmount = 0
    await saveOrders(orders)
    
    const foundOrders = findOrdersByPhone(order.customer.phone)
    renderCustomerOrders(foundOrders)
  }
}

function exportOrders() {
  if (orders.length === 0) {
    alert('No orders to export')
    return
  }
  const date = new Date().toISOString().slice(0, 10)
  downloadJson(`orders_${date}.json`, orders)
  showFinalOk(t('dataExported'))
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
    
    const foundOrders = findOrdersByPhone(els.searchPhone.value)
    if (foundOrders.length > 0) {
      renderCustomerOrders(foundOrders)
    }
    
    showFinalOk(t('dataImported'))
    els.importOrdersFile.value = ''
  } catch (e) {
    showFinalError(t('importError') + ': ' + (e.message || 'Unknown error'))
    els.importOrdersFile.value = ''
  }
}

async function init() {
  ui.initI18n()
  
  els.searchBtn.addEventListener('click', onSearchCustomer)
  els.searchPhone.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') onSearchCustomer()
  })

  els.lastName.addEventListener('input', onCustomerChange)
  els.phone.addEventListener('input', onCustomerChange)
  els.productSelect.addEventListener('change', updateItemTotal)
  els.qtyInput.addEventListener('input', updateItemTotal)
  els.depositInput.addEventListener('input', (e) => {
    formatPriceInput(e.target)
    onDepositChange()
  })
  els.depositInput.addEventListener('blur', () => {
    els.depositInput.value = formatMoneyInput(els.depositInput.value)
    onDepositChange()
  })
  els.addBtn.addEventListener('click', onAddToCart)
  els.cartList.addEventListener('click', onCartClick)
  els.cartList.addEventListener('input', onCartInput)
  els.customerOrdersList.addEventListener('click', onCustomerOrdersClick)
  els.clearDraftBtn.addEventListener('click', clearDraft)
  els.finalizeBtn.addEventListener('click', finalizeOrder)
  els.exportOrdersBtn.addEventListener('click', exportOrders)
  els.importOrdersBtn.addEventListener('click', importOrders)
  els.importOrdersFile.addEventListener('change', importOrders)
  
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

  els.productSelect.disabled = true
  els.qtyInput.disabled = true
  els.itemTotalInput.disabled = true
  els.addBtn.disabled = true
  els.depositInput.disabled = true
  els.clearDraftBtn.disabled = true

  await initData()

  window.addEventListener('focus', refreshProducts)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}


