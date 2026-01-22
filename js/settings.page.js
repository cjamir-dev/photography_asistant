const { ui, theme, logic } = window.PhotoTools
const { $, setText, setHidden, escapeHtml } = ui
const { formatMoney } = logic
const t = window.i18n?.t || ((k) => k)

const els = {
  themeSelect: $('#themeSelect'),
  languageSelect: $('#languageSelect'),
  currencySelect: $('#currencySelect'),
  receiptSize: $('#receiptSize'),
  receiptFontSizePreset: $('#receiptFontSizePreset'),
  receiptTitleWeight: $('#receiptTitleWeight'),
  receiptPriceWeight: $('#receiptPriceWeight'),
  receiptBgColor: $('#receiptBgColor'),
  receiptCardBgColor: $('#receiptCardBgColor'),
  receiptBorderColor: $('#receiptBorderColor'),
  smsApiType: $('#smsApiType'),
  smsUsername: $('#smsUsername'),
  smsPassword: $('#smsPassword'),
  smsFromNumber: $('#smsFromNumber'),
  smsMessageTemplate: $('#smsMessageTemplate'),
  smsEnabled: $('#smsEnabled'),
  saveSettingsBtn: $('#saveSettingsBtn'),
  settingsError: $('#settingsError'),
  settingsOk: $('#settingsOk'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
}

function rgbToHex(input) {
  const s = String(input || '').trim()
  if (!s) return ''
  if (s.startsWith('#')) return s
  const m = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!m) return ''
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  const toHex = (n) => {
    const x = Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
    return x
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function getReceiptSettingsFromForm() {
  return {
    size: els.receiptSize?.value || 'a4',
    fontSizePreset: els.receiptFontSizePreset?.value || 'medium',
    titleWeight: els.receiptTitleWeight?.value || '700',
    priceWeight: els.receiptPriceWeight?.value || '700',
    bgColor: els.receiptBgColor?.value || '',
    cardBgColor: els.receiptCardBgColor?.value || '',
    borderColor: els.receiptBorderColor?.value || ''
  }
}

function renderPreviewItems() {
  const previewItemsList = $('#previewItemsList')
  if (!previewItemsList) return
  
  const currency = t('currency')
  const previewItems = [
    { name: 'عکس 10×15', quantity: 2, unitPrice: 50000, totalPrice: 100000 },
    { name: 'قاب 20×30', quantity: 1, unitPrice: 250000, totalPrice: 250000 }
  ]
  
  const rows = previewItems.map(it => {
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
  
  previewItemsList.innerHTML = rows
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

function updateReceiptPreview() {
  const settings = getReceiptSettingsFromForm()
  if (window.PhotoTools?.receipt?.applySettings) {
    window.PhotoTools.receipt.applySettings(settings)
  }
  
  const previewCard = $('#receiptPreviewCard')
  if (previewCard) {
    previewCard.classList.remove('size-a4', 'size-a5', 'size-80mm', 'size-58mm', 'size-business-card')
    previewCard.classList.add(`size-${settings.size || 'a4'}`)
  }
  
  const previewDate = $('#previewDate')
  if (previewDate) {
    previewDate.textContent = formatDate(new Date())
  }
  
  renderPreviewItems()
}

function applyReceiptSettingsPreview() {
  updateReceiptPreview()
}

function loadReceiptSettings() {
  const stored = window.PhotoTools?.receipt?.getSettings ? window.PhotoTools.receipt.getSettings() : {}
  const size = stored.size || 'a4'
  if (els.receiptSize) els.receiptSize.value = size
  
  const preset = stored.fontSizePreset || 'medium'
  if (els.receiptFontSizePreset) els.receiptFontSizePreset.value = preset

  if (els.receiptTitleWeight) els.receiptTitleWeight.value = String(stored.titleWeight || '700')
  if (els.receiptPriceWeight) els.receiptPriceWeight.value = String(stored.priceWeight || '700')

  const css = getComputedStyle(document.documentElement)
  const bg = stored.bgColor || rgbToHex(css.getPropertyValue('--receipt-bg')) || '#f5f5f7'
  const cardBg = stored.cardBgColor || rgbToHex(css.getPropertyValue('--receipt-card-bg')) || '#ffffff'
  const border = stored.borderColor || rgbToHex(css.getPropertyValue('--receipt-card-border')) || '#e8e8ed'

  if (els.receiptBgColor) els.receiptBgColor.value = bg
  if (els.receiptCardBgColor) els.receiptCardBgColor.value = cardBg
  if (els.receiptBorderColor) els.receiptBorderColor.value = border

  updateReceiptPreview()
}

function loadSettings() {
  const savedTheme = localStorage.getItem('theme') || 'light'
  const currentTheme = document.documentElement.getAttribute('data-theme') || savedTheme
  els.themeSelect.value = currentTheme
  // اطمینان از اینکه theme اعمال شده است
  if (currentTheme !== document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', currentTheme)
  }
  
  // بارگذاری تنظیمات زبان
  const savedLanguage = localStorage.getItem('language') || 'en'
  if (els.languageSelect) els.languageSelect.value = savedLanguage
  
  // بارگذاری تنظیمات واحد ارز
  const savedCurrency = localStorage.getItem('currency') || 'toman'
  if (els.currencySelect) els.currencySelect.value = savedCurrency
  
  // بارگذاری تنظیمات SMS
  const smsSettings = JSON.parse(localStorage.getItem('smsSettings') || '{}')
  if (els.smsApiType) els.smsApiType.value = smsSettings.apiType || 'payamak-vip'
  if (els.smsUsername) els.smsUsername.value = smsSettings.username || ''
  if (els.smsPassword) els.smsPassword.value = smsSettings.password || ''
  if (els.smsFromNumber) els.smsFromNumber.value = smsSettings.fromNumber || ''
  if (els.smsMessageTemplate) {
    els.smsMessageTemplate.value = smsSettings.messageTemplate || '{lastName} عزیز، سفارش شما به مبلغ {totalAmount} تومان ثبت شد. بیعانه: {deposit} تومان، مانده: {remainingAmount} تومان'
  }
  if (els.smsEnabled) els.smsEnabled.checked = smsSettings.enabled === true

  loadReceiptSettings()
}

function saveTheme(themeValue) {
  // اعمال فوری theme
  document.documentElement.setAttribute('data-theme', themeValue)
  localStorage.setItem('theme', themeValue)
  
  // اطمینان از اعمال theme
  if (document.documentElement.getAttribute('data-theme') !== themeValue) {
    document.documentElement.setAttribute('data-theme', themeValue)
  }
}

function onThemeChange() {
  // اعمال فوری theme برای پیش‌نمایش (اما ذخیره نمی‌شود)
  const newTheme = els.themeSelect.value
  if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'gray') {
    document.documentElement.setAttribute('data-theme', newTheme)
    void document.body.offsetHeight // Force reflow
  }
}

function onLanguageChange() {
  // اعمال فوری زبان برای پیش‌نمایش (اما ذخیره نمی‌شود)
  const newLanguage = els.languageSelect.value
  if (newLanguage === 'en' || newLanguage === 'fa') {
    localStorage.setItem('language', newLanguage)
    if (window.i18n && window.i18n.setLanguage) {
      window.i18n.setLanguage(newLanguage)
    }
    // Re-initialize i18n to update all texts
    if (window.PhotoTools && window.PhotoTools.ui && window.PhotoTools.ui.initI18n) {
      window.PhotoTools.ui.initI18n()
    }
  }
}

function onCurrencyChange() {
  // اعمال فوری واحد ارز برای پیش‌نمایش (اما ذخیره نمی‌شود)
  const newCurrency = els.currencySelect.value
  if (newCurrency === 'toman' || newCurrency === 'dollar' || newCurrency === 'euro') {
    localStorage.setItem('currency', newCurrency)
    if (window.i18n && window.i18n.setCurrency) {
      window.i18n.setCurrency(newCurrency)
    }
    // Re-initialize i18n to update currency text
    if (window.PhotoTools && window.PhotoTools.ui && window.PhotoTools.ui.initI18n) {
      window.PhotoTools.ui.initI18n()
    }
  }
}

function saveSettings() {
  const newTheme = els.themeSelect.value
  
  if (!newTheme || (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'gray')) {
    showSettingsError(t('errorInvalidTheme') || 'Invalid theme selected')
    return
  }
  
  // اعمال theme جدید
  const htmlElement = document.documentElement
  htmlElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
  
  // اطمینان از اعمال theme - چند بار تلاش می‌کنیم
  let applied = false
  for (let i = 0; i < 5; i++) {
    if (htmlElement.getAttribute('data-theme') === newTheme) {
      applied = true
      break
    }
    htmlElement.setAttribute('data-theme', newTheme)
  }
  
  // اگر هنوز اعمال نشده، یک بار دیگر تلاش می‌کنیم
  if (!applied) {
    htmlElement.removeAttribute('data-theme')
    setTimeout(() => {
      htmlElement.setAttribute('data-theme', newTheme)
    }, 10)
  }
  
  // ذخیره تنظیمات زبان
  const newLanguage = els.languageSelect?.value || 'en'
  if (newLanguage === 'en' || newLanguage === 'fa') {
    localStorage.setItem('language', newLanguage)
    if (window.i18n && window.i18n.setLanguage) {
      window.i18n.setLanguage(newLanguage)
    }
  }
  
  // ذخیره تنظیمات واحد ارز
  const newCurrency = els.currencySelect?.value || 'toman'
  if (newCurrency === 'toman' || newCurrency === 'dollar' || newCurrency === 'euro') {
    localStorage.setItem('currency', newCurrency)
    if (window.i18n && window.i18n.setCurrency) {
      window.i18n.setCurrency(newCurrency)
    }
  }
  
  // ذخیره تنظیمات SMS
  const smsSettings = {
    apiType: els.smsApiType?.value || 'payamak-vip',
    username: els.smsUsername?.value || '',
    password: els.smsPassword?.value || '',
    fromNumber: els.smsFromNumber?.value || '',
    messageTemplate: els.smsMessageTemplate?.value || '',
    enabled: els.smsEnabled?.checked || false
  }
  localStorage.setItem('smsSettings', JSON.stringify(smsSettings))

  const receiptSettingsKey = window.PhotoTools?.receipt?.key || 'receiptStyleSettings_v1'
  const receiptSettings = getReceiptSettingsFromForm()
  localStorage.setItem(receiptSettingsKey, JSON.stringify(receiptSettings))
  if (window.PhotoTools?.receipt?.applySettings) {
    window.PhotoTools.receipt.applySettings(receiptSettings)
  }
  
  // Force reflow برای اطمینان از اعمال CSS
  void htmlElement.offsetHeight
  void document.body.offsetHeight
  
  // Re-initialize i18n to update all texts
  if (window.PhotoTools && window.PhotoTools.ui && window.PhotoTools.ui.initI18n) {
    window.PhotoTools.ui.initI18n()
  }
  
  showSettingsOk(t('settingsSaved') || 'Settings saved successfully')
}

function showSettingsOk(msg) {
  setText(els.settingsOk, msg)
  setHidden(els.settingsOk, false)
  setHidden(els.settingsError, true)
  
  setTimeout(() => {
    setHidden(els.settingsOk, true)
  }, 3000)
}

function showSettingsError(msg) {
  setText(els.settingsError, msg)
  setHidden(els.settingsError, false)
  setHidden(els.settingsOk, true)
}

function showMessage(msg, type = 'ok') {
  const msgEl = document.createElement('div')
  msgEl.className = type === 'ok' ? 'ok' : 'error'
  msgEl.textContent = msg
  msgEl.style.position = 'fixed'
  msgEl.style.top = '20px'
  msgEl.style.right = '20px'
  msgEl.style.zIndex = '10000'
  msgEl.style.minWidth = '200px'
  msgEl.style.maxWidth = '400px'
  
  document.body.appendChild(msgEl)
  
  setTimeout(() => {
    msgEl.style.opacity = '0'
    msgEl.style.transition = 'opacity 0.3s ease'
    setTimeout(() => {
      msgEl.remove()
    }, 300)
  }, 2000)
}

async function init() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  if (!isAuthenticated) {
    window.location.href = './login.html'
    return
  }
  
  ui.initI18n()
  
  loadSettings()
  
  els.themeSelect.addEventListener('change', onThemeChange)
  if (els.languageSelect) {
    els.languageSelect.addEventListener('change', onLanguageChange)
  }
  if (els.currencySelect) {
    els.currencySelect.addEventListener('change', onCurrencyChange)
  }

  if (els.receiptSize) {
    els.receiptSize.addEventListener('change', updateReceiptPreview)
  }
  if (els.receiptFontSizePreset) {
    els.receiptFontSizePreset.addEventListener('change', updateReceiptPreview)
  }
  if (els.receiptTitleWeight) {
    els.receiptTitleWeight.addEventListener('change', updateReceiptPreview)
  }
  if (els.receiptPriceWeight) {
    els.receiptPriceWeight.addEventListener('change', updateReceiptPreview)
  }
  if (els.receiptBgColor) {
    els.receiptBgColor.addEventListener('input', updateReceiptPreview)
  }
  if (els.receiptCardBgColor) {
    els.receiptCardBgColor.addEventListener('input', updateReceiptPreview)
  }
  if (els.receiptBorderColor) {
    els.receiptBorderColor.addEventListener('input', updateReceiptPreview)
  }
  
  updateReceiptPreview()

  els.saveSettingsBtn.addEventListener('click', saveSettings)
  
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      const confirmMsg = t('logoutConfirm') || 'Are you sure you want to logout?'
      if (confirm(confirmMsg)) {
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
    
    const sidebarItems = els.sidebar.querySelectorAll('.sidebar-item')
    sidebarItems.forEach(item => {
      const textSpan = item.querySelector('.sidebar-text')
      if (textSpan && textSpan.hasAttribute('data-i18n')) {
        const i18nKey = textSpan.getAttribute('data-i18n')
        item.setAttribute('data-tooltip', t(i18nKey))
      }
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

