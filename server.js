const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

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

  // Debug log - فقط برای API routes
  if (pathname.startsWith('/api/')) {
    console.log(`[${method}] ${pathname}`)
  }

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

