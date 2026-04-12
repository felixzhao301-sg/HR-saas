import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// 發送重設密碼郵件
// redirectTo 預設用當前網域，本地/Vercel 都通用
// ─────────────────────────────────────────────
export async function sendPasswordResetEmail(email, options = {}) {
  if (!email) return { error: 'Please enter your email.' }
  const redirectTo = options.redirectTo || window.location.origin
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return { error: error?.message || null }
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