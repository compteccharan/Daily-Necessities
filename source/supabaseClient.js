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
