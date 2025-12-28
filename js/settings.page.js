const { ui, theme } = window.PhotoTools
const { $, setText, setHidden } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  themeSelect: $('#themeSelect'),
  languageSelect: $('#languageSelect'),
  currencySelect: $('#currencySelect'),
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

