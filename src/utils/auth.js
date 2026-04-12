import { supabase } from '../supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// ─────────────────────────────────────────────
// 發送重設密碼郵件（走 Edge Function）
// ─────────────────────────────────────────────
export async function sendPasswordResetEmail(email, options = {}) {
  if (!email) return { error: 'Please enter your email.' }
  
  try {
    // 1. 先用 Supabase 生成重設連結
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { error: error.message }

    // 2. 用 Edge Function 發送自定義郵件
    const language = options.language || 'zh'
    const resetLink = `${window.location.origin}/reset-password`

    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'password_reset',
        to: email,
        resetLink,
        language,
      }),
    })

    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

// ─────────────────────────────────────────────
// 更新密碼（用戶點連結後調用）
// ─────────────────────────────────────────────
export async function updatePassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message || null }
}