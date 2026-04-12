import { useState } from 'react'
import { inputClass } from '../constants'
import { updatePassword } from '../utils/auth'

export default function ResetPasswordPage({ language, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleReset() {
    if (!password) { setError(language === 'zh' ? '請輸入新密碼' : 'Please enter a new password'); return }
    if (password !== confirm) { setError(language === 'zh' ? '兩次密碼不一致' : 'Passwords do not match'); return }
    setLoading(true); setError('')
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) { setError(err); return }
    setSuccess(true)
    setTimeout(onDone, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {language === 'zh' ? '重設密碼' : language === 'ms' ? 'Tetapkan Semula Kata Laluan' : 'Reset Password'}
          </h2>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-medium text-sm">
              {language === 'zh' ? '密碼更新成功！正在跳轉...' : 'Password updated! Redirecting...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === 'zh' ? '新密碼' : 'New Password'}
              </label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass + ' pr-16'} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs font-medium">
                  {showPwd ? (language === 'zh' ? '隱藏' : 'Hide') : (language === 'zh' ? '顯示' : 'Show')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === 'zh' ? '確認密碼' : 'Confirm Password'}
              </label>
              <input type={showPwd ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                className={inputClass} placeholder="••••••••" />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button onClick={handleReset} disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
              {loading ? (language === 'zh' ? '更新中...' : 'Updating...') : (language === 'zh' ? '更新密碼' : 'Update Password')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}