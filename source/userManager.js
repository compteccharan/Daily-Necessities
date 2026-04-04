import { supabase } from './supabaseClient.js'
import { getCurrentUser } from './auth.js'
import { enrichItemWithCatalog } from './catalog.js'

const DEMO_ETA_MINUTES = 30

function isMissingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return message.includes('column') && (message.includes('does not exist') || message.includes('schema cache'))
}

function addMinutes(isoString, minutes) {
  return new Date(new Date(isoString).getTime() + minutes * 60 * 1000).toISOString()
}

export function calculateCartTotals(items = []) {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price_at_add ?? item.price ?? 0)
    return sum + price * Number(item.quantity || 0)
  }, 0)
  const tax = subtotal * 0.05
  const deliveryFee = 0
  const total = subtotal + tax + deliveryFee

  return { subtotal, tax, deliveryFee, total }
}

function coerceProductInput(productOrId, productName, quantity, price, productImage) {
  if (typeof productOrId === 'object' && productOrId !== null) {
    return {
      productId: productOrId.id,
      productName: productOrId.name,
      quantity: quantity ?? 1,
      price: Number(productOrId.price ?? 0),
      productImage: productOrId.image || '',
    }
  }

  return {
    productId: productOrId,
    productName,
    quantity: quantity ?? 1,
    price: Number(price ?? 0),
    productImage: productImage || '',
  }
}

function buildDeliveryAddressText(deliveryInfo) {
  return [deliveryInfo.address, deliveryInfo.city, deliveryInfo.state]
    .filter(Boolean)
    .join(', ')
    .concat(deliveryInfo.zipcode ? ` - ${deliveryInfo.zipcode}` : '')
}

function buildLegacyOrderEnvelope({ deliveryInfo, paymentMethod, paymentStatus, paymentReference, placedAt, estimatedDeliveryAt }) {
  return JSON.stringify({
    __verdailLegacyOrder: true,
    addressText: buildDeliveryAddressText(deliveryInfo),
    customer: {
      name: deliveryInfo.name,
      phone: deliveryInfo.phone,
      email: deliveryInfo.email,
    },
    payment: {
      method: paymentMethod,
      status: paymentStatus,
      reference: paymentReference || '',
    },
    placedAt,
    estimatedDeliveryAt,
    status: 'confirmed',
  })
}

function parseLegacyOrderEnvelope(value) {
  if (!value || !value.trim?.().startsWith('{')) {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    return parsed?.__verdailLegacyOrder ? parsed : null
  } catch (error) {
    return null
  }
}

function normalizeOrderRow(row) {
  const legacy = parseLegacyOrderEnvelope(row.delivery_address || '')

  return {
    ...row,
    delivery_address_text: legacy?.addressText || row.delivery_address || '',
    customer_name: row.customer_name || legacy?.customer?.name || '',
    customer_phone: row.customer_phone || legacy?.customer?.phone || '',
    customer_email: row.customer_email || legacy?.customer?.email || '',
    payment_method: row.payment_method || legacy?.payment?.method || 'cod',
    payment_status: row.payment_status || legacy?.payment?.status || 'pay_on_delivery',
    payment_reference: row.payment_reference || legacy?.payment?.reference || '',
    placed_at: row.placed_at || legacy?.placedAt || row.created_at,
    estimated_delivery_at:
      row.estimated_delivery_at || legacy?.estimatedDeliveryAt || addMinutes(row.created_at || new Date().toISOString(), DEMO_ETA_MINUTES),
    status: row.status || legacy?.status || 'confirmed',
  }
}

// ========================================
// CART OPERATIONS
// ========================================

export async function addToCart(productOrId, productName, quantity = 1, price = 0, productImage = '') {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Please sign in to add items to cart')

    const product = coerceProductInput(productOrId, productName, quantity, price, productImage)

    // Check if item already exists in cart
    const { data: existingItem, error: fetchError } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', product.productId)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)

    if (existingItem) {
      const updatePayload = {
        quantity: existingItem.quantity + product.quantity,
        price_at_add: product.price,
        product_image: product.productImage,
      }

      let { data, error } = await supabase
        .from('carts')
        .update(updatePayload)
        .eq('id', existingItem.id)
        .select()

      if (error && isMissingColumnError(error)) {
        ;({ data, error } = await supabase
          .from('carts')
          .update({
            quantity: existingItem.quantity + product.quantity,
            price_at_add: product.price,
          })
          .eq('id', existingItem.id)
          .select())
      }

      if (error) throw new Error(error.message)
      return data
    } else {
      const insertPayload = {
        user_id: user.id,
        product_id: product.productId,
        product_name: product.productName,
        quantity: product.quantity,
        price_at_add: product.price,
        product_image: product.productImage,
      }

      let { data, error } = await supabase
        .from('carts')
        .insert(insertPayload)
        .select()

      if (error && isMissingColumnError(error)) {
        ;({ data, error } = await supabase
          .from('carts')
          .insert({
            user_id: user.id,
            product_id: product.productId,
            product_name: product.productName,
            quantity: product.quantity,
            price_at_add: product.price,
          })
          .select())
      }

      if (error) throw new Error(error.message)
      return data
    }
  } catch (error) {
    throw new Error('Failed to add to cart: ' + error.message)
  }
}

export async function getCart() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    return Promise.all((data || []).map((item) => enrichItemWithCatalog(item)))
  } catch (error) {
    console.error('Failed to get cart:', error.message)
    return []
  }
}

export async function updateCartQuantity(cartItemId, quantity) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const safeQuantity = Math.max(1, Number(quantity) || 1)
    const { data, error } = await supabase
      .from('carts')
      .update({ quantity: safeQuantity })
      .eq('id', cartItemId)
      .eq('user_id', user.id)
      .select()

    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    throw new Error('Failed to update cart quantity: ' + error.message)
  }
}

export async function getCartCount() {
  const items = await getCart()
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

export async function removeFromCart(cartItemId) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  } catch (error) {
    throw new Error('Failed to remove from cart: ' + error.message)
  }
}

export async function clearCart() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  } catch (error) {
    throw new Error('Failed to clear cart: ' + error.message)
  }
}

// ========================================
// WISHLIST OPERATIONS
// ========================================

export async function addToWishlist(productId, productName) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('wishlist')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_name: productName,
      })

    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    throw new Error('Failed to add to wishlist: ' + error.message)
  }
}

export async function getWishlist() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    return data || []
  } catch (error) {
    console.error('Failed to get wishlist:', error.message)
    return []
  }
}

export async function removeFromWishlist(wishlistItemId) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', wishlistItemId)
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  } catch (error) {
    throw new Error('Failed to remove from wishlist: ' + error.message)
  }
}

// ========================================
// ORDER OPERATIONS
// ========================================

export async function createOrder(cartItems, deliveryAddress) {
  return createOrderFromCart({
    cartItems,
    deliveryInfo: {
      name: '',
      phone: '',
      email: '',
      address: deliveryAddress,
      city: '',
      state: '',
      zipcode: '',
    },
    paymentMethod: 'cod',
    paymentStatus: 'pay_on_delivery',
    paymentReference: '',
  })
}

export async function createOrderFromCart({
  cartItems,
  deliveryInfo,
  paymentMethod,
  paymentStatus,
  paymentReference = '',
}) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const totals = calculateCartTotals(cartItems)
    const placedAt = new Date().toISOString()
    const estimatedDeliveryAt = addMinutes(placedAt, DEMO_ETA_MINUTES)
    const deliveryAddressText = buildDeliveryAddressText(deliveryInfo)

    let { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_price: totals.total,
        delivery_address: deliveryAddressText,
        status: 'confirmed',
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_reference: paymentReference,
        customer_name: deliveryInfo.name,
        customer_phone: deliveryInfo.phone,
        customer_email: deliveryInfo.email,
        placed_at: placedAt,
        estimated_delivery_at: estimatedDeliveryAt,
      })
      .select()
      .single()

    if (orderError && isMissingColumnError(orderError)) {
      ;({ data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_price: totals.total,
          delivery_address: buildLegacyOrderEnvelope({
            deliveryInfo,
            paymentMethod,
            paymentStatus,
            paymentReference,
            placedAt,
            estimatedDeliveryAt,
          }),
          status: 'confirmed',
        })
        .select()
        .single())
    }

    if (orderError) throw new Error(orderError.message)

    const orderId = orderData.id

    const orderItems = cartItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: Number(item.price_at_add ?? item.price ?? 0),
      product_image: item.product_image || '',
    }))

    let { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError && isMissingColumnError(itemsError)) {
      ;({ error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems.map(({ product_image, ...item }) => item)))
    }

    if (itemsError) throw new Error(itemsError.message)

    await clearCart()

    return {
      ...normalizeOrderRow(orderData),
      items: await Promise.all(orderItems.map((item) => enrichItemWithCatalog(item))),
      ...totals,
      deliveryInfo,
    }
  } catch (error) {
    throw new Error('Failed to create order: ' + error.message)
  }
}

export async function getOrders() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []).map(normalizeOrderRow)
  } catch (error) {
    console.error('Failed to get orders:', error.message)
    return []
  }
}

export async function getOrderDetails(orderId) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (error) throw new Error(error.message)
    return Promise.all((data || []).map((item) => enrichItemWithCatalog(item)))
  } catch (error) {
    console.error('Failed to get order details:', error.message)
    return []
  }
}

export async function getOrderById(orderId) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (error) throw new Error(error.message)

    const items = await getOrderDetails(orderId)
    const normalizedOrder = normalizeOrderRow(data)
    const totals = calculateCartTotals(items.map((item) => ({
      price_at_add: item.price,
      quantity: item.quantity,
    })))

    return {
      ...normalizedOrder,
      items,
      ...totals,
      deliveryInfo: {
        name: normalizedOrder.customer_name,
        phone: normalizedOrder.customer_phone,
        email: normalizedOrder.customer_email,
        addressText: normalizedOrder.delivery_address_text,
      },
    }
  } catch (error) {
    console.error('Failed to get order:', error.message)
    return null
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) throw new Error(error.message)
  } catch (error) {
    throw new Error('Failed to update order: ' + error.message)
  }
}
