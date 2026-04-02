# Supabase Setup Instructions

## Critical: You MUST complete this setup for auth and cart to work!

### Step 1: Create a Supabase Account
1. Go to https://supabase.com
2. Click "Sign Up" → use GitHub or email
3. Create a new project:
   - Project Name: `daily-necessities`
   - Database Password: (save this)
   - Region: Select closest to you (e.g., `ap-south-1` for India)
4. Wait for project to initialize (2-5 minutes)

---

### Step 2: Get Your API Keys
1. In Supabase dashboard, click **Settings** (bottom left)
2. Click **API** tab
3. Copy these two values:
   - **Project URL** → Copy the entire URL
   - **Anon Public Key** → Copy this key

---

### Step 3: Update Configuration File
1. Open: `source/supabaseClient.js`
2. Replace:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL'  
   // Replace with: const SUPABASE_URL = 'https://your-project-ref.supabase.co'
   
   const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'  
   // Replace with the actual anon key you copied
   ```

**Example:**
```javascript
const SUPABASE_URL = 'https://abcdefgh12345678.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

### Step 4: Create Database Tables

Run these SQL queries in Supabase → SQL Editor:

#### 1. User Profiles Table
```sql
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Carts Table
```sql
CREATE TABLE carts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_add DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### 3. Wishlist Table
```sql
CREATE TABLE wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### 4. Orders Table
```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_price DECIMAL(10,2) NOT NULL,
  delivery_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Order Items Table
```sql
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Step 5: Set Row Level Security (RLS)

Run these in Supabase → SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for carts
CREATE POLICY "Users can view own cart" ON carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart" ON carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart" ON carts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for wishlist
CREATE POLICY "Users can view own wishlist" ON wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist" ON wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist" ON wishlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist" ON wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for order_items
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );
```

---

### Step 6: Configure Google OAuth (for social login)

1. In Supabase → **Authentication** → **Providers**
2. Find **Google** and toggle ON
3. Set redirect URL to:
   ```
   http://localhost:8000
   ```
   (or your production domain later)

---

### Step 7: Test It

1. Run local server: `python -m http.server 8000`
2. Open `http://localhost:8000/index.html`
3. Click **Login** → Sign up a test account
4. Try **Add to Cart**
5. Check Google Sign In button

---

### ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Supabase is not defined" | Credentials not set in `supabaseClient.js` |
| "User not authenticated" | Sign up/login first before adding to cart |
| Google button does nothing | Check redirect URL in Supabase → check browser console (F12) |
| Cart not saving | Check RLS policies are created correctly |
| "Project not found" error | Check Project URL is correct in `supabaseClient.js` |

---

### 📚 Next Steps (Optional)
- Set up email verification in Supabase → **Authentication** → **Email Templates**
- Configure SMTP for password reset emails
- Add analytics in Supabase → **Analytics**
