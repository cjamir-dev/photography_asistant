const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const PORT = 3000
const DATA_DIR = path.join(__dirname, 'data')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8')
  }
}

ensureFile(PRODUCTS_FILE)
ensureFile(ORDERS_FILE)

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

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (pathname === '/api/products' && method === 'GET') {
    const products = readJsonFile(PRODUCTS_FILE)
    sendJson(res, products)
    return
  }

  if (pathname === '/api/products' && method === 'POST') {
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
    return
  }

  if (pathname === '/api/orders' && method === 'GET') {
    const orders = readJsonFile(ORDERS_FILE)
    sendJson(res, orders)
    return
  }

  if (pathname === '/api/orders' && method === 'POST') {
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
    return
  }

  if (pathname.startsWith('/')) {
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

