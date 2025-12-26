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

  function loadProducts() {
    const raw = localStorage.getItem(KEYS.products)
    const list = safeJsonParse(raw, [])
    return Array.isArray(list) ? list : []
  }

  function saveProducts(products) {
    localStorage.setItem(KEYS.products, JSON.stringify(products ?? []))
  }

  function loadOrders() {
    const raw = localStorage.getItem(KEYS.orders)
    const list = safeJsonParse(raw, [])
    return Array.isArray(list) ? list : []
  }

  function saveOrders(orders) {
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
    return safe.toLocaleString('fa-IR')
  }

  function createProduct({ name, price, description, imageDataUrl }) {
    const cleanName = String(name ?? '').trim()
    if (!cleanName) return { ok: false, error: 'نام محصول الزامی است' }

    const cleanPrice = parseMoney(price)
    if (cleanPrice <= 0) return { ok: false, error: 'قیمت باید بزرگ‌تر از صفر باشد' }

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

    if (!next.name) return { ok: false, error: 'نام محصول الزامی است' }
    if (!(next.price > 0)) return { ok: false, error: 'قیمت باید بزرگ‌تر از صفر باشد' }

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
      createdAt: nowIso()
    }
  }

  function setCustomer(draft, { lastName, phone }) {
    const ln = String(lastName ?? '').trim()
    const ph = normalizeIranMobile(phone)

    if (!ln) return { ok: false, error: 'نام خانوادگی الزامی است' }
    if (!isValidIranMobile(ph)) return { ok: false, error: 'شماره موبایل معتبر نیست (مثال: 09123456789)' }

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

    if (!ln) return { ok: false, error: 'نام خانوادگی الزامی است' }
    if (!isValidIranMobile(ph)) return { ok: false, error: 'شماره موبایل معتبر نیست' }
    if (!Array.isArray(draft.items) || draft.items.length === 0) return { ok: false, error: 'حداقل یک محصول به سبد اضافه کنید' }

    const final = recomputeOrder(draft)
    if (!(final.totalAmount > 0)) return { ok: false, error: 'مبلغ کل معتبر نیست' }

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
      reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود'))
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.readAsDataURL(file)
    })
  }

  window.PhotoTools = {
    storage: {
      loadProducts,
      saveProducts,
      loadOrders,
      saveOrders,
      clearAll
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
      validateFinalOrder
    },
    ui: {
      $,
      setText,
      setHidden,
      escapeHtml,
      readFileAsDataUrl
    }
  }
})()


