const { storage, logic, ui } = window.PhotoTools
const { loadOrders, saveOrders } = storage
const { formatMoney } = logic
const { $, setText, setHidden, escapeHtml } = ui
const t = window.i18n?.t || ((k) => k)

const els = {
  filterSearch: $('#filterSearch'),
  filterPaymentStatus: $('#filterPaymentStatus'),
  filterDateRange: $('#filterDateRange'),
  filterSortBy: $('#filterSortBy'),
  filterDateFrom: $('#filterDateFrom'),
  filterDateTo: $('#filterDateTo'),
  customDateRange: $('#customDateRange'),
  clearFiltersBtn: $('#clearFiltersBtn'),
  filterResults: $('#filterResults'),
  ordersList: $('#ordersList'),
  ordersContent: $('#ordersContent'),
  ordersCount: $('#ordersCount'),
  sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebarToggle'),
  logoutBtn: $('#logoutBtn')
}

let orders = []
let filteredOrders = []
let currentViewMode = localStorage.getItem('ordersViewMode') || 'list'

function getTodayDate() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

function getDateRange(range) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (range) {
    case 'today':
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
      }
    case 'week':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return {
        start: weekStart.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
      }
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
      return {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString()
      }
    case 'custom':
      const from = els.filterDateFrom.value
      const to = els.filterDateTo.value
      if (from && to) {
        return {
          start: new Date(from).toISOString(),
          end: new Date(to + 'T23:59:59').toISOString()
        }
      }
      return null
    default:
      return null
  }
}

function filterOrders() {
  const searchTerm = els.filterSearch.value.toLowerCase().trim()
  const paymentStatus = els.filterPaymentStatus.value
  const dateRange = els.filterDateRange.value
  const sortBy = els.filterSortBy.value
  
  filteredOrders = orders.filter(order => {
    // Search filter
    if (searchTerm) {
      const customerName = (order.customer?.lastName || '').toLowerCase()
      const customerPhone = (order.customer?.phone || '').toLowerCase()
      const orderId = (order.id || '').toLowerCase()
      const itemsText = (order.items || [])
        .map(item => (item.name || '').toLowerCase())
        .join(' ')
      
      if (!customerName.includes(searchTerm) && 
          !customerPhone.includes(searchTerm) &&
          !orderId.includes(searchTerm) &&
          !itemsText.includes(searchTerm)) {
        return false
      }
    }
    
    // Payment status filter
    if (paymentStatus !== 'all') {
      const total = order.totalAmount || 0
      const remaining = order.remainingAmount !== undefined 
        ? order.remainingAmount 
        : (total - (order.deposit || 0))
      
      if (paymentStatus === 'paid' && remaining > 0) {
        return false
      }
      if (paymentStatus === 'unpaid' && remaining <= 0) {
        return false
      }
    }
    
    // Date range filter
    if (dateRange !== 'all') {
      const dateRangeObj = getDateRange(dateRange)
      if (dateRangeObj) {
        const orderDate = new Date(order.createdAt || order.customer?.createdAt || Date.now())
        if (orderDate < new Date(dateRangeObj.start) || orderDate > new Date(dateRangeObj.end)) {
          return false
        }
      }
    }
    
    return true
  })
  
  // Sort
  filteredOrders.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      case 'amount-high':
        return (b.totalAmount || 0) - (a.totalAmount || 0)
      case 'amount-low':
        return (a.totalAmount || 0) - (b.totalAmount || 0)
      default:
        return 0
    }
  })
  
  renderOrders()
  updateFilterResults()
}

function renderOrders() {
  if (filteredOrders.length === 0) {
    els.ordersContent.innerHTML = `<p class="help">${t('noOrdersFound')}</p>`
    return
  }
  
  switch (currentViewMode) {
    case 'table':
      renderTableView()
      break
    case 'card':
      renderCardView()
      break
    default:
      renderListView()
  }
  
  attachOrderActions()
  updateViewModeButtons()
}

function renderListView() {
  const rows = filteredOrders.map((order, index) => {
    const itemText = (order.items || [])
      .map(it => `${it.name || ''} × ${it.quantity || 0}`)
      .join(', ')
    
    const date = new Date(order.createdAt || order.customer?.createdAt || Date.now())
    const dateStr = date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const currency = t('currency')
    const total = formatMoney(order.totalAmount || 0)
    const deposit = formatMoney(order.deposit || 0)
    const totalAmount = order.totalAmount || 0
    const depositAmount = order.deposit || 0
    const remainingAmount = order.remainingAmount !== undefined 
      ? order.remainingAmount 
      : (totalAmount - depositAmount)
    const remaining = formatMoney(remainingAmount)
    const isSettled = remainingAmount <= 0 && totalAmount > 0
    
    const actionsHtml = `
      <div class="actions">
        <button class="btn" data-action="receipt" data-order-id="${escapeHtml(order.id)}" type="button">${t('printReceipt')}</button>
        <button class="btn" data-action="edit" data-order-id="${escapeHtml(order.id)}" type="button">${t('editOrder')}</button>
        <button class="btn danger" data-action="delete" data-order-id="${escapeHtml(order.id)}" type="button">${t('deleteOrder')}</button>
        ${!isSettled ? `<button class="btn primary" data-action="settle" data-order-id="${escapeHtml(order.id)}" type="button">${t('settlePayment')}</button>` : ''}
      </div>
    `
    
    return `
      <div class="item" data-order-id="${escapeHtml(order.id)}" style="--item-index: ${index}">
        <div class="meta">
          <div class="title">${escapeHtml(order.customer?.lastName || '')}</div>
          <div class="sub">${escapeHtml(order.customer?.phone || '')}</div>
          <div class="sub">${escapeHtml(dateStr)}</div>
          <div class="sub">${escapeHtml(itemText)}</div>
          <div class="sub" style="margin-top: 8px">
            <span style="color: var(--accent); font-weight: 600">${t('totalAmount')}: ${total} ${currency}</span>
            ${depositAmount > 0 ? `<span style="margin-left: 12px">${t('deposit')}: ${deposit} ${currency}</span>` : ''}
          </div>
          ${!isSettled ? 
            `<div class="sub" style="color: var(--danger); margin-top: 4px; font-weight: 600">${t('remainingAmount')}: ${remaining} ${currency}</div>` : 
            `<div class="sub" style="color: var(--ok); margin-top: 4px; font-weight: 600">${t('settled')}</div>`
          }
        </div>
        ${actionsHtml}
      </div>
    `
  }).join('')
  
  els.ordersContent.innerHTML = `<div class="list scrollable-orders" id="ordersList">${rows}</div>`
  els.ordersList = $('#ordersList')
}

function renderTableView() {
  const tableRows = filteredOrders.map((order, index) => {
    const itemText = (order.items || [])
      .map(it => `${it.name || ''} × ${it.quantity || 0}`)
      .join(', ')
    
    const date = new Date(order.createdAt || order.customer?.createdAt || Date.now())
    const dateStr = date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const currency = t('currency')
    const total = formatMoney(order.totalAmount || 0)
    const deposit = formatMoney(order.deposit || 0)
    const totalAmount = order.totalAmount || 0
    const depositAmount = order.deposit || 0
    const remainingAmount = order.remainingAmount !== undefined 
      ? order.remainingAmount 
      : (totalAmount - depositAmount)
    const remaining = formatMoney(remainingAmount)
    const isSettled = remainingAmount <= 0 && totalAmount > 0
    
    return `
      <tr class="table-row" data-order-id="${escapeHtml(order.id)}" style="--item-index: ${index}">
        <td class="table-cell table-cell-name">
          <div class="table-cell-content">
            <div class="table-cell-title">${escapeHtml(order.customer?.lastName || '')}</div>
            <div class="table-cell-sub">${escapeHtml(order.customer?.phone || '')}</div>
          </div>
        </td>
        <td class="table-cell table-cell-date">${escapeHtml(dateStr)}</td>
        <td class="table-cell table-cell-items">${escapeHtml(itemText)}</td>
        <td class="table-cell table-cell-amount">
          <div class="table-cell-content">
            <div class="table-cell-title">${total} ${currency}</div>
            ${depositAmount > 0 ? `<div class="table-cell-sub">${t('deposit')}: ${deposit} ${currency}</div>` : ''}
          </div>
        </td>
        <td class="table-cell table-cell-status">
          ${!isSettled ? 
            `<span class="status-badge status-unpaid">${t('unpaid')}</span>` : 
            `<span class="status-badge status-paid">${t('settled')}</span>`
          }
        </td>
        <td class="table-cell table-cell-actions">
          <div class="table-actions">
            <button class="btn-icon" data-action="receipt" data-order-id="${escapeHtml(order.id)}" type="button" title="${t('printReceipt')}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 2H12V4H4V2ZM4 4V12H12V4M4 12H2V14H14V12H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-icon" data-action="edit" data-order-id="${escapeHtml(order.id)}" type="button" title="${t('editOrder')}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.3333 2.66667C11.5084 2.49157 11.7163 2.40402 11.9569 2.40402C12.1975 2.40402 12.4054 2.49157 12.5805 2.66667C12.7556 2.84178 12.8431 3.04972 12.8431 3.29048C12.8431 3.53124 12.7556 3.73918 12.5805 3.91429L4.24719 12.2476L2 13.3333L3.08571 11.0857L11.3333 2.66667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            ${!isSettled ? 
              `<button class="btn-icon btn-icon-primary" data-action="settle" data-order-id="${escapeHtml(order.id)}" type="button" title="${t('settlePayment')}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>` : ''
            }
            <button class="btn-icon btn-icon-danger" data-action="delete" data-order-id="${escapeHtml(order.id)}" type="button" title="${t('deleteOrder')}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V13.3333C12 13.687 11.8595 14.0261 11.6095 14.2761C11.3594 14.5262 11.0203 14.6667 10.6667 14.6667H5.33333C4.97971 14.6667 4.64057 14.5262 4.39052 14.2761C4.14048 14.0261 4 13.687 4 13.3333V4M6 4V2.66667C6 2.31305 6.14048 1.97391 6.39052 1.72386C6.64057 1.47381 6.97971 1.33333 7.33333 1.33333H8.66667C9.02029 1.33333 9.35943 1.47381 9.60948 1.72386C9.85952 1.97391 10 2.31305 10 2.66667V4M2 4H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `
  }).join('')
  
  const tableHtml = `
    <div class="table-container scrollable-orders">
      <table class="orders-table">
        <thead>
          <tr>
            <th class="table-header table-header-name" data-i18n="customerName">Customer</th>
            <th class="table-header table-header-date" data-i18n="orderDate">Date</th>
            <th class="table-header table-header-items" data-i18n="items">Items</th>
            <th class="table-header table-header-amount" data-i18n="totalAmount">Amount</th>
            <th class="table-header table-header-status" data-i18n="paymentStatus">Status</th>
            <th class="table-header table-header-actions" data-i18n="actions">Actions</th>
          </tr>
        </thead>
        <tbody id="ordersList">
          ${tableRows}
        </tbody>
      </table>
    </div>
  `
  
  els.ordersContent.innerHTML = tableHtml
  els.ordersList = $('#ordersList')
}

function renderCardView() {
  const cards = filteredOrders.map((order, index) => {
    const itemText = (order.items || [])
      .map(it => `${it.name || ''} × ${it.quantity || 0}`)
      .join(', ')
    
    const date = new Date(order.createdAt || order.customer?.createdAt || Date.now())
    const dateStr = date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const currency = t('currency')
    const total = formatMoney(order.totalAmount || 0)
    const deposit = formatMoney(order.deposit || 0)
    const totalAmount = order.totalAmount || 0
    const depositAmount = order.deposit || 0
    const remainingAmount = order.remainingAmount !== undefined 
      ? order.remainingAmount 
      : (totalAmount - depositAmount)
    const remaining = formatMoney(remainingAmount)
    const isSettled = remainingAmount <= 0 && totalAmount > 0
    
    return `
      <div class="order-card" data-order-id="${escapeHtml(order.id)}" style="--item-index: ${index}">
        <div class="order-card-header">
          <div class="order-card-title">
            <h3>${escapeHtml(order.customer?.lastName || '')}</h3>
            <div class="order-card-subtitle">${escapeHtml(order.customer?.phone || '')}</div>
          </div>
          ${!isSettled ? 
            `<span class="status-badge status-unpaid">${t('unpaid')}</span>` : 
            `<span class="status-badge status-paid">${t('settled')}</span>`
          }
        </div>
        <div class="order-card-body">
          <div class="order-card-row">
            <span class="order-card-label">${t('orderDate')}:</span>
            <span class="order-card-value">${escapeHtml(dateStr)}</span>
          </div>
          <div class="order-card-row">
            <span class="order-card-label">${t('items')}:</span>
            <span class="order-card-value">${escapeHtml(itemText)}</span>
          </div>
          <div class="order-card-row">
            <span class="order-card-label">${t('totalAmount')}:</span>
            <span class="order-card-value order-card-amount">${total} ${currency}</span>
          </div>
          ${depositAmount > 0 ? `
            <div class="order-card-row">
              <span class="order-card-label">${t('deposit')}:</span>
              <span class="order-card-value">${deposit} ${currency}</span>
            </div>
          ` : ''}
          ${!isSettled ? `
            <div class="order-card-row">
              <span class="order-card-label">${t('remainingAmount')}:</span>
              <span class="order-card-value order-card-remaining">${remaining} ${currency}</span>
            </div>
          ` : ''}
        </div>
        <div class="order-card-actions">
          <button class="btn" data-action="receipt" data-order-id="${escapeHtml(order.id)}" type="button">${t('printReceipt')}</button>
          <button class="btn" data-action="edit" data-order-id="${escapeHtml(order.id)}" type="button">${t('editOrder')}</button>
          ${!isSettled ? `<button class="btn primary" data-action="settle" data-order-id="${escapeHtml(order.id)}" type="button">${t('settlePayment')}</button>` : ''}
          <button class="btn danger" data-action="delete" data-order-id="${escapeHtml(order.id)}" type="button">${t('deleteOrder')}</button>
        </div>
      </div>
    `
  }).join('')
  
  els.ordersContent.innerHTML = `<div class="orders-grid scrollable-orders" id="ordersList">${cards}</div>`
  els.ordersList = $('#ordersList')
}

function updateViewModeButtons() {
  const buttons = document.querySelectorAll('.view-mode-btn')
  buttons.forEach(btn => {
    if (btn.getAttribute('data-view') === currentViewMode) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })
  
  // Update container class
  if (els.ordersContent) {
    els.ordersContent.className = 'orders-content'
    els.ordersContent.classList.add(`view-${currentViewMode}`)
  }
  
  // Update i18n for table headers
  if (currentViewMode === 'table') {
    setTimeout(() => {
      ui.initI18n()
    }, 0)
  }
}

function attachOrderActions() {
  const actionButtons = els.ordersList.querySelectorAll('[data-action]')
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-action')
      const orderId = btn.getAttribute('data-order-id')
      handleOrderAction(action, orderId)
    })
  })
}

function handleOrderAction(action, orderId) {
  const order = orders.find(o => o.id === orderId)
  if (!order) return
  
  switch (action) {
    case 'receipt':
      window.location.href = `./receipt.html?orderId=${encodeURIComponent(orderId)}`
      break
    case 'edit':
      window.location.href = `./index.html?edit=${encodeURIComponent(orderId)}`
      break
    case 'delete':
      if (confirm(t('deleteOrderConfirm') || 'Are you sure you want to delete this order?')) {
        deleteOrder(orderId)
      }
      break
    case 'settle':
      if (confirm(t('settleOrderConfirm') || 'Mark this order as settled?')) {
        settleOrder(orderId)
      }
      break
  }
}

async function deleteOrder(orderId) {
  orders = orders.filter(o => o.id !== orderId)
  await saveOrders(orders)
  filterOrders()
}

async function settleOrder(orderId) {
  const order = orders.find(o => o.id === orderId)
  if (order) {
    order.remainingAmount = 0
    if (!order.history) order.history = []
    order.history.push({
      action: 'settled',
      date: new Date().toISOString()
    })
    await saveOrders(orders)
    filterOrders()
  }
}

function updateFilterResults() {
  const total = orders.length
  const filtered = filteredOrders.length
  const isFiltered = total !== filtered
  
  if (isFiltered) {
    els.filterResults.textContent = `${filtered} ${t('of')} ${total} ${t('orders')}`
  } else {
    els.filterResults.textContent = `${total} ${t('orders')}`
  }
  
  els.ordersCount.textContent = `${filtered} ${t('orders')}`
}

function clearFilters() {
  els.filterSearch.value = ''
  els.filterPaymentStatus.value = 'all'
  els.filterDateRange.value = 'all'
  els.filterSortBy.value = 'newest'
  els.filterDateFrom.value = ''
  els.filterDateTo.value = ''
  els.customDateRange.style.display = 'none'
  filterOrders()
}

async function loadOrdersData() {
  orders = await loadOrders()
  filteredOrders = orders
  filterOrders()
}

async function init() {
  const { auth } = window.PhotoTools
  const isValid = await auth.checkAuthToken()
  if (!isValid) {
    auth.logout()
    return
  }
  
  ui.initI18n()
  auth.initSessionTimeout()
  
  await loadOrdersData()
  
  // View mode toggle
  const viewModeButtons = document.querySelectorAll('.view-mode-btn')
  viewModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewMode = btn.getAttribute('data-view')
      currentViewMode = viewMode
      localStorage.setItem('ordersViewMode', viewMode)
      renderOrders()
    })
  })
  
  // Initialize view mode
  updateViewModeButtons()
  
  // Filter event listeners
  els.filterSearch.addEventListener('input', filterOrders)
  els.filterPaymentStatus.addEventListener('change', filterOrders)
  els.filterDateRange.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      els.customDateRange.style.display = 'block'
    } else {
      els.customDateRange.style.display = 'none'
      filterOrders()
    }
  })
  els.filterDateFrom.addEventListener('change', filterOrders)
  els.filterDateTo.addEventListener('change', filterOrders)
  els.filterSortBy.addEventListener('change', filterOrders)
  els.clearFiltersBtn.addEventListener('click', clearFilters)
  
  // Sidebar
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      const confirmMsg = t('logoutConfirm') || 'Are you sure you want to logout?'
      if (confirm(confirmMsg)) {
        const { auth } = window.PhotoTools
        auth.logout()
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
