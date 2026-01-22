const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')
const crypto = require('crypto')

// Check if axios is installed
let axios
try {
  axios = require('axios')
  console.log('[INFO] axios loaded successfully')
} catch (error) {
  console.error('[ERROR] axios is not installed!')
  console.error('[ERROR] Please run: npm install')
  process.exit(1)
}

const PORT = 3000
const DATA_DIR = path.join(__dirname, 'data')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

function ensureFile(filePath, defaultContent = '[]') {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, 'utf8')
  }
}

ensureFile(PRODUCTS_FILE)
ensureFile(ORDERS_FILE)
ensureFile(AUTH_FILE, JSON.stringify({ username: 'admin', passwordHash: hashPassword('admin') }, null, 2))
ensureFile(SESSIONS_FILE)

// Rate limiting برای login
const loginAttempts = new Map()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000 // 15 دقیقه

// Session management
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 ساعت

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function readAuth() {
  try {
    const content = fs.readFileSync(AUTH_FILE, 'utf8')
    const auth = JSON.parse(content)
    // Validate auth structure
    if (!auth.username || !auth.passwordHash) {
      console.log('[AUTH] Invalid auth file structure, recreating...')
      const defaultAuth = { username: 'admin', passwordHash: hashPassword('admin') }
      writeAuth(defaultAuth)
      return defaultAuth
    }
    return auth
  } catch (e) {
    console.log('[AUTH] Error reading auth file:', e.message)
    const defaultAuth = { username: 'admin', passwordHash: hashPassword('admin') }
    writeAuth(defaultAuth)
    return defaultAuth
  }
}

function writeAuth(auth) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), 'utf8')
}

function readSessions() {
  try {
    const content = fs.readFileSync(SESSIONS_FILE, 'utf8').trim()
    if (!content || content === '[]' || content === '') {
      return {}
    }
    const parsed = JSON.parse(content)
    // اگر array بود، به object تبدیل کن
    if (Array.isArray(parsed)) {
      return {}
    }
    return parsed
  } catch (e) {
    console.log('[AUTH] Error reading sessions file:', e.message)
    return {}
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8')
}

function isValidSession(token) {
  if (!token || token.length < 10) {
    console.log('[AUTH] Invalid token format')
    return false
  }
  
  const sessions = readSessions()
  const session = sessions[token]
  if (!session) {
    console.log('[AUTH] Session not found for token:', token.substring(0, 16) + '...')
    return false
  }
  
  const now = Date.now()
  if (now > session.expires) {
    console.log('[AUTH] Session expired')
    delete sessions[token]
    writeSessions(sessions)
    return false
  }
  
  // Update last activity
  session.lastActivity = now
  writeSessions(sessions)
  console.log('[AUTH] Session valid for user:', session.username)
  return true
}

function createSession(username) {
  const sessions = readSessions()
  const token = generateToken()
  const now = Date.now()
  
  sessions[token] = {
    username,
    createdAt: now,
    expires: now + SESSION_DURATION,
    lastActivity: now
  }
  
  // Cleanup expired sessions
  Object.keys(sessions).forEach(key => {
    if (sessions[key].expires < now) {
      delete sessions[key]
    }
  })
  
  writeSessions(sessions)
  console.log('[AUTH] Session created:', { token: token.substring(0, 16) + '...', username, expires: new Date(now + SESSION_DURATION).toISOString() })
  return token
}

function requireAuth(req, res, callback) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Unauthorized', 401)
  }
  
  const token = authHeader.substring(7)
  if (!isValidSession(token)) {
    return sendError(res, 'Invalid or expired session', 401)
  }
  
  callback()
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function sendError(res, message, statusCode = 400) {
  sendJson(res, { error: message }, statusCode)
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const method = req.method
  const pathname = parsedUrl.pathname

  // Debug log - فقط برای API routes
  if (pathname.startsWith('/api/')) {
    console.log(`[${method}] ${pathname}`)
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Authentication endpoints (public)
  if (pathname === '/api/auth/login' && method === 'POST') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body)
        const clientIp = req.socket.remoteAddress || 'unknown'
        
        // Rate limiting check
        const attempts = loginAttempts.get(clientIp) || { count: 0, lockoutUntil: 0 }
        const now = Date.now()
        
        // Auto-clear old lockouts (older than lockout time)
        if (attempts.lockoutUntil > 0 && attempts.lockoutUntil < now) {
          loginAttempts.delete(clientIp)
        }
        
        if (attempts.lockoutUntil > now) {
          const remainingMinutes = Math.ceil((attempts.lockoutUntil - now) / 60000)
          console.log('[AUTH] Rate limit active for IP:', clientIp, 'remaining:', remainingMinutes, 'minutes')
          return sendError(res, `Too many login attempts. Please try again in ${remainingMinutes} minute(s).`, 429)
        }
        
        const auth = readAuth()
        const passwordHash = hashPassword(password)
        
        console.log('[AUTH] Login attempt:', { username, providedHash: passwordHash.substring(0, 16) + '...', storedHash: auth.passwordHash.substring(0, 16) + '...' })
        console.log('[AUTH] Auth data:', { username: auth.username, hashMatch: passwordHash === auth.passwordHash })
        
        if (username === auth.username && passwordHash === auth.passwordHash) {
          // Reset attempts on successful login
          loginAttempts.delete(clientIp)
          
          const token = createSession(username)
          console.log('[AUTH] Login successful, token created')
          sendJson(res, { success: true, token, username })
        } else {
          // Increment failed attempts
          attempts.count++
          if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
            attempts.lockoutUntil = now + LOGIN_LOCKOUT_TIME
            attempts.count = 0
          }
          loginAttempts.set(clientIp, attempts)
          
          console.log('[AUTH] Login failed:', { usernameMatch: username === auth.username, hashMatch: passwordHash === auth.passwordHash })
          sendError(res, 'Invalid username or password', 401)
        }
      } catch (e) {
        sendError(res, 'Invalid request', 400)
      }
    })
    return
  }

  if (pathname === '/api/auth/change-password' && method === 'POST') {
    requireAuth(req, res, () => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          const { currentPassword, newPassword } = JSON.parse(body)
          
          if (!newPassword || newPassword.length < 4) {
            return sendError(res, 'New password must be at least 4 characters', 400)
          }
          
          const auth = readAuth()
          const currentHash = hashPassword(currentPassword)
          
          if (currentHash !== auth.passwordHash) {
            return sendError(res, 'Current password is incorrect', 401)
          }
          
          auth.passwordHash = hashPassword(newPassword)
          writeAuth(auth)
          
          sendJson(res, { success: true })
        } catch (e) {
          sendError(res, 'Invalid request', 400)
        }
      })
    })
    return
  }

  if (pathname === '/api/auth/verify' && method === 'GET') {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH] Verify: No auth header')
      return sendError(res, 'Unauthorized', 401)
    }
    
    const token = authHeader.substring(7)
    console.log('[AUTH] Verify: Token received, length:', token.length)
    
    if (isValidSession(token)) {
      const sessions = readSessions()
      const session = sessions[token]
      console.log('[AUTH] Verify: Session valid for user:', session.username)
      sendJson(res, { valid: true, username: session.username })
    } else {
      console.log('[AUTH] Verify: Session invalid or expired')
      sendError(res, 'Invalid or expired session', 401)
    }
    return
  }

  // Reset rate limiting (for debugging - remove in production)
  if (pathname === '/api/auth/reset-rate-limit' && method === 'POST') {
    loginAttempts.clear()
    console.log('[AUTH] Rate limiting cleared')
    sendJson(res, { success: true, message: 'Rate limiting cleared' })
    return
  }

  // Protected API endpoints
  if (pathname === '/api/products' && method === 'GET') {
    const products = readJsonFile(PRODUCTS_FILE)
    sendJson(res, products)
    return
  }

  if (pathname === '/api/products' && method === 'POST') {
    requireAuth(req, res, () => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          const products = JSON.parse(body)
          if (!Array.isArray(products)) {
            return sendError(res, 'Invalid data format')
          }
          writeJsonFile(PRODUCTS_FILE, products)
          sendJson(res, { success: true })
        } catch (e) {
          sendError(res, 'Invalid JSON')
        }
      })
    })
    return
  }

  if (pathname === '/api/orders' && method === 'GET') {
    requireAuth(req, res, () => {
      const orders = readJsonFile(ORDERS_FILE)
      sendJson(res, orders)
    })
    return
  }

  if (pathname === '/api/orders' && method === 'POST') {
    requireAuth(req, res, () => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          const orders = JSON.parse(body)
          if (!Array.isArray(orders)) {
            return sendError(res, 'Invalid data format')
          }
          writeJsonFile(ORDERS_FILE, orders)
          sendJson(res, { success: true })
        } catch (e) {
          sendError(res, 'Invalid JSON')
        }
      })
    })
    return
  }

  if (pathname === '/api/send-sms' && method === 'POST') {
    console.log('[SMS] SMS endpoint called')
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', async () => {
      try {
        console.log('[SMS] Request body received, length:', body.length)
        const data = JSON.parse(body)
        console.log('[SMS] Parsed data - userName:', data.userName ? '***' : 'missing', 
                    'fromNumber:', data.fromNumber, 'toNumbers:', data.toNumbers)
        
        const { apiType, userName, password, fromNumber, toNumbers, messageContent } = data
        
        if (!userName || !password || !fromNumber || !toNumbers || !messageContent) {
          console.log('[SMS] Missing required fields')
          return sendError(res, 'Missing required fields')
        }
        
        const selectedApiType = apiType || 'payamak-vip'
        console.log('[SMS] Using API type:', selectedApiType)
        
        try {
          let response
          
          if (selectedApiType === 'niazpardaz') {
            // API Niazpardaz - GET با query parameters
            const baseUrl = 'https://panel.niazpardaz-sms.com/SMSInOutBox/SendSms'
            const params = new URLSearchParams({
              username: userName,
              password: password,
              from: fromNumber,
              to: toNumbers,
              text: messageContent
            })
            const apiUrl = `${baseUrl}?${params.toString()}`
            
            console.log('[SMS] Calling Niazpardaz API:', baseUrl)
            response = await axios.get(apiUrl, {
              timeout: 10000,
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              }
            })
            
            console.log('[SMS] API Response Status:', response.status)
            console.log('[SMS] API Response Data:', response.data)
            
            // Niazpardaz معمولاً متن ساده برمی‌گرداند
            const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
            
            // بررسی پاسخ (معمولاً عدد برمی‌گرداند که اگر مثبت باشد موفق است)
            if (responseText && !responseText.toLowerCase().includes('error') && !responseText.toLowerCase().includes('خطا')) {
              sendJson(res, { success: true, response: responseText })
            } else {
              sendError(res, responseText || 'Failed to send SMS', 400)
            }
          } else {
            // API Payamak.vip - POST با JSON
            const baseAddress = 'http://www.payamak.vip/api/v1/RestWebApi/'
            const apiUrl = baseAddress + 'SendBatchSms'
            
            const smsData = {
              userName,
              password,
              fromNumber,
              toNumbers,
              messageContent,
              isFlash: false,
              sendDelay: 0
            }
            
            console.log('[SMS] Calling Payamak.vip API:', apiUrl)
            response = await axios.post(apiUrl, smsData, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000
            })
            
            console.log('[SMS] API Response Status:', response.status)
            console.log('[SMS] API Response Data:', JSON.stringify(response.data))
            
            // بررسی نتیجه API
            const apiResult = response.data
            if (apiResult && apiResult.Result !== undefined) {
              // Result: 0 = موفق, غیر 0 = خطا
              if (apiResult.Result === 0) {
                sendJson(res, { success: true, response: apiResult })
              } else {
                const errorMessage = apiResult.ErrorMessage || `API Error Code: ${apiResult.Result}`
                console.error('[SMS] API returned error:', errorMessage)
                sendError(res, errorMessage, 400)
              }
            } else {
              // اگر ساختار پاسخ غیرمنتظره بود
              sendJson(res, { success: true, response: apiResult })
            }
          }
        } catch (error) {
          console.error('[SMS] API Error:', error.message)
          if (error.response) {
            console.error('[SMS] Response Status:', error.response.status)
            console.error('[SMS] Response Data:', JSON.stringify(error.response.data))
          }
          sendError(res, error.response?.data?.message || error.message || 'Failed to send SMS', 500)
        }
      } catch (e) {
        console.error('[SMS] Parse Error:', e.message)
        sendError(res, 'Invalid JSON: ' + e.message)
      }
    })
    return
  }

  // Handle favicon.ico requests (return 204 No Content)
  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Content-Type': 'image/x-icon' })
    res.end()
    return
  }

  // Serve static files (but not API routes)
  if (pathname.startsWith('/') && !pathname.startsWith('/api/')) {
    let filePath = pathname === '/' ? 'index.html' : pathname.slice(1)
    filePath = path.join(__dirname, filePath)

    if (!filePath.startsWith(__dirname)) {
      sendError(res, 'Forbidden', 403)
      return
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath)
      const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
      }[ext] || 'application/octet-stream'

      const content = fs.readFileSync(filePath)
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
      return
    }
  }

  sendError(res, 'Not Found', 404)
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
})

