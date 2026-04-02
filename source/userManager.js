import { supabase } from './supabaseClient.js'
import { getCurrentUser } from './auth.js'

import { supabase } from './supabaseClient.js'
import { getCurrentUser } from './auth.js'

// ========================================
// CART OPERATIONS
// ========================================

export async function addToCart(productId, productName, quantity = 1, price = 0) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('carts')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_name: productName,
        quantity,
        price_at_add: price,
      })

    if (error) throw new Error(error.message)
    return data
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
    return data || []
  } catch (error) {
    console.error('Failed to get cart:', error.message)
    return []
  }
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
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    // Calculate total price
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price_at_add * item.quantity), 0)

    // Step 1: Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_price: totalPrice,
        delivery_address: deliveryAddress,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    const orderId = orderData.id

    // Step 2: Add order items
    const orderItems = cartItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price_at_add,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw new Error(itemsError.message)

    // Step 3: Clear cart
    await clearCart()

    return orderData
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
    return data || []
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
    return data || []
  } catch (error) {
    console.error('Failed to get order details:', error.message)
    return []
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
