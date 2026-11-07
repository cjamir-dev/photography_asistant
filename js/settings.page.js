const { ui, theme, auth, storage } = window.PhotoTools
const { $, setText, setHidden, setupSidebar } = ui
const { loadSmsSettings, saveSmsSettings, sendSms } = storage
const t = window.i18n?.t || ((k) => k)

const els = {
  themeSelect: $('#themeSelect'),
  langSelect: $('#langSelect'),
  smsApiType: $('#smsApiType'),
  smsUsername: $('#smsUsername'),
  smsPassword: $('#smsPassword'),
  smsFromNumber: $('#smsFromNumber'),
  smsTemplateCreate: $('#smsTemplateCreate'),
  smsTemplateSettle: $('#smsTemplateSettle'),
  smsTemplateReady: $('#smsTemplateReady'),
  smsEnabled: $('#smsEnabled'),
  smsEnabledOnCreate: $('#smsEnabledOnCreate'),
  smsEnabledOnSettle: $('#smsEnabledOnSettle'),
  smsEnabledOnReady: $('#smsEnabledOnReady'),
  smsTestPhone: $('#smsTestPhone'),
  smsTestBtn: $('#smsTestBtn'),
  saveSettingsBtn: $('#saveSettingsBtn'),
  settingsError: $('#settingsError'),
  settingsOk: $('#settingsOk'),
  currentPassword: $('#currentPassword'),
  newPassword: $('#newPassword'),
  confirmPassword: $('#confirmPassword'),
  changePasswordBtn: $('#changePasswordBtn'),
  passwordError: $('#passwordError'),
  passwordOk: $('#passwordOk'),
  mustChangeBanner: $('#mustChangeBanner'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
}

let mustChangePassword = false

async function loadSettings() {
  const savedTheme = localStorage.getItem('theme') || 'light'
  els.themeSelect.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)
  if (els.langSelect && window.i18n) {
    els.langSelect.value = window.i18n.getLang()
  }

  const smsSettings = await loadSmsSettings()
  if (els.smsApiType) els.smsApiType.value = smsSettings.apiType || 'payamak-vip'
  if (els.smsUsername) els.smsUsername.value = smsSettings.username || ''
  if (els.smsPassword) {
    els.smsPassword.value = ''
    els.smsPassword.placeholder = smsSettings.passwordSet ? t('smsPasswordKeep') : ''
  }
  if (els.smsFromNumber) els.smsFromNumber.value = smsSettings.fromNumber || ''
  const templates = smsSettings.templates || {}
  if (els.smsTemplateCreate) {
    els.smsTemplateCreate.value = templates.create || smsSettings.messageTemplate || t('smsDefaultTemplateCreate')
  }
  if (els.smsTemplateSettle) {
    els.smsTemplateSettle.value = templates.settle || t('smsDefaultTemplateSettle')
  }
  if (els.smsTemplateReady) {
    els.smsTemplateReady.value = templates.ready || t('smsDefaultTemplateReady')
  }
  if (els.smsEnabled) els.smsEnabled.checked = smsSettings.enabled === true
  if (els.smsEnabledOnCreate) els.smsEnabledOnCreate.checked = smsSettings.enabledOnCreate !== false
  if (els.smsEnabledOnSettle) els.smsEnabledOnSettle.checked = smsSettings.enabledOnSettle === true
  if (els.smsEnabledOnReady) els.smsEnabledOnReady.checked = smsSettings.enabledOnReady === true
}

function showSettingsOk(msg) {
  setText(els.settingsOk, msg)
  setHidden(els.settingsOk, false)
  setHidden(els.settingsError, true)
  setTimeout(() => setHidden(els.settingsOk, true), 3000)
}

function showSettingsError(msg) {
  setText(els.settingsError, msg)
  setHidden(els.settingsError, false)
  setHidden(els.settingsOk, true)
}

function showPasswordOk(msg) {
  setText(els.passwordOk, msg)
  setHidden(els.passwordOk, false)
  setHidden(els.passwordError, true)
}

function showPasswordError(msg) {
  setText(els.passwordError, msg)
  setHidden(els.passwordError, false)
  setHidden(els.passwordOk, true)
}

async function saveSettings({ silent } = {}) {
  const newTheme = els.themeSelect.value
  if (newTheme !== 'light' && newTheme !== 'dark') {
    showSettingsError(t('errorInvalidTheme'))
    throw new Error(t('errorInvalidTheme'))
  }
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)

  const payload = {
    apiType: els.smsApiType?.value || 'payamak-vip',
    username: els.smsUsername?.value || '',
    fromNumber: els.smsFromNumber?.value || '',
    messageTemplate: els.smsTemplateCreate?.value || '',
    templates: {
      create: els.smsTemplateCreate?.value || '',
      settle: els.smsTemplateSettle?.value || '',
      ready: els.smsTemplateReady?.value || ''
    },
    enabled: els.smsEnabled?.checked || false,
    enabledOnCreate: els.smsEnabledOnCreate?.checked || false,
    enabledOnSettle: els.smsEnabledOnSettle?.checked || false,
    enabledOnReady: els.smsEnabledOnReady?.checked || false
  }
  if (els.smsPassword?.value) payload.password = els.smsPassword.value
  await saveSmsSettings(payload)
  if (els.smsPassword) {
    els.smsPassword.value = ''
    els.smsPassword.placeholder = t('smsPasswordKeep')
  }
  if (!silent) showSettingsOk(t('settingsSaved'))
}

async function onChangePassword() {
  showPasswordError('')
  showPasswordOk('')
  const currentPassword = els.currentPassword?.value || ''
  const newPassword = els.newPassword?.value || ''
  const confirmPassword = els.confirmPassword?.value || ''
  if (newPassword.length < 4) return showPasswordError(t('errorPasswordShort'))
  if (newPassword !== confirmPassword) return showPasswordError(t('errorPasswordMismatch'))
  try {
    await auth.changePassword(currentPassword, newPassword)
    els.currentPassword.value = ''
    els.newPassword.value = ''
    els.confirmPassword.value = ''
    mustChangePassword = false
    if (els.mustChangeBanner) setHidden(els.mustChangeBanner, true)
    showPasswordOk(t('passwordChanged'))
  } catch (e) {
    showPasswordError(e.message || t('errorCurrentPassword'))
  }
}

async function onSmsTest() {
  const phone = (els.smsTestPhone?.value || '').trim()
  if (!phone) return showSettingsError(t('errorPhoneRequired'))
  try {
    await saveSettings({ silent: true })
    await sendSms({
      toNumbers: phone,
      messageContent: t('smsTestMessage')
    })
    showSettingsOk(t('smsTestSent'))
  } catch (e) {
    showSettingsError(e.message || t('smsError'))
  }
}

async function init() {
  const me = await auth.requireAuth({ allowMustChange: true })
  if (!me) return
  mustChangePassword = Boolean(me.mustChangePassword)
  if (els.mustChangeBanner) setHidden(els.mustChangeBanner, !mustChangePassword)

  ui.initI18n()
  setupSidebar(els, t)
  ui.bindLanguageControls(document)
  await loadSettings()

  els.themeSelect.addEventListener('change', () => {
    document.documentElement.setAttribute('data-theme', els.themeSelect.value)
  })
  els.saveSettingsBtn.addEventListener('click', () => {
    saveSettings().catch((e) => showSettingsError(e.message))
  })
  if (els.changePasswordBtn) els.changePasswordBtn.addEventListener('click', onChangePassword)
  if (els.smsTestBtn) els.smsTestBtn.addEventListener('click', onSmsTest)
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (confirm(t('logoutConfirm'))) auth.logout()
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
