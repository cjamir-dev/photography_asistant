const { storage, logic, ui } = window.PhotoTools
const { loadProducts, loadOrders, saveOrders } = storage
const {
  createOrderDraft,
  setCustomer,
  addItemByProduct,
  updateItemQty,
  removeItem,
  validateFinalOrder,
  formatMoney,
  parseQty
} = logic
const { $, setText, setHidden, escapeHtml } = ui

const els = {
  lastName: $('#cLastName'),
  phone: $('#cPhone'),
  customerOk: $('#customerOk'),
  customerError: $('#customerError'),

  productSelect: $('#productSelect'),
  qtyInput: $('#qtyInput'),
  addBtn: $('#addBtn'),
  noProductsHelp: $('#noProductsHelp'),

  cartList: $('#cartList'),
  emptyCart: $('#emptyCart'),
  totalAmount: $('#totalAmount'),
  clearDraftBtn: $('#clearDraftBtn'),
  finalizeBtn: $('#finalizeBtn'),
  finalError: $('#finalError'),
  finalOk: $('#finalOk'),

  exportCsvBtn: $('#exportCsvBtn'),
  clearOrdersBtn: $('#clearOrdersBtn'),
  ordersList: $('#ordersList'),
  emptyOrders: $('#emptyOrders')
}

let products = loadProducts()
let orders = loadOrders()
let draft = createOrderDraft()
let customerIsValid = false

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
    `<option value="">—</option>`,
    ...products
      .slice()
      .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
      .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${formatMoney(p.price)} تومان</option>`)
  ].join('')

  els.productSelect.innerHTML = options
  setHidden(els.noProductsHelp, products.length !== 0)
}

function renderCart() {
  const items = draft.items ?? []
  setHidden(els.emptyCart, items.length !== 0)

  const rows = items
    .map(it => {
      const total = formatMoney(it.totalPrice)
      const unit = formatMoney(it.unitPrice)
      return `
        <div class="item" data-id="${escapeHtml(it.id)}">
          <div class="thumb">سبد</div>
          <div class="meta">
            <div class="title">${escapeHtml(it.name)}</div>
            <div class="sub">${unit} تومان ×
              <input data-role="qty" inputmode="numeric" value="${escapeHtml(it.quantity)}" style="width: 90px; margin: 0 6px" />
              = ${total} تومان
            </div>
          </div>
          <div class="actions">
            <button class="btn danger" data-action="del" type="button">حذف</button>
          </div>
        </div>
      `
    })
    .join('')

  els.cartList.innerHTML = rows
  setText(els.totalAmount, `${formatMoney(draft.totalAmount)} تومان`)

  els.addBtn.disabled = !canAddToCart()
  els.finalizeBtn.disabled = !customerIsValid
}

function renderOrders() {
  const count = orders.length
  setHidden(els.emptyOrders, count !== 0)

  const rows = orders
    .slice()
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .slice(0, 20)
    .map(o => {
      const itemText = (o.items ?? [])
        .map(it => `${it.name}×${it.quantity}`)
        .join('، ')
      return `
        <div class="item">
          <div class="thumb">ثبت</div>
          <div class="meta">
            <div class="title">${escapeHtml(o.customer?.lastName)} — ${escapeHtml(o.customer?.phone)}</div>
            <div class="sub">${escapeHtml(new Date(o.createdAt).toLocaleString('fa-IR'))} — ${formatMoney(o.totalAmount)} تومان</div>
            <div class="sub">${escapeHtml(itemText)}</div>
          </div>
          <div class="actions">
            <span class="pill">#${escapeHtml(o.id)}</span>
          </div>
        </div>
      `
    })
    .join('')

  els.ordersList.innerHTML = rows
}

function onCustomerChange() {
  const res = setCustomer(draft, {
    lastName: els.lastName.value,
    phone: els.phone.value
  })

  if (!res.ok) {
    customerIsValid = false
    showCustomerError(res.error)
    showCustomerOk('')
    renderCart()
    return
  }

  customerIsValid = true
  draft = res.order
  showCustomerError('')
  showCustomerOk('اطلاعات مشتری تایید شد')
  renderCart()
}

function onAddToCart() {
  showFinalError('')
  showFinalOk('')

  if (!canAddToCart()) return
  const productId = els.productSelect.value
  if (!productId) return showFinalError('اول یک محصول انتخاب کنید')

  const product = products.find(p => p.id === productId)
  if (!product) return showFinalError('محصول پیدا نشد')

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
  input.value = String(qty)
  draft = updateItemQty(draft, id, qty)
  renderCart()
}

function clearDraft() {
  draft = createOrderDraft()
  customerIsValid = false
  els.lastName.value = ''
  els.phone.value = ''
  els.productSelect.value = ''
  els.qtyInput.value = '1'
  showCustomerError('')
  showCustomerOk('')
  showFinalError('')
  showFinalOk('')
  renderCart()
}

function finalizeOrder() {
  showFinalError('')
  showFinalOk('')

  const res = validateFinalOrder(draft)
  if (!res.ok) return showFinalError(res.error)

  orders = [res.order, ...orders]
  saveOrders(orders)
  renderOrders()

  showFinalOk('سفارش ثبت شد')
  clearDraft()
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

function clearOrders() {
  const ok = confirm('همه سفارش‌ها پاک شوند؟')
  if (!ok) return
  orders = []
  saveOrders(orders)
  renderOrders()
}

function refreshProducts() {
  products = loadProducts()
  renderProductsSelect()
  renderCart()
}

els.lastName.addEventListener('input', onCustomerChange)
els.phone.addEventListener('input', onCustomerChange)
els.addBtn.addEventListener('click', onAddToCart)
els.cartList.addEventListener('click', onCartClick)
els.cartList.addEventListener('input', onCartInput)
els.clearDraftBtn.addEventListener('click', clearDraft)
els.finalizeBtn.addEventListener('click', finalizeOrder)
els.exportCsvBtn.addEventListener('click', exportCsv)
els.clearOrdersBtn.addEventListener('click', clearOrders)

renderProductsSelect()
renderCart()
renderOrders()

window.addEventListener('focus', refreshProducts)


