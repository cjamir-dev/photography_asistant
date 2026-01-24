const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')
const crypto = require('crypto')

// Check if required packages are installed
let axios
let bcrypt
try {
  axios = require('axios')
  console.log('[INFO] axios loaded successfully')
} catch (error) {
  console.error('[ERROR] axios is not installed!')
  console.error('[ERROR] Please run: npm install')
  process.exit(1)
}

try {
  bcrypt = require('bcryptjs')
  console.log('[INFO] bcryptjs loaded successfully')
} catch (error) {
  console.error('[ERROR] bcryptjs is not installed!')
  console.error('[ERROR] Attempting to install bcryptjs...')
  console.error('[ERROR] Please run: npm install bcryptjs')
  console.error('[ERROR] Or run: npm install')
  console.error('[ERROR] Server will exit. Please install bcryptjs and restart.')
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
// Auth file will be initialized asynchronously
ensureFile(SESSIONS_FILE)

// Initialize auth file with bcrypt (async)
async function initAuthFile() {
  if (!fs.existsSync(AUTH_FILE)) {
    try {
      const defaultHash = await hashPassword('admin')
      fs.writeFileSync(AUTH_FILE, JSON.stringify({ username: 'admin', passwordHash: defaultHash }, null, 2), 'utf8')
      console.log('[AUTH] Default auth file created with bcrypt')
    } catch (e) {
      console.error('[AUTH] Error creating auth file:', e.message)
    }
  } else {
    // Check if we need to migrate from SHA-256 to bcrypt
    try {
      const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'))
      if (auth.passwordHash && auth.passwordHash.length === 64 && /^[a-f0-9]+$/i.test(auth.passwordHash)) {
        console.log('[AUTH] Legacy SHA-256 hash detected. Will migrate on next login.')
      }
    } catch (e) {
      // Ignore errors
    }
  }
}

// Rate limiting برای login
const loginAttempts = new Map()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000 // 15 دقیقه

// Session management
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 ساعت

// Security constants
const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10MB
const BCRYPT_ROUNDS = 10

// Password hashing with bcrypt
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password')
  }
  if (password.length < 4 || password.length > 128) {
    throw new Error('Password length must be between 4 and 128 characters')
  }
  return await bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false
  }
  try {
    return await bcrypt.compare(password, hash)
  } catch (e) {
    console.error('[AUTH] Error comparing password:', e.message)
    return false
  }
}

// Legacy password migration helper
async function migrateLegacyPassword(legacyHash, password) {
  // Check if it's a legacy SHA-256 hash (64 hex characters)
  if (legacyHash && legacyHash.length === 64 && /^[a-f0-9]+$/i.test(legacyHash)) {
    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex')
    if (sha256Hash === legacyHash) {
      // Password matches legacy hash, return new bcrypt hash
      return await hashPassword(password)
    }
  }
  return null
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
      return null
    }
    // Validate username format
    if (typeof auth.username !== 'string' || auth.username.length < 3 || auth.username.length > 50) {
      console.log('[AUTH] Invalid username format')
      return null
    }
    // Validate password hash format (bcrypt hash starts with $2a$, $2b$, or $2y$)
    if (typeof auth.passwordHash !== 'string' || auth.passwordHash.length < 10) {
      console.log('[AUTH] Invalid password hash format')
      return null
    }
    return auth
  } catch (e) {
    console.log('[AUTH] Error reading auth file:', e.message)
    return null
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

// Input validation and sanitization
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' }
  }
  const trimmed = username.trim()
  if (trimmed.length < 3 || trimmed.length > 50) {
    return { valid: false, error: 'Username must be between 3 and 50 characters' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' }
  }
  return { valid: true, value: trimmed }
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' }
  }
  if (password.length < 4 || password.length > 128) {
    return { valid: false, error: 'Password must be between 4 and 128 characters' }
  }
  // Check for common weak passwords
  const weakPasswords = ['1234', 'password', 'admin', '12345', 'qwerty']
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too weak' }
  }
  return { valid: true, value: password }
}

function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return ''
  }
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  return sanitized.trim()
}

function validateJsonArray(data, maxItems = 10000) {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Data must be an array' }
  }
  if (data.length > maxItems) {
    return { valid: false, error: `Array cannot contain more than ${maxItems} items` }
  }
  return { valid: true, value: data }
}

// Read request body with size limit
function readRequestBody(req, maxSize = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    
    req.on('data', chunk => {
      size += chunk.length
      if (size > maxSize) {
        req.destroy()
        reject(new Error('Request body too large'))
        return
      }
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        if (!body) {
          resolve(null)
          return
        }
        const parsed = JSON.parse(body)
        resolve(parsed)
      } catch (e) {
        reject(new Error('Invalid JSON'))
      }
    })
    
    req.on('error', err => {
      reject(err)
    })
  })
}

// Security headers
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Don't set CSP too strict for now to avoid breaking the app
  // res.setHeader('Content-Security-Policy', "default-src 'self'")
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const method = req.method
  const pathname = parsedUrl.pathname

  // Debug log - فقط برای API routes
  if (pathname.startsWith('/api/')) {
    console.log(`[${method}] ${pathname}`)
  }

  // Set security headers for all responses
  setSecurityHeaders(res)
  
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
    readRequestBody(req, 1024).then(async (data) => {
      try {
        if (!data || typeof data !== 'object') {
          return sendError(res, 'Invalid request', 400)
        }
        
        const { username, password } = data
        const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown'
        
        // Validate input
        const usernameValidation = validateUsername(username)
        if (!usernameValidation.valid) {
          return sendError(res, usernameValidation.error, 400)
        }
        
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
          return sendError(res, passwordValidation.error, 400)
        }
        
        const sanitizedUsername = usernameValidation.value
        const sanitizedPassword = passwordValidation.value
        
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
        if (!auth) {
          console.log('[AUTH] Auth file corrupted, rejecting login')
          return sendError(res, 'Authentication service unavailable', 503)
        }
        
        // Check username match
        if (sanitizedUsername !== auth.username) {
          // Increment failed attempts
          attempts.count++
          if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
            attempts.lockoutUntil = now + LOGIN_LOCKOUT_TIME
            attempts.count = 0
          }
          loginAttempts.set(clientIp, attempts)
          console.log('[AUTH] Login failed: username mismatch')
          return sendError(res, 'Invalid username or password', 401)
        }
        
        // Check password with bcrypt (or migrate from legacy)
        let passwordMatch = false
        if (auth.passwordHash.startsWith('$2')) {
          // Bcrypt hash
          passwordMatch = await comparePassword(sanitizedPassword, auth.passwordHash)
        } else {
          // Legacy SHA-256 hash - try to migrate
          const migratedHash = await migrateLegacyPassword(auth.passwordHash, sanitizedPassword)
          if (migratedHash) {
            // Password matches, update to bcrypt
            auth.passwordHash = migratedHash
            writeAuth(auth)
            passwordMatch = true
            console.log('[AUTH] Password migrated from SHA-256 to bcrypt')
          } else {
            // Check legacy hash directly
            const sha256Hash = crypto.createHash('sha256').update(sanitizedPassword).digest('hex')
            passwordMatch = sha256Hash === auth.passwordHash
          }
        }
        
        if (passwordMatch) {
          // Reset attempts on successful login
          loginAttempts.delete(clientIp)
          
          const token = createSession(sanitizedUsername)
          console.log('[AUTH] Login successful, token created')
          sendJson(res, { success: true, token, username: sanitizedUsername })
        } else {
          // Increment failed attempts
          attempts.count++
          if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
            attempts.lockoutUntil = now + LOGIN_LOCKOUT_TIME
            attempts.count = 0
          }
          loginAttempts.set(clientIp, attempts)
          console.log('[AUTH] Login failed: password mismatch')
          sendError(res, 'Invalid username or password', 401)
        }
      } catch (e) {
        console.error('[AUTH] Login error:', e.message)
        sendError(res, 'Invalid request', 400)
      }
    }).catch(err => {
      if (err.message === 'Request body too large') {
        sendError(res, 'Request too large', 413)
      } else {
        console.error('[AUTH] Login request error:', err.message)
        sendError(res, 'Invalid request', 400)
      }
    })
    return
  }

  if (pathname === '/api/auth/change-username' && method === 'POST') {
    requireAuth(req, res, () => {
      readRequestBody(req, 1024).then(async (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return sendError(res, 'Invalid request', 400)
          }
          
          const { newUsername, password } = data
          
          // Validate new username
          const usernameValidation = validateUsername(newUsername)
          if (!usernameValidation.valid) {
            return sendError(res, usernameValidation.error, 400)
          }
          
          // Validate password
          const passwordValidation = validatePassword(password)
          if (!passwordValidation.valid) {
            return sendError(res, passwordValidation.error, 400)
          }
          
          const sanitizedUsername = usernameValidation.value
          const sanitizedPassword = passwordValidation.value
          
          const auth = readAuth()
          if (!auth) {
            return sendError(res, 'Authentication service unavailable', 503)
          }
          
          // Verify current password
          let passwordMatch = false
          if (auth.passwordHash.startsWith('$2')) {
            passwordMatch = await comparePassword(sanitizedPassword, auth.passwordHash)
          } else {
            // Legacy SHA-256
            const sha256Hash = crypto.createHash('sha256').update(sanitizedPassword).digest('hex')
            passwordMatch = sha256Hash === auth.passwordHash
          }
          
          if (!passwordMatch) {
            return sendError(res, 'Password is incorrect', 401)
          }
          
          auth.username = sanitizedUsername
          writeAuth(auth)
          
          console.log('[AUTH] Username changed to:', sanitizedUsername)
          sendJson(res, { success: true, username: sanitizedUsername })
        } catch (e) {
          console.error('[AUTH] Change username error:', e.message)
          sendError(res, 'Invalid request', 400)
        }
      }).catch(err => {
        if (err.message === 'Request body too large') {
          sendError(res, 'Request too large', 413)
        } else {
          console.error('[AUTH] Change username request error:', err.message)
          sendError(res, 'Invalid request', 400)
        }
      })
    })
    return
  }

  if (pathname === '/api/auth/change-password' && method === 'POST') {
    requireAuth(req, res, () => {
      readRequestBody(req, 1024).then(async (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return sendError(res, 'Invalid request', 400)
          }
          
          const { currentPassword, newPassword } = data
          
          // Validate current password
          const currentPasswordValidation = validatePassword(currentPassword)
          if (!currentPasswordValidation.valid) {
            return sendError(res, currentPasswordValidation.error, 400)
          }
          
          // Validate new password
          const newPasswordValidation = validatePassword(newPassword)
          if (!newPasswordValidation.valid) {
            return sendError(res, newPasswordValidation.error, 400)
          }
          
          // Check if new password is different
          if (currentPassword === newPassword) {
            return sendError(res, 'New password must be different from current password', 400)
          }
          
          const sanitizedCurrentPassword = currentPasswordValidation.value
          const sanitizedNewPassword = newPasswordValidation.value
          
          const auth = readAuth()
          if (!auth) {
            return sendError(res, 'Authentication service unavailable', 503)
          }
          
          // Verify current password
          let passwordMatch = false
          if (auth.passwordHash.startsWith('$2')) {
            passwordMatch = await comparePassword(sanitizedCurrentPassword, auth.passwordHash)
          } else {
            // Legacy SHA-256
            const sha256Hash = crypto.createHash('sha256').update(sanitizedCurrentPassword).digest('hex')
            passwordMatch = sha256Hash === auth.passwordHash
          }
          
          if (!passwordMatch) {
            return sendError(res, 'Current password is incorrect', 401)
          }
          
          // Hash new password with bcrypt
          auth.passwordHash = await hashPassword(sanitizedNewPassword)
          writeAuth(auth)
          
          console.log('[AUTH] Password changed')
          sendJson(res, { success: true })
        } catch (e) {
          console.error('[AUTH] Change password error:', e.message)
          sendError(res, 'Invalid request', 400)
        }
      }).catch(err => {
        if (err.message === 'Request body too large') {
          sendError(res, 'Request too large', 413)
        } else {
          console.error('[AUTH] Change password request error:', err.message)
          sendError(res, 'Invalid request', 400)
        }
      })
    })
    return
  }

  if (pathname === '/api/auth/get-username' && method === 'GET') {
    requireAuth(req, res, () => {
      const auth = readAuth()
      sendJson(res, { success: true, username: auth.username })
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

  // Reset rate limiting endpoint removed for security

  // Protected API endpoints
  if (pathname === '/api/products' && method === 'GET') {
    requireAuth(req, res, () => {
      try {
        const products = readJsonFile(PRODUCTS_FILE)
        sendJson(res, products)
      } catch (e) {
        console.error('[API] Error reading products:', e.message)
        sendError(res, 'Failed to read products', 500)
      }
    })
    return
  }

  if (pathname === '/api/products' && method === 'POST') {
    requireAuth(req, res, () => {
      readRequestBody(req).then((data) => {
        try {
          const validation = validateJsonArray(data, 10000)
          if (!validation.valid) {
            return sendError(res, validation.error, 400)
          }
          
          // Sanitize product data
          const sanitizedProducts = validation.value.map(product => {
            if (typeof product !== 'object' || product === null) {
              return null
            }
            return {
              id: sanitizeString(product.id || '', 100),
              name: sanitizeString(product.name || '', 200),
              price: typeof product.price === 'number' ? Math.max(0, Math.min(product.price, 999999999)) : 0,
              description: sanitizeString(product.description || '', 1000),
              imageDataUrl: sanitizeString(product.imageDataUrl || '', 1000000), // Base64 images can be large
              createdAt: sanitizeString(product.createdAt || '', 50),
              updatedAt: sanitizeString(product.updatedAt || '', 50)
            }
          }).filter(p => p !== null && p.id && p.name)
          
          writeJsonFile(PRODUCTS_FILE, sanitizedProducts)
          sendJson(res, { success: true })
        } catch (e) {
          console.error('[API] Error saving products:', e.message)
          sendError(res, 'Invalid data format', 400)
        }
      }).catch(err => {
        if (err.message === 'Request body too large') {
          sendError(res, 'Request too large', 413)
        } else {
          console.error('[API] Products save error:', err.message)
          sendError(res, 'Invalid request', 400)
        }
      })
    })
    return
  }

  if (pathname === '/api/orders' && method === 'GET') {
    requireAuth(req, res, () => {
      try {
        const orders = readJsonFile(ORDERS_FILE)
        sendJson(res, orders)
      } catch (e) {
        console.error('[API] Error reading orders:', e.message)
        sendError(res, 'Failed to read orders', 500)
      }
    })
    return
  }

  if (pathname === '/api/orders' && method === 'POST') {
    requireAuth(req, res, () => {
      readRequestBody(req).then((data) => {
        try {
          const validation = validateJsonArray(data, 10000)
          if (!validation.valid) {
            return sendError(res, validation.error, 400)
          }
          
          // Sanitize order data
          const sanitizedOrders = validation.value.map(order => {
            if (typeof order !== 'object' || order === null) {
              return null
            }
            return {
              id: sanitizeString(order.id || '', 100),
              customer: order.customer && typeof order.customer === 'object' ? {
                lastName: sanitizeString(order.customer.lastName || '', 100),
                phone: sanitizeString(order.customer.phone || '', 20),
                createdAt: sanitizeString(order.customer.createdAt || '', 50)
              } : null,
              items: Array.isArray(order.items) ? order.items.slice(0, 100).map(item => ({
                id: sanitizeString(item.id || '', 100),
                productId: sanitizeString(item.productId || '', 100),
                name: sanitizeString(item.name || '', 200),
                quantity: typeof item.quantity === 'number' ? Math.max(1, Math.min(item.quantity, 9999)) : 1,
                unitPrice: typeof item.unitPrice === 'number' ? Math.max(0, Math.min(item.unitPrice, 999999999)) : 0,
                totalPrice: typeof item.totalPrice === 'number' ? Math.max(0, Math.min(item.totalPrice, 999999999)) : 0,
                description: sanitizeString(item.description || '', 500)
              })) : [],
              totalAmount: typeof order.totalAmount === 'number' ? Math.max(0, Math.min(order.totalAmount, 999999999)) : 0,
              deposit: typeof order.deposit === 'number' ? Math.max(0, Math.min(order.deposit, 999999999)) : 0,
              remainingAmount: typeof order.remainingAmount === 'number' ? Math.max(0, Math.min(order.remainingAmount, 999999999)) : 0,
              description: sanitizeString(order.description || '', 1000),
              createdAt: sanitizeString(order.createdAt || '', 50),
              updatedAt: sanitizeString(order.updatedAt || '', 50),
              history: Array.isArray(order.history) ? order.history.slice(0, 100).map(h => ({
                ts: sanitizeString(h.ts || '', 50),
                action: sanitizeString(h.action || '', 50),
                payload: h.payload
              })) : []
            }
          }).filter(o => o !== null && o.id)
          
          writeJsonFile(ORDERS_FILE, sanitizedOrders)
          sendJson(res, { success: true })
        } catch (e) {
          console.error('[API] Error saving orders:', e.message)
          sendError(res, 'Invalid data format', 400)
        }
      }).catch(err => {
        if (err.message === 'Request body too large') {
          sendError(res, 'Request too large', 413)
        } else {
          console.error('[API] Orders save error:', err.message)
          sendError(res, 'Invalid request', 400)
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

// Initialize auth file on startup
initAuthFile().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
    console.log(`Data directory: ${DATA_DIR}`)
    console.log('[SECURITY] Security features enabled:')
    console.log('  - bcrypt password hashing')
    console.log('  - Input validation and sanitization')
    console.log('  - Rate limiting')
    console.log('  - Security headers')
    console.log('  - Request size limits')
  })
}).catch(err => {
  console.error('[ERROR] Failed to initialize auth file:', err.message)
  process.exit(1)
})

