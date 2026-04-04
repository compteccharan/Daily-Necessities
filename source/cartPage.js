import { getCurrentUser, getLoginUrl, restoreSession } from './auth.js'
import { calculateCartTotals, getCart, removeFromCart, updateCartQuantity } from './userManager.js'
import { escapeHtml, formatCurrency, imageSrc } from './pageHelpers.js'
import { supabase } from './supabaseClient.js'

let cartItems = []
let realtimeChannel = null

document.addEventListener('DOMContentLoaded', initCartPage)

async function initCartPage() {
  try {
    await restoreSession()
    const user = await getCurrentUser()
    if (!user) {
      window.location.href = getLoginUrl()
      return
    }

    await refreshCart()
    subscribeToCartRealtime(user.id)
    document.getElementById('cart-items-list')?.addEventListener('click', handleCartClick)
  } catch (error) {
    alert(error.message || 'Unable to load cart')
  }
}

function subscribeToCartRealtime(userId) {
  realtimeChannel?.unsubscribe()

  realtimeChannel = supabase
    .channel(`cart-live-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'carts',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refreshCart()
      }
    )
    .subscribe()

  window.addEventListener(
    'beforeunload',
    () => {
      realtimeChannel?.unsubscribe()
    },
    { once: true }
  )
}

async function refreshCart() {
  cartItems = await getCart()
  renderCart()
}

function renderCart() {
  const cartItemsList = document.getElementById('cart-items-list')
  const emptyMessage = document.getElementById('empty-cart-message')

  if (!cartItemsList || !emptyMessage) return

  cartItemsList.innerHTML = ''

  if (cartItems.length === 0) {
    cartItemsList.appendChild(emptyMessage)
    updateSummary([])
    return
  }

  cartItems.forEach((item) => {
    const total = Number(item.price_at_add) * Number(item.quantity)
    const imageMarkup = item.product_image
      ? `<img src="${imageSrc(item.product_image)}" alt="${escapeHtml(item.product_name)}">`
      : `<div style="width:100%;height:100%;background:#e0e0e0;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#999;">Item</div>`

    cartItemsList.insertAdjacentHTML(
      'beforeend',
      `
        <div class="cart-item" data-cart-id="${item.id}">
          <div class="item-image">${imageMarkup}</div>
          <div class="item-details">
            <div class="item-name">${escapeHtml(item.product_name)}</div>
            <div class="item-price">${formatCurrency(item.price_at_add)}</div>
            <div class="item-quantity">
              <button class="quantity-btn decrease-btn" data-cart-id="${item.id}">-</button>
              <div class="quantity-display">${item.quantity}</div>
              <button class="quantity-btn increase-btn" data-cart-id="${item.id}">+</button>
            </div>
            <div class="item-total">Total: ${formatCurrency(total)}</div>
          </div>
          <button class="delete-btn" data-cart-id="${item.id}">Delete</button>
        </div>
      `
    )
  })

  updateSummary(cartItems)
}

async function handleCartClick(event) {
  const target = event.target
  const cartId = target.dataset.cartId
  if (!cartId) return

  const item = cartItems.find((entry) => entry.id === cartId)
  if (!item) return

  const previousCart = [...cartItems]

  try {
    if (target.classList.contains('increase-btn')) {
      cartItems = cartItems.map((entry) =>
        entry.id === cartId ? { ...entry, quantity: Number(entry.quantity) + 1 } : entry
      )
      renderCart()
      await updateCartQuantity(cartId, Number(item.quantity) + 1)
    } else if (target.classList.contains('decrease-btn')) {
      const nextQuantity = Math.max(1, Number(item.quantity) - 1)
      cartItems = cartItems.map((entry) =>
        entry.id === cartId ? { ...entry, quantity: nextQuantity } : entry
      )
      renderCart()
      await updateCartQuantity(cartId, nextQuantity)
    } else if (target.classList.contains('delete-btn')) {
      if (!window.confirm('Are you sure you want to delete this item?')) return
      cartItems = cartItems.filter((entry) => entry.id !== cartId)
      renderCart()
      await removeFromCart(cartId)
    } else {
      return
    }

    await refreshCart()
  } catch (error) {
    cartItems = previousCart
    renderCart()
    alert(error.message || 'Unable to update cart')
  }
}

function updateSummary(items) {
  const totals = calculateCartTotals(items)
  document.getElementById('subtotal').textContent = formatCurrency(totals.subtotal)
  document.getElementById('delivery-fee').textContent = totals.deliveryFee === 0 ? 'Free' : formatCurrency(totals.deliveryFee)
  document.getElementById('tax').textContent = formatCurrency(totals.tax)
  document.getElementById('total-amount').textContent = formatCurrency(totals.total)
  document.getElementById('checkout-btn').disabled = items.length === 0
}

window.proceedToCheckout = function proceedToCheckout() {
  if (cartItems.length === 0) {
    alert('Your cart is empty')
    return
  }

  sessionStorage.setItem('cartItems', JSON.stringify(cartItems))
  sessionStorage.setItem('cartTotal', String(calculateCartTotals(cartItems).total))
  window.location.href = '/Daily-Necessities/checkout.html'
}
