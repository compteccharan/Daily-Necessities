# Signup & Authentication Implementation Instructions for Verdail

## Overview
Build a complete authentication system for the Verdail e-commerce app using **Supabase** (PostgreSQL + built-in Auth). This is a **frontend-only implementation** — no backend server code needed.

**Why Supabase**: No server to manage, built-in Google OAuth, password hashing handled automatically, Row-Level Security for data protection, and simple SDK-based API calls.

---

## Architecture

| Component | Technology |
|-----------|------------|
| Frontend | HTML, CSS (existing Login.html styles), Vanilla JavaScript |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth (email/password + Google OAuth) |
| User Data Storage | Supabase database tables |
| Security | Row-Level Security (RLS) policies |
| Hosting | Frontend: file-based, Database: Supabase cloud |

---

## Phase 1: Supabase Project Setup

### Step 1.1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up with email or GitHub
3. Click "New Project"
4. Choose a name (e.g., "verdail-ecommerce")
5. Set database password
6. Select region closest to your users
7. Wait for project to initialize (2-3 minutes)

### Step 1.2: Get Credentials
1. Go to **Settings → API** in sidebar
2. Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy **Anon Public Key** (long string starting with `eyJh...`)
4. Store these in a `.env` file in project root:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

### Step 1.3: Enable Google OAuth
1. Go to **Authentication → Providers** in sidebar
2. Find "Google" provider
3. Click "Enable"
4. You'll need Google OAuth credentials (follow Step 1.4)

### Step 1.4: Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Google+ API"
4. Go to **Credentials** → Create OAuth 2.0 Client ID
5. Choose "Web Application"
6. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:5173` (if using Vite)
   - `http://127.0.0.1:5500` (if using Live Server)
   - Your production domain (e.g., `https://verdail.com`)
7. Copy **Client ID**
8. Paste into Supabase → Authentication → Providers → Google → Client ID field
9. Also paste **Client Secret** in the secret field
10. Click "Save"

---

## Phase 2: Create Database Tables

### Step 2.1: Open SQL Editor
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy-paste the entire SQL script below

### Step 2.2: Execute Database Setup SQL
```sql
-- ========================================
-- USER PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- SHOPPING CART TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  price_at_add DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- WISHLIST TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT,
  added_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_price DECIMAL(10, 2) DEFAULT 0,
  delivery_address TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- ORDER ITEMS TABLE (line items in each order)
-- ========================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- ENABLE ROW-LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ROW-LEVEL SECURITY POLICIES
-- ========================================

-- User Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cart: Users can only access their own cart
CREATE POLICY "Users can view own cart" ON carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own cart" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own cart" ON carts
  FOR DELETE USING (auth.uid() = user_id);
///
-- Wishlist: Users can only access their own wishlist
CREATE POLICY "Users can view own wishlist" ON wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own wishlist" ON wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own wishlist" ON wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- Orders: Users can only see their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order Items: Users can only see items from their own orders
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

### Step 2.3: Verify Tables Created
1. Go to **Table Editor** in sidebar
2. You should see: user_profiles, carts, wishlist, orders, order_items
3. RLS policies are now active (users can only see their own data)

---

## Phase 3: Create Sign Up Page

### Step 3.1: Create File `source/SignUp.html`
Create new file at: `source/SignUp.html`

```html
<!DOCTYPE html>
<html lang="en" style="margin:0px 0px;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Verdail - Your Farm-Fresh Daily Essentials">
    <title>Verdail - Sign Up</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="styles/login.css">
    <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</head>

<body>
    <div class="background"></div>
    <div class="page-layout">
        <div class="brand-panel">
            <img class="brand-image" src="/assets/VERDAIL_ENTRY.png" alt="Verdail Online Shop">
        </div>
        <div class="sign-in-wrapper">
            <h1 class="sign-in-heading">Sign Up</h1>
            <div class="sign-in-form-container">
                <form class="sign-in-form" id="signup-form">
                    <input type="text" id="signup-name" placeholder="Full Name" required>
                    <input type="email" id="signup-email" placeholder="Email" required>
                    <input type="tel" id="signup-phone" placeholder="Phone Number" required>
                    <input type="password" id="signup-password" placeholder="Password (min 8 chars)" required>
                    <input type="password" id="signup-confirm-password" placeholder="Confirm Password" required>
                    <button class="signin-button" type="submit"><p style="margin:0px;margin-left:-9px;">Sign Up</p></button>
                    <div id="error-message" style="color: red; margin-top: 10px; display: none;"></div>
                    <div id="success-message" style="color: green; margin-top: 10px; display: none;"></div>
                </form>

                <div class="sign-in-portion">
                  <h5 class="connect_media">or Connect with other social media</h5>
                    <button type="button" class="google_button" id="google-signup-btn">
                        <p class="google_button-text">Sign up with Google</p>
                        <img class="google_img" src="/assets/google icon.svg">
                    </button>
                    <span style="margin-left:16px;line-height:32px;">
                        <p class="new-customer">Already have account? <a href="Login.html" class="sign-up" style="text-decoration: none; color: inherit;">Sign In</a></p>
                        <pre class="terms-conditions" style="line-height:18px;">By continuing, you agree to Verdail's <br> <u class="conditions">Conditions of Use</u> and <u class="policy">Privacy Policy</u></pre>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <script type="module">
        import { supabase } from './supabaseClient.js';
        import { signUp, signUpWithGoogle, validateEmail, validatePassword } from './auth.js';

        const form = document.getElementById('signup-form');
        const errorDiv = document.getElementById('error-message');
        const successDiv = document.getElementById('success-message');
        const googleBtn = document.getElementById('google-signup-btn');

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            // Validation
            if (!name) {
                showError('Please enter your name');
                return;
            }
            if (!validateEmail(email)) {
                showError('Please enter a valid email');
                return;
            }
            if (!phone) {
                showError('Please enter your phone number');
                return;
            }
            if (!validatePassword(password)) {
                showError('Password must be at least 8 characters with uppercase, lowercase, and numbers');
                return;
            }
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }

            try {
                await signUp(email, password, name, phone);
                showSuccess('Account created! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = 'Login.html';
                }, 2000);
            } catch (error) {
                showError(error.message);
            }
        });

        // Handle Google Sign Up
        googleBtn.addEventListener('click', async () => {
            try {
                await signUpWithGoogle();
                // Supabase will redirect to callback URL
            } catch (error) {
                showError('Google sign-up failed: ' + error.message);
            }
        });

        function showError(msg) {
            errorDiv.textContent = msg;
            errorDiv.style.display = 'block';
        }

        function showSuccess(msg) {
            successDiv.textContent = msg;
            successDiv.style.display = 'block';
        }
    </script>
</body>
</html>
```

---

## Phase 4: Enhance Login Page

### Step 4.1: Update `source/Login.html`
Replace the existing Login.html with this updated version:

```html
<!DOCTYPE html>
<html lang="en" style="margin:0px 0px;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Verdail - Your Farm-Fresh Daily Essentials">
    <title>Verdail - Sign In</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="styles/login.css">
    <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</head>

<body>
    <div class="background"></div>
    <div class="page-layout">
        <div class="brand-panel">
            <img class="brand-image" src="/assets/VERDAIL_ENTRY.png" alt="Verdail Online Shop">
        </div>
        <div class="sign-in-wrapper">
            <h1 class="sign-in-heading">Sign In</h1>
            <div class="sign-in-form-container">
                <form class="sign-in-form" id="signin-form">
                    <input type="email" id="signin-email" placeholder="Email" required>
                    <input type="password" id="signin-password" placeholder="Password" required>
                    <a href="#" class="forgot-password">Forgot Password?</a>
                    <button class="signin-button" type="submit"><p style="margin:0px;margin-left:-9px;">Sign In</p></button>
                    <div id="error-message" style="color: red; margin-top: 10px; display: none;"></div>
                </form>

                <div class="sign-in-portion">
                  <h5 class="connect_media">or Connect with other social media</h5>
                    <button type="button" class="google_button" id="google-signin-btn">
                        <p class="google_button-text">Sign in with Google</p>
                        <img class="google_img" src="/assets/google icon.svg">
                    </button>
                    <span style="margin-left:16px;line-height:32px;">
                        <p class="new-customer">New Customer? <a href="SignUp.html" class="sign-up" style="text-decoration: none; color: inherit;">Sign Up</a></p>
                        <pre class="terms-conditions" style="line-height:18px;">By continuing, you agree to Verdail's <br> <u class="conditions">Conditions of Use</u> and <u class="policy">Privacy Policy</u></pre>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <script type="module">
        import { signIn, signInWithGoogle, validateEmail } from './auth.js';

        const form = document.getElementById('signin-form');
        const errorDiv = document.getElementById('error-message');
        const googleBtn = document.getElementById('google-signin-btn');

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';

            const email = document.getElementById('signin-email').value.trim();
            const password = document.getElementById('signin-password').value;

            if (!validateEmail(email)) {
                showError('Please enter a valid email');
                return;
            }
            if (!password) {
                showError('Please enter your password');
                return;
            }

            try {
                await signIn(email, password);
                window.location.href = '../index.html';
            } catch (error) {
                showError(error.message);
            }
        });

        // Handle Google Sign In
        googleBtn.addEventListener('click', async () => {
            try {
                await signInWithGoogle();
                // Supabase will redirect after authentication
            } catch (error) {
                showError('Google sign-in failed: ' + error.message);
            }
        });

        function showError(msg) {
            errorDiv.textContent = msg;
            errorDiv.style.display = 'block';
        }
    </script>
</body>
</html>
```

---

## Phase 5: Create Supabase Client

### Step 5.1: Create File `source/supabaseClient.js`
Create new file at: `source/supabaseClient.js`

```javascript
// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

// Load credentials from environment or directly
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storage: localStorage,
    autoRefreshToken: true
  }
})
```

---

## Phase 6: Create Authentication Functions

### Step 6.1: Create File `source/auth.js`
Create new file at: `source/auth.js`

```javascript
import { supabase } from './supabaseClient.js'

// ========================================
// VALIDATION FUNCTIONS
// ========================================

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password) {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  return passwordRegex.test(password)
}

// ========================================
// SIGN UP
// ========================================

export async function signUp(email, password, name, phone) {
  try {
    // Step 1: Create user in auth.users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw new Error(authError.message)

    const userId = authData.user.id

    // Step 2: Create user profile in user_profiles table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        name,
        phone,
      })

    if (profileError) throw new Error('Failed to create profile: ' + profileError.message)

    return { userId, email }
  } catch (error) {
    throw new Error(error.message || 'Sign up failed')
  }
}

// ========================================
// SIGN IN
// ========================================

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new Error(error.message)

    return data
  } catch (error) {
    throw new Error(error.message || 'Sign in failed')
  }
}

// ========================================
// GOOGLE OAUTH SIGN UP / SIGN IN
// ========================================

export async function signUpWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/index.html',
      },
    })

    if (error) throw new Error(error.message)

    // After user approves, Supabase will redirect
    // Create user_profile if first time login
    return data
  } catch (error) {
    throw new Error(error.message || 'Google sign-up failed')
  }
}

export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/index.html',
      },
    })

    if (error) throw new Error(error.message)

    return data
  } catch (error) {
    throw new Error(error.message || 'Google sign-in failed')
  }
}

// ========================================
// LOGOUT
// ========================================

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    
    // Redirect to login
    window.location.href = '/source/Login.html'
  } catch (error) {
    throw new Error(error.message || 'Logout failed')
  }
}

// ========================================
// GET CURRENT USER
// ========================================

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw new Error(error.message)
    return user
  } catch (error) {
    return null
  }
}

// ========================================
// CHECK IF AUTHENTICATED
// ========================================

export async function isAuthenticated() {
  const user = await getCurrentUser()
  return user !== null
}

// ========================================
// GET USER PROFILE
// ========================================

export async function getUserProfile() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw new Error(error.message)
    return data
  } catch (error) {
    console.error('Failed to get profile:', error.message)
    return null
  }
}
```

---

## Phase 7: Create User Data Manager

### Step 7.1: Create File `source/userManager.js`
Create new file at: `source/userManager.js`

```javascript
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
```

---

## Phase 8: Create `.env` File

### Step 8.1: Create `.env` in Project Root
Create file: `.env` (in the main project root)

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-anon-public-key-here
```

**Important**: Replace with actual values from Supabase → Settings → API

---

## Phase 9: Integration with Existing Pages

### Step 9.1: Update `index.html`
Add these imports at the top of the `<body>` before `<script src="script.js"></script>`:

```html
<!-- Before closing </body> tag, add: -->
<script type="module">
    import { getCurrentUser, logout } from './source/auth.js';
    import { getCart } from './source/userManager.js';

    // Check if user is logged in on page load
    window.addEventListener('load', async () => {
        const user = await getCurrentUser();
        
        if (user) {
            // User is logged in
            console.log('Logged in as:', user.email);
            
            // Show user email in header (optional)
            const headerUserInfo = document.querySelector('.header-user-info');
            if (headerUserInfo) {
                headerUserInfo.textContent = user.email;
            }
            
            // Enable cart button
            const cartButton = document.querySelector('.cart-button');
            if (cartButton) {
                cartButton.style.display = 'block';
            }
        } else {
            // User is not logged in - show cart popup instead
            console.log('User not logged in');
        }
    });

    // Add logout button listener if you have a logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
</script>
```

### Step 9.2: Update `script.js`
Modify the cart button event listener to use authenticated cart:

```javascript
// Replace the existing cart button click handler with:
import { addToCart } from './source/userManager.js';
import { getCurrentUser } from './source/auth.js';

window.addEventListener('load', function() {
    var addButtons = document.querySelectorAll('.add-button');
    var popup = document.getElementById('cart-popup');
    var closeBtn = document.querySelector('.close-popup');
    
    for (var i = 0; i < addButtons.length; i++) {
        addButtons[i].addEventListener('click', async function(e) {
            e.preventDefault();
            
            const user = await getCurrentUser();
            
            if (!user) {
                // Not logged in - show popup
                popup.classList.remove('hidden');
            } else {
                // Logged in - add to cart
                const productCard = this.closest('.product-card');
                const productName = productCard.querySelector('.product-name').textContent;
                const productId = productCard.getAttribute('data-product-id') || productName;
                
                try {
                    await addToCart(productId, productName, 1, 0);
                    alert('Added to cart!');
                } catch (error) {
                    alert('Error adding to cart: ' + error.message);
                }
            }
        });
    }
    
    closeBtn.addEventListener('click', function() {
        popup.classList.add('hidden');
    });
    
    popup.addEventListener('click', function(event) {
        if (event.target === popup) {
            popup.classList.add('hidden');
        }
    });
});
```

---

## Phase 10: Testing Checklist

### Signup Flow
- [ ] Open `source/SignUp.html` in browser
- [ ] Fill in: Name, Email, Phone, Password (8+ chars with uppercase/numbers), Confirm password
- [ ] Click "Sign Up" button
- [ ] Verify success message appears
- [ ] Check Supabase dashboard → Table Editor → user_profiles (new user should be there)
- [ ] Verify redirected to Login.html after 2 seconds

### Google OAuth Signup
- [ ] On SignUp.html, click "Sign up with Google"
- [ ] You're redirected to Google login
- [ ] Sign in with Google account
- [ ] You should be redirected back to Sign Up page
- [ ] Check Supabase → auth.users (new user should be there)
- [ ] Check user_profiles (profile created for Google user)

### Login Flow
- [ ] Open `source/Login.html` in browser
- [ ] Enter email and password (from signup)
- [ ] Click "Sign In" button
- [ ] Verify redirected to `index.html`
- [ ] Check browser console: "Logged in as: your-email@example.com"

### Google OAuth Login
- [ ] On Login.html, click "Sign in with Google"
- [ ] Sign in with same Google account
- [ ] You should be redirected to `index.html`

### Add to Cart (Authenticated)
- [ ] Make sure you're logged in (check console)
- [ ] Click "ADD" button on any product
- [ ] Verify "Added to cart!" message appears
- [ ] Check Supabase → carts table (item should be there with your user_id)

### Wishlist Operations
- [ ] Logged in, click heart/wishlist icon on product
- [ ] Check Supabase → wishlist table (product should be there)

### Logout
- [ ] Click logout button (if you added one to header)
- [ ] Verify redirected to `source/Login.html`
- [ ] Verify cart popup shows when clicking ADD without being logged in

---

## Troubleshooting

### Issue: "VITE_SUPABASE_URL is undefined"
**Solution**: Create `.env` file in project root with your actual Supabase credentials.

### Issue: "Policies don't exist for table"
**Solution**: Make sure you ran the entire SQL script in Supabase SQL Editor, including the RLS policy creation section.

### Issue: "Google OAuth not working"
**Solution**: 
1. Verify Google Client ID is in Supabase → Authentication → Providers → Google
2. Verify redirect URL includes your app's URL (localhost:5500 for Live Server)
3. Check Google Cloud Console → OAuth consent screen is configured

### Issue: "Can't see user data from other tables"
**Solution**: This is correct! RLS policies prevent users from seeing other users' data. Each user can only see their own cart, wishlist, and orders.

### Issue: "User profile not created after Google signup"
**Solution**: Add a trigger in Supabase to auto-create user_profile when auth.users is created (optional but recommended for production).

---

## Security Notes

- ✅ Row-Level Security (RLS) ensures users can only access their own data
- ✅ Passwords are hashed by Supabase before storage
- ⚠️ Store Supabase key in `.env`, never commit to git
- ⚠️ Add `.env` to `.gitignore`
- 🔐 In production, use HTTPOnly cookies instead of localStorage for JWT storage

---

## File Structure After Implementation

```
project-root/
├── .env
├── .gitignore
├── index.html
├── script.js
├── style.css
├── source/
│   ├── Login.html (modified)
│   ├── SignUp.html (new)
│   ├── auth.js (new)
│   ├── supabaseClient.js (new)
│   ├── userManager.js (new)
│   └── styles/
│       └── login.css (unchanged)
├── assets/
│   ├── epsd.json
│   ├── VERDAIL_ENTRY.png
│   └── google icon.svg
└── README.md
```

---

## Next Steps for Agents

1. **Phase 1-2**: Setup Supabase account, enable OAuth, create database tables
2. **Phase 3-4**: Create Sign Up and update Login pages
3. **Phase 5-7**: Create Supabase client and auth/user manager functions
4. **Phase 8**: Add `.env` file
5. **Phase 9**: Update index.html and script.js for authentication checks
6. **Phase 10**: Test all flows end-to-end

---

## Additional References

- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Google OAuth Setup: https://console.cloud.google.com
- Database SQL Guide: https://supabase.com/docs/guides/database
- Row-Level Security: https://supabase.com/docs/guides/auth/row-level-security
