import { useState } from 'react'
import { inputClass } from '../constants'
import { registerCompany, checkUENExists } from '../utils/register'

// ─────────────────────────────────────────────
// 左側步驟導航
// ─────────────────────────────────────────────
function SideNav({ current, steps, language }) {
  return (
    <div className="hidden md:flex flex-col justify-between bg-gradient-to-b from-blue-800 to-blue-900 text-white w-72 flex-shrink-0 p-8">
      <div>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-base leading-tight">HR SaaS</div>
            <div className="text-blue-300 text-xs">Management Platform</div>
          </div>
        </div>
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-all
              ${i === current ? 'bg-white/15' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                ${i < current ? 'bg-green-400 text-white'
                  : i === current ? 'bg-white text-blue-800'
                  : 'bg-white/20 text-blue-300'}`}>
                {i < current ? '✓' : i + 1}
              </div>
              <div>
                <div className={`text-sm font-medium
                  ${i === current ? 'text-white' : i < current ? 'text-green-300' : 'text-blue-300'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-blue-400 mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-blue-400 leading-relaxed">
        {language === 'zh'
          ? '註冊後進入 14 天免費試用期，無需信用卡。'
          : 'Start with a 14-day free trial. No credit card required.'}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 字段組件
// ─────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// 主註冊頁
// ─────────────────────────────────────────────
export default function RegisterPage({ language: initLang = 'en', onBackToLogin }) {
  const [language, setLanguage] = useState(initLang)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [company, setCompany] = useState({
    name: '', uen: '', address: '', postalCode: '', phone: '', industry: '',
  })
  const [admin, setAdmin] = useState({
    name: '', email: '', password: '', confirm: '', position: '',
  })

  const zh = language === 'zh'

  const steps = zh ? [
    { label: '公司信息', desc: '填寫公司基本資料' },
    { label: '管理員帳號', desc: '設定系統管理員' },
    { label: '確認提交', desc: '核對後完成註冊' },
  ] : [
    { label: 'Company Info', desc: 'Enter your company details' },
    { label: 'Admin Account', desc: 'Set up the admin account' },
    { label: 'Review & Submit', desc: 'Confirm and register' },
  ]

  const industries = [
    'Marine & Offshore', 'Construction', 'Manufacturing', 'Retail',
    'F&B', 'Logistics', 'IT & Technology', 'Healthcare', 'Education', 'Others',
  ]

  const fieldClass = `w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    placeholder:text-gray-300 transition-all`

  // ── 驗證 ──
  async function validateStep0() {
    if (!company.name.trim() || !company.uen.trim() || !company.address.trim() || !company.postalCode.trim()) {
      setError(zh ? '請填寫所有必填欄位' : 'Please fill all required fields.')
      return false
    }
    setLoading(true); setError('')
    const exists = await checkUENExists(company.uen.trim())
    setLoading(false)
    if (exists) {
      setError(zh ? '此 UEN 已被註冊，請聯繫我們' : 'This UEN is already registered. Please contact us.')
      return false
    }
    return true
  }

  function validateStep1() {
    if (!admin.name.trim() || !admin.email.trim() || !admin.password || !admin.confirm) {
      setError(zh ? '請填寫所有必填欄位' : 'Please fill all required fields.')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(admin.email)) {
      setError(zh ? '請輸入有效的電郵地址' : 'Please enter a valid email address.')
      return false
    }
    if (admin.password.length < 6) {
      setError(zh ? '密碼至少 6 位' : 'Password must be at least 6 characters.')
      return false
    }
    if (admin.password !== admin.confirm) {
      setError(zh ? '兩次密碼不一致' : 'Passwords do not match.')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {zh ? '註冊成功！' : 'Registration Submitted!'}
        </h2>
        <p className="text-gray-500 text-sm mb-2">
          {zh ? '確認郵件已發送至' : 'A confirmation email has been sent to'}
        </p>
        <p className="text-blue-600 font-medium text-sm mb-6">{admin.email}</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-xs text-amber-700 text-left">
          <div className="font-semibold mb-1">
            {zh ? '⏳ 等待平台審批' : '⏳ Pending Platform Review'}
          </div>
          {zh
            ? '您的帳號正在等待平台管理員審批，通常在 1 個工作日內完成，審批後您將收到通知郵件。'
            : 'Your account is pending platform admin review. This usually takes 1 business day. You will receive an email once approved.'}
        </div>
        <button onClick={onBackToLogin}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          {zh ? '返回登入' : 'Back to Login'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">

      {/* Mobile Navbar */}
      <nav className="md:hidden bg-blue-800 text-white px-4 py-3 flex justify-between items-center">
        <div className="font-bold text-base">HR SaaS</div>
        <div className="flex items-center gap-3">
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="bg-white/20 text-white text-xs px-2 py-1 rounded border-0 cursor-pointer">
            <option value="en">EN</option>
            <option value="zh">中文</option>
          </select>
          <button onClick={onBackToLogin} className="text-blue-200 text-xs hover:text-white">
            {zh ? '登入' : 'Login'}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-stretch justify-center">
        <div className="flex w-full max-w-4xl mx-auto md:my-8 md:shadow-2xl md:rounded-2xl overflow-hidden">

          {/* 左側導航 */}
          <SideNav current={step} steps={steps} language={language} />

          {/* 右側表單 */}
          <div className="flex-1 bg-white flex flex-col">

            {/* 頂部（桌面）*/}
            <div className="hidden md:flex justify-between items-center px-8 pt-6 pb-2">
              <button onClick={onBackToLogin}
                className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                ← {zh ? '返回登入' : 'Back to Login'}
              </button>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="text-sm text-gray-500 border border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none">
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div className="flex-1 px-8 py-6 overflow-y-auto">
              {/* 標題 */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">{steps[step].label}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{steps[step].desc}</p>
              </div>

              {/* Mobile 步驟條 */}
              <div className="flex md:hidden gap-1 mb-5">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all
                    ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>

              {/* 錯誤 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* ── Step 0：公司信息 ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <Field label={zh ? '公司名稱' : 'Company Name'} required>
                    <input value={company.name}
                      onChange={e => setCompany({ ...company, name: e.target.value })}
                      className={fieldClass} placeholder="YLL Offshore Services Pte. Ltd." />
                  </Field>
                  <Field label="UEN" required
                    hint={zh ? '新加坡公司唯一識別碼' : 'Singapore Unique Entity Number'}>
                    <input value={company.uen}
                      onChange={e => setCompany({ ...company, uen: e.target.value.toUpperCase() })}
                      className={fieldClass} placeholder="201400368E" />
                  </Field>
                  <Field label={zh ? '公司地址' : 'Company Address'} required>
                    <input value={company.address}
                      onChange={e => setCompany({ ...company, address: e.target.value })}
                      className={fieldClass} placeholder="123 Tuas Road" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={zh ? '郵政編碼' : 'Postal Code'} required>
                      <input value={company.postalCode}
                        onChange={e => setCompany({ ...company, postalCode: e.target.value })}
                        className={fieldClass} placeholder="638402" maxLength={6} />
                    </Field>
                    <Field label={zh ? '聯繫電話' : 'Phone'}>
                      <input value={company.phone}
                        onChange={e => setCompany({ ...company, phone: e.target.value })}
                        className={fieldClass} placeholder="+65 6123 4567" />
                    </Field>
                  </div>
                  <Field label={zh ? '行業' : 'Industry'}>
                    <select value={company.industry}
                      onChange={e => setCompany({ ...company, industry: e.target.value })}
                      className={fieldClass}>
                      <option value="">{zh ? '選擇行業（可選）' : 'Select industry (optional)'}</option>
                      {industries.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {/* ── Step 1：管理員帳號 ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    {zh
                      ? '此帳號將成為貴公司的 Super Admin，並自動建立您的員工檔案。'
                      : 'This account will be the Super Admin of your company. An employee profile will be created automatically.'}
                  </div>

                  <Field label={zh ? '姓名' : 'Full Name'} required>
                    <input value={admin.name}
                      onChange={e => setAdmin({ ...admin, name: e.target.value })}
                      className={fieldClass} placeholder="John Tan" />
                  </Field>

                  <Field label={zh ? '職位' : 'Job Title'}
                    hint={zh ? '將顯示在您的員工檔案中' : 'Will appear in your employee profile'}>
                    <input value={admin.position}
                      onChange={e => setAdmin({ ...admin, position: e.target.value })}
                      className={fieldClass} placeholder={zh ? '例：Managing Director' : 'e.g. Managing Director'} />
                  </Field>

                  <Field label={zh ? '工作電郵' : 'Work Email'} required>
                    <input type="email" value={admin.email}
                      onChange={e => setAdmin({ ...admin, email: e.target.value })}
                      className={fieldClass} placeholder="admin@company.com" />
                  </Field>

                  <Field label={zh ? '密碼' : 'Password'} required
                    hint={zh ? '至少 6 位字符' : 'At least 6 characters'}>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={admin.password}
                        onChange={e => setAdmin({ ...admin, password: e.target.value })}
                        className={fieldClass + ' pr-16'} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                        {showPwd ? (zh ? '隱藏' : 'Hide') : (zh ? '顯示' : 'Show')}
                      </button>
                    </div>
                  </Field>

                  <Field label={zh ? '確認密碼' : 'Confirm Password'} required>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} value={admin.confirm}
                        onChange={e => setAdmin({ ...admin, confirm: e.target.value })}
                        className={fieldClass + ' pr-16'} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                        {showConfirm ? (zh ? '隱藏' : 'Hide') : (zh ? '顯示' : 'Show')}
                      </button>
                    </div>
                    {admin.confirm && admin.password !== admin.confirm && (
                      <p className="text-xs text-red-500 mt-1">{zh ? '密碼不一致' : 'Passwords do not match'}</p>
                    )}
                    {admin.confirm && admin.password === admin.confirm && (
                      <p className="text-xs text-green-600 mt-1">✓ {zh ? '密碼一致' : 'Passwords match'}</p>
                    )}
                  </Field>
                </div>
              )}

              {/* ── Step 2：確認 ── */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* 公司信息 */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {zh ? '公司信息' : 'Company Information'}
                      </span>
                      <button onClick={() => setStep(0)} className="text-xs text-blue-500 hover:underline">
                        {zh ? '修改' : 'Edit'}
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {[
                        { label: zh ? '公司名稱' : 'Company Name', value: company.name },
                        { label: 'UEN', value: company.uen },
                        { label: zh ? '地址' : 'Address', value: `${company.address}, ${company.postalCode}` },
                        company.phone && { label: zh ? '電話' : 'Phone', value: company.phone },
                        company.industry && { label: zh ? '行業' : 'Industry', value: company.industry },
                      ].filter(Boolean).map((item, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-gray-400 w-28 flex-shrink-0">{item.label}</span>
                          <span className="text-gray-800 font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 管理員信息 */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {zh ? '管理員帳號' : 'Admin Account'}
                      </span>
                      <button onClick={() => setStep(1)} className="text-xs text-blue-500 hover:underline">
                        {zh ? '修改' : 'Edit'}
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {[
                        { label: zh ? '姓名' : 'Name', value: admin.name },
                        admin.position && { label: zh ? '職位' : 'Title', value: admin.position },
                        { label: zh ? '電郵' : 'Email', value: admin.email },
                        { label: zh ? '密碼' : 'Password', value: '••••••••' },
                      ].filter(Boolean).map((item, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-gray-400 w-28 flex-shrink-0">{item.label}</span>
                          <span className="text-gray-800 font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
                    ✅ {zh
                      ? '系統將自動為您建立員工檔案，您登入後可在員工管理中完善資料。'
                      : 'An employee profile will be created automatically. You can complete it after login.'}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    ⏳ {zh
                      ? '提交後需等待平台管理員審批，通常在 1 個工作日內完成。'
                      : 'After submission, your account requires platform admin approval, usually within 1 business day.'}
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    {zh
                      ? '點擊「提交註冊」即表示您同意我們的服務條款。'
                      : 'By clicking Submit, you agree to our Terms of Service.'}
                  </p>
                </div>
              )}
            </div>

            {/* 底部按鈕 */}
            <div className="px-8 py-5 border-t border-gray-100 flex gap-3">
              {step > 0 && (
                <button onClick={() => { setStep(s => s - 1); setError('') }}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600
                    hover:bg-gray-50 transition-colors font-medium">
                  {zh ? '上一步' : 'Back'}
                </button>
              )}
              {step < 2 ? (
                <button onClick={handleNext} disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold
                    hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {zh ? '驗證中...' : 'Verifying...'}</>
                    : <>{zh ? '下一步' : 'Next'} →</>}
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold
                    hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {zh ? '提交中...' : 'Submitting...'}</>
                    : <>{zh ? '✓ 提交註冊' : '✓ Submit Registration'}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}