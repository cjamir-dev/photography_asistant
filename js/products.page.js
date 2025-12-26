const { storage, logic, ui } = window.PhotoTools
const { loadProducts, saveProducts } = storage
const { createProduct, updateProduct, formatMoney } = logic
const { $, setText, setHidden, escapeHtml, readFileAsDataUrl } = ui

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
  emptyState: $('#emptyState'),
  editPill: $('#editPill')
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
  setText(els.editPill, 'حالت: افزودن')
  showError('')
  showOk('')
}

function render() {
  const count = products.length
  setText(els.countPill, `${count} محصول`)
  setHidden(els.emptyState, count !== 0)

  const rows = products
    .slice()
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .map(p => {
      const img = p.imageDataUrl
        ? `<img alt="${escapeHtml(p.name)}" src="${escapeHtml(p.imageDataUrl)}" />`
        : 'بدون عکس'

      const desc = p.description ? ` — ${escapeHtml(p.description)}` : ''

      return `
        <div class="item" data-id="${escapeHtml(p.id)}">
          <div class="thumb">${img}</div>
          <div class="meta">
            <div class="title">${escapeHtml(p.name)}</div>
            <div class="sub">${formatMoney(p.price)} تومان${desc}</div>
          </div>
          <div class="actions">
            <button class="btn" data-action="edit" type="button">ویرایش</button>
            <button class="btn danger" data-action="del" type="button">حذف</button>
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
    showError(e?.message || 'خواندن عکس ناموفق بود')
  }
}

function startEdit(id) {
  const p = products.find(x => x.id === id)
  if (!p) return

  editingId = id
  pendingImageDataUrl = ''
  els.name.value = p.name ?? ''
  els.price.value = String(p.price ?? '')
  els.desc.value = p.description ?? ''
  els.image.value = ''
  setText(els.editPill, 'حالت: ویرایش')
  showOk('محصول برای ویرایش وارد فرم شد')
}

function removeProduct(id) {
  const p = products.find(x => x.id === id)
  if (!p) return
  const ok = confirm(`حذف محصول "${p.name}"؟`)
  if (!ok) return

  products = products.filter(x => x.id !== id)
  saveProducts(products)
  if (editingId === id) resetForm()
  render()
  showOk('محصول حذف شد')
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

    if (!res.ok) return showError(res.error)

    products = [res.product, ...products]
    saveProducts(products)
    resetForm()
    render()
    return showOk('محصول ذخیره شد')
  }

  const current = products.find(x => x.id === editingId)
  if (!current) {
    resetForm()
    return showError('محصول برای ویرایش پیدا نشد')
  }

  const patch = {
    name: els.name.value,
    price: els.price.value,
    description: els.desc.value
  }

  if (pendingImageDataUrl) patch.imageDataUrl = pendingImageDataUrl

  const res = updateProduct(current, patch)
  if (!res.ok) return showError(res.error)

  products = products.map(x => (x.id === editingId ? res.product : x))
  saveProducts(products)
  resetForm()
  render()
  showOk('ویرایش ذخیره شد')
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

els.image.addEventListener('change', onPickImage)
els.saveBtn.addEventListener('click', upsertProduct)
els.resetBtn.addEventListener('click', resetForm)
els.productsList.addEventListener('click', onListClick)

render()
resetForm()


