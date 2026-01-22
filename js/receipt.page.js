const { storage, logic, ui } = window.PhotoTools
const { loadOrders } = storage
const { formatMoney } = logic
const { $, setText, setHidden, escapeHtml } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  printBtn: $('#printBtn'),
  receiptCard: $('#receiptCard'),
  receiptError: $('#receiptError'),
  orderIdText: $('#orderIdText'),
  orderDateText: $('#orderDateText'),
  customerNameText: $('#customerNameText'),
  customerPhoneText: $('#customerPhoneText'),
  itemsList: $('#itemsList'),
  totalAmountText: $('#totalAmountText'),
  depositText: $('#depositText'),
  remainingText: $('#remainingText'),
  descSection: $('#descSection'),
  descText: $('#descText')
}

function getParam(name) {
  const url = new URL(window.location.href)
  return url.searchParams.get(name)
}

function createPreviewOrder() {
  const now = new Date().toISOString()
  return {
    id: 'preview_order',
    createdAt: now,
    customer: {
      lastName: t('receiptPreviewCustomerName') || 'Customer',
      phone: '09120000000'
    },
    items: [
      { id: 'i1', name: t('receiptPreviewItem1') || 'Photo 10×15', quantity: 2, unitPrice: 50000, totalPrice: 100000 },
      { id: 'i2', name: t('receiptPreviewItem2') || 'Frame 20×30', quantity: 1, unitPrice: 250000, totalPrice: 250000 }
    ],
    totalAmount: 350000,
    deposit: 100000,
    remainingAmount: 250000,
    description: t('receiptPreviewDescription') || ''
  }
}

function formatDate(value) {
  const d = new Date(value || Date.now())
  const lang = window.i18n?.getLanguage ? window.i18n.getLanguage() : (localStorage.getItem('language') || 'en')
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US'
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function showError(msg) {
  setText(els.receiptError, msg)
  setHidden(els.receiptError, !msg)
  setHidden(els.receiptCard, !!msg)
}

function renderItems(order) {
  const currency = t('currency')
  const items = Array.isArray(order.items) ? order.items : []

  if (items.length === 0) {
    els.itemsList.innerHTML = `<div class="help">${escapeHtml(t('emptyCart'))}</div>`
    return
  }

  const rows = items.map(it => {
    const qty = Number(it.quantity || 0)
    const unit = formatMoney(it.unitPrice || 0)
    const total = formatMoney(it.totalPrice || 0)
    return `
      <div class="receipt-item">
        <span class="item-name">${escapeHtml(it.name || '')}</span>
        <span class="item-details">${escapeHtml(String(qty))} × ${unit} ${currency}</span>
        <span class="item-price">${total} ${currency}</span>
      </div>
    `
  }).join('')

  els.itemsList.innerHTML = rows
}

function render(order) {
  const currency = t('currency')
  setText(els.orderIdText, order.id || '-')
  setText(els.orderDateText, formatDate(order.createdAt))
  setText(els.customerNameText, order.customer?.lastName || '-')
  setText(els.customerPhoneText, order.customer?.phone || '-')

  const totalAmount = order.totalAmount || 0
  const deposit = order.deposit || 0
  const remainingAmount = order.remainingAmount !== undefined ? order.remainingAmount : (totalAmount - deposit)

  setText(els.totalAmountText, `${formatMoney(totalAmount)} ${currency}`)
  setText(els.depositText, `${formatMoney(deposit)} ${currency}`)
  setText(els.remainingText, `${formatMoney(remainingAmount)} ${currency}`)

  renderItems(order)

  const desc = String(order.description || '').trim()
  if (desc) {
    setHidden(els.descSection, false)
    els.descText.textContent = desc
  } else {
    setHidden(els.descSection, true)
    els.descText.textContent = ''
  }
}

async function init() {
  if (window.PhotoTools?.receipt?.applySettings) {
    window.PhotoTools.receipt.applySettings()
  }
  ui.initI18n()

  const orderId = getParam('orderId')
  const orders = await loadOrders()
  const isPreview = getParam('preview') === '1'
  let order = null

  if (orderId) {
    order = orders.find(o => o.id === orderId)
    if (!order) {
      showError(t('receiptOrderNotFound'))
      return
    }
  } else if (isPreview) {
    order = orders[0] || createPreviewOrder()
  } else {
    showError(t('receiptMissingOrderId'))
    return
  }

  showError('')
  render(order)

  if (els.printBtn) {
    els.printBtn.addEventListener('click', () => {
      window.print()
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

