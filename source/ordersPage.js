import { getCurrentUser, getLoginUrl, restoreSession } from './auth.js'
import { getOrders } from './userManager.js'
import { escapeHtml, formatCurrency, formatDateLabel, formatPaymentMethod, formatPaymentStatus } from './pageHelpers.js'

document.addEventListener('DOMContentLoaded', initOrdersPage)

async function initOrdersPage() {
  try {
    await restoreSession()
    const user = await getCurrentUser()
    if (!user) {
      window.location.href = getLoginUrl()
      return
    }

    const orders = await getOrders()
    renderOrders(orders)
  } catch (error) {
    alert(error.message || 'Unable to load orders')
  }
}

function renderOrders(orders) {
  const list = document.getElementById('orders-list')
  const empty = document.getElementById('empty-orders')

  if (!list || !empty) return

  list.innerHTML = ''

  if (orders.length === 0) {
    empty.style.display = 'block'
    return
  }

  empty.style.display = 'none'

  orders.forEach((order) => {
    list.insertAdjacentHTML(
      'beforeend',
      `
        <article class="order-card">
          <div class="order-card-header">
            <div>
              <h2>Order ${escapeHtml(order.id)}</h2>
              <p>Placed ${formatDateLabel(order.placed_at)}</p>
            </div>
            <a class="receipt-link" href="order-confirmation.html?order=${order.id}">View Receipt</a>
          </div>
          <div class="order-meta-grid">
            <div><span class="meta-label">ETA</span><span>${formatDateLabel(order.estimated_delivery_at)}</span></div>
            <div><span class="meta-label">Payment</span><span>${formatPaymentMethod(order.payment_method)}</span></div>
            <div><span class="meta-label">Payment Status</span><span>${formatPaymentStatus(order.payment_status)}</span></div>
            <div><span class="meta-label">Total</span><span>${formatCurrency(order.total_price || order.total)}</span></div>
          </div>
          <p class="order-address">${escapeHtml(order.delivery_address_text || '-')}</p>
        </article>
      `
    )
  })
}
