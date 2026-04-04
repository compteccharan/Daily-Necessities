import { getCurrentUser, getCurrentSession, getLoginUrl, getUserProfile, restoreSession, saveUserProfile } from './auth.js'
import { calculateCartTotals, createOrderFromCart, getCart } from './userManager.js'
import { escapeHtml, formatCurrency } from './pageHelpers.js'

let cartItems = []
let currentUser = null

document.addEventListener('DOMContentLoaded', initCheckoutPage)

async function initCheckoutPage() {
  try {
    await restoreSession()
    currentUser = await getCurrentUser()

    if (!currentUser) {
      window.location.href = getLoginUrl()
      return
    }

    cartItems = await getCart()
    if (cartItems.length === 0) {
      const storedCart = JSON.parse(sessionStorage.getItem('cartItems') || '[]')
      cartItems = storedCart
    }

    if (cartItems.length === 0) {
      alert('No items in cart')
      window.location.href = '/Daily-Necessities/cart.html'
      return
    }

    renderOrderSummary()
    await prefillUserInfo()
    bindPaymentMethodFields()
    document.getElementById('checkout-form')?.addEventListener('submit', placeOrder)
  } catch (error) {
    showError(error.message || 'Unable to load checkout')
  }
}

function renderOrderSummary() {
  const summary = document.getElementById('order-items-summary')
  if (!summary) return

  summary.innerHTML = ''
  cartItems.forEach((item) => {
    const itemTotal = Number(item.price_at_add) * Number(item.quantity)
    summary.insertAdjacentHTML(
      'beforeend',
      `
        <div class="order-item">
          <span>${escapeHtml(item.product_name)} x${item.quantity}</span>
          <span>${formatCurrency(itemTotal)}</span>
        </div>
      `
    )
  })

  const totals = calculateCartTotals(cartItems)
  document.getElementById('summary-subtotal').textContent = formatCurrency(totals.subtotal)
  document.getElementById('summary-tax').textContent = formatCurrency(totals.tax)
  document.getElementById('summary-delivery').textContent = totals.deliveryFee === 0 ? 'Free' : formatCurrency(totals.deliveryFee)
  document.getElementById('summary-total').textContent = formatCurrency(totals.total)
}

async function prefillUserInfo() {
  const profile = await getUserProfile()
  const session = await getCurrentSession()

  document.getElementById('name').value = profile?.name || currentUser.user_metadata?.full_name || ''
  document.getElementById('phone').value = profile?.phone || currentUser.user_metadata?.phone || ''
  document.getElementById('email').value = currentUser.email || session?.user?.email || ''
}

function bindPaymentMethodFields() {
  const radios = document.querySelectorAll('input[name="payment_method"]')
  radios.forEach((radio) => radio.addEventListener('change', updatePaymentFields))
  updatePaymentFields()
}

function updatePaymentFields() {
  const method = document.querySelector('input[name="payment_method"]:checked')?.value
  const cardFields = document.getElementById('card-payment-fields')
  const upiFields = document.getElementById('upi-payment-fields')

  if (cardFields) cardFields.style.display = method === 'card' ? 'block' : 'none'
  if (upiFields) upiFields.style.display = method === 'upi' ? 'block' : 'none'
}

function buildPaymentPayload(paymentMethod) {
  if (paymentMethod === 'cod') {
    return {
      status: 'pay_on_delivery',
      reference: '',
    }
  }

  if (paymentMethod === 'card') {
    const cardName = document.getElementById('card-name').value.trim()
    const cardNumber = document.getElementById('card-number').value.replace(/\s+/g, '')
    const cardExpiry = document.getElementById('card-expiry').value.trim()
    const cardCvv = document.getElementById('card-cvv').value.trim()

    if (!cardName || cardNumber.length < 12 || !cardExpiry || cardCvv.length < 3) {
      throw new Error('Enter valid demo card details')
    }

    return {
      status: 'paid_demo',
      reference: `CARD-DEMO-${cardNumber.slice(-4)}`,
    }
  }

  if (paymentMethod === 'upi') {
    const upiId = document.getElementById('upi-id').value.trim()
    if (!/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
      throw new Error('Enter a valid demo UPI ID')
    }

    const parts = upiId.split('@')
    return {
      status: 'paid_demo',
      reference: `UPI-DEMO-${parts[0].slice(0, 3)}***@${parts[1]}`,
    }
  }

  throw new Error('Select a payment method')
}

async function placeOrder(event) {
  event.preventDefault()
  hideMessages()

  const deliveryInfo = {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    zipcode: document.getElementById('zipcode').value.trim(),
  }

  if (Object.values(deliveryInfo).some((value) => !value)) {
    showError('Please fill in all required fields')
    return
  }

  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value
  const button = document.getElementById('place-order-btn')

  try {
    const payment = buildPaymentPayload(paymentMethod)
    button.disabled = true
    button.textContent = 'Placing Order...'

    await saveUserProfile({ name: deliveryInfo.name, phone: deliveryInfo.phone })

    const order = await createOrderFromCart({
      cartItems,
      deliveryInfo,
      paymentMethod,
      paymentStatus: payment.status,
      paymentReference: payment.reference,
    })

    sessionStorage.setItem('lastOrder', JSON.stringify(order))
    sessionStorage.removeItem('cartItems')
    sessionStorage.removeItem('cartTotal')

    window.location.href = `/Daily-Necessities/order-confirmation.html?order=${order.id}`
  } catch (error) {
    showError(error.message || 'Unable to place order')
    button.disabled = false
    button.textContent = 'Place Order'
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error-message')
  errorDiv.textContent = message
  errorDiv.style.display = 'block'
}

function hideMessages() {
  document.getElementById('error-message').style.display = 'none'
  document.getElementById('success-message').style.display = 'none'
}

window.goBackToCart = function goBackToCart() {
  window.location.href = '/Daily-Necessities/cart.html'
}
