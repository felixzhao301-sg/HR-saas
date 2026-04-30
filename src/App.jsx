import PlatformAdminPage from './pages/PlatformAdminPage'
import { i18n } from './i18n'
import { isPlatformAdmin } from './utils/guard'
import { getCompanySubscription, checkCompanyValid, getTrialDaysLeft } from './utils/subscription'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import LoginPage from './components/LoginPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import { supabase } from './supabase'
import './App.css'
import { inputClass } from './constants'
import { loadPermissions, can } from './utils/permissions'
import RegisterPage from './pages/RegisterPage'

// ─── Lazy loaded tabs ─────────────────────────────────────────
const DashboardTab       = lazy(() => import('./tabs/DashboardTab'))
const LeaveManagementTab = lazy(() => import('./tabs/LeaveManagementTab'))
const LeaveTypesTab      = lazy(() => import('./tabs/LeaveTypesTab'))
const LeaveApproversTab  = lazy(() => import('./tabs/LeaveApproversTab'))
const UserManagementTab  = lazy(() => import('./tabs/UserManagementTab'))
const SettingsTab        = lazy(() => import('./tabs/SettingsTab'))
const DropdownSettingsTab= lazy(() => import('./tabs/DropdownSettingsTab'))
const PermissionsTab     = lazy(() => import('./tabs/PermissionsTab'))
const EmployeesTab       = lazy(() => import('./tabs/EmployeesTab'))
const MyLeaveTab         = lazy(() => import('./tabs/MyLeaveTab'))
const PayrollTab         = lazy(() => import('./tabs/PayrollTab'))
const CommissionTab      = lazy(() => import('./tabs/CommissionTab'))
const YearEndTab         = lazy(() => import('./tabs/YearEndTab'))
const SubscriptionTab    = lazy(() => import('./tabs/SubscriptionTab'))

// ─── Tab Loading Fallback ─────────────────────────────────────
function TabLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading...</div>
    </div>
  )
}

// ─── 阻擋畫面 ─────────────────────────────────────────────────
function BlockedScreen({ reason, companyName, language, onLogout }) {
  const zh = language === 'zh'
  const messages = {
    pending_approval: {
      icon: '⏳',
      title: zh ? '帳號審核中' : 'Account Pending Approval',
      desc: zh ? '你的公司帳號正在審核中，請等待平台管理員批准。' : 'Your company account is pending approval. Please wait for platform admin review.',
    },
    suspended: {
      icon: '🚫',
      title: zh ? '帳號已停用' : 'Account Suspended',
      desc: zh ? '你的公司帳號已被停用，請聯繫平台支援。' : 'Your company account has been suspended. Please contact platform support.',
    },
    trial_expired: {
      icon: '⏰',
      title: zh ? '試用期已結束' : 'Trial Expired',
      desc: zh ? '試用期已結束，請升級計劃以繼續使用系統。' : 'Your trial has expired. Please upgrade your plan to continue.',
    },
    subscription_expired: {
      icon: '💳',
      title: zh ? '訂閱已過期' : 'Subscription Expired',
      desc: zh ? '訂閱已過期，請續訂以繼續使用系統。' : 'Your subscription has expired. Please renew to continue.',
    },
    no_company: {
      icon: '❓',
      title: zh ? '找不到公司資料' : 'Company Not Found',
      desc: zh ? '找不到公司資料，請聯繫平台支援。' : 'Company not found. Please contact platform support.',
    },
  }
  const msg = messages[reason] || messages.no_company

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">{msg.icon}</div>
        {companyName && (
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{companyName}</div>
        )}
        <h2 className="text-lg font-bold text-gray-800 mb-3">{msg.title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{msg.desc}</p>
        <div className="space-y-2">
          {(reason === 'trial_expired' || reason === 'subscription_expired') && (
            <button
              onClick={() => {}}
              className="block w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              {zh ? '查看訂閱方案' : 'View Plans & Upgrade'}
            </button>
          )}
          <button onClick={onLogout}
            className="block w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            {zh ? '登出' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 試用期提示條 ──────────────────────────────────────────────
function TrialBanner({ daysLeft, language, onUpgrade }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || daysLeft === null) return null
  if (daysLeft > 30) return null

  const zh = language === 'zh'
  const isUrgent = daysLeft <= 7
  const isWarning = daysLeft <= 14

  return (
    <div className={`px-4 py-2 flex items-center justify-between text-xs ${
      isUrgent ? 'bg-red-50 border-b border-red-200 text-red-700'
      : isWarning ? 'bg-amber-50 border-b border-amber-200 text-amber-700'
      : 'bg-blue-50 border-b border-blue-200 text-blue-700'
    }`}>
      <span>
        {isUrgent ? '🚨' : isWarning ? '⚠️' : '💡'}
        {' '}
        {zh
          ? `試用期還剩 ${daysLeft} 天，到期後系統將暫停使用。`
          : `Trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to keep access.`}
      </span>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <button onClick={onUpgrade}
          className={`font-semibold underline ${isUrgent ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
          {zh ? '查看方案' : 'View Plans'}
        </button>
        <button onClick={() => setDismissed(true)} className="opacity-50 hover:opacity-100">✕</button>
      </div>
    </div>
  )
}

// ─── 底部導航欄 ───────────────────────────────────────────────
function BottomNav({ mainTab, setMainTab, userRole, language, myEmployeeRecord, setSelectedEmployee }) {
  const isAdmin = ['super_admin', 'hr_admin', 'hr_staff', 'manager'].includes(userRole)
  const tabs = [
    { key: 'dashboard', icon: '🏠', zh: '首頁', en: 'Home', ms: 'Utama' },
    {
      key: 'employees',
      icon: userRole === 'employee' ? '👤' : '👥',
      zh: userRole === 'employee' ? '我的資料' : '員工',
      en: userRole === 'employee' ? 'My Profile' : 'Employees',
      ms: userRole === 'employee' ? 'Profil' : 'Pekerja'
    },
    { key: 'myleave', icon: '🗓️', zh: '我的假期', en: 'My Leave', ms: 'Cuti Saya' },
    ...(isAdmin ? [{ key: 'leave', icon: '📋', zh: '年假管理', en: 'Leave Mgmt', ms: 'Urus Cuti' }] : []),
    ...(isAdmin ? [{ key: 'payroll', icon: '💰', zh: '薪資', en: 'Payroll', ms: 'Gaji' }] : []),
  ]
  const label = (tab) => language === 'zh' ? tab.zh : language === 'ms' ? tab.ms : tab.en

  function handleClick(tab) {
    if (tab.key === 'employees' && userRole === 'employee' && myEmployeeRecord) {
      setSelectedEmployee(myEmployeeRecord)
    } else if (tab.key === 'employees' && userRole !== 'employee') {
      setSelectedEmployee(null)
    }
    setMainTab(tab.key)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => handleClick(tab)}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] relative transition-colors ${
              mainTab === tab.key ? 'text-blue-600' : 'text-gray-400'
            }`}>
            {mainTab === tab.key && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-600 rounded-full" />
            )}
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span className="text-xs font-medium">{label(tab)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 設定下拉 ─────────────────────────────────────────────────
function SettingsDropdown({ language, userRole, mainTab, setMainTab, permissions, userDisplayName, currentUser, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const isAdmin = ['super_admin', 'hr_admin', 'hr_staff', 'manager'].includes(userRole)

  const items = [
    { type: 'info' },
    { type: 'divider' },
    { key: 'settings',    icon: '🔑', zh: '個人設定',   en: 'My Settings',   show: true },
    { type: 'divider' },
    { key: 'payroll',     icon: '💰', zh: '薪資管理',   en: 'Payroll',       show: isAdmin },
    { key: 'commission',  icon: '📊', zh: '佣金管理',   en: 'Commission',    show: isAdmin },
    { type: 'divider' },
    { key: 'permissions', icon: '🛡️', zh: '權限設定',  en: 'Permissions',   show: can(permissions, userRole, 'system.manage_dropdown') },
    { key: 'dropdown',    icon: '🏷️', zh: '種族設定',  en: 'Race Settings', show: can(permissions, userRole, 'system.manage_dropdown') },
    { key: 'leavetypes',  icon: '📅', zh: '假期設定',   en: 'Leave Types',   show: can(permissions, userRole, 'system.manage_dropdown') },
    { key: 'approvers',   icon: '✅', zh: '批准人設定', en: 'Approvers',     show: can(permissions, userRole, 'system.manage_dropdown') },
    { key: 'yearend',     icon: '📅', zh: '年度結算',   en: 'Year-End',      show: ['super_admin','hr_admin'].includes(userRole) },
    { key: 'users',       icon: '👤', zh: '用戶管理',   en: 'Users',         show: ['super_admin','hr_admin'].includes(userRole) },
    { type: 'divider' },
    { key: 'subscription',icon: '💳', zh: '訂閱管理',   en: 'Subscription',  show: ['super_admin'].includes(userRole) },
    { type: 'divider' },
    { key: 'logout',      icon: '🚪', zh: '登出',       en: 'Logout',        show: true, danger: true },
  ].filter(i => i.type || i.show)

  const label = (item) => language === 'zh' ? item.zh : item.en
  const settingsTabs = ['permissions','dropdown','leavetypes','approvers','users','settings','payroll','commission','yearend','subscription']

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
          open ? 'bg-white text-blue-700 border-white' : 'bg-blue-600 border-blue-400 text-white hover:bg-blue-800'
        }`}>
        <span className="text-base font-bold">{open ? '✕' : '☰'}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {items.map((item, i) => {
            if (item.type === 'divider') return <div key={i} className="h-px bg-gray-100" />
            if (item.type === 'info') return (
              <div key={i} className="px-4 py-3 bg-gray-50">
                <div className="font-semibold text-gray-800 text-sm truncate">{userDisplayName || currentUser?.email}</div>
                {userDisplayName && <div className="text-gray-400 text-xs mt-0.5 truncate">{currentUser?.email}</div>}
              </div>
            )
            return (
              <button key={item.key}
                onClick={() => { item.key === 'logout' ? onLogout() : setMainTab(item.key); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                  item.danger ? 'text-red-500 hover:bg-red-50'
                  : mainTab === item.key ? 'text-blue-600 font-medium bg-blue-50'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <span>{item.icon}</span>
                <span>{label(item)}</span>
                {settingsTabs.includes(item.key) && mainTab === item.key && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 主 App ───────────────────────────────────────────────────
function App() {
  const [language, setLanguage] = useState('zh')
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userDisplayName, setUserDisplayName] = useState('')
  const [permissions, setPermissions] = useState({})
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [raceOptions, setRaceOptions] = useState([])
  const [mainTab, setMainTab] = useState('dashboard')
  const [myEmployeeRecord, setMyEmployeeRecord] = useState(null)
  const [companyId, setCompanyId] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [companyData, setCompanyData] = useState(null)
  const [resetPasswordMode, setResetPasswordMode] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [isPlatformAdminMode, setIsPlatformAdminMode] = useState(false)
  const [enteredFromPlatform, setEnteredFromPlatform] = useState(false)
  const [companyBlocked, setCompanyBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState(null)

  const text = i18n[language] || i18n.en

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setCurrentUser(session.user); loadUserRole(session.user.id) }
      else setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') { setResetPasswordMode(true); setAuthLoading(false); return }
      if (session?.user) { setCurrentUser(session.user); loadUserRole(session.user.id) }
      else { setCurrentUser(null); setUserRole(null); setPermissions({}); setAuthLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUserRole(userId) {
    const isPA = await isPlatformAdmin(userId)
    if (isPA) { setIsPlatformAdminMode(true); setAuthLoading(false); return }

    const { data } = await supabase.from('user_roles').select('role,display_name,email,company_id').eq('user_id', userId).single()
    const role = data?.role || null
    setUserRole(role)
    setUserDisplayName(data?.display_name || '')

    if (data?.company_id) {
      setCompanyId(data.company_id)
      const company = await getCompanySubscription(data.company_id)
      if (company) { setCompanyName(company.name); setCompanyData(company) }
      const { valid, reason } = checkCompanyValid(company)
      if (!valid) { setCompanyBlocked(true); setBlockReason(reason); setAuthLoading(false); return }
      const daysLeft = getTrialDaysLeft(company)
      setTrialDaysLeft(daysLeft)
    }

    const perms = await loadPermissions(data.company_id, role)
    setPermissions(perms)
    setAuthLoading(false)
    fetchRaceOptions()

    const { data: empData } = await supabase.from('employees').select('*').eq('auth_user_id', userId).maybeSingle()
    if (empData) {
      setMyEmployeeRecord(empData)
      setSelectedEmployee(empData)
      setMainTab(role === 'employee' ? 'employees' : 'dashboard')
    } else {
      setMainTab('dashboard')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setCurrentUser(null); setUserRole(null); setUserDisplayName(''); setPermissions({})
    setCompanyId(null); setCompanyName(''); setCompanyData(null)
    setSelectedEmployee(null); setMyEmployeeRecord(null)
    setMainTab('dashboard'); setCompanyBlocked(false); setBlockReason(null)
    setTrialDaysLeft(null); setIsPlatformAdminMode(false); setEnteredFromPlatform(false)
  }

  async function handleEnterCompany(company) {
    setIsPlatformAdminMode(false); setEnteredFromPlatform(true)
    setCompanyId(company.id); setCompanyName(company.name); setCompanyData(company)
    setUserRole('super_admin'); setUserDisplayName('Platform Admin')
    const perms = await loadPermissions(company.id, 'super_admin')
    setPermissions(perms); fetchRaceOptions()
    setMainTab('dashboard'); setTrialDaysLeft(null); setCompanyBlocked(false)
  }

  async function fetchRaceOptions() {
    const { data } = await supabase.from('dropdown_options').select('value,label_zh,label_en').eq('category', 'race').order('sort_order')
    if (data) setRaceOptions(data)
  }

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">{language === 'zh' ? '載入中...' : 'Loading...'}</div>
    </div>
  )
  if (isPlatformAdminMode) return <PlatformAdminPage onLogout={handleLogout} onEnterCompany={handleEnterCompany} />
  if (showRegister) return <RegisterPage language={language} onBackToLogin={() => setShowRegister(false)} />
  if (resetPasswordMode) return <ResetPasswordPage language={language} onDone={() => { setResetPasswordMode(false); supabase.auth.signOut() }} />
  if (!currentUser) return <LoginPage language={language} setLanguage={setLanguage} onRegister={() => setShowRegister(true)} />
  if (companyBlocked) return <BlockedScreen reason={blockReason} companyName={companyName} language={language} onLogout={handleLogout} />

  const settingsTabs = ['permissions','dropdown','leavetypes','approvers','users','settings','payroll','commission','yearend','subscription']
  const isSettingsTab = settingsTabs.includes(mainTab)

  const breadcrumbZh = { permissions:'權限設定', dropdown:'種族設定', leavetypes:'假期設定', approvers:'批准人設定', users:'用戶管理', settings:'個人設定', payroll:'薪資管理', commission:'佣金管理', yearend:'年度結算', subscription:'訂閱管理' }
  const breadcrumbEn = { permissions:'Permissions', dropdown:'Race Settings', leavetypes:'Leave Types', approvers:'Approvers', users:'Users', settings:'My Settings', payroll:'Payroll', commission:'Commission', yearend:'Year-End Settlement', subscription:'Subscription' }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center shadow sticky top-0 z-40">
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-tight truncate">{text.title}</h1>
          {companyName && <div className="text-blue-200 text-xs truncate">{companyName}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block text-right mr-1">
            <div className="text-white font-medium text-sm">{userDisplayName || currentUser.email}</div>
            {userDisplayName && <div className="text-blue-200 text-xs">{currentUser.email}</div>}
          </div>
          {enteredFromPlatform && (
            <button onClick={() => { setIsPlatformAdminMode(true); setEnteredFromPlatform(false); setCompanyId(null); setUserRole(null); setPermissions({}) }}
              className="text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded-lg font-medium hover:bg-yellow-300 whitespace-nowrap">
              ← Platform
            </button>
          )}
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="bg-white text-blue-700 px-1 py-1 rounded text-xs font-medium border-0 cursor-pointer">
            <option value="zh">中文</option>
            <option value="en">EN</option>
            <option value="ms">BM</option>
          </select>
          <SettingsDropdown language={language} userRole={userRole} mainTab={mainTab}
            setMainTab={setMainTab} permissions={permissions}
            userDisplayName={userDisplayName} currentUser={currentUser} onLogout={handleLogout} />
        </div>
      </nav>

      {/* Trial Banner */}
      <TrialBanner daysLeft={trialDaysLeft} language={language} onUpgrade={() => setMainTab('subscription')} />

      {/* Breadcrumb */}
      {isSettingsTab && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center gap-2">
          <button onClick={() => setMainTab('dashboard')} className="text-blue-600 text-sm hover:underline">
            {language === 'zh' ? '← 返回首頁' : '← Back'}
          </button>
          <span className="text-gray-400 text-sm">/</span>
          <span className="text-gray-600 text-sm">
            {language === 'zh' ? breadcrumbZh[mainTab] : breadcrumbEn[mainTab]}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="p-4 max-w-5xl mx-auto">
          <Suspense fallback={<TabLoading />}>

            {mainTab === 'dashboard' && (
              <DashboardTab text={text} language={language} userRole={userRole}
                currentUserId={currentUser?.id} selectedEmployeeId={myEmployeeRecord?.id} companyId={companyId} />
            )}
            {mainTab === 'employees' && (
              <EmployeesTab text={text} language={language} userRole={userRole}
                currentUserId={currentUser?.id} permissions={permissions}
                companyId={companyId} raceOptions={raceOptions}
                myEmployeeRecord={myEmployeeRecord}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                mainTab={mainTab} setMainTab={setMainTab} />
            )}
            {mainTab === 'myleave' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <MyLeaveTab text={text} language={language} currentUserId={currentUser?.id} companyId={companyId} />
              </div>
            )}
            {mainTab === 'leave' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <LeaveManagementTab text={text} language={language} userRole={userRole} currentUserId={currentUser?.id} companyId={companyId} />
              </div>
            )}
            {mainTab === 'payroll' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <PayrollTab language={language} companyId={companyId} companyName={companyName}
                  currentUserId={currentUser?.id} userRole={userRole} permissions={permissions} />
              </div>
            )}
            {mainTab === 'commission' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <CommissionTab language={language} companyId={companyId}
                  currentUserId={currentUser?.id} userRole={userRole} />
              </div>
            )}
            {mainTab === 'permissions' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <PermissionsTab userRole={userRole} permissions={permissions} text={text} language={language} companyId={companyId} />
              </div>
            )}
            {mainTab === 'leavetypes' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <LeaveTypesTab text={text} language={language} companyId={companyId} />
              </div>
            )}
            {mainTab === 'approvers' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <LeaveApproversTab text={text} language={language} companyId={companyId} />
              </div>
            )}
            {mainTab === 'users' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <UserManagementTab text={text} language={language} currentUserRole={userRole} companyId={companyId} />
              </div>
            )}
            {mainTab === 'settings' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <SettingsTab language={language} companyId={companyId} userRole={userRole} />
              </div>
            )}
            {mainTab === 'dropdown' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <DropdownSettingsTab text={text} language={language} onRaceUpdated={fetchRaceOptions} companyId={companyId} />
              </div>
            )}
            {mainTab === 'yearend' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <YearEndTab language={language} companyId={companyId} userRole={userRole} />
              </div>
            )}
            {mainTab === 'subscription' && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <SubscriptionTab
                  company={companyData || { id: companyId, name: companyName, status: 'trial', plan: 'starter' }}
                  userRole={userRole} />
              </div>
            )}

          </Suspense>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav mainTab={mainTab} setMainTab={setMainTab}
        userRole={userRole} language={language}
        myEmployeeRecord={myEmployeeRecord}
        setSelectedEmployee={setSelectedEmployee} />
    </div>
  )
}

export default App