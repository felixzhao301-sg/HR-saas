import { useState } from 'react'
import { inputClass } from '../constants'
import { registerCompany, checkUENExists } from '../utils/register'

const PLANS = [
  { id: 'starter', name: 'Starter', monthlyPrice: 29, yearlyPrice: 278, maxEmployees: 10, features: ['Up to 10 employees', 'Payroll & CPF', 'Leave management', 'IR8A filing'] },
  { id: 'growth', name: 'Growth', monthlyPrice: 59, yearlyPrice: 566, maxEmployees: 30, badge: 'Most Popular', features: ['Up to 30 employees', 'All Starter features', 'Commission module', 'Excel export'] },
  { id: 'business', name: 'Business', monthlyPrice: 99, yearlyPrice: 950, maxEmployees: 100, features: ['Up to 100 employees', 'All Growth features', 'Priority support', 'Dedicated manager'] },
]

const T = {
  en: {
    title: 'HR Management System', backToLogin: 'Back to Login', pageTitle: 'Start Your Free Trial',
    pageSubtitle: '30 days free · No credit card required',
    steps: ['Choose Plan', 'Company Info', 'Admin Account', 'Review & Submit'],
    trialBanner: '30-Day Free Trial', trialSub: 'Completely free to start · No credit card required · Cancel anytime',
    monthly: 'Monthly', yearly: 'Yearly', save: 'Save 2mo', afterTrial: 'After trial',
    upTo: 'Up to', employees: 'employees',
    notSure: "Not sure? Start with Starter — you can switch anytime during your trial.",
    next: 'Next →', startTrial: 'Start Free Trial →', back: 'Back', submit: '🎉 Start Free Trial',
    companyInfo: 'Company Info', adminAccount: 'Admin Account',
    companyName: 'Company Name', uen: 'UEN', address: 'Company Address',
    postalCode: 'Postal Code', phone: 'Phone', industry: 'Industry', selectIndustry: 'Select industry',
    adminName: 'Your Name', workEmail: 'Work Email', password: 'Password',
    passwordMin: 'Min. 6 characters', confirmPassword: 'Confirm Password',
    planSummary: 'Plan Selected', submitNote: 'A confirmation email will be sent. Your free trial starts once confirmed.',
    securityNote: 'Completely free during trial · Payment reminder 7 days before trial ends',
    successTitle: "You're all set!", trialStarted: '30-day free trial started',
    noCharges: 'No charges during your trial period',
    checkEmail: 'Check your email and click the confirmation link to activate your account.',
    goLogin: 'Go to Login', errRequired: 'Please fill all required fields.',
    errUEN: 'This UEN is already registered.', errPassword: 'Password must be at least 6 characters.',
    errMatch: 'Passwords do not match.', errPlan: 'Please select a plan to continue.',
  },
  zh: {
    title: 'HR 管理系統', backToLogin: '返回登入', pageTitle: '開始免費試用',
    pageSubtitle: '30天免費，不需要信用卡',
    steps: ['選擇方案', '公司信息', '管理員帳號', '確認提交'],
    trialBanner: '30天免費試用', trialSub: '試用期間完全免費 · 不需要信用卡 · 隨時取消',
    monthly: '月付', yearly: '年付', save: '省2個月', afterTrial: '試用後',
    upTo: '最多', employees: '人',
    notSure: '不確定？先選 Starter，試用期內隨時更換。',
    next: '下一步 →', startTrial: '免費開始試用 →', back: '上一步', submit: '🎉 開始免費試用',
    companyInfo: '公司信息', adminAccount: '管理員帳號',
    companyName: '公司名稱', uen: 'UEN', address: '公司地址',
    postalCode: '郵政編碼', phone: '電話', industry: '行業', selectIndustry: '選擇行業',
    adminName: '管理員姓名', workEmail: '工作郵箱', password: '密碼',
    passwordMin: '至少6位', confirmPassword: '確認密碼',
    planSummary: '已選方案', submitNote: '提交後將發送確認郵件，點擊確認後試用期立即開始。',
    securityNote: '試用期間完全免費，到期前7天才會提醒付款',
    successTitle: '註冊成功！', trialStarted: '30天免費試用已開始',
    noCharges: '試用期間不收取任何費用',
    checkEmail: '請查收確認郵件，點擊連結後即可登入系統。',
    goLogin: '前往登入', errRequired: '請填寫所有必填欄位',
    errUEN: '此 UEN 已被註冊', errPassword: '密碼至少 6 位',
    errMatch: '兩次密碼不一致', errPlan: '請選擇一個方案',
  },
  ms: {
    title: 'Sistem Pengurusan HR', backToLogin: 'Kembali Log Masuk', pageTitle: 'Mulakan Percubaan Percuma',
    pageSubtitle: '30 hari percuma · Tanpa kad kredit',
    steps: ['Pilih Pelan', 'Maklumat Syarikat', 'Akaun Admin', 'Semak & Hantar'],
    trialBanner: 'Percubaan Percuma 30 Hari', trialSub: 'Percuma sepenuhnya · Tanpa kad kredit · Batal bila-bila masa',
    monthly: 'Bulanan', yearly: 'Tahunan', save: 'Jimat 2bln', afterTrial: 'Selepas cuba',
    upTo: 'Sehingga', employees: 'pekerja',
    notSure: 'Tidak pasti? Mulakan dengan Starter — boleh tukar bila-bila masa.',
    next: 'Seterusnya →', startTrial: 'Mula Percubaan Percuma →', back: 'Kembali', submit: '🎉 Mula Percubaan Percuma',
    companyInfo: 'Maklumat Syarikat', adminAccount: 'Akaun Admin',
    companyName: 'Nama Syarikat', uen: 'UEN', address: 'Alamat Syarikat',
    postalCode: 'Poskod', phone: 'Telefon', industry: 'Industri', selectIndustry: 'Pilih industri',
    adminName: 'Nama Anda', workEmail: 'E-mel Kerja', password: 'Kata Laluan',
    passwordMin: 'Min. 6 aksara', confirmPassword: 'Sahkan Kata Laluan',
    planSummary: 'Pelan Dipilih', submitNote: 'E-mel pengesahan akan dihantar. Percubaan bermula setelah disahkan.',
    securityNote: 'Percuma semasa percubaan · Peringatan bayaran 7 hari sebelum tamat',
    successTitle: 'Berjaya Mendaftar!', trialStarted: 'Percubaan percuma 30 hari dimulakan',
    noCharges: 'Tiada caj semasa tempoh percubaan',
    checkEmail: 'Semak e-mel dan klik pautan pengesahan untuk mengaktifkan akaun.',
    goLogin: 'Pergi ke Log Masuk', errRequired: 'Sila isi semua medan yang diperlukan.',
    errUEN: 'UEN ini telah didaftarkan.', errPassword: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.',
    errMatch: 'Kata laluan tidak sepadan.', errPlan: 'Sila pilih pelan untuk meneruskan.',
  },
}

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < current ? 'bg-blue-600 text-white' :
              i === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i === current ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-0.5 mx-1 mb-4 transition-colors duration-300 ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── 密碼輸入框（帶眼睛按鈕）────────────────────
function PasswordInput({ value, onChange, placeholder, className }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', fontSize: 18, padding: 0, lineHeight: 1,
        }}
        tabIndex={-1}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

function PlanStep({ selected, billing, onSelect, onBilling, t, error }) {
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '14px 16px', marginBottom: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1E40AF', marginBottom: 4 }}>{t.trialBanner}</div>
        <div style={{ fontSize: 13, color: '#3B82F6', fontWeight: 500 }}>{t.trialSub}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 50, padding: 3, gap: 3 }}>
          {['monthly', 'yearly'].map(b => (
            <button key={b} onClick={() => onBilling(b)} style={{
              padding: '6px 16px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: billing === b ? '#1B3A5C' : 'transparent',
              color: billing === b ? '#fff' : '#64748b',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
            }}>
              {b === 'monthly' ? t.monthly : t.yearly}
              {b === 'yearly' && <span style={{ background: '#10B981', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>{t.save}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 6 }}>
        {PLANS.map(plan => {
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const isSelected = selected === plan.id
          return (
            <button key={plan.id} onClick={() => onSelect(plan.id)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14,
              border: isSelected ? '2px solid #1B3A5C' : '2px solid #E2E8F0',
              background: isSelected ? '#F0F4FF' : '#fff',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', width: '100%', position: 'relative',
            }}>
              {plan.badge && (
                <span style={{ position: 'absolute', top: -10, right: 14, background: '#1B3A5C', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{plan.badge}</span>
              )}
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: isSelected ? '6px solid #1B3A5C' : '2px solid #CBD5E1', flexShrink: 0, transition: 'all 0.18s', background: '#fff' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>{plan.name}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>· {t.upTo} {plan.maxEmployees} {t.employees}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                  {plan.features.map(f => <span key={f} style={{ fontSize: 11, color: '#64748b' }}>✓ {f}</span>)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 1 }}>{t.afterTrial}</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1B3A5C' }}>S${price}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>/{billing === 'monthly' ? 'mo' : 'yr'}</div>
              </div>
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>{t.notSure}</p>
      {error && <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#DC2626', textAlign: 'center' }}>{error}</div>}
    </div>
  )
}

export default function RegisterPage({ onBackToLogin }) {
  const [lang, setLang] = useState('en')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('growth')
  const [billing, setBilling] = useState('monthly')
  const [company, setCompany] = useState({ name: '', uen: '', address: '', postalCode: '', phone: '', industry: '' })
  const [admin, setAdmin] = useState({ name: '', email: '', password: '', confirm: '' })

  const t = T[lang] || T.en
  const currentPlan = PLANS.find(p => p.id === selectedPlan)
  const industries = ['Marine & Offshore', 'Construction', 'Manufacturing', 'Retail', 'F&B', 'Logistics', 'IT & Technology', 'Healthcare', 'Education', 'Others']

  async function handleNext() {
    setError('')
    if (step === 0) {
      if (!selectedPlan) { setError(t.errPlan); return }
      setStep(1)
    } else if (step === 1) {
      if (!company.name || !company.uen || !company.address || !company.postalCode) { setError(t.errRequired); return }
      setLoading(true); setError('')
      const exists = await checkUENExists(company.uen)
      setLoading(false)
      if (exists) { setError(t.errUEN); return }
      setStep(2)
    } else if (step === 2) {
      if (!admin.name || !admin.email || !admin.password || !admin.confirm) { setError(t.errRequired); return }
      if (admin.password.length < 6) { setError(t.errPassword); return }
      if (admin.password !== admin.confirm) { setError(t.errMatch); return }
      setStep(3)
    }
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const { error: err } = await registerCompany({ company, admin, plan: selectedPlan, billing })
    setLoading(false)
    if (err) { setError(err); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t.successTitle}</h2>
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>🎉 {t.trialStarted}</p>
          <p style={{ fontSize: 12, color: '#15803D', marginTop: 4 }}>{t.noCharges}</p>
        </div>
        <p className="text-sm text-gray-500 mb-6">{t.checkEmail}</p>
        <button onClick={onBackToLogin} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">{t.goLogin}</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-blue-700 text-white px-4 py-4 flex justify-between items-center shadow sticky top-0 z-40">
        <div>
          <h1 className="text-base font-bold leading-tight">FelihR</h1>
          <div className="text-blue-200 text-xs">{t.title}</div>
        </div>
        <div className="flex items-center gap-3">
          <select value={lang} onChange={e => setLang(e.target.value)} className="bg-white text-blue-700 px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer">
            <option value="en">EN</option>
            <option value="zh">中文</option>
            <option value="ms">BM</option>
          </select>
          <button onClick={onBackToLogin} className="text-blue-200 text-sm hover:text-white whitespace-nowrap">{t.backToLogin}</button>
        </div>
      </nav>

      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-1">{t.pageTitle}</h2>
          <p className="text-sm text-gray-400 text-center mb-5">{t.pageSubtitle}</p>
          <StepIndicator current={step} steps={t.steps} />

          {error && step !== 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          {step === 0 && <PlanStep selected={selectedPlan} billing={billing} onSelect={setSelectedPlan} onBilling={setBilling} t={t} error={error} />}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.companyName} *</label>
                <input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} className={inputClass} placeholder="ABC Pte. Ltd." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.uen} *</label>
                <input value={company.uen} onChange={e => setCompany({ ...company, uen: e.target.value })} className={inputClass} placeholder="201400368E" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.address} *</label>
                <input value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} className={inputClass} placeholder="123 Tuas Road" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t.postalCode} *</label>
                  <input value={company.postalCode} onChange={e => setCompany({ ...company, postalCode: e.target.value })} className={inputClass} placeholder="638402" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t.phone}</label>
                  <input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} className={inputClass} placeholder="+65 6123 4567" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.industry}</label>
                <select value={company.industry} onChange={e => setCompany({ ...company, industry: e.target.value })} className={inputClass}>
                  <option value="">{t.selectIndustry}</option>
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.adminName} *</label>
                <input value={admin.name} onChange={e => setAdmin({ ...admin, name: e.target.value })} className={inputClass} placeholder="John Tan" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.workEmail} *</label>
                <input type="email" value={admin.email} onChange={e => setAdmin({ ...admin, email: e.target.value })} className={inputClass} placeholder="admin@company.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.password} *</label>
                <PasswordInput value={admin.password} onChange={e => setAdmin({ ...admin, password: e.target.value })} placeholder={t.passwordMin} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.confirmPassword} *</label>
                <PasswordInput value={admin.confirm} onChange={e => setAdmin({ ...admin, confirm: e.target.value })} placeholder="••••••••" className={inputClass} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1E40AF' }}>{currentPlan?.name} Plan</div>
                    <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>{t.upTo} {currentPlan?.maxEmployees} {t.employees}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#3B82F6' }}>{t.afterTrial}</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#1E40AF' }}>
                      S${billing === 'monthly' ? currentPlan?.monthlyPrice : currentPlan?.yearlyPrice}
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#60A5FA' }}>/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🎉</span>
                  <span style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>{t.trialSub}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-gray-600">
                <div className="font-semibold text-gray-700 mb-2">{t.companyInfo}</div>
                <div><span className="text-gray-400">Name: </span>{company.name}</div>
                <div><span className="text-gray-400">UEN: </span>{company.uen}</div>
                <div><span className="text-gray-400">Address: </span>{company.address}, {company.postalCode}</div>
                {company.phone && <div><span className="text-gray-400">Phone: </span>{company.phone}</div>}
                {company.industry && <div><span className="text-gray-400">Industry: </span>{company.industry}</div>}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-gray-600">
                <div className="font-semibold text-gray-700 mb-2">{t.adminAccount}</div>
                <div><span className="text-gray-400">Name: </span>{admin.name}</div>
                <div><span className="text-gray-400">Email: </span>{admin.email}</div>
              </div>
              <p className="text-xs text-gray-400 text-center pt-1">{t.submitNote}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => { setStep(s => s - 1); setError('') }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium">{t.back}</button>
            )}
            {step < 3 ? (
              <button onClick={handleNext} disabled={loading} style={{ flex: 1, padding: '10px 0', background: '#1B3A5C', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
                {loading ? '...' : step === 0 ? t.startTrial : t.next}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px 0', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? '...' : t.submit}
              </button>
            )}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 12 }}>🔒 {t.securityNote}</p>
        </div>
      </div>
    </div>
  )
}