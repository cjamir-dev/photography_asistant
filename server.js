const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { URL } = require('url')

const PORT = Number(process.env.PORT) || 3000
const DATA_DIR = path.join(__dirname, 'data')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')
const SMS_FILE = path.join(DATA_DIR, 'sms-settings.json')
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const BACKUP_KEEP_DAYS = 7

const ORDER_STATUSES = ['registered', 'printing', 'ready', 'delivered', 'cancelled']
const sessions = new Map()
const fileLocks = new Map()

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function ensureJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    atomicWriteSync(filePath, '[]')
  }
}

function nowIso() {
  return new Date().toISOString()
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(16)}_${crypto.randomBytes(6).toString('hex')}`
}

function hashPassword(password, salt) {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), usedSalt, 64).toString('hex')
  return { salt: usedSalt, hash }
}

function verifyPassword(password, salt, hash) {
  const next = crypto.scryptSync(String(password), salt, 64).toString('hex')
  const a = Buffer.from(next, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function atomicWriteSync(filePath, content) {
  const dir = path.dirname(filePath)
  ensureDir(dir)
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)
  fs.writeFileSync(tmp, content, 'utf8')
  fs.renameSync(tmp, filePath)
}

async function withFileLock(filePath, fn) {
  const prev = fileLocks.get(filePath) || Promise.resolve()
  let release
  const gate = new Promise(resolve => { release = resolve })
  const current = prev.then(() => gate)
  fileLocks.set(filePath, current)
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (fileLocks.get(filePath) === current) fileLocks.delete(filePath)
  }
}

function readJson(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return fallback
  }
}

async function readJsonLocked(filePath, fallback) {
  return withFileLock(filePath, async () => readJson(filePath, fallback))
}

async function writeJsonLocked(filePath, data) {
  return withFileLock(filePath, async () => {
    atomicWriteSync(filePath, JSON.stringify(data, null, 2))
    return data
  })
}

function ensureAuth() {
  if (fs.existsSync(AUTH_FILE)) return readJson(AUTH_FILE, null)
  const { salt, hash } = hashPassword('admin')
  const auth = {
    username: 'admin',
    salt,
    hash,
    mustChangePassword: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
  atomicWriteSync(AUTH_FILE, JSON.stringify(auth, null, 2))
  console.log('[AUTH] Default user created: admin / admin (change password after login)')
  return auth
}

function ensureSmsSettings() {
  if (fs.existsSync(SMS_FILE)) return
  const defaults = {
    apiType: 'payamak-vip',
    username: '',
    password: '',
    fromNumber: '',
    messageTemplate: '{lastName} عزیز، سفارش شما به مبلغ {totalAmount} تومان ثبت شد. بیعانه: {deposit} تومان، مانده: {remainingAmount} تومان',
    enabled: false,
    updatedAt: nowIso()
  }
  atomicWriteSync(SMS_FILE, JSON.stringify(defaults, null, 2))
}

function runStartupBackup() {
  ensureDir(BACKUP_DIR)
  const day = new Date().toISOString().slice(0, 10)
  const dest = path.join(BACKUP_DIR, day)
  ensureDir(dest)
  for (const name of ['products.json', 'orders.json', 'auth.json', 'sms-settings.json']) {
    const src = path.join(DATA_DIR, name)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(dest, name))
    }
  }
  const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()
  while (entries.length > BACKUP_KEEP_DAYS) {
    const old = entries.shift()
    fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true })
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  const out = {}
  header.split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx === -1) return
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(val)
  })
  return out
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, {
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  })
  return token
}

function getSession(req) {
  const cookies = parseCookies(req)
  const token = cookies.session
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS
  return { token, session }
}

function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000)
  res.setHeader('Set-Cookie', `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
}

function sendJson(res, data, statusCode = 200) {
  const body = JSON.stringify(data)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

function sendError(res, message, statusCode = 400) {
  sendJson(res, { error: message }, statusCode)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

async function readJsonBody(req) {
  const raw = await readBody(req)
  if (!raw) return {}
  return JSON.parse(raw)
}

function normalizeOrder(order) {
  const total = Math.max(0, Math.round(Number(order.totalAmount) || 0))
  const deposit = Math.max(0, Math.round(Number(order.deposit) || 0))
  const remaining = Math.max(0, total - deposit)
  const status = ORDER_STATUSES.includes(order.status) ? order.status : 'registered'
  const payments = Array.isArray(order.payments) ? order.payments : []
  return {
    ...order,
    totalAmount: total,
    deposit,
    remainingAmount: remaining,
    status,
    dueDate: order.dueDate || '',
    description: order.description || order.note || '',
    payments,
    updatedAt: order.updatedAt || order.createdAt || nowIso()
  }
}

function validateOrderPayload(data, { requireId = false } = {}) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid_data' }
  if (requireId && !data.id) return { ok: false, error: 'order_id_required' }
  const lastName = String(data.customer?.lastName || '').trim()
  const phone = String(data.customer?.phone || '').trim()
  if (!lastName) return { ok: false, error: 'last_name_required' }
  if (!/^09\d{9}$/.test(phone)) return { ok: false, error: 'phone_invalid' }
  if (!Array.isArray(data.items) || data.items.length === 0) return { ok: false, error: 'cart_empty' }
  if (data.status && !ORDER_STATUSES.includes(data.status)) return { ok: false, error: 'invalid_status' }
  return { ok: true }
}

function validateProductPayload(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid_data' }
  const name = String(data.name || '').trim()
  const price = Math.round(Number(data.price) || 0)
  if (!name) return { ok: false, error: 'product_name_required' }
  if (price <= 0) return { ok: false, error: 'price_required' }
  return { ok: true }
}

function httpRequest(urlString, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, data, headers: res.headers })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('SMS timeout'))
    })
    if (body) req.write(body)
    req.end()
  })
}

async function sendSmsViaProvider(settings, toNumbers, messageContent) {
  const apiType = settings.apiType || 'payamak-vip'
  if (apiType === 'niazpardaz') {
    const params = new URLSearchParams({
      username: settings.username,
      password: settings.password,
      from: settings.fromNumber,
      to: toNumbers,
      text: messageContent
    })
    const apiUrl = `https://panel.niazpardaz-sms.com/SMSInOutBox/SendSms?${params.toString()}`
    const response = await httpRequest(apiUrl, { method: 'GET', timeout: 10000 })
    const responseText = String(response.data || '')
    if (responseText && !responseText.toLowerCase().includes('error') && !responseText.includes('خطا')) {
      return { ok: true, response: responseText }
    }
    return { ok: false, error: responseText || 'sms_failed' }
  }

  const apiUrl = 'http://www.payamak.vip/api/v1/RestWebApi/SendBatchSms'
  const payload = JSON.stringify({
    userName: settings.username,
    password: settings.password,
    fromNumber: settings.fromNumber,
    toNumbers,
    messageContent,
    isFlash: false,
    sendDelay: 0
  })
  const response = await httpRequest(apiUrl, {
    method: 'POST',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload)

  let apiResult
  try {
    apiResult = JSON.parse(response.data)
  } catch {
    apiResult = response.data
  }

  if (apiResult && apiResult.Result !== undefined) {
    if (apiResult.Result === 0) return { ok: true, response: apiResult }
    return { ok: false, error: apiResult.ErrorMessage || `API Error Code: ${apiResult.Result}` }
  }
  return { ok: true, response: apiResult }
}

function isPublicPath(pathname) {
  if (pathname === '/login.html' || pathname === '/favicon.ico') return true
  if (pathname.startsWith('/assets/')) return true
  if (pathname === '/js/i18n.js' || pathname === '/js/common.js' || pathname === '/js/login.page.js') return true
  if (pathname === '/api/login' || pathname === '/api/me') return true
  return false
}

function contentTypeFor(ext) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream'
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? 'index.html' : pathname.slice(1)
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '')
  const absolute = path.join(__dirname, filePath)
  if (!absolute.startsWith(__dirname)) {
    sendError(res, 'Forbidden', 403)
    return
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    sendError(res, 'Not Found', 404)
    return
  }
  const content = fs.readFileSync(absolute)
  res.writeHead(200, { 'Content-Type': contentTypeFor(path.extname(absolute)) })
  res.end(content)
}

ensureDir(DATA_DIR)
ensureJsonArray(PRODUCTS_FILE)
ensureJsonArray(ORDERS_FILE)
ensureAuth()
ensureSmsSettings()
runStartupBackup()

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const method = req.method || 'GET'
    const pathname = parsed.pathname

    const reqOrigin = req.headers.origin || ''
    const allowed = new Set([
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`
    ])
    if (allowed.has(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const sessionInfo = getSession(req)
    const authed = Boolean(sessionInfo)

    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/me' && method === 'GET') {
        if (!authed) return sendJson(res, { authenticated: false })
        const auth = ensureAuth()
        return sendJson(res, {
          authenticated: true,
          username: sessionInfo.session.username,
          mustChangePassword: Boolean(auth.mustChangePassword)
        })
      }

      if (pathname === '/api/login' && method === 'POST') {
        const body = await readJsonBody(req)
        const username = String(body.username || '').trim()
        const password = String(body.password || '')
        const auth = ensureAuth()
        if (username !== auth.username || !verifyPassword(password, auth.salt, auth.hash)) {
          return sendError(res, 'invalid_credentials', 401)
        }
        const token = createSession(username)
        setSessionCookie(res, token)
        return sendJson(res, {
          success: true,
          username,
          mustChangePassword: Boolean(auth.mustChangePassword)
        })
      }

      if (pathname === '/api/logout' && method === 'POST') {
        if (sessionInfo) sessions.delete(sessionInfo.token)
        clearSessionCookie(res)
        return sendJson(res, { success: true })
      }

      if (!authed) return sendError(res, 'unauthorized', 401)

      if (pathname === '/api/change-password' && method === 'POST') {
        const body = await readJsonBody(req)
        const currentPassword = String(body.currentPassword || '')
        const newPassword = String(body.newPassword || '')
        if (newPassword.length < 4) return sendError(res, 'password_too_short')
        const auth = ensureAuth()
        if (!verifyPassword(currentPassword, auth.salt, auth.hash)) {
          return sendError(res, 'wrong_password', 400)
        }
        const { salt, hash } = hashPassword(newPassword)
        const next = {
          ...auth,
          salt,
          hash,
          mustChangePassword: false,
          updatedAt: nowIso()
        }
        await writeJsonLocked(AUTH_FILE, next)
        return sendJson(res, { success: true })
      }

      if (pathname === '/api/sms-settings' && method === 'GET') {
        const settings = readJson(SMS_FILE, {})
        return sendJson(res, {
          apiType: settings.apiType || 'payamak-vip',
          username: settings.username || '',
          passwordSet: Boolean(settings.password),
          fromNumber: settings.fromNumber || '',
          messageTemplate: settings.messageTemplate || '',
          enabled: Boolean(settings.enabled)
        })
      }

      if (pathname === '/api/sms-settings' && method === 'POST') {
        const body = await readJsonBody(req)
        const current = readJson(SMS_FILE, {})
        const next = {
          apiType: body.apiType || current.apiType || 'payamak-vip',
          username: body.username !== undefined ? String(body.username) : (current.username || ''),
          password: body.password !== undefined && body.password !== ''
            ? String(body.password)
            : (current.password || ''),
          fromNumber: body.fromNumber !== undefined ? String(body.fromNumber) : (current.fromNumber || ''),
          messageTemplate: body.messageTemplate !== undefined
            ? String(body.messageTemplate)
            : (current.messageTemplate || ''),
          enabled: body.enabled !== undefined ? Boolean(body.enabled) : Boolean(current.enabled),
          updatedAt: nowIso()
        }
        await writeJsonLocked(SMS_FILE, next)
        return sendJson(res, { success: true })
      }

      if (pathname === '/api/products' && method === 'GET') {
        const products = await readJsonLocked(PRODUCTS_FILE, [])
        return sendJson(res, Array.isArray(products) ? products : [])
      }

      if (pathname === '/api/products' && method === 'POST') {
        const body = await readJsonBody(req)
        if (Array.isArray(body)) {
          await writeJsonLocked(PRODUCTS_FILE, body)
          return sendJson(res, { success: true, replaced: true })
        }
        const check = validateProductPayload(body)
        if (!check.ok) return sendError(res, check.error)
        const product = {
          id: uid('prod'),
          name: String(body.name).trim(),
          price: Math.round(Number(body.price)),
          description: String(body.description || '').trim(),
          imageDataUrl: String(body.imageDataUrl || ''),
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
        const products = await withFileLock(PRODUCTS_FILE, async () => {
          const list = readJson(PRODUCTS_FILE, [])
          list.push(product)
          atomicWriteSync(PRODUCTS_FILE, JSON.stringify(list, null, 2))
          return product
        })
        return sendJson(res, products, 201)
      }

      const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/)
      if (productMatch && method === 'PUT') {
        const id = decodeURIComponent(productMatch[1])
        const body = await readJsonBody(req)
        const check = validateProductPayload(body)
        if (!check.ok) return sendError(res, check.error)
        const updated = await withFileLock(PRODUCTS_FILE, async () => {
          const list = readJson(PRODUCTS_FILE, [])
          const idx = list.findIndex(p => p.id === id)
          if (idx === -1) return null
          const next = {
            ...list[idx],
            name: String(body.name).trim(),
            price: Math.round(Number(body.price)),
            description: String(body.description || '').trim(),
            imageDataUrl: body.imageDataUrl !== undefined
              ? String(body.imageDataUrl || '')
              : (list[idx].imageDataUrl || ''),
            updatedAt: nowIso()
          }
          list[idx] = next
          atomicWriteSync(PRODUCTS_FILE, JSON.stringify(list, null, 2))
          return next
        })
        if (!updated) return sendError(res, 'product_not_found', 404)
        return sendJson(res, updated)
      }

      if (productMatch && method === 'DELETE') {
        const id = decodeURIComponent(productMatch[1])
        const ok = await withFileLock(PRODUCTS_FILE, async () => {
          const list = readJson(PRODUCTS_FILE, [])
          const next = list.filter(p => p.id !== id)
          if (next.length === list.length) return false
          atomicWriteSync(PRODUCTS_FILE, JSON.stringify(next, null, 2))
          return true
        })
        if (!ok) return sendError(res, 'product_not_found', 404)
        return sendJson(res, { success: true })
      }

      if (pathname === '/api/orders' && method === 'GET') {
        const orders = await readJsonLocked(ORDERS_FILE, [])
        const normalized = (Array.isArray(orders) ? orders : []).map(normalizeOrder)
        return sendJson(res, normalized)
      }

      if (pathname === '/api/orders' && method === 'POST') {
        const body = await readJsonBody(req)
        if (Array.isArray(body)) {
          const normalized = body.map(normalizeOrder)
          await writeJsonLocked(ORDERS_FILE, normalized)
          return sendJson(res, { success: true, replaced: true })
        }
        const check = validateOrderPayload(body)
        if (!check.ok) return sendError(res, check.error)
        const order = normalizeOrder({
          ...body,
          id: body.id || uid('ord'),
          createdAt: body.createdAt || nowIso(),
          updatedAt: nowIso(),
          payments: Array.isArray(body.payments) ? body.payments : (
            (Number(body.deposit) || 0) > 0
              ? [{ amount: Math.round(Number(body.deposit)), at: nowIso(), note: 'Initial deposit' }]
              : []
          )
        })
        await withFileLock(ORDERS_FILE, async () => {
          const list = readJson(ORDERS_FILE, [])
          list.unshift(order)
          atomicWriteSync(ORDERS_FILE, JSON.stringify(list, null, 2))
        })
        return sendJson(res, order, 201)
      }

      const orderPaymentMatch = pathname.match(/^\/api\/orders\/([^/]+)\/payments$/)
      if (orderPaymentMatch && method === 'POST') {
        const id = decodeURIComponent(orderPaymentMatch[1])
        const body = await readJsonBody(req)
        const amount = Math.round(Number(body.amount) || 0)
        if (amount <= 0) return sendError(res, 'invalid_payment')
        const updated = await withFileLock(ORDERS_FILE, async () => {
          const list = readJson(ORDERS_FILE, [])
          const idx = list.findIndex(o => o.id === id)
          if (idx === -1) return null
          const order = normalizeOrder(list[idx])
          if (amount > order.remainingAmount) return { error: 'payment_exceeds_remaining' }
          order.deposit += amount
          order.remainingAmount = Math.max(0, order.totalAmount - order.deposit)
          order.payments = Array.isArray(order.payments) ? order.payments : []
          order.payments.push({
            amount,
            at: nowIso(),
            note: String(body.note || '').trim()
          })
          order.updatedAt = nowIso()
          list[idx] = order
          atomicWriteSync(ORDERS_FILE, JSON.stringify(list, null, 2))
          return order
        })
        if (!updated) return sendError(res, 'order_not_found', 404)
        if (updated.error) return sendError(res, updated.error)
        return sendJson(res, updated)
      }

      const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/)
      if (orderMatch && method === 'PUT') {
        const id = decodeURIComponent(orderMatch[1])
        const body = await readJsonBody(req)
        const check = validateOrderPayload({ ...body, id }, { requireId: true })
        if (!check.ok) return sendError(res, check.error)
        const updated = await withFileLock(ORDERS_FILE, async () => {
          const list = readJson(ORDERS_FILE, [])
          const idx = list.findIndex(o => o.id === id)
          if (idx === -1) return null
          const prev = normalizeOrder(list[idx])
          const next = normalizeOrder({
            ...prev,
            ...body,
            id,
            payments: Array.isArray(body.payments) ? body.payments : prev.payments,
            createdAt: prev.createdAt,
            updatedAt: nowIso()
          })
          list[idx] = next
          atomicWriteSync(ORDERS_FILE, JSON.stringify(list, null, 2))
          return next
        })
        if (!updated) return sendError(res, 'order_not_found', 404)
        return sendJson(res, updated)
      }

      if (orderMatch && method === 'PATCH') {
        const id = decodeURIComponent(orderMatch[1])
        const body = await readJsonBody(req)
        const updated = await withFileLock(ORDERS_FILE, async () => {
          const list = readJson(ORDERS_FILE, [])
          const idx = list.findIndex(o => o.id === id)
          if (idx === -1) return null
          const prev = normalizeOrder(list[idx])
          if (body.status && !ORDER_STATUSES.includes(body.status)) {
            return { error: 'invalid_status' }
          }
          const next = normalizeOrder({
            ...prev,
            ...body,
            id,
            updatedAt: nowIso()
          })
          list[idx] = next
          atomicWriteSync(ORDERS_FILE, JSON.stringify(list, null, 2))
          return next
        })
        if (!updated) return sendError(res, 'order_not_found', 404)
        if (updated.error) return sendError(res, updated.error)
        return sendJson(res, updated)
      }

      if (orderMatch && method === 'DELETE') {
        const id = decodeURIComponent(orderMatch[1])
        const ok = await withFileLock(ORDERS_FILE, async () => {
          const list = readJson(ORDERS_FILE, [])
          const next = list.filter(o => o.id !== id)
          if (next.length === list.length) return false
          atomicWriteSync(ORDERS_FILE, JSON.stringify(next, null, 2))
          return true
        })
        if (!ok) return sendError(res, 'order_not_found', 404)
        return sendJson(res, { success: true })
      }

      if (pathname === '/api/backup' && method === 'POST') {
        runStartupBackup()
        return sendJson(res, { success: true })
      }

      if (pathname === '/api/send-sms' && method === 'POST') {
        const body = await readJsonBody(req)
        const settings = readJson(SMS_FILE, {})
        const toNumbers = String(body.toNumbers || '').trim()
        let messageContent = String(body.messageContent || '').trim()

        if (!settings.enabled) return sendError(res, 'sms_disabled')
        if (!settings.username || !settings.password || !settings.fromNumber) {
          return sendError(res, 'sms_incomplete')
        }
        if (!toNumbers) return sendError(res, 'sms_recipient_required')

        if (!messageContent && body.order) {
          const tpl = settings.messageTemplate || ''
          const order = body.order
          messageContent = tpl
            .replace(/{lastName}/g, order.customer?.lastName || '')
            .replace(/{totalAmount}/g, String(order.totalAmount || 0))
            .replace(/{deposit}/g, String(order.deposit || 0))
            .replace(/{remainingAmount}/g, String(order.remainingAmount || 0))
        }
        if (!messageContent) return sendError(res, 'sms_empty')

        try {
          const result = await sendSmsViaProvider(settings, toNumbers, messageContent)
          if (!result.ok) return sendError(res, result.error || 'sms_failed', 400)
          return sendJson(res, { success: true, response: result.response })
        } catch (e) {
          console.error('[SMS]', e.message)
          return sendError(res, e.message || 'sms_failed', 500)
        }
      }

      return sendError(res, 'Not Found', 404)
    }

    if (!authed && !isPublicPath(pathname)) {
      if (pathname === '/' || pathname.endsWith('.html')) {
        res.writeHead(302, { Location: '/login.html' })
        res.end()
        return
      }
    }

    serveStatic(req, res, pathname)
  } catch (e) {
    console.error('[SERVER]', e)
    if (!res.headersSent) sendError(res, e.message || 'Server error', 500)
  }
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
})
