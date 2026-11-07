const { storage, logic, ui, formatMoneyInput, auth } = window.PhotoTools
const { loadProducts, createProduct: createProductApi, updateProduct: updateProductApi, deleteProduct: deleteProductApi } = storage
const { createProduct, updateProduct, formatMoney } = logic
const { $, setText, setHidden, escapeHtml, readFileAsDataUrl, setupSidebar } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  name: $('#pName'),
  price: $('#pPrice'),
  desc: $('#pDesc'),
  image: $('#pImage'),
  saveBtn: $('#saveBtn'),
  resetBtn: $('#resetBtn'),
  productsList: $('#productsList'),
  formError: $('#formError'),
  formOk: $('#formOk'),
  countPill: $('#countPill'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
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
  setText(els.countPill, `${products.length} ${t('productCount')}`)
  const currency = t('currency')
  const rows = products
    .slice()
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .map(p => {
      const img = p.imageDataUrl
        ? `<img alt="${escapeHtml(p.name)}" src="${escapeHtml(p.imageDataUrl)}" />`
        : t('noImage')
      const desc = p.description ? ` — ${escapeHtml(p.description)}` : ''
      return `
        <div class="item" data-id="${escapeHtml(p.id)}">
          <div class="thumb">${img}</div>
          <div class="meta">
            <div class="title">${escapeHtml(p.name)}</div>
            <div class="sub"><span class="money-ltr">${formatMoney(p.price)}</span> ${currency}${desc}</div>
          </div>
          <div class="actions">
            <button class="btn" data-action="edit" type="button">${t('editBtn')}</button>
            <button class="btn danger" data-action="del" type="button">${t('deleteBtn')}</button>
          </div>
        </div>
      `
    }).join('')
  els.productsList.innerHTML = rows || `<p class="help">${t('emptyProducts')}</p>`
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
  showOk(t('productLoaded'))
}

async function removeProduct(id) {
  const p = products.find(x => x.id === id)
  if (!p) return
  if (!confirm(`${t('deleteConfirmQuestion')}: ${p.name}`)) return
  try {
    await deleteProductApi(id)
    products = products.filter(x => x.id !== id)
    if (editingId === id) resetForm()
    render()
    showOk(t('productDeleted'))
  } catch (e) {
    showError(e.message)
  }
}

async function upsertProduct() {
  showError('')
  showOk('')
  try {
    if (!editingId) {
      const res = createProduct({
        name: els.name.value,
        price: els.price.value,
        description: els.desc.value,
        imageDataUrl: pendingImageDataUrl
      })
      if (!res.ok) return showError(t(res.error) || res.error)
      const saved = await createProductApi(res.product)
      products = [saved, ...products]
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
    const saved = await updateProductApi(editingId, res.product)
    products = products.map(x => (x.id === editingId ? saved : x))
    resetForm()
    render()
    showOk(t('productUpdated'))
  } catch (e) {
    showError(e.message || t('errorServer'))
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
    input.setSelectionRange(Math.max(0, Math.min(cursorPos + diff, formatted.length)), Math.max(0, Math.min(cursorPos + diff, formatted.length)))
  }
}

async function init() {
  const me = await auth.requireAuth()
  if (!me) return
  ui.initI18n()
  setupSidebar(els, t)

  els.image.addEventListener('change', onPickImage)
  els.saveBtn.addEventListener('click', (e) => {
    e.preventDefault()
    upsertProduct()
  })
  els.resetBtn.addEventListener('click', resetForm)
  els.productsList.addEventListener('click', onListClick)
  els.price.addEventListener('input', (e) => formatPriceInput(e.target))
  els.price.addEventListener('blur', (e) => {
    e.target.value = formatMoneyInput(e.target.value)
  })
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (confirm(t('logoutConfirm'))) auth.logout()
    })
  }

  await initData()
  resetForm()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
