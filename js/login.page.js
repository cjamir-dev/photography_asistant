const els = {
  loginForm: document.getElementById('loginForm'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginError: document.getElementById('loginError')
}

const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin'

function showError(msg) {
  els.loginError.textContent = msg
  els.loginError.style.display = msg ? 'block' : 'none'
}

function checkAuth() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  if (isAuthenticated) {
    window.location.href = './index.html'
  }
}

function handleLogin(e) {
  e.preventDefault()
  showError('')

  const username = els.username.value.trim()
  const password = els.password.value.trim()

  if (!username || !password) {
    return showError('Please enter both username and password')
  }

  if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('username', username)
    window.location.href = './index.html'
  } else {
    showError('Invalid username or password')
    els.password.value = ''
  }
}

function init() {
  checkAuth()
  els.loginForm.addEventListener('submit', handleLogin)
  
  els.username.focus()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}


