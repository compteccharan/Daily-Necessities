// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'
import { CONFIG } from './config.js'

// Load credentials from a single place (works for local + GitHub Pages)
const SUPABASE_URL = (window?.__SUPABASE__?.url || CONFIG?.SUPABASE_URL || '').trim()
const SUPABASE_KEY = (window?.__SUPABASE__?.anonKey || CONFIG?.SUPABASE_ANON_KEY || '').trim()
const storage = typeof window !== 'undefined' ? window.localStorage : undefined

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Update `source/config.js` (or set `window.__SUPABASE__`).'
  )
}

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
})
