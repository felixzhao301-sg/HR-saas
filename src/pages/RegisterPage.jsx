import { useState } from 'react'
import { inputClass } from '../constants'
import { registerCompany, checkUENExists } from '../utils/register'

// ─── 步驟指示器 ───────────────────────────────
function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i < current ? 'bg-blue-600 text-white' :
              i === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i === current ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 h-0.5 mx-2 mb-4 ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── 主註冊頁 ─────────────────────────────────
export default function RegisterPage({ language = 'en', onBackToLogin }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const [company, setCompany] = useState({
    name: '', uen: '', address: '', postalCode: '', phone: '', industry: '',
  })
  const [admin, setAdmin] = useState({
    name: '', email: '', password: '', confirm: '',
  })

  const steps = language === 'zh'
    ? ['公司信息', '管理員帳號', '確認提交']
    : ['Company Info', 'Admin Account', 'Review & Submit']

  const industries = [
    'Marine & Offshore', 'Construction', 'Manufacturing', 'Retail',
    'F&B', 'Logistics', 'IT & Technology', 'Healthcare', 'Education', 'Others',
  ]

  // ── Step 0 驗證 ──
  async function validateStep0() {
    if (!company.name || !company.uen || !company.address || !company.postalCode) {
      setError(language === 'zh' ? '請填寫所有必填欄位' : 'Please fill all required fields')
      return false
    }
    setLoading(true); setError('')
    const exists = await checkUENExists(company.uen)
    setLoading(false)
    if (exists) {
      setError(language === 'zh' ? '此 UEN 已被註冊' : 'This UEN is already registered.')
      return false
    }
    return true
  }

  // ── Step 1 驗證 ──
  function validateStep1() {
    if (!admin.name || !admin.email || !admin.password || !admin.confirm) {
      setError(language === 'zh' ? '請填寫所有必填欄位' : 'Please fill all required fields')
      return false
    }
    if (admin.password.length < 6) {
      setError(language === 'zh' ? '密碼至少 6 位' : 'Password must be at least 6 characters.')
      return false
    }
    if (admin.password !== admin.confirm) {
      setError(language === 'zh' ? '兩次密碼不一致' : 'Passwords do not match.')
      return false
    }
    return true
  }

  async function handleNext() {
    setError('')
    if (step === 0) {
      const ok = await validateStep0()
      if (ok) setStep(1)
    } else if (step === 1) {
      if (validateStep1()) setStep(2)
    }
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const { error: err } = await registerCompany({ company, admin })
    setLoading(false)
    if (err) { setError(err); return }
    setDone(true)
  }

  // ── 成功頁 ──
  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {language === 'zh' ? '註冊成功！' : 'Registration Successful!'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {language === 'zh'
            ? '請查收確認郵件，點擊連結後即可登入系統。'
            : 'Please check your email and click the confirmation link to activate your account.'}
        </p>
        <button onClick={onBackToLogin}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          {language === 'zh' ? '返回登入' : 'Back to Login'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white px-4 py-4 flex justify-between items-center shadow">
        <h1 className="text-lg font-bold">
          {language === 'zh' ? 'HR 管理系統' : 'HR Management System'}
        </h1>
        <button onClick={onBackToLogin} className="text-blue-200 text-sm hover:text-white">
          {language === 'zh' ? '返回登入' : 'Back to Login'}
        </button>
      </nav>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
            {language === 'zh' ? '公司註冊' : 'Company Registration'}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-6">
            {language === 'zh' ? '建立你的 HR 管理系統帳號' : 'Create your HR system account'}
          </p>

          <StepIndicator current={step} steps={steps} />

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step 0：公司信息 */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '公司名稱' : 'Company Name'} *
                </label>
                <input value={company.name} onChange={e => setCompany({...company, name: e.target.value})}
                  className={inputClass} placeholder="YLL Offshore Services Pte. Ltd." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">UEN *</label>
                <input value={company.uen} onChange={e => setCompany({...company, uen: e.target.value})}
                  className={inputClass} placeholder="201400368E" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '公司地址' : 'Company Address'} *
                </label>
                <input value={company.address} onChange={e => setCompany({...company, address: e.target.value})}
                  className={inputClass} placeholder="123 Tuas Road" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {language === 'zh' ? '郵政編碼' : 'Postal Code'} *
                  </label>
                  <input value={company.postalCode} onChange={e => setCompany({...company, postalCode: e.target.value})}
                    className={inputClass} placeholder="638402" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {language === 'zh' ? '電話' : 'Phone'}
                  </label>
                  <input value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})}
                    className={inputClass} placeholder="+65 6123 4567" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '行業' : 'Industry'}
                </label>
                <select value={company.industry} onChange={e => setCompany({...company, industry: e.target.value})}
                  className={inputClass}>
                  <option value="">{language === 'zh' ? '選擇行業' : 'Select industry'}</option>
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1：管理員帳號 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '管理員姓名' : 'Admin Name'} *
                </label>
                <input value={admin.name} onChange={e => setAdmin({...admin, name: e.target.value})}
                  className={inputClass} placeholder="John Tan" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '管理員郵箱' : 'Admin Email'} *
                </label>
                <input type="email" value={admin.email} onChange={e => setAdmin({...admin, email: e.target.value})}
                  className={inputClass} placeholder="admin@company.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '密碼' : 'Password'} *
                </label>
                <input type="password" value={admin.password} onChange={e => setAdmin({...admin, password: e.target.value})}
                  className={inputClass} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '確認密碼' : 'Confirm Password'} *
                </label>
                <input type="password" value={admin.confirm} onChange={e => setAdmin({...admin, confirm: e.target.value})}
                  className={inputClass} placeholder="••••••••" />
              </div>
            </div>
          )}

          {/* Step 2：確認 */}
          {step === 2 && (
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-medium text-gray-700 mb-2">
                  {language === 'zh' ? '公司信息' : 'Company Info'}
                </div>
                <div className="space-y-1 text-gray-600">
                  <div><span className="text-gray-400">Name: </span>{company.name}</div>
                  <div><span className="text-gray-400">UEN: </span>{company.uen}</div>
                  <div><span className="text-gray-400">Address: </span>{company.address}, {company.postalCode}</div>
                  {company.phone && <div><span className="text-gray-400">Phone: </span>{company.phone}</div>}
                  {company.industry && <div><span className="text-gray-400">Industry: </span>{company.industry}</div>}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-medium text-gray-700 mb-2">
                  {language === 'zh' ? '管理員帳號' : 'Admin Account'}
                </div>
                <div className="space-y-1 text-gray-600">
                  <div><span className="text-gray-400">Name: </span>{admin.name}</div>
                  <div><span className="text-gray-400">Email: </span>{admin.email}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {language === 'zh'
                  ? '提交後將發送確認郵件到你的郵箱'
                  : 'A confirmation email will be sent to your email address.'}
              </p>
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => { setStep(s => s - 1); setError('') }}
                className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                {language === 'zh' ? '上一步' : 'Back'}
              </button>
            )}
            {step < 2 ? (
              <button onClick={handleNext} disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? '...' : (language === 'zh' ? '下一步' : 'Next')}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {loading ? '...' : (language === 'zh' ? '提交註冊' : 'Submit')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}