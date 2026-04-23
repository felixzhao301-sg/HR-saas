import { supabase } from '../supabase'

export async function sendPasswordResetEmail(email, options = {}) {
  if (!email) return { error: 'Please enter your email.' }

  try {
    // ✅ 不傳 redirectTo，讓 Supabase 用 Site URL 做 redirect
    // App.jsx 的 onAuthStateChange 監聽 PASSWORD_RECOVERY 事件來切換頁面
    const { error } = await supabase.auth.resetPasswordForEmail(email)

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