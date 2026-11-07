const { storage, logic, ui, formatMoneyInput, auth } = window.PhotoTools
const {
  loadProducts,
  loadOrders,
  createOrder,
  addPayment,
  sendSms,
  loadSmsSettings
} = storage
const {
  createOrderDraft,
  setCustomer,
  addItemByProduct,
  updateItemQty,
  removeItem,
  validateFinalOrder,
  formatMoney,
  parseMoney,
  parseQty,
  formatDateFa,
  statusLabel,
  normalizeIranMobile,
  isValidIranMobile
} = logic
const { $, setText, setHidden, escapeHtml, setupSidebar, printReceipt } = ui
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
  orderNote: $('#orderNote'),
  dueDate: $('#dueDate'),
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
  printLastBtn: $('#printLastBtn'),
  finalError: $('#finalError'),
  finalOk: $('#finalOk'),
  finalWarn: $('#finalWarn'),

  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
}

let products = []
let orders = []
let draft = createOrderDraft()
let customerIsValid = false
let lastSavedOrder = null

async function initData() {
  products = await loadProducts()
  orders = await loadOrders()
  renderProductsSelect()
  renderCart()
  if (els.searchPhone.value) onSearchCustomer()
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
  if (els.finalWarn) setHidden(els.finalWarn, true)
}

function showFinalOk(msg) {
  setText(els.finalOk, msg)
  setHidden(els.finalOk, !msg)
  setHidden(els.finalError, true)
}

function showFinalWarn(msg) {
  if (!els.finalWarn) return
  setText(els.finalWarn, msg)
  setHidden(els.finalWarn, !msg)
}

function canAddToCart() {
  return customerIsValid && products.length > 0
}

function renderProductsSelect() {
  const options = [
    `<option value=""></option>`,
    ...products
      .slice()
      .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'fa'))
      .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
  ].join('')
  els.productSelect.innerHTML = options
}

function syncDraftMeta() {
  if (els.orderNote) draft.description = String(els.orderNote.value || '').trim()
  if (els.dueDate) draft.dueDate = String(els.dueDate.value || '').trim()
}

function renderCart() {
  const items = draft.items ?? []
  const rows = items.map(it => {
    const total = formatMoney(it.totalPrice)
    const unit = formatMoney(it.unitPrice)
    const currency = t('currency')
    return `
      <div class="item" data-id="${escapeHtml(it.id)}">
        <div class="meta">
          <div class="title">${escapeHtml(it.name)}</div>
            <div class="sub">
              <span class="money-ltr">${unit}</span> ${currency} ×
              <input data-role="qty" inputmode="numeric" value="${escapeHtml(it.quantity)}" type="number" min="1" step="1" class="qty-inline" />
              = <span class="money-ltr">${total}</span> ${currency}
            </div>
        </div>
        <div class="actions">
          <button class="btn danger" data-action="del" type="button">${t('deleteItem')}</button>
        </div>
      </div>
    `
  }).join('')

  els.cartList.innerHTML = rows || `<p class="help">${t('emptyCart')}</p>`

  draft = logic.recomputeOrder(draft)
  if (els.totalAmount) {
    els.totalAmount.innerHTML = `<span class="money-ltr">${formatMoney(draft.totalAmount)}</span> ${t('currency')}`
  }
  if (els.remainingAmount) {
    els.remainingAmount.innerHTML = `<span class="money-ltr">${formatMoney(draft.remainingAmount ?? draft.totalAmount)}</span> ${t('currency')}`
  }

  els.productSelect.disabled = !customerIsValid
  els.qtyInput.disabled = !customerIsValid
  els.itemTotalInput.disabled = !customerIsValid
  els.addBtn.disabled = !canAddToCart()
  els.depositInput.disabled = !customerIsValid
  els.finalizeBtn.disabled = !customerIsValid
  els.clearDraftBtn.disabled = !customerIsValid
  if (els.orderNote) els.orderNote.disabled = !customerIsValid
  if (els.dueDate) els.dueDate.disabled = !customerIsValid
  if (els.printLastBtn) els.printLastBtn.disabled = !lastSavedOrder

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
  els.itemTotalInput.value = `${formatMoney(product.price * qty)} ${t('currency')}`
}

function findOrdersByPhone(phone) {
  const normalized = normalizeIranMobile(phone)
  if (!isValidIranMobile(normalized)) return []
  return orders.filter(o => normalizeIranMobile(o.customer?.phone ?? '') === normalized)
}

function renderCustomerOrders(customerOrders) {
  if (customerOrders.length === 0) {
    setHidden(els.customerOrdersContainer, true)
    return
  }
  setHidden(els.customerOrdersContainer, false)
  const currency = t('currency')
  const rows = customerOrders
    .slice()
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .map(o => {
      const itemText = (o.items ?? []).map(it => `${it.name} × ${it.quantity}`).join(t('listSeparator'))
      const remainingAmount = o.remainingAmount !== undefined
        ? o.remainingAmount
        : ((o.totalAmount || 0) - (o.deposit || 0))
      const isSettled = remainingAmount <= 0 && (o.totalAmount || 0) > 0
      return `
        <div class="item" data-order-id="${escapeHtml(o.id)}">
          <div class="meta">
            <div class="title">${escapeHtml(o.customer?.lastName ?? '')}</div>
            <div class="sub">${escapeHtml(formatDateFa(o.createdAt))} — ${escapeHtml(statusLabel(o.status, t))}</div>
            <div class="sub">${escapeHtml(itemText)}</div>
            <div class="sub" style="margin-top: 4px">
              <span style="color: var(--accent)">${t('totalAmount')}: <span class="money-ltr">${formatMoney(o.totalAmount || 0)}</span> ${currency}</span>
              ${(o.deposit || 0) > 0 ? `<span style="margin-inline-start: 12px">${t('deposit')}: <span class="money-ltr">${formatMoney(o.deposit || 0)}</span> ${currency}</span>` : ''}
            </div>
            <div class="sub order-balance ${isSettled ? 'is-settled' : 'is-remaining'}">
              ${isSettled
                ? t('settled')
                : `${t('remaining')}: <span class="money-ltr">${formatMoney(remainingAmount)}</span> ${currency}`}
            </div>
          </div>
          <div class="actions">
            ${!isSettled ? `<button class="btn primary" data-action="settle" type="button">${t('settlePayment')}</button>` : ''}
            ${!isSettled ? `<button class="btn" data-action="partial" type="button">${t('partialPayment')}</button>` : ''}
            <button class="btn" data-action="print" type="button">${t('printReceipt')}</button>
          </div>
        </div>
      `
    }).join('')
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

  const normalized = normalizeIranMobile(phoneInput)
  if (!isValidIranMobile(normalized)) {
    setText(els.searchError, t('errorPhoneInvalid'))
    setHidden(els.searchError, false)
    return
  }

  const foundOrders = findOrdersByPhone(normalized)
  if (foundOrders.length === 0) {
    setText(els.searchOk, t('customerNotFound'))
    setHidden(els.searchOk, false)
    setHidden(els.searchError, true)
    return
  }

  const customer = foundOrders[0].customer
  els.lastName.value = customer?.lastName ?? ''
  els.phone.value = normalized
  onCustomerChange()

  setText(els.searchOk, `${foundOrders.length} ${t('ordersFoundPlural')}`)
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
    renderCart()
    return
  }

  customerIsValid = true
  draft = res.order
  syncDraftMeta()
  showCustomerError('')
  showCustomerOk(t('customerValid'))
  renderCart()
}

function onAddToCart() {
  showFinalError('')
  showFinalOk('')
  showFinalWarn('')
  if (!canAddToCart()) return
  const productId = els.productSelect.value
  if (!productId) return showFinalError(t('errorSelectProduct'))
  const product = products.find(p => p.id === productId)
  if (!product) return showFinalError(t('errorProductNotFound'))
  draft = addItemByProduct(draft, product, els.qtyInput.value)
  els.qtyInput.value = '1'
  renderCart()
}

function onCartClick(e) {
  const btn = e.target?.closest('button[data-action]')
  if (!btn) return
  const row = e.target?.closest('.item')
  const id = row?.getAttribute('data-id')
  if (!id) return
  if (btn.getAttribute('data-action') === 'del') {
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
  input.value = String(qty > 0 ? qty : 1)
  draft = updateItemQty(draft, id, qty > 0 ? qty : 1)
  renderCart()
}

function clearDraftKeepSearch() {
  const searchPhone = els.searchPhone.value
  draft = createOrderDraft()
  customerIsValid = false
  els.lastName.value = ''
  els.phone.value = ''
  if (els.orderNote) els.orderNote.value = ''
  if (els.dueDate) els.dueDate.value = ''
  els.productSelect.value = ''
  els.qtyInput.value = '1'
  els.itemTotalInput.value = ''
  els.depositInput.value = '0'
  showCustomerError('')
  showCustomerOk('')
  if (searchPhone) {
    const found = findOrdersByPhone(searchPhone)
    if (found.length) renderCustomerOrders(found)
  } else {
    setHidden(els.customerOrdersContainer, true)
  }
  renderCart()
}

async function trySendSms(order) {
  try {
    const settings = await loadSmsSettings()
    if (!settings.enabled) return { ok: false, skipped: true }
    if (!settings.username || !settings.passwordSet || !settings.fromNumber) {
      return { ok: false, skipped: true, error: t('smsNotConfigured') }
    }
    await sendSms({
      toNumbers: order.customer?.phone || '',
      order: {
        customer: order.customer,
        totalAmount: formatMoney(order.totalAmount || 0),
        deposit: formatMoney(order.deposit || 0),
        remainingAmount: formatMoney(order.remainingAmount || 0)
      }
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message || t('smsError') }
  }
}

async function finalizeOrder() {
  showFinalError('')
  showFinalOk('')
  showFinalWarn('')
  syncDraftMeta()
  draft.deposit = parseMoney(els.depositInput.value)
  draft = logic.recomputeOrder(draft)

  const res = validateFinalOrder(draft)
  if (!res.ok) return showFinalError(t(res.error) || res.error)

  try {
    const saved = await createOrder(res.order)
    lastSavedOrder = saved
    orders = await loadOrders()
    showFinalOk(t('orderSaved'))
    if (els.printLastBtn) els.printLastBtn.disabled = false

    const smsResult = await trySendSms(saved)
    if (smsResult.ok) {
      showFinalOk(`${t('orderSaved')} — ${t('smsSent')}`)
    } else if (!smsResult.skipped) {
      showFinalWarn(`${t('smsWarning')}: ${smsResult.error || t('smsError')}`)
    }

    const phone = saved.customer?.phone
    clearDraftKeepSearch()
    if (phone) {
      els.searchPhone.value = phone
      const found = findOrdersByPhone(phone)
      setText(els.searchOk, `${found.length} ${t('ordersFoundPlural')}`)
      setHidden(els.searchOk, false)
      renderCustomerOrders(found)
    }
  } catch (e) {
    showFinalError(e.message || t('smsError'))
  }
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
  draft.deposit = parseMoney(els.depositInput.value)
  draft = logic.recomputeOrder(draft)
  if (els.remainingAmount) {
    els.remainingAmount.innerHTML = `<span class="money-ltr">${formatMoney(draft.remainingAmount ?? draft.totalAmount)}</span> ${t('currency')}`
  }
}

async function onCustomerOrdersClick(e) {
  const btn = e.target?.closest('button[data-action]')
  if (!btn) return
  const row = e.target?.closest('.item')
  const orderId = row?.getAttribute('data-order-id')
  if (!orderId) return
  const order = orders.find(o => o.id === orderId)
  if (!order) return
  const action = btn.getAttribute('data-action')

  try {
    if (action === 'print') {
      printReceipt(order, t)
      return
    }
    if (action === 'settle') {
      if (!confirm(t('confirmSettleAll'))) return
      const amount = order.remainingAmount || 0
      if (amount <= 0) return
      await addPayment(orderId, amount, t('settlePayment'))
      orders = await loadOrders()
      renderCustomerOrders(findOrdersByPhone(order.customer.phone))
      return
    }
    if (action === 'partial') {
      const raw = prompt(t('paymentAmount'), String(order.remainingAmount || 0))
      if (raw === null) return
      const amount = parseMoney(raw)
      if (amount <= 0 || amount > (order.remainingAmount || 0)) {
        alert(t('errorPaymentAmount'))
        return
      }
      await addPayment(orderId, amount, t('partialPayment'))
      orders = await loadOrders()
      renderCustomerOrders(findOrdersByPhone(order.customer.phone))
    }
  } catch (err) {
    alert(err.message || t('smsError'))
  }
}

async function init() {
  const me = await auth.requireAuth()
  if (!me) return

  ui.initI18n()
  setupSidebar(els, t)

  els.searchBtn.addEventListener('click', onSearchCustomer)
  els.searchPhone.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') onSearchCustomer()
  })
  els.lastName.addEventListener('input', onCustomerChange)
  els.phone.addEventListener('input', onCustomerChange)
  if (els.orderNote) els.orderNote.addEventListener('input', syncDraftMeta)
  if (els.dueDate) els.dueDate.addEventListener('change', syncDraftMeta)
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
  els.clearDraftBtn.addEventListener('click', () => {
    els.searchPhone.value = ''
    setText(els.searchError, '')
    setText(els.searchOk, '')
    setHidden(els.customerOrdersContainer, true)
    showFinalError('')
    showFinalOk('')
    showFinalWarn('')
    clearDraftKeepSearch()
  })
  els.finalizeBtn.addEventListener('click', finalizeOrder)
  if (els.printLastBtn) {
    els.printLastBtn.addEventListener('click', () => {
      if (lastSavedOrder) printReceipt(lastSavedOrder, t)
    })
  }
  els.customerOrdersList.addEventListener('click', onCustomerOrdersClick)
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (confirm(t('logoutConfirm'))) auth.logout()
    })
  }

  await initData()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
