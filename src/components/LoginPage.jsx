import { useState } from 'react'
import { inputClass } from '../constants'
import { supabase } from '../supabase'
import { sendPasswordResetEmail } from '../utils/auth'

// ─── 忘記密碼 Modal ───────────────────────────
function ForgotPasswordModal({ language, onClose }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    setLoading(true); setError('')
    const { error: err } = await sendPasswordResetEmail(email)
    setLoading(false)
    if (err) setError(err)
    else setSent(true)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          {language === 'zh' ? '忘記密碼' : language === 'ms' ? 'Lupa Kata Laluan' : 'Forgot Password'}
        </h2>
        {sent ? (
          <>
            <p className="text-sm text-gray-500 mt-2 mb-4">
              {language === 'zh' ? '重設連結已發送，請查收郵箱。' : language === 'ms' ? 'Pautan penetapan semula telah dihantar.' : 'Reset link sent. Please check your inbox.'}
            </p>
            <button onClick={onClose} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
              {language === 'zh' ? '關閉' : 'Close'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              {language === 'zh' ? '輸入帳號郵箱，我們將發送重設連結。' : language === 'ms' ? 'Masukkan e-mel untuk menerima pautan penetapan semula.' : 'Enter your email to receive a password reset link.'}
            </p>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="email@example.com" className={inputClass + ' mb-3'}
            />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button onClick={handleSend} disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {loading ? (language === 'zh' ? '發送中...' : 'Sending...') : (language === 'zh' ? '發送' : 'Send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── 登入頁 ───────────────────────────────────
export default function LoginPage({ language, setLanguage, onRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      setError(language === 'zh' ? '請填寫 Email 和密碼' : 'Please enter email and password')
      return
    }
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) setError(language === 'zh' ? '登入失敗，請檢查 Email 或密碼' : 'Login failed. Check your email or password')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-blue-700 text-white px-4 py-4 flex justify-between items-center shadow">
        <h1 className="text-lg font-bold">
          {language === 'zh' ? 'HR 管理系統' : language === 'ms' ? 'Sistem Pengurusan HR' : 'HR Management System'}
        </h1>
        <select value={language} onChange={e => setLanguage(e.target.value)}
          className="bg-white text-blue-700 px-2 py-1 rounded text-sm font-medium border-0 cursor-pointer">
          <option value="zh">中文</option>
          <option value="en">EN</option>
          <option value="ms">BM</option>
        </select>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {language === 'zh' ? '登入系統' : language === 'ms' ? 'Log Masuk' : 'Sign In'}
            </h2>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className={inputClass} placeholder="admin@example.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === 'zh' ? '密碼' : language === 'ms' ? 'Kata Laluan' : 'Password'}
              </label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className={inputClass + ' pr-16'} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs font-medium">
                  {showPwd ? (language === 'zh' ? '隱藏' : 'Hide') : (language === 'zh' ? '顯示' : 'Show')}
                </button>
              </div>
              {/* 忘記密碼連結 */}
              <div className="text-right mt-1">
                <button onClick={() => setShowForgot(true)}
                  className="text-xs text-blue-500 hover:underline">
                  {language === 'zh' ? '忘記密碼？' : language === 'ms' ? 'Lupa kata laluan?' : 'Forgot password?'}
                </button>
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-base mt-2">
              {loading ? (language === 'zh' ? '登入中...' : 'Signing in...') : (language === 'zh' ? '登入' : 'Sign In')}
            </button>
            <div className="text-center mt-4">
                <span className="text-xs text-gray-400">
                 {language === 'zh' ? '還沒有帳號？' : "Don't have an account? "}
                </span>
                <button onClick={onRegister} className="text-xs text-blue-500 hover:underline font-medium">
                    {language === 'zh' ? '立即註冊' : 'Register now'}
                </button>
            </div>
          </div>
        </div>
      </div>
      {showForgot && <ForgotPasswordModal language={language} onClose={() => setShowForgot(false)} />}
    </div>
  )
}