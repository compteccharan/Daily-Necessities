<<<<<<< Updated upstream
=======
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

function getBasePathname() {
  const pathname = window.location.pathname
  if (pathname.includes('/source/')) {
    return pathname.slice(0, pathname.indexOf('/source/'))
  }
  const basePath = pathname === '/' ? '/' : pathname.replace(/\/[^/]*$/, '')
  return basePath || '/'
}

function buildAppUrl(relativePath = 'index.html') {
  const basePath = getBasePathname()
  const normalizedBase = basePath.endsWith('/') || basePath === '' ? basePath : `${basePath}/`
  return `${window.location.origin}${normalizedBase}${relativePath}`
}

function cleanAuthUrl() {
  if (!window.history.replaceState) {
    return
  }

  const cleanUrl = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState({}, document.title, cleanUrl)
}

let restoreSessionPromise = null

async function restoreSessionInternal() {
  const url = new URL(window.location.href)
  const hasAuthCode = url.searchParams.has('code')
  const hasAuthHash =
    url.hash.includes('access_token') ||
    url.hash.includes('refresh_token') ||
    url.hash.includes('error')

  if (hasAuthCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
    if (error) {
      throw new Error(error.message)
    }
    cleanAuthUrl()
  } else if (hasAuthHash) {
    const { error } = await supabase.auth.getSession()
    if (error) {
      throw new Error(error.message)
    }
    cleanAuthUrl()
  }

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    throw new Error(error.message)
  }

  return session
}

export async function restoreSession() {
  if (!restoreSessionPromise) {
    restoreSessionPromise = restoreSessionInternal().catch((error) => {
      restoreSessionPromise = null
      throw error
    })
  }

  return restoreSessionPromise
}

export function resetSessionRestore() {
  restoreSessionPromise = null
}

// ========================================
// SIGN UP
// ========================================

export async function signUp(email, password, name, phone) {
  try {
    // Step 1: Create user in auth.users with user_metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
          phone: phone,
        }
      }
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

    if (profileError) {
      console.warn('Profile creation warning:', profileError.message)
      // Don't throw error - profile can be created later on first login
    }

    return { userId, email, name }
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

function getRedirectUrl() {
  return buildAppUrl('index.html')
}

export async function signUpWithGoogle() {
  try {
    const redirectUrl = getRedirectUrl()
    console.log('Google signup redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) throw new Error(error.message)

    return data
  } catch (error) {
    throw new Error(error.message || 'Google sign-up failed')
  }
}

export async function signInWithGoogle() {
  try {
    const redirectUrl = getRedirectUrl()
    console.log('Google signin redirect URL:', redirectUrl)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) throw new Error(error.message)

    return data
  } catch (error) {
    throw new Error(error.message || 'Google sign-in failed')
  }
}

// ========================================
// ENSURE USER PROFILE EXISTS (for OAuth users)
// ========================================

export async function ensureUserProfile(user) {
  if (!user) return null
  
  try {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (existingProfile) {
      return existingProfile
    }
    
    // Profile doesn't exist, create one
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    const phone = user.user_metadata?.phone || ''
    
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        name: name,
        phone: phone,
      })
      .select()
      .single()
    
    if (insertError) {
      console.warn('Could not create profile:', insertError.message)
      return null
    }
    
    return newProfile
  } catch (error) {
    console.warn('Error ensuring user profile:', error.message)
    return null
  }
}

// ========================================
// LOGOUT
// ========================================

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)

    resetSessionRestore()

    // Don't auto-redirect - let the calling code handle it
    return true
  } catch (error) {
    throw new Error(error.message || 'Logout failed')
  }
}

// ========================================
// GET CURRENT USER
// ========================================

export async function getCurrentUser() {
  try {
    const session = await restoreSession()

    if (session?.user) {
      return session.user
    }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw new Error(error.message)
    return user
  } catch (error) {
    return null
  }
}

export async function getCurrentSession() {
  try {
    return await restoreSession()
  } catch (error) {
    console.error('Failed to restore session:', error.message)
    return null
  }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      restoreSessionPromise = Promise.resolve(session)
    }

    if (event === 'SIGNED_OUT') {
      resetSessionRestore()
    }

    callback(event, session)
  })
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

export async function saveUserProfile({ name, phone }) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const payload = {
    user_id: user.id,
    name: name?.trim() || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    phone: phone?.trim() || '',
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export function getLoginUrl() {
  return buildAppUrl('source/Login.html')
}
>>>>>>> Stashed changes
