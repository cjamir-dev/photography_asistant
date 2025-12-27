const { storage, logic, ui } = window.PhotoTools
const { loadOrders } = storage
const { formatMoney } = logic
const { $, setText, setHidden, escapeHtml } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  statTotalOrders: $('#statTotalOrders'),
  statTodayOrders: $('#statTodayOrders'),
  statUnpaidOrders: $('#statUnpaidOrders'),
  statTotalRevenue: $('#statTotalRevenue'),
  statTotalCustomers: $('#statTotalCustomers'),
  statRemainingAmount: $('#statRemainingAmount'),
  recentOrdersList: $('#recentOrdersList'),
  unpaidOrdersList: $('#unpaidOrdersList'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
}

let orders = []

function getTodayDate() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

function getThisMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

function calculateStats(ordersList) {
  const today = getTodayDate()
  const monthRange = getThisMonthRange()
  
  const stats = {
    totalOrders: ordersList.length,
    todayOrders: 0,
    unpaidOrders: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    totalCustomers: new Set(),
    remainingAmount: 0
  }
  
  ordersList.forEach(order => {
    const orderDate = new Date(order.createdAt || order.customer?.createdAt || Date.now())
    const orderDateStr = orderDate.toISOString().split('T')[0]
    
    // سفارشات امروز
    if (orderDateStr === today) {
      stats.todayOrders++
    }
    
    // درآمد کل
    const total = order.totalAmount || 0
    stats.totalRevenue += total
    
    // درآمد این ماه
    if (order.createdAt >= monthRange.start && order.createdAt <= monthRange.end) {
      stats.monthRevenue += total
    }
    
    // مشتریان منحصر به فرد
    if (order.customer?.phone) {
      stats.totalCustomers.add(order.customer.phone)
    }
    
    // سفارشات تسویه نشده
    const remaining = order.remainingAmount !== undefined 
      ? order.remainingAmount 
      : (total - (order.deposit || 0))
    
    if (remaining > 0) {
      stats.unpaidOrders++
      stats.remainingAmount += remaining
    }
  })
  
  return stats
}

function renderStats(stats) {
  if (els.statTotalOrders) {
    els.statTotalOrders.textContent = stats.totalOrders.toLocaleString('en-US')
  }
  if (els.statTodayOrders) {
    els.statTodayOrders.textContent = stats.todayOrders.toLocaleString('en-US')
  }
  if (els.statUnpaidOrders) {
    els.statUnpaidOrders.textContent = stats.unpaidOrders.toLocaleString('en-US')
  }
  if (els.statTotalRevenue) {
    els.statTotalRevenue.textContent = `${formatMoney(stats.totalRevenue)} ${t('currency')}`
  }
  if (els.statTotalCustomers) {
    els.statTotalCustomers.textContent = stats.totalCustomers.size.toLocaleString('en-US')
  }
  if (els.statRemainingAmount) {
    els.statRemainingAmount.textContent = `${formatMoney(stats.remainingAmount)} ${t('currency')}`
  }
}

function renderRecentOrders(ordersList) {
  const recent = ordersList
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)
  
  if (recent.length === 0) {
    els.recentOrdersList.innerHTML = `<p class="help">${t('noOrders')}</p>`
    return
  }
  
  const rows = recent.map(order => {
    const date = new Date(order.createdAt).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    const total = formatMoney(order.totalAmount || 0)
    const currency = t('currency')
    
    return `
      <div class="item">
        <div class="meta">
          <div class="title">${escapeHtml(order.customer?.lastName || '')}</div>
          <div class="sub">${escapeHtml(date)}</div>
          <div class="sub">${total} ${currency}</div>
        </div>
      </div>
    `
  }).join('')
  
  els.recentOrdersList.innerHTML = rows
}

function renderUnpaidOrders(ordersList) {
  const unpaid = ordersList
    .filter(order => {
      const total = order.totalAmount || 0
      const remaining = order.remainingAmount !== undefined 
        ? order.remainingAmount 
        : (total - (order.deposit || 0))
      return remaining > 0
    })
    .sort((a, b) => {
      const remainingA = a.remainingAmount !== undefined 
        ? a.remainingAmount 
        : ((a.totalAmount || 0) - (a.deposit || 0))
      const remainingB = b.remainingAmount !== undefined 
        ? b.remainingAmount 
        : ((b.totalAmount || 0) - (b.deposit || 0))
      return remainingB - remainingA
    })
    .slice(0, 5)
  
  if (unpaid.length === 0) {
    els.unpaidOrdersList.innerHTML = `<p class="help">${t('noUnpaidOrders')}</p>`
    return
  }
  
  const rows = unpaid.map(order => {
    const date = new Date(order.createdAt).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const total = formatMoney(order.totalAmount || 0)
    const remaining = order.remainingAmount !== undefined 
      ? order.remainingAmount 
      : ((order.totalAmount || 0) - (order.deposit || 0))
    const remainingFormatted = formatMoney(remaining)
    const currency = t('currency')
    
    return `
      <div class="item">
        <div class="meta">
          <div class="title">${escapeHtml(order.customer?.lastName || '')}</div>
          <div class="sub">${escapeHtml(date)}</div>
          <div class="sub" style="color: var(--danger); font-weight: 600;">
            ${t('remainingAmount')}: ${remainingFormatted} ${currency}
          </div>
        </div>
      </div>
    `
  }).join('')
  
  els.unpaidOrdersList.innerHTML = rows
}

async function loadDashboardData() {
  orders = await loadOrders()
  
  const stats = calculateStats(orders)
  renderStats(stats)
  renderRecentOrders(orders)
  renderUnpaidOrders(orders)
}

async function init() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  if (!isAuthenticated) {
    window.location.href = './login.html'
    return
  }
  
  ui.initI18n()
  
  await loadDashboardData()
  
  // Auto refresh every 30 seconds
  setInterval(() => {
    loadDashboardData()
  }, 30000)
  
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

