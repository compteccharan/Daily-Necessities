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
    window.location.href = 'source/Login.html'
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
