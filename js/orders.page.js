const { storage, logic, ui, auth, formatMoneyInput } = window.PhotoTools
const {
  loadOrders,
  loadProducts,
  updateOrder,
  patchOrder,
  deleteOrder,
  addPayment,
  trySendOrderSms
} = storage
const {
  formatMoney,
  parseMoney,
  formatDateFa,
  formatDateOnlyFa,
  statusLabel,
  ORDER_STATUSES,
  createOrderDraft,
  setCustomer,
  addItemByProduct,
  updateItemQty,
  removeItem,
  validateFinalOrder,
  recomputeOrder,
  parseQty
} = logic
const { $, setText, setHidden, escapeHtml, setupSidebar, printReceipt } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  searchQuery: $('#searchQuery'),
  filterStatus: $('#filterStatus'),
  filterUnpaid: $('#filterUnpaid'),
  dateFrom: $('#dateFrom'),
  dateTo: $('#dateTo'),
  applyFiltersBtn: $('#applyFiltersBtn'),
  clearFiltersBtn: $('#clearFiltersBtn'),
  ordersList: $('#ordersList'),
  ordersCount: $('#ordersCount'),
  editPanel: $('#editPanel'),
  editLastName: $('#editLastName'),
  editPhone: $('#editPhone'),
  editNote: $('#editNote'),
  editDueDate: $('#editDueDate'),
  editStatus: $('#editStatus'),
  editProductSelect: $('#editProductSelect'),
  editQty: $('#editQty'),
  editAddBtn: $('#editAddBtn'),
  editCartList: $('#editCartList'),
  editDeposit: $('#editDeposit'),
  editTotal: $('#editTotal'),
  editRemaining: $('#editRemaining'),
  editSaveBtn: $('#editSaveBtn'),
  editCancelBtn: $('#editCancelBtn'),
  editError: $('#editError'),
  editOk: $('#editOk'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
}

let orders = []
let products = []
let editing = null

function fillStatusSelect(selectEl, includeAll) {
  if (!selectEl) return
  const options = []
  if (includeAll) options.push(`<option value="">${t('filterAll')}</option>`)
  ORDER_STATUSES.forEach(s => {
    options.push(`<option value="${s}">${statusLabel(s, t)}</option>`)
  })
  selectEl.innerHTML = options.join('')
}

async function refresh() {
  orders = await loadOrders()
  products = await loadProducts()
  renderProductsSelect()
  renderList()
}

function renderProductsSelect() {
  if (!els.editProductSelect) return
  els.editProductSelect.innerHTML = [
    `<option value=""></option>`,
    ...products
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'fa'))
      .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
  ].join('')
}

function getFilters() {
  return {
    q: String(els.searchQuery?.value || '').trim().toLowerCase(),
    status: els.filterStatus?.value || '',
    unpaid: Boolean(els.filterUnpaid?.checked),
    from: els.dateFrom?.value || '',
    to: els.dateTo?.value || ''
  }
}

function matchesFilters(order, filters) {
  if (filters.status && order.status !== filters.status) return false
  if (filters.unpaid && !(order.remainingAmount > 0)) return false
  if (filters.q) {
    const hay = `${order.customer?.lastName || ''} ${order.customer?.phone || ''} ${order.description || ''}`.toLowerCase()
    if (!hay.includes(filters.q)) return false
  }
  if (filters.from) {
    const d = (order.createdAt || '').slice(0, 10)
    if (d < filters.from) return false
  }
  if (filters.to) {
    const d = (order.createdAt || '').slice(0, 10)
    if (d > filters.to) return false
  }
  return true
}

function renderList() {
  const filters = getFilters()
  const list = orders
    .filter(o => matchesFilters(o, filters))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  setText(els.ordersCount, `${list.length}`)
  if (list.length === 0) {
    els.ordersList.innerHTML = `<p class="help">${t('noOrdersMatch')}</p>`
    return
  }

  const currency = t('currency')
  els.ordersList.innerHTML = list.map(o => {
    const remaining = o.remainingAmount || 0
    const items = (o.items || []).map(it => `${it.name}×${it.quantity}`).join(t('listSeparator'))
    return `
      <div class="item" data-order-id="${escapeHtml(o.id)}">
        <div class="meta">
          <div class="title">${escapeHtml(o.customer?.lastName || '')} — ${escapeHtml(o.customer?.phone || '')}</div>
          <div class="sub">${escapeHtml(formatDateFa(o.createdAt))} | ${escapeHtml(statusLabel(o.status, t))}${o.dueDate ? ` | ${t('dueDate')}: ${escapeHtml(formatDateOnlyFa(o.dueDate))}` : ''}</div>
          <div class="sub">${escapeHtml(items)}</div>
          ${o.description ? `<div class="sub">${escapeHtml(o.description)}</div>` : ''}
          <div class="sub money-summary" style="margin-top:4px">
            ${t('totalAmount')}: <span class="money-ltr">${formatMoney(o.totalAmount || 0)}</span> ${currency}
            — ${t('deposit')}: <span class="money-ltr">${formatMoney(o.deposit || 0)}</span> ${currency}
          </div>
          <div class="sub order-balance ${remaining > 0 ? 'is-remaining' : 'is-settled'}">
            ${remaining > 0 ? `${t('remaining')}: <span class="money-ltr">${formatMoney(remaining)}</span> ${currency}` : t('settled')}
          </div>
        </div>
        <div class="actions">
          <select data-action="status" class="order-status-select">
            ${ORDER_STATUSES.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s, t)}</option>`).join('')}
          </select>
          ${remaining > 0 ? `<button class="btn primary" data-action="settle" type="button">${t('settlePayment')}</button>` : ''}
          ${remaining > 0 ? `<button class="btn" data-action="partial" type="button">${t('partialPayment')}</button>` : ''}
          <button class="btn" data-action="edit" type="button">${t('editBtn')}</button>
          <button class="btn" data-action="print" type="button">${t('printReceipt')}</button>
          <button class="btn danger" data-action="delete" type="button">${t('deleteBtn')}</button>
        </div>
      </div>
    `
  }).join('')
}

function showEditError(msg) {
  setText(els.editError, msg)
  setHidden(els.editError, !msg)
  setHidden(els.editOk, true)
}

function showEditOk(msg) {
  setText(els.editOk, msg)
  setHidden(els.editOk, !msg)
  setHidden(els.editError, true)
}

function openEdit(order) {
  editing = recomputeOrder({ ...order, items: (order.items || []).map(it => ({ ...it })) })
  setHidden(els.editPanel, false)
  els.editLastName.value = editing.customer?.lastName || ''
  els.editPhone.value = editing.customer?.phone || ''
  els.editNote.value = editing.description || ''
  els.editDueDate.value = editing.dueDate || ''
  els.editStatus.value = editing.status || 'registered'
  els.editDeposit.value = formatMoneyInput(String(editing.deposit || 0))
  els.editQty.value = '1'
  showEditError('')
  showEditOk('')
  renderEditCart()
  els.editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeEdit() {
  editing = null
  setHidden(els.editPanel, true)
}

function renderEditCart() {
  if (!editing) return
  editing = recomputeOrder(editing)
  const currency = t('currency')
  els.editCartList.innerHTML = (editing.items || []).map(it => `
    <div class="item" data-id="${escapeHtml(it.id)}">
      <div class="meta">
        <div class="title">${escapeHtml(it.name)}</div>
        <div class="sub">${formatMoney(it.unitPrice)} ${currency} ×
          <input data-role="qty" type="number" min="1" value="${escapeHtml(it.quantity)}" style="width:80px;margin:0 6px" />
          = ${formatMoney(it.totalPrice)} ${currency}
        </div>
      </div>
      <div class="actions">
        <button class="btn danger" data-action="del" type="button">${t('deleteItem')}</button>
      </div>
    </div>
  `).join('') || `<p class="help">${t('emptyCart')}</p>`

  if (els.editTotal) {
    els.editTotal.innerHTML = `<span class="money-ltr">${formatMoney(editing.totalAmount)}</span> ${currency}`
  }
  if (els.editRemaining) {
    els.editRemaining.innerHTML = `<span class="money-ltr">${formatMoney(editing.remainingAmount)}</span> ${currency}`
  }
}

async function onListClick(e) {
  const row = e.target?.closest('[data-order-id]')
  if (!row) return
  const id = row.getAttribute('data-order-id')
  const order = orders.find(o => o.id === id)
  if (!order) return

  const statusSelect = e.target?.closest('select[data-action="status"]')
  if (statusSelect && e.type === 'change') {
    try {
      const prevStatus = order.status
      const nextStatus = statusSelect.value
      const updated = await patchOrder(id, { status: nextStatus })
      if (nextStatus === 'ready' && prevStatus !== 'ready') {
        const smsResult = await trySendOrderSms(updated || { ...order, status: nextStatus }, 'ready')
        if (smsResult.ok) {
          // silent success
        } else if (!smsResult.skipped && smsResult.error) {
          alert(`${t('smsWarning')}: ${smsResult.error}`)
        }
      }
      await refresh()
    } catch (err) {
      alert(err.message)
    }
    return
  }

  const btn = e.target?.closest('button[data-action]')
  if (!btn) return
  const action = btn.getAttribute('data-action')

  try {
    if (action === 'print') {
      printReceipt(order, t)
      return
    }
    if (action === 'edit') {
      openEdit(order)
      return
    }
    if (action === 'delete') {
      if (!confirm(t('deleteOrderConfirm'))) return
      await deleteOrder(id)
      if (editing?.id === id) closeEdit()
      await refresh()
      return
    }
    if (action === 'settle') {
      if (!confirm(t('confirmSettleAll'))) return
      const updated = await addPayment(id, order.remainingAmount || 0, t('settlePayment'))
      const smsResult = await trySendOrderSms(updated || order, 'settle')
      if (!smsResult.ok && !smsResult.skipped && smsResult.error) {
        alert(`${t('smsWarning')}: ${smsResult.error}`)
      }
      await refresh()
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
      const updated = await addPayment(id, amount, t('partialPayment'))
      const smsResult = await trySendOrderSms(updated || order, 'settle')
      if (!smsResult.ok && !smsResult.skipped && smsResult.error) {
        alert(`${t('smsWarning')}: ${smsResult.error}`)
      }
      await refresh()
    }
  } catch (err) {
    alert(err.message)
  }
}

function onEditCartClick(e) {
  if (!editing) return
  const btn = e.target?.closest('button[data-action="del"]')
  if (!btn) return
  const id = e.target.closest('.item')?.getAttribute('data-id')
  if (!id) return
  editing = removeItem(editing, id)
  renderEditCart()
}

function onEditCartInput(e) {
  if (!editing) return
  const input = e.target
  if (!(input instanceof HTMLInputElement) || input.getAttribute('data-role') !== 'qty') return
  const id = input.closest('.item')?.getAttribute('data-id')
  if (!id) return
  editing = updateItemQty(editing, id, parseQty(input.value))
  renderEditCart()
}

function onEditAdd() {
  if (!editing) return
  const product = products.find(p => p.id === els.editProductSelect.value)
  if (!product) return showEditError(t('errorSelectProduct'))
  editing = addItemByProduct(editing, product, els.editQty.value)
  els.editQty.value = '1'
  showEditError('')
  renderEditCart()
}

async function saveEdit() {
  if (!editing) return
  showEditError('')
  const customerRes = setCustomer(editing, {
    lastName: els.editLastName.value,
    phone: els.editPhone.value
  })
  if (!customerRes.ok) return showEditError(t(customerRes.error) || customerRes.error)
  editing = customerRes.order
  editing.description = String(els.editNote.value || '').trim()
  editing.dueDate = String(els.editDueDate.value || '').trim()
  editing.status = els.editStatus.value || 'registered'
  editing.deposit = parseMoney(els.editDeposit.value)
  editing = recomputeOrder(editing)
  const valid = validateFinalOrder(editing)
  if (!valid.ok) return showEditError(t(valid.error) || valid.error)

  try {
    await updateOrder(editing.id, valid.order)
    showEditOk(t('orderUpdated'))
    closeEdit()
    await refresh()
  } catch (e) {
    showEditError(e.message)
  }
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('unpaid') === '1' && els.filterUnpaid) els.filterUnpaid.checked = true
  if (params.get('q') && els.searchQuery) els.searchQuery.value = params.get('q')
  if (params.get('status') && els.filterStatus) els.filterStatus.value = params.get('status')
}

async function init() {
  const me = await auth.requireAuth()
  if (!me) return
  ui.initI18n()
  setupSidebar(els, t)
  fillStatusSelect(els.filterStatus, true)
  fillStatusSelect(els.editStatus, false)
  applyQueryParams()

  els.applyFiltersBtn.addEventListener('click', renderList)
  els.clearFiltersBtn.addEventListener('click', () => {
    els.searchQuery.value = ''
    els.filterStatus.value = ''
    els.filterUnpaid.checked = false
    els.dateFrom.value = ''
    els.dateTo.value = ''
    renderList()
  })
  els.searchQuery.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') renderList()
  })
  els.ordersList.addEventListener('click', onListClick)
  els.ordersList.addEventListener('change', onListClick)
  els.editAddBtn.addEventListener('click', onEditAdd)
  els.editCartList.addEventListener('click', onEditCartClick)
  els.editCartList.addEventListener('input', onEditCartInput)
  els.editDeposit.addEventListener('input', () => {
    if (!editing) return
    editing.deposit = parseMoney(els.editDeposit.value)
    renderEditCart()
  })
  els.editSaveBtn.addEventListener('click', saveEdit)
  els.editCancelBtn.addEventListener('click', closeEdit)
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (confirm(t('logoutConfirm'))) auth.logout()
    })
  }

  await refresh()

  const focusId = new URLSearchParams(window.location.search).get('id')
  if (focusId) {
    const order = orders.find(o => o.id === focusId)
    if (order) openEdit(order)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
