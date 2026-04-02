// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

// Load credentials from environment or directly
const SUPABASE_URL = 'https://jacxdeovekyipofwiqhb.supabase.co'
const SUPABASE_KEY =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphY3hkZW92ZWt5aXBvZndpcWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzcyOTIsImV4cCI6MjA5MDcxMzI5Mn0.4h2vSQ9mXlxklGms2UoqzRavRCjr1W4swihy09P087w'

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storage: localStorage,
    autoRefreshToken: true
  }
})
