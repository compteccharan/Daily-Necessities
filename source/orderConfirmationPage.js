import { getCurrentUser, getLoginUrl, restoreSession } from './auth.js'
import { getOrderById } from './userManager.js'
import { escapeHtml, formatCurrency, formatDateLabel, formatDateTime, formatPaymentMethod, formatPaymentStatus, imageSrc } from './pageHelpers.js'

document.addEventListener('DOMContentLoaded', initConfirmationPage)

async function initConfirmationPage() {
  try {
    await restoreSession()
    const user = await getCurrentUser()
    if (!user) {
      window.location.href = getLoginUrl()
      return
    }

    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order')
    const storedOrder = JSON.parse(sessionStorage.getItem('lastOrder') || 'null')

    let order = storedOrder
    if (orderId && (!order || order.id !== orderId)) {
      order = await getOrderById(orderId)
    } else if (order?.id) {
      orderId && history.replaceState({}, document.title, `order-confirmation.html?order=${order.id}`)
    }

    if (!order?.id) {
      window.location.href = 'index.html'
      return
    }

    renderOrder(order)
  } catch (error) {
    console.error('Unable to load order confirmation:', error.message)
    window.location.href = 'index.html'
  }
}

function renderOrder(order) {
  document.getElementById('order-id').textContent = order.id
  document.getElementById('delivery-date').textContent = formatDateLabel(order.estimated_delivery_at)
  document.getElementById('order-placed').textContent = formatDateTime(order.placed_at)
  document.getElementById('payment-method').textContent = formatPaymentMethod(order.payment_method)
  document.getElementById('payment-status').textContent = formatPaymentStatus(order.payment_status)
  document.getElementById('subtotal').textContent = formatCurrency(order.subtotal)
  document.getElementById('tax').textContent = formatCurrency(order.tax)
  document.getElementById('delivery').textContent = order.deliveryFee === 0 ? 'Free' : formatCurrency(order.deliveryFee)
  document.getElementById('total').textContent = formatCurrency(order.total)
  document.getElementById('delivery-name').textContent = order.deliveryInfo?.name || '-'
  document.getElementById('delivery-address').textContent = order.deliveryInfo?.addressText || order.delivery_address_text || '-'
  document.getElementById('delivery-phone').textContent = `Phone: ${order.deliveryInfo?.phone || '-'}`

  const itemsList = document.getElementById('items-list')
  itemsList.innerHTML = ''
  order.items.forEach((item) => {
    itemsList.insertAdjacentHTML(
      'beforeend',
      `
        <div class="order-item">
          <div class="item-info">
            ${item.product_image ? `<img src="${imageSrc(item.product_image)}" alt="${escapeHtml(item.product_name)}" class="item-image">` : `<div class="item-image"></div>`}
            <div>
              <div class="item-name">${escapeHtml(item.product_name)}</div>
              <div class="item-qty">Qty: ${item.quantity}</div>
            </div>
          </div>
          <div class="item-price">${formatCurrency(Number(item.price) * Number(item.quantity))}</div>
        </div>
      `
    )
  })
}
