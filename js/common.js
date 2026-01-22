(function () {
  const KEYS = {
    products: 'photo_tools_products_v1',
    orders: 'photo_tools_orders_v1'
  }

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

  function getAuthHeaders() {
    const token = localStorage.getItem('authToken')
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async function checkAuthToken() {
    const token = localStorage.getItem('authToken')
    if (!token) {
      console.log('[AUTH] No token found')
      return false
    }
    
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('[AUTH] Verify response:', { status: response.status, ok: response.ok })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[AUTH] Verify data:', data)
        return data.valid === true
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.log('[AUTH] Verify failed:', errorData)
      }
    } catch (e) {
      console.error('[AUTH] Verify error:', e)
    }
    
    return false
  }

  function logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('username')
    localStorage.removeItem('isAuthenticated') // برای backward compatibility
    window.location.href = './login.html'
  }

  function initSessionTimeout() {
    // Check session validity every 5 minutes
    setInterval(async () => {
      const token = localStorage.getItem('authToken')
      if (!token) return
      
      const isValid = await checkAuthToken()
      if (!isValid) {
        logout()
      }
    }, 5 * 60 * 1000) // 5 minutes
    
    // Also check on page visibility change
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('authToken')
        if (!token) return
        
        const isValid = await checkAuthToken()
        if (!isValid) {
          logout()
        }
      }
    })
  }

  async function loadProducts() {
    try {
      const response = await fetch('/api/products', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('authToken')
        localStorage.removeItem('username')
        window.location.href = './login.html'
        return []
      }
    } catch (e) {
      console.warn('Failed to load products from server, using localStorage fallback')
    }
    const raw = localStorage.getItem(KEYS.products)
    const list = safeJsonParse(raw, [])
    return Array.isArray(list) ? list : []
  }

  async function saveProducts(products) {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(products ?? [])
      })
      if (response.ok) {
        localStorage.setItem(KEYS.products, JSON.stringify(products ?? []))
        return
      } else if (response.status === 401) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('username')
        window.location.href = './login.html'
        return
      }
    } catch (e) {
      console.warn('Failed to save products to server, using localStorage fallback')
    }
    localStorage.setItem(KEYS.products, JSON.stringify(products ?? []))
  }

  async function loadOrders() {
    try {
      const response = await fetch('/api/orders', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } else if (response.status === 401) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('username')
        window.location.href = './login.html'
        return []
      }
    } catch (e) {
      console.warn('Failed to load orders from server, using localStorage fallback')
    }
    const raw = localStorage.getItem(KEYS.orders)
    const list = safeJsonParse(raw, [])
    return Array.isArray(list) ? list : []
  }

  async function saveOrders(orders) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orders ?? [])
      })
      if (response.ok) {
        localStorage.setItem(KEYS.orders, JSON.stringify(orders ?? []))
        return
      } else if (response.status === 401) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('username')
        window.location.href = './login.html'
        return
      }
    } catch (e) {
      console.warn('Failed to save orders to server, using localStorage fallback')
    }
    localStorage.setItem(KEYS.orders, JSON.stringify(orders ?? []))
  }

  function clearAll() {
    localStorage.removeItem(KEYS.products)
    localStorage.removeItem(KEYS.orders)
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
      description: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      history: []
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
    const description = String(draft?.description ?? '').trim()

    if (!ln) return { ok: false, error: 'errorLastNameRequired' }
    if (!isValidIranMobile(ph)) return { ok: false, error: 'errorPhoneInvalid' }
    if (!Array.isArray(draft.items) || draft.items.length === 0) return { ok: false, error: 'errorCartEmpty' }

    const final = recomputeOrder(draft)
    if (!(final.totalAmount > 0)) return { ok: false, error: 'errorPriceRequired' }
    if (final.deposit > final.totalAmount) return { ok: false, error: 'errorDepositTooHigh' }

    final.description = description

    return { ok: true, order: final }
  }

  function appendHistory(order, action, payload) {
    const next = clone(order)
    const history = Array.isArray(next.history) ? next.history.slice() : []
    history.push({
      ts: nowIso(),
      action,
      payload: payload ?? null
    })
    next.history = history
    return next
  }

  function updateOrder(existing, patch) {
    const base = clone(existing)
    const merged = {
      ...base,
      ...patch,
      customer: {
        ...(base.customer || {}),
        ...(patch?.customer || {})
      },
      items: Array.isArray(patch?.items) ? patch.items : base.items,
      description: patch?.description ?? base.description,
      deposit: patch?.deposit ?? base.deposit
    }

    const validated = validateFinalOrder(merged)
    if (!validated.ok) return validated

    const next = recomputeOrder(validated.order)
    next.createdAt = base.createdAt || next.createdAt || nowIso()
    next.updatedAt = nowIso()
    next.history = Array.isArray(base.history) ? base.history.slice() : []
    next.history.push({
      ts: next.updatedAt,
      action: 'update',
      payload: patch ?? null
    })

    return { ok: true, order: next }
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
      reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود'))
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.readAsDataURL(file)
    })
  }

  function initI18n() {
    if (!window.i18n) return
    
    // Apply language to HTML element
    const language = window.i18n.getLanguage ? window.i18n.getLanguage() : (localStorage.getItem('language') || 'en')
    const html = document.documentElement
    html.setAttribute('lang', language === 'fa' ? 'fa' : 'en')
    html.setAttribute('dir', language === 'fa' ? 'rtl' : 'ltr')
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')
      const text = window.i18n.t(key)
      if (text && text !== key) {
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
          const text = reader.result
          const data = JSON.parse(text)
          resolve(data)
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

  const RECEIPT_SETTINGS_KEY = 'receiptStyleSettings_v1'

  function getReceiptStyleSettings() {
    const raw = localStorage.getItem(RECEIPT_SETTINGS_KEY)
    const v = safeJsonParse(raw, {})
    return v && typeof v === 'object' ? v : {}
  }

  function setReceiptVar(name, value) {
    const root = document.documentElement
    if (!value) {
      root.style.removeProperty(name)
      return
    }
    root.style.setProperty(name, String(value))
  }

  function applyReceiptStylePreset(preset) {
    if (preset === 'small') {
      setReceiptVar('--receipt-padding', '14px')
      setReceiptVar('--receipt-title-size', '16px')
      setReceiptVar('--receipt-h2-size', '14px')
      setReceiptVar('--receipt-label-size', '12px')
      setReceiptVar('--receipt-value-size', '12px')
      setReceiptVar('--receipt-item-sub-size', '11px')
      return
    }

    if (preset === 'large') {
      setReceiptVar('--receipt-padding', '26px')
      setReceiptVar('--receipt-title-size', '20px')
      setReceiptVar('--receipt-h2-size', '18px')
      setReceiptVar('--receipt-label-size', '16px')
      setReceiptVar('--receipt-value-size', '16px')
      setReceiptVar('--receipt-item-sub-size', '14px')
      return
    }

    setReceiptVar('--receipt-padding', '')
    setReceiptVar('--receipt-title-size', '')
    setReceiptVar('--receipt-h2-size', '')
    setReceiptVar('--receipt-label-size', '')
    setReceiptVar('--receipt-value-size', '')
    setReceiptVar('--receipt-item-sub-size', '')
  }

  function applyReceiptStyleSettings(settings) {
    const s = settings || getReceiptStyleSettings()

    const size = s.size || 'a4'
    const body = document.body
    if (body) {
      body.classList.remove('size-a4', 'size-a5', 'size-80mm', 'size-58mm', 'size-business-card')
      body.classList.add(`size-${size}`)
    }

    applyReceiptStylePreset(s.fontSizePreset || 'medium')

    setReceiptVar('--receipt-title-weight', s.titleWeight)
    setReceiptVar('--receipt-price-weight', s.priceWeight)

    setReceiptVar('--receipt-bg', s.bgColor)
    setReceiptVar('--receipt-card-bg', s.cardBgColor)
    setReceiptVar('--receipt-card-border', s.borderColor)
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
    let newTheme = 'light'
    if (currentTheme === 'light') {
      newTheme = 'dark'
    } else if (currentTheme === 'dark') {
      newTheme = 'gray'
    } else {
      newTheme = 'light'
    }
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    return newTheme
  }

  function getTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'
    const currentTheme = document.documentElement.getAttribute('data-theme') || savedTheme
    // اطمینان از هماهنگی
    if (currentTheme !== savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme)
      return savedTheme
    }
    return currentTheme
  }

  window.PhotoTools = {
    auth: {
      getAuthHeaders,
      checkAuthToken,
      logout,
      initSessionTimeout
    },
    storage: {
      loadProducts,
      saveProducts,
      loadOrders,
      saveOrders,
      clearAll
    },
    file: {
      downloadJson,
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
      createProduct,
      updateProduct,
      createOrderDraft,
      setCustomer,
      recomputeOrder,
      addItemByProduct,
      updateItemQty,
      removeItem,
      validateFinalOrder,
      appendHistory,
      updateOrder,
      clone
    },
    ui: {
      $,
      setText,
      setHidden,
      escapeHtml,
      readFileAsDataUrl,
      initI18n
    },
    theme: {
      init: initTheme,
      toggle: toggleTheme,
      get: getTheme
    },
    receipt: {
      key: RECEIPT_SETTINGS_KEY,
      getSettings: getReceiptStyleSettings,
      applySettings: applyReceiptStyleSettings
    },
    formatMoneyInput
  }
  
  function addPageTransition() {
    // اضافه کردن transition برای لینک‌های داخلی
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a')
      if (!link) return
      
      const href = link.getAttribute('href')
      if (!href) return
      
      // فقط برای لینک‌های داخلی (نه لینک‌های خارجی یا anchor)
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      
      // اگر لینک به همان صفحه فعلی است، transition نده
      if (href === window.location.pathname || href === './' + window.location.pathname.split('/').pop()) {
        return
      }
      
      // اضافه کردن fade-out به body
      document.body.style.transition = 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      document.body.style.opacity = '0.8'
      document.body.style.transform = 'scale(0.98)'
      
      // بعد از transition، صفحه تغییر می‌کند
      setTimeout(() => {
        document.body.style.opacity = '1'
        document.body.style.transform = 'scale(1)'
      }, 250)
    })
  }

  function setupAnimationIndices() {
    // تنظیم index برای کارت‌ها
    const cards = document.querySelectorAll('.card')
    cards.forEach((card, index) => {
      card.style.setProperty('--card-index', index)
    })
    
    // تنظیم index برای آیتم‌ها
    const items = document.querySelectorAll('.item')
    items.forEach((item, index) => {
      item.style.setProperty('--item-index', index)
    })
    
    // تنظیم index برای stat-card ها
    const statCards = document.querySelectorAll('.stat-card')
    statCards.forEach((card, index) => {
      card.style.setProperty('--stat-index', index)
    })
    
    // تنظیم index برای sidebar-item ها
    const sidebarItems = document.querySelectorAll('.sidebar-item')
    sidebarItems.forEach((item, index) => {
      item.style.setProperty('--sidebar-item-index', index)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initI18n()
      initTheme()
      addPageTransition()
      setupAnimationIndices()
    })
  } else {
    initI18n()
    initTheme()
    addPageTransition()
    setupAnimationIndices()
  }
})()


