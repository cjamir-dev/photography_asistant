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
  logoutBtn: $('#logoutBtn'),
  salesChart: $('#salesChart'),
  productsChart: $('#productsChart')
}

let orders = []
let salesChartInstance = null
let productsChartInstance = null
let currentPeriod = 'daily'

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

// Chart data calculation functions
function getDailySalesData(ordersList) {
  const days = []
  const revenues = []
  const today = new Date()
  
  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayName = date.toLocaleDateString('fa-IR', { weekday: 'short' })
    const dayNum = date.getDate()
    days.push(`${dayName} ${dayNum}`)
    
    const dayRevenue = ordersList
      .filter(order => {
        const orderDate = new Date(order.createdAt || order.customer?.createdAt || Date.now())
        return orderDate.toISOString().split('T')[0] === dateStr
      })
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    
    revenues.push(dayRevenue)
  }
  
  return { labels: days, data: revenues }
}

function getMonthlySalesData(ordersList) {
  const months = []
  const revenues = []
  const today = new Date()
  
  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthName = date.toLocaleDateString('fa-IR', { month: 'short' })
    months.push(monthName)
    
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    
    const monthRevenue = ordersList
      .filter(order => {
        const orderDate = new Date(order.createdAt || order.customer?.createdAt || Date.now())
        return orderDate >= monthStart && orderDate <= monthEnd
      })
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    
    revenues.push(monthRevenue)
  }
  
  return { labels: months, data: revenues }
}

function getTopProductsData(ordersList) {
  const productMap = new Map()
  
  ordersList.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productName = item.name || 'Unknown'
        const quantity = item.quantity || 0
        const current = productMap.get(productName) || 0
        productMap.set(productName, current + quantity)
      })
    }
  })
  
  // Sort by quantity and get top 5
  const sorted = Array.from(productMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  
  return {
    labels: sorted.map(([name]) => name),
    data: sorted.map(([, qty]) => qty)
  }
}

function renderSalesChart(period) {
  const ctx = els.salesChart
  if (!ctx) return
  
  const chartData = period === 'daily' 
    ? getDailySalesData(orders)
    : getMonthlySalesData(orders)
  
  // Destroy existing chart if it exists
  if (salesChartInstance) {
    salesChartInstance.destroy()
  }
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const isGray = document.documentElement.getAttribute('data-theme') === 'gray'
  const textColor = isDark || isGray ? 'rgba(235, 235, 245, 0.7)' : 'rgba(60, 60, 67, 0.6)'
  const gridColor = isDark || isGray ? 'rgba(235, 235, 245, 0.1)' : 'rgba(60, 60, 67, 0.1)'
  const accentColor = isDark ? '#0A84FF' : (isGray ? '#5E5CE6' : '#0071E3')
  
  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: t('chartRevenue'),
        data: chartData.data,
        borderColor: accentColor,
        backgroundColor: `${accentColor}20`,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: accentColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDark || isGray ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark || isGray ? 'rgba(235, 235, 245, 0.9)' : 'rgba(60, 60, 67, 0.9)',
          bodyColor: isDark || isGray ? 'rgba(235, 235, 245, 0.7)' : 'rgba(60, 60, 67, 0.7)',
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return `${t('chartRevenue')}: ${formatMoney(context.parsed.y)} ${t('currency')}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            font: {
              size: 12
            },
            callback: function(value) {
              return formatMoney(value)
            }
          },
          grid: {
            color: gridColor
          }
        },
        x: {
          ticks: {
            color: textColor,
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  })
}

function renderProductsChart() {
  const ctx = els.productsChart
  if (!ctx) return
  
  const chartData = getTopProductsData(orders)
  
  if (chartData.labels.length === 0) {
    if (productsChartInstance) {
      productsChartInstance.destroy()
      productsChartInstance = null
    }
    // Keep canvas but show message
    const container = ctx.parentElement
    if (!container.querySelector('.help')) {
      const helpMsg = document.createElement('p')
      helpMsg.className = 'help'
      helpMsg.textContent = t('noProductsData')
      container.appendChild(helpMsg)
    }
    return
  }
  
  // Remove help message if exists
  const helpMsg = ctx.parentElement.querySelector('.help')
  if (helpMsg) {
    helpMsg.remove()
  }
  
  // Destroy existing chart if it exists
  if (productsChartInstance) {
    productsChartInstance.destroy()
  }
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const isGray = document.documentElement.getAttribute('data-theme') === 'gray'
  const textColor = isDark || isGray ? 'rgba(235, 235, 245, 0.7)' : 'rgba(60, 60, 67, 0.6)'
  const gridColor = isDark || isGray ? 'rgba(235, 235, 245, 0.1)' : 'rgba(60, 60, 67, 0.1)'
  
  const colors = [
    '#0071E3', '#34C759', '#FF9500', '#FF3B30', '#5856D6',
    '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00', '#8E8E93'
  ]
  
  productsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: colors.slice(0, chartData.labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: {
              size: 11
            },
            padding: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDark || isGray ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark || isGray ? 'rgba(235, 235, 245, 0.9)' : 'rgba(60, 60, 67, 0.9)',
          bodyColor: isDark || isGray ? 'rgba(235, 235, 245, 0.7)' : 'rgba(60, 60, 67, 0.7)',
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ${value.toLocaleString()} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

async function loadDashboardData() {
  orders = await loadOrders()
  
  const stats = calculateStats(orders)
  renderStats(stats)
  renderRecentOrders(orders)
  renderUnpaidOrders(orders)
  renderSalesChart(currentPeriod)
  renderProductsChart()
}

async function init() {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  if (!isAuthenticated) {
    window.location.href = './login.html'
    return
  }
  
  ui.initI18n()
  
  await loadDashboardData()
  
  // Chart period tabs
  const chartTabs = document.querySelectorAll('.chart-tab')
  chartTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      chartTabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      currentPeriod = tab.getAttribute('data-period')
      renderSalesChart(currentPeriod)
    })
  })
  
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

