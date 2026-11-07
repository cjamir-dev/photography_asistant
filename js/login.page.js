const els = {
  loginForm: document.getElementById('loginForm'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginError: document.getElementById('loginError')
}

function t(key) {
  return window.i18n?.t?.(key) || key
}

function showError(msg) {
  els.loginError.textContent = msg
  els.loginError.style.display = msg ? 'block' : 'none'
}

async function checkAuth() {
  if (!window.PhotoTools?.auth) return
  const me = await window.PhotoTools.auth.checkAuth()
  if (me.authenticated) {
    window.location.href = me.mustChangePassword ? './settings.html' : './dashboard.html'
  }
}

async function handleLogin(e) {
  e.preventDefault()
  showError('')

  const username = els.username.value.trim()
  const password = els.password.value

  if (!username || !password) {
    return showError(t('errorLoginRequired'))
  }

  try {
    const result = await window.PhotoTools.auth.login(username, password)
    if (result.mustChangePassword) {
      window.location.href = './settings.html'
    } else {
      window.location.href = './dashboard.html'
    }
  } catch (err) {
    const code = err.code || ''
    if (code === 'invalid_credentials' || err.status === 401) {
      showError(t('errorLoginFailed'))
    } else {
      showError(err.message || t('errorLoginFailed'))
    }
    els.password.value = ''
  }
}

async function init() {
  if (window.PhotoTools?.theme) {
    window.PhotoTools.theme.init()
  }
  if (window.PhotoTools?.ui) {
    window.PhotoTools.ui.initI18n()
    window.PhotoTools.ui.bindLanguageControls(document)
  }

  await checkAuth()
  els.loginForm.addEventListener('submit', handleLogin)
  els.username.focus()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
