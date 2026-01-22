const els = {
  loginForm: document.getElementById('loginForm'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginError: document.getElementById('loginError')
}

function showError(msg) {
  els.loginError.textContent = msg
  els.loginError.style.display = msg ? 'block' : 'none'
}

async function checkAuth() {
  const token = localStorage.getItem('authToken')
  if (!token) return false
  
  try {
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.valid) {
        window.location.href = './index.html'
        return true
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  localStorage.removeItem('authToken')
  localStorage.removeItem('username')
  return false
}

async function handleLogin(e) {
  e.preventDefault()
  showError('')

  const username = els.username.value.trim()
  const password = els.password.value.trim()

  if (!username || !password) {
    return showError('Please enter both username and password')
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })

    const data = await response.json()
    
    console.log('[LOGIN] Response:', { status: response.status, ok: response.ok, data })

    if (response.ok && data.success) {
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('username', data.username)
      window.location.href = './index.html'
    } else {
      showError(data.error || 'Invalid username or password')
      els.password.value = ''
    }
  } catch (e) {
    console.error('[LOGIN] Error:', e)
    showError('Connection error. Please try again.')
    els.password.value = ''
  }
}

function init() {
  // Initialize theme
  if (window.PhotoTools && window.PhotoTools.theme) {
    window.PhotoTools.theme.init()
  }
  
  checkAuth()
  els.loginForm.addEventListener('submit', handleLogin)
  
  els.username.focus()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}


