const { storage, logic, ui, auth } = window.PhotoTools
const { loadOrders } = storage
const { formatMoney, formatDateFa, statusLabel } = logic
const { $, setText, setHidden, escapeHtml, setupSidebar } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  statTotalOrders: $('#statTotalOrders'),
  statTodayOrders: $('#statTodayOrders'),
  statUnpaidOrders: $('#statUnpaidOrders'),
  statTotalRevenue: $('#statTotalRevenue'),
  statCollected: $('#statCollected'),
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
  return new Date().toISOString().split('T')[0]
}

function calculateStats(ordersList) {
  const today = getTodayDate()
  const stats = {
    totalOrders: ordersList.length,
    todayOrders: 0,
    unpaidOrders: 0,
    totalRevenue: 0,
    collected: 0,
    totalCustomers: new Set(),
    remainingAmount: 0
  }

  ordersList.forEach(order => {
    const orderDate = new Date(order.createdAt || Date.now())
    const orderDateStr = orderDate.toISOString().split('T')[0]
    if (orderDateStr === today) stats.todayOrders++

    const total = order.totalAmount || 0
    const deposit = order.deposit || 0
    const remaining = order.remainingAmount !== undefined ? order.remainingAmount : Math.max(0, total - deposit)

    stats.totalRevenue += total
    stats.collected += deposit
    if (order.customer?.phone) stats.totalCustomers.add(order.customer.phone)
    if (remaining > 0) {
      stats.unpaidOrders++
      stats.remainingAmount += remaining
    }
  })

  return stats
}

function setMoneyStat(el, amount) {
  if (!el) return
  el.classList.add('is-money')
  el.innerHTML = `<span class="money-amount">${formatMoney(amount)}</span><span class="money-unit">${t('currency')}</span>`
}

function renderStats(stats) {
  if (els.statTotalOrders) els.statTotalOrders.textContent = stats.totalOrders.toLocaleString('en-US')
  if (els.statTodayOrders) els.statTodayOrders.textContent = stats.todayOrders.toLocaleString('en-US')
  if (els.statUnpaidOrders) els.statUnpaidOrders.textContent = stats.unpaidOrders.toLocaleString('en-US')
  if (els.statTotalCustomers) els.statTotalCustomers.textContent = stats.totalCustomers.size.toLocaleString('en-US')
  setMoneyStat(els.statTotalRevenue, stats.totalRevenue)
  setMoneyStat(els.statCollected, stats.collected)
  setMoneyStat(els.statRemainingAmount, stats.remainingAmount)
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

  els.recentOrdersList.innerHTML = recent.map(order => `
    <a class="item" href="./orders.html?id=${encodeURIComponent(order.id)}" style="text-decoration:none;color:inherit">
      <div class="meta">
        <div class="title">${escapeHtml(order.customer?.lastName || '')}</div>
        <div class="sub">${escapeHtml(formatDateFa(order.createdAt))} — ${escapeHtml(statusLabel(order.status, t))}</div>
        <div class="sub"><span class="money-ltr">${formatMoney(order.totalAmount || 0)}</span> ${t('currency')}</div>
      </div>
    </a>
  `).join('')
}

function renderUnpaidOrders(ordersList) {
  const unpaid = ordersList
    .filter(order => (order.remainingAmount || 0) > 0)
    .sort((a, b) => (b.remainingAmount || 0) - (a.remainingAmount || 0))
    .slice(0, 5)

  if (unpaid.length === 0) {
    els.unpaidOrdersList.innerHTML = `<p class="help">${t('noUnpaidOrders')}</p>`
    return
  }

  els.unpaidOrdersList.innerHTML = unpaid.map(order => `
    <a class="item" href="./orders.html?unpaid=1&q=${encodeURIComponent(order.customer?.phone || '')}" style="text-decoration:none;color:inherit">
      <div class="meta">
        <div class="title">${escapeHtml(order.customer?.lastName || '')}</div>
        <div class="sub">${escapeHtml(formatDateFa(order.createdAt))}</div>
        <div class="sub order-balance is-remaining">
          ${t('remainingAmount')}: <span class="money-ltr">${formatMoney(order.remainingAmount || 0)}</span> ${t('currency')}
        </div>
      </div>
    </a>
  `).join('')
}

async function loadDashboardData() {
  orders = await loadOrders()
  const stats = calculateStats(orders)
  renderStats(stats)
  renderRecentOrders(orders)
  renderUnpaidOrders(orders)
}

async function init() {
  const me = await auth.requireAuth()
  if (!me) return
  if (me.mustChangePassword) {
    window.location.href = './settings.html'
    return
  }

  ui.initI18n()
  setupSidebar(els, t)
  await loadDashboardData()
  setInterval(loadDashboardData, 30000)

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (confirm(t('logoutConfirm'))) auth.logout()
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
