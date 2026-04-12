import { supabase } from '../supabase'

export async function sendPasswordResetEmail(email, options = {}) {
  if (!email) return { error: 'Please enter your email.' }
  
  try {
    const language = options.language || 'zh'
    const resetLink = `${window.location.origin}/#reset-password`

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'password_reset',
        to: email,
        resetLink,
        language,
      },
    })

    if (error) return { error: error.message }
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

export async function updatePassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message || null }
}