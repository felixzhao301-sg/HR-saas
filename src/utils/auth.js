import { supabase } from '../supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export async function sendPasswordResetEmail(email, options = {}) {
  if (!email) return { error: 'Please enter your email.' }
  
  try {
    const language = options.language || 'zh'
    const resetLink = `${window.location.origin}/#reset-password`

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'password_reset',
        to: email,
        resetLink,
        language,
      }),
    })

    if (!res.ok) return { error: 'Failed to send email.' }
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