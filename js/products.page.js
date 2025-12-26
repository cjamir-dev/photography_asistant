const { storage, logic, ui, formatMoneyInput } = window.PhotoTools
const { loadProducts, saveProducts } = storage
const { createProduct, updateProduct, formatMoney } = logic
const { $, setText, setHidden, escapeHtml, readFileAsDataUrl } = ui
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
  countPill: $('#countPill')
}

let products = loadProducts()
let editingId = null
let pendingImageDataUrl = ''

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
  const file = els.image.files?.[0]
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

function removeProduct(id) {
  const p = products.find(x => x.id === id)
  if (!p) return
  const ok = confirm(`${t('deleteConfirmQuestion')} "${p.name}"?`)
  if (!ok) return

  products = products.filter(x => x.id !== id)
  saveProducts(products)
  if (editingId === id) resetForm()
  render()
  showOk(t('productDeleted'))
}

function upsertProduct() {
  showError('')
  showOk('')

  if (!editingId) {
    const res = createProduct({
      name: els.name.value,
      price: els.price.value,
      description: els.desc.value,
      imageDataUrl: pendingImageDataUrl
    })

    if (!res.ok) return showError(t(res.error) || res.error)

    products = [res.product, ...products]
    saveProducts(products)
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
  saveProducts(products)
  resetForm()
  render()
  showOk(t('productUpdated'))
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

function init() {
  ui.initI18n()
  
els.image.addEventListener('change', onPickImage)
els.saveBtn.addEventListener('click', upsertProduct)
els.resetBtn.addEventListener('click', resetForm)
els.productsList.addEventListener('click', onListClick)

els.price.addEventListener('input', (e) => {
  formatPriceInput(e.target)
})

els.price.addEventListener('blur', (e) => {
  e.target.value = formatMoneyInput(e.target.value)
})

  render()
  resetForm()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}


