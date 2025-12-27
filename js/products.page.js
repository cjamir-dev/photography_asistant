let storage, logic, ui, formatMoneyInput, file
let loadProducts, saveProducts
let downloadJson, readJsonFile
let createProduct, updateProduct, formatMoney
let $, setText, setHidden, escapeHtml, readFileAsDataUrl
let t

const els = {
  name: null,
  price: null,
  desc: null,
  image: null,
  saveBtn: null,
  resetBtn: null,
  productsList: null,
  formError: null,
  formOk: null,
  countPill: null,
  sidebar: null,
  sidebarToggle: null,
  logoutBtn: null
}

function initElements() {
  if (!window.PhotoTools) {
    console.error('PhotoTools not found!')
    return false
  }
  
  const pt = window.PhotoTools
  storage = pt.storage
  logic = pt.logic
  ui = pt.ui
  formatMoneyInput = pt.formatMoneyInput
  file = pt.file
  
  loadProducts = storage.loadProducts
  saveProducts = storage.saveProducts
  downloadJson = file.downloadJson
  readJsonFile = file.readJsonFile
  createProduct = logic.createProduct
  updateProduct = logic.updateProduct
  formatMoney = logic.formatMoney
  $ = ui.$
  setText = ui.setText
  setHidden = ui.setHidden
  escapeHtml = ui.escapeHtml
  readFileAsDataUrl = ui.readFileAsDataUrl
  t = window.i18n?.t || ((k) => k)
  
  els.name = $('#pName')
  els.price = $('#pPrice')
  els.desc = $('#pDesc')
  els.image = $('#pImage')
  els.saveBtn = $('#saveBtn')
  els.resetBtn = $('#resetBtn')
  els.productsList = $('#productsList')
  els.formError = $('#formError')
  els.formOk = $('#formOk')
  els.countPill = $('#countPill')
  els.sidebar = $('#sidebar')
  els.sidebarToggle = $('#sidebarToggle')
  els.logoutBtn = $('#logoutBtn')
  
  return true
}

let products = []
let editingId = null
let pendingImageDataUrl = ''

async function initData() {
  products = await loadProducts()
  render()
}

function showError(msg) {
  setText(els.formError, msg)
  setHidden(els.formError, !msg)
  setHidden(els.formOk, true)
}

function showOk(msg) {
  setText(els.formOk, msg)
  setHidden(els.formOk, !msg)
  setHidden(els.formError, true)
}

function resetForm() {
  editingId = null
  pendingImageDataUrl = ''
  els.name.value = ''
  els.price.value = ''
  els.desc.value = ''
  els.image.value = ''
  showError('')
  showOk('')
}

function render() {
  const count = products.length
  setText(els.countPill, `${count} ${t('productCount')}`)

  const rows = products
    .slice()
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .map(p => {
      const img = p.imageDataUrl
        ? `<img alt="${escapeHtml(p.name)}" src="${escapeHtml(p.imageDataUrl)}" />`
        : t('noImage')

      const desc = p.description ? ` — ${escapeHtml(p.description)}` : ''
      const currency = t('currency')

      return `
        <div class="item" data-id="${escapeHtml(p.id)}">
          <div class="thumb">${img}</div>
          <div class="meta">
            <div class="title">${escapeHtml(p.name)}</div>
            <div class="sub">${formatMoney(p.price)} ${currency}${desc}</div>
          </div>
          <div class="actions">
            <button class="btn" data-action="edit" type="button">${t('editBtn')}</button>
            <button class="btn danger" data-action="del" type="button">${t('deleteBtn')}</button>
          </div>
        </div>
      `
    })
    .join('')

  els.productsList.innerHTML = rows
}

async function onPickImage() {
  showError('')
  const file = els.image?.files?.[0]
  if (!file) {
    pendingImageDataUrl = ''
    return
  }
  try {
    pendingImageDataUrl = await readFileAsDataUrl(file)
  } catch (e) {
    pendingImageDataUrl = ''
    showError(e?.message || t('errorImageRead'))
  }
}

function startEdit(id) {
  const p = products.find(x => x.id === id)
  if (!p) return

  editingId = id
  pendingImageDataUrl = ''
  els.name.value = p.name ?? ''
  els.price.value = formatMoneyInput(String(p.price ?? ''))
  els.desc.value = p.description ?? ''
  els.image.value = ''
  showOk('')
}

async function removeProduct(id) {
  const p = products.find(x => x.id === id)
  if (!p) return
  const ok = confirm(`${t('deleteConfirmQuestion')} "${p.name}"?`)
  if (!ok) return

  products = products.filter(x => x.id !== id)
  await saveProducts(products)
  if (editingId === id) resetForm()
  render()
  showOk(t('productDeleted'))
}

async function upsertProduct() {
  console.log('upsertProduct called')
  try {
    showError('')
    showOk('')

    if (!els.name || !els.price || !els.desc) {
      console.error('Form elements not found', { name: els.name, price: els.price, desc: els.desc })
      return showError('Form elements not found')
    }
    
    console.log('Form values:', {
      name: els.name.value,
      price: els.price.value,
      desc: els.desc.value,
      editingId: editingId
    })

    if (!editingId) {
      const res = createProduct({
        name: els.name.value,
        price: els.price.value,
        description: els.desc.value,
        imageDataUrl: pendingImageDataUrl
      })

      if (!res.ok) return showError(t(res.error) || res.error)

      products = [res.product, ...products]
      await saveProducts(products)
      resetForm()
      render()
      return showOk(t('productSaved'))
    }

    const current = products.find(x => x.id === editingId)
    if (!current) {
      resetForm()
      return showError(t('errorProductEditNotFound'))
    }

    const patch = {
      name: els.name.value,
      price: els.price.value,
      description: els.desc.value
    }

    if (pendingImageDataUrl) patch.imageDataUrl = pendingImageDataUrl

    const res = updateProduct(current, patch)
    if (!res.ok) return showError(t(res.error) || res.error)

    products = products.map(x => (x.id === editingId ? res.product : x))
    await saveProducts(products)
    resetForm()
    render()
    showOk(t('productUpdated'))
  } catch (e) {
    console.error('Error in upsertProduct:', e)
    showError('Error: ' + (e.message || 'Unknown error'))
  }
}

function onListClick(e) {
  const btn = e.target?.closest('button[data-action]')
  if (!btn) return
  const row = e.target?.closest('.item')
  const id = row?.getAttribute('data-id')
  if (!id) return

  const action = btn.getAttribute('data-action')
  if (action === 'edit') startEdit(id)
  if (action === 'del') removeProduct(id)
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

async function init() {
  try {
    console.log('Initializing products page...')
    console.log('PhotoTools available:', !!window.PhotoTools)
    console.log('i18n available:', !!window.i18n)
    
    if (!initElements()) {
      console.error('Failed to initialize elements')
      alert('Error: PhotoTools not loaded. Please refresh the page.')
      return
    }
    
    ui.initI18n()
    
    console.log('Elements initialized:', {
      saveBtn: els.saveBtn,
      name: els.name,
      price: els.price,
      desc: els.desc
    })
    
    if (!els.saveBtn) {
      console.error('saveBtn not found after init')
      return
    }
    
    if (!els.name || !els.price || !els.desc) {
      console.error('Form elements not found', { name: els.name, price: els.price, desc: els.desc })
      return
    }
    
    els.image.addEventListener('change', onPickImage)
    els.saveBtn.addEventListener('click', (e) => {
      console.log('Save button clicked', e)
      e.preventDefault()
      e.stopPropagation()
      upsertProduct()
    })
    els.resetBtn.addEventListener('click', resetForm)
    els.productsList.addEventListener('click', onListClick)
    
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('username')
          window.location.href = './login.html'
        }
      })
    }
    
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

    els.price.addEventListener('input', (e) => {
      formatPriceInput(e.target)
    })

    els.price.addEventListener('blur', (e) => {
      e.target.value = formatMoneyInput(e.target.value)
    })

    await initData()
    resetForm()
  } catch (e) {
    console.error('Error in init:', e)
    alert('Error initializing page: ' + (e.message || 'Unknown error'))
  }
}

function startInit() {
  console.log('startInit called, readyState:', document.readyState)
  console.log('PhotoTools available:', !!window.PhotoTools)
  console.log('i18n available:', !!window.i18n)
  
  if (document.readyState === 'loading') {
    console.log('Waiting for DOMContentLoaded...')
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired')
      init()
    })
  } else {
    console.log('DOM already ready, calling init immediately')
    init()
  }
}

startInit()


