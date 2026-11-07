(function () {
  const ORDER_STATUSES = ['registered', 'printing', 'ready', 'delivered', 'cancelled']

  function nowIso() {
    return new Date().toISOString()
  }

  function uid(prefix = 'id') {
    const rnd = Math.random().toString(16).slice(2)
    const t = Date.now().toString(16)
    return `${prefix}_${t}_${rnd}`
  }

  function safeJsonParse(text, fallback) {
    try {
      const v = JSON.parse(text)
      return v ?? fallback
    } catch {
      return fallback
    }
  }

  function translateApiError(codeOrMessage) {
    const raw = String(codeOrMessage || '').trim()
    if (!raw) return window.i18n?.t?.('errorServer') || 'Server error'
    const translated = window.i18n?.t?.(raw)
    if (translated && translated !== raw) return translated
    return raw
  }

  async function api(path, options = {}) {
    const opts = {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    }
    if (opts.body && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body)
    }
    const response = await fetch(path, opts)
    let data = null
    const text = await response.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }
    }
    if (response.status === 401 && !path.includes('/api/login') && !path.includes('/api/me')) {
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = './login.html'
      }
      const err = new Error(translateApiError((data && data.error) || 'unauthorized'))
      err.status = 401
      err.code = data?.error || 'unauthorized'
      throw err
    }
    if (!response.ok) {
      const err = new Error(translateApiError((data && data.error) || 'errorServer'))
      err.status = response.status
      err.code = data?.error || 'errorServer'
      err.data = data
      throw err
    }
    return data
  }

  async function checkAuth() {
    try {
      const me = await api('/api/me')
      return me
    } catch {
      return { authenticated: false }
    }
  }

  async function requireAuth(options = {}) {
    const me = await checkAuth()
    if (!me.authenticated) {
      window.location.href = './login.html'
      return null
    }
    const onSettings = window.location.pathname.endsWith('settings.html')
    if (me.mustChangePassword && !options.allowMustChange && !onSettings) {
      window.location.href = './settings.html'
      return null
    }
    return me
  }

  async function login(username, password) {
    return api('/api/login', {
      method: 'POST',
      body: { username, password }
    })
  }

  async function logout() {
    try {
      await api('/api/logout', { method: 'POST', body: {} })
    } catch {
      // ignore
    }
    window.location.href = './login.html'
  }

  async function changePassword(currentPassword, newPassword) {
    return api('/api/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
  }

  async function loadProducts() {
    const data = await api('/api/products')
    return Array.isArray(data) ? data : []
  }

  async function createProductApi(product) {
    return api('/api/products', { method: 'POST', body: product })
  }

  async function updateProductApi(id, product) {
    return api(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: product })
  }

  async function deleteProductApi(id) {
    return api(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async function replaceProducts(products) {
    return api('/api/products', { method: 'POST', body: products })
  }

  async function loadOrders() {
    const data = await api('/api/orders')
    return Array.isArray(data) ? data.map(normalizeOrder) : []
  }

  async function createOrderApi(order) {
    return api('/api/orders', { method: 'POST', body: order })
  }

  async function updateOrderApi(id, order) {
    return api(`/api/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: order })
  }

  async function patchOrderApi(id, patch) {
    return api(`/api/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
  }

  async function deleteOrderApi(id) {
    return api(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async function addPaymentApi(id, amount, note) {
    return api(`/api/orders/${encodeURIComponent(id)}/payments`, {
      method: 'POST',
      body: { amount, note: note || '' }
    })
  }

  async function replaceOrders(orders) {
    return api('/api/orders', { method: 'POST', body: orders })
  }

  async function loadSmsSettings() {
    return api('/api/sms-settings')
  }

  async function saveSmsSettings(settings) {
    return api('/api/sms-settings', { method: 'POST', body: settings })
  }

  async function sendSmsApi(payload) {
    return api('/api/send-sms', { method: 'POST', body: payload })
  }

  async function requestBackup() {
    return api('/api/backup', { method: 'POST', body: {} })
  }

  function clone(v) {
    if (typeof structuredClone === 'function') return structuredClone(v)
    return JSON.parse(JSON.stringify(v))
  }

  function normalizeIranMobile(input) {
    const raw = String(input ?? '').trim()
    const digits = raw.replace(/[^\d+]/g, '')

    if (digits.startsWith('+98')) {
      const rest = digits.slice(3).replace(/[^\d]/g, '')
      return '0' + rest
    }

    if (digits.startsWith('0098')) {
      const rest = digits.slice(4).replace(/[^\d]/g, '')
      return '0' + rest
    }

    return digits.replace(/[^\d]/g, '')
  }

  function isValidIranMobile(input) {
    const n = normalizeIranMobile(input)
    return /^09\d{9}$/.test(n)
  }

  function parseMoney(input) {
    const raw = String(input ?? '').trim()
    if (!raw) return 0
    const normalized = raw.replace(/[,\s]/g, '')
    const n = Number(normalized)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.round(n))
  }

  function parseQty(input) {
    const n = Number(String(input ?? '').trim())
    if (!Number.isFinite(n)) return 1
    return Math.max(1, Math.floor(n))
  }

  function formatMoney(n) {
    const x = Number(n ?? 0)
    const safe = Number.isFinite(x) ? x : 0
    return safe.toLocaleString('en-US')
  }

  function formatMoneyInput(value) {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const normalized = raw.replace(/[,\s]/g, '')
    const num = Number(normalized)
    if (!Number.isFinite(num)) return raw
    return num.toLocaleString('en-US')
  }

  function currentLocale() {
    return window.i18n?.locale?.() || 'fa-IR'
  }

  function formatDateFa(iso) {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleString(currentLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return String(iso)
    }
  }

  function formatDateOnlyFa(iso) {
    if (!iso) return ''
    try {
      const d = iso.length <= 10 ? new Date(iso + 'T00:00:00') : new Date(iso)
      return d.toLocaleDateString(currentLocale())
    } catch {
      return String(iso)
    }
  }

  function normalizeOrder(order) {
    const total = parseMoney(order.totalAmount)
    const deposit = parseMoney(order.deposit)
    return {
      ...order,
      totalAmount: total,
      deposit,
      remainingAmount: Math.max(0, total - deposit),
      status: ORDER_STATUSES.includes(order.status) ? order.status : 'registered',
      dueDate: order.dueDate || '',
      description: order.description || order.note || '',
      payments: Array.isArray(order.payments) ? order.payments : [],
      updatedAt: order.updatedAt || order.createdAt || nowIso()
    }
  }

  function createProduct({ name, price, description, imageDataUrl }) {
    const cleanName = String(name ?? '').trim()
    if (!cleanName) return { ok: false, error: 'errorProductRequired' }

    const cleanPrice = parseMoney(price)
    if (cleanPrice <= 0) return { ok: false, error: 'errorPriceRequired' }

    return {
      ok: true,
      product: {
        id: uid('prod'),
        name: cleanName,
        price: cleanPrice,
        description: String(description ?? '').trim(),
        imageDataUrl: String(imageDataUrl ?? ''),
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    }
  }

  function updateProduct(existing, patch) {
    const next = { ...existing }

    if ('name' in patch) next.name = String(patch.name ?? '').trim()
    if ('price' in patch) next.price = parseMoney(patch.price)
    if ('description' in patch) next.description = String(patch.description ?? '').trim()
    if ('imageDataUrl' in patch) next.imageDataUrl = String(patch.imageDataUrl ?? '')

    if (!next.name) return { ok: false, error: 'errorProductRequired' }
    if (!(next.price > 0)) return { ok: false, error: 'errorPriceRequired' }

    next.updatedAt = nowIso()

    return { ok: true, product: next }
  }

  function createOrderDraft() {
    return {
      id: uid('ord'),
      customer: {
        lastName: '',
        phone: '',
        createdAt: nowIso()
      },
      items: [],
      totalAmount: 0,
      deposit: 0,
      remainingAmount: 0,
      status: 'registered',
      dueDate: '',
      description: '',
      payments: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  }

  function setCustomer(draft, { lastName, phone }) {
    const ln = String(lastName ?? '').trim()
    const ph = normalizeIranMobile(phone)

    if (!ln) return { ok: false, error: 'errorLastNameRequired' }
    if (!isValidIranMobile(ph)) return { ok: false, error: 'errorPhoneInvalid' }

    const next = clone(draft)
    next.customer.lastName = ln
    next.customer.phone = ph
    return { ok: true, order: next }
  }

  function recomputeOrder(draft) {
    const next = clone(draft)
    let total = 0
    next.items = (next.items ?? []).map(it => {
      const qty = parseQty(it.quantity)
      const unit = parseMoney(it.unitPrice)
      const rowTotal = qty * unit
      total += rowTotal
      return { ...it, quantity: qty, unitPrice: unit, totalPrice: rowTotal }
    })
    next.totalAmount = total
    const deposit = parseMoney(next.deposit ?? 0)
    next.deposit = deposit
    next.remainingAmount = Math.max(0, total - deposit)
    return next
  }

  function addItemByProduct(draft, product, qtyInput) {
    const qty = parseQty(qtyInput)
    const next = clone(draft)

    const existing = next.items.find(x => x.productId === product.id)
    if (existing) {
      existing.quantity = parseQty(existing.quantity + qty)
    } else {
      next.items.push({
        id: uid('item'),
        productId: product.id,
        name: product.name,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: product.price * qty,
        description: product.description || ''
      })
    }

    return recomputeOrder(next)
  }

  function updateItemQty(draft, itemId, qtyInput) {
    const qty = parseQty(qtyInput)
    const next = clone(draft)
    const it = next.items.find(x => x.id === itemId)
    if (!it) return draft
    it.quantity = qty
    return recomputeOrder(next)
  }

  function removeItem(draft, itemId) {
    const next = clone(draft)
    next.items = next.items.filter(x => x.id !== itemId)
    return recomputeOrder(next)
  }

  function validateFinalOrder(draft) {
    const ln = String(draft?.customer?.lastName ?? '').trim()
    const ph = String(draft?.customer?.phone ?? '').trim()

    if (!ln) return { ok: false, error: 'errorLastNameRequired' }
    if (!isValidIranMobile(ph)) return { ok: false, error: 'errorPhoneInvalid' }
    if (!Array.isArray(draft.items) || draft.items.length === 0) return { ok: false, error: 'errorCartEmpty' }

    const final = recomputeOrder(draft)
    if (!(final.totalAmount > 0)) return { ok: false, error: 'errorPriceRequired' }

    final.status = final.status || 'registered'
    final.description = String(final.description || '').trim()
    final.dueDate = String(final.dueDate || '').trim()
    final.updatedAt = nowIso()
    if (!Array.isArray(final.payments)) final.payments = []

    return { ok: true, order: final }
  }

  function $(sel, root = document) {
    return root.querySelector(sel)
  }

  function setText(el, text) {
    if (!el) return
    el.textContent = String(text ?? '')
  }

  function setHidden(el, hidden) {
    if (!el) return
    el.style.display = hidden ? 'none' : ''
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('')
      const reader = new FileReader()
      reader.onerror = () => reject(new Error(window.i18n?.t?.('errorImageRead') || 'Failed to read image'))
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.readAsDataURL(file)
    })
  }

  function initI18n() {
    if (!window.i18n) return

    window.i18n.applyDocumentLang(window.i18n.getLang())

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')
      const text = window.i18n.t(key)
      if (text && text !== key) {
        if (el.tagName === 'TITLE') {
          document.title = text
        }
        el.textContent = text
      }
    })

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder')
      const text = window.i18n.t(key)
      if (text && text !== key) {
        el.placeholder = text
      }
    })

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title')
      const text = window.i18n.t(key)
      if (text && text !== key) el.setAttribute('title', text)
    })

    document.querySelectorAll('.lang-select').forEach(sel => {
      sel.value = window.i18n.getLang()
    })
  }

  function bindLanguageControls(root = document) {
    root.querySelectorAll('.lang-select').forEach(sel => {
      if (sel.dataset.bound === '1') return
      sel.dataset.bound = '1'
      sel.value = window.i18n?.getLang?.() || 'fa'
      sel.addEventListener('change', () => {
        window.i18n.setLang(sel.value, { reload: true })
      })
    })
  }

  function downloadJson(filename, data) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadTextFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result))
        } catch (e) {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.readAsText(file)
    })
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    return newTheme
  }

  function getTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'
    const currentTheme = document.documentElement.getAttribute('data-theme') || savedTheme
    if (currentTheme !== savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme)
      return savedTheme
    }
    return currentTheme
  }

  function setupSidebar(els, t) {
    bindLanguageControls(document)
    if (!els.sidebarToggle || !els.sidebar) return
    els.sidebarToggle.addEventListener('click', () => {
      els.sidebar.classList.toggle('collapsed')
      const isCollapsed = els.sidebar.classList.contains('collapsed')
      localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false')
    })
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      els.sidebar.classList.add('collapsed')
    }
    const sidebarItems = els.sidebar.querySelectorAll('.sidebar-item')
    sidebarItems.forEach(item => {
      const textSpan = item.querySelector('.sidebar-text')
      if (textSpan && textSpan.hasAttribute('data-i18n')) {
        const i18nKey = textSpan.getAttribute('data-i18n')
        item.setAttribute('data-tooltip', t(i18nKey))
      }
    })
  }

  function statusLabel(status, t) {
    const key = `status_${status}`
    const label = t(key)
    return label === key ? status : label
  }

  function printReceipt(order, t) {
    const currency = t('currency')
    const shopName = t('shopName')
    const items = (order.items || []).map(it => `
      <tr>
        <td>${escapeHtml(it.name)}</td>
        <td>${escapeHtml(it.quantity)}</td>
        <td>${formatMoney(it.unitPrice)} ${currency}</td>
        <td>${formatMoney(it.totalPrice)} ${currency}</td>
      </tr>
    `).join('')

    const lang = window.i18n?.getLang?.() || 'fa'
    const dir = lang === 'fa' ? 'rtl' : 'ltr'
    const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t('receiptTitle'))}</title>
  <style>
    body { font-family: ${lang === 'fa' ? 'Tahoma, "Segoe UI"' : 'system-ui, sans-serif'}; padding: 24px; color: #111; direction: ${dir}; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    .meta { margin-bottom: 16px; font-size: 13px; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; font-size: 13px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
    th { background: #f3f3f3; }
    .totals { margin-top: 12px; font-size: 14px; line-height: 1.9; }
    .footer { margin-top: 24px; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <h1>${escapeHtml(shopName)}</h1>
  <div class="meta">
    <div>${escapeHtml(t('receiptTitle'))}</div>
    <div>${escapeHtml(t('customerLastName'))}: ${escapeHtml(order.customer?.lastName || '')}</div>
    <div>${escapeHtml(t('customerPhone'))}: ${escapeHtml(order.customer?.phone || '')}</div>
    <div>${escapeHtml(t('orderDate'))}: ${escapeHtml(formatDateFa(order.createdAt))}</div>
    <div>${escapeHtml(t('orderStatus'))}: ${escapeHtml(statusLabel(order.status, t))}</div>
    ${order.dueDate ? `<div>${escapeHtml(t('dueDate'))}: ${escapeHtml(formatDateOnlyFa(order.dueDate))}</div>` : ''}
    ${order.description ? `<div>${escapeHtml(t('orderNote'))}: ${escapeHtml(order.description)}</div>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t('productName'))}</th>
        <th>${escapeHtml(t('quantity'))}</th>
        <th>${escapeHtml(t('unitPrice'))}</th>
        <th>${escapeHtml(t('itemTotal'))}</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>
  <div class="totals">
    <div>${escapeHtml(t('totalAmount'))}: ${formatMoney(order.totalAmount)} ${currency}</div>
    <div>${escapeHtml(t('deposit'))}: ${formatMoney(order.deposit)} ${currency}</div>
    <div>${escapeHtml(t('remainingAmount'))}: ${formatMoney(order.remainingAmount)} ${currency}</div>
  </div>
  <div class="footer">${escapeHtml(t('receiptThanks'))}</div>
  <script>window.onload = function () { window.print(); }<\/script>
</body>
</html>`

    const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
    if (!w) {
      alert(t('printBlocked'))
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  window.PhotoTools = {
    auth: {
      checkAuth,
      requireAuth,
      login,
      logout,
      changePassword
    },
    storage: {
      loadProducts,
      createProduct: createProductApi,
      updateProduct: updateProductApi,
      deleteProduct: deleteProductApi,
      replaceProducts,
      loadOrders,
      createOrder: createOrderApi,
      updateOrder: updateOrderApi,
      patchOrder: patchOrderApi,
      deleteOrder: deleteOrderApi,
      addPayment: addPaymentApi,
      replaceOrders,
      loadSmsSettings,
      saveSmsSettings,
      sendSms: sendSmsApi,
      requestBackup
    },
    file: {
      downloadJson,
      downloadTextFile,
      readJsonFile
    },
    logic: {
      nowIso,
      uid,
      normalizeIranMobile,
      isValidIranMobile,
      parseMoney,
      parseQty,
      formatMoney,
      formatDateFa,
      formatDateOnlyFa,
      normalizeOrder,
      createProduct,
      updateProduct,
      createOrderDraft,
      setCustomer,
      recomputeOrder,
      addItemByProduct,
      updateItemQty,
      removeItem,
      validateFinalOrder,
      ORDER_STATUSES,
      statusLabel
    },
    ui: {
      $,
      setText,
      setHidden,
      escapeHtml,
      readFileAsDataUrl,
      initI18n,
      setupSidebar,
      bindLanguageControls,
      printReceipt
    },
    theme: {
      init: initTheme,
      toggle: toggleTheme,
      get: getTheme
    },
    formatMoneyInput,
    api
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initI18n()
      initTheme()
    })
  } else {
    initI18n()
    initTheme()
  }
})()
