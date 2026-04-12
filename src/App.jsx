import PlatformAdminPage from './pages/PlatformAdminPage'
import { isPlatformAdmin } from './utils/guard'
import { useState, useEffect, useRef } from 'react'
import LoginPage from './components/LoginPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import { supabase } from './supabase'
import './App.css'
import { inputClass } from './constants'
import { loadPermissions, can } from './utils/permissions'
import DashboardTab from './tabs/DashboardTab'
import LeaveManagementTab from './tabs/LeaveManagementTab'
import LeaveTypesTab from './tabs/LeaveTypesTab'
import LeaveApproversTab from './tabs/LeaveApproversTab'
import UserManagementTab from './tabs/UserManagementTab'
import SettingsTab from './tabs/SettingsTab'
import DropdownSettingsTab from './tabs/DropdownSettingsTab'
import PermissionsTab from './tabs/PermissionsTab'
import EmployeesTab from './tabs/EmployeesTab'
import RegisterPage from './pages/RegisterPage'

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
    ...(isAdmin ? [{ key: 'leave', icon: '📋', zh: '年假管理', en: 'Leave', ms: 'Cuti' }] : []),
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => handleClick(tab)}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] relative transition-colors ${mainTab === tab.key ? 'text-blue-600' : 'text-gray-400'}`}>
            {mainTab === tab.key && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-600 rounded-full" />}
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span className="text-xs font-medium">{label(tab)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 設定下拉（右上角漢堡）────────────────────────────────────
function SettingsDropdown({ language, userRole, mainTab, setMainTab, permissions, userDisplayName, currentUser, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const items = [
    { type: 'info' },
    { type: 'divider' },
    { key: 'settings', icon: '🔑', zh: '個人設定', en: 'My Settings', show: true },
    { type: 'divider' },
    { key: 'permissions', icon: '🛡️', zh: '權限設定', en: 'Permissions', show: can(permissions, userRole, 'manage_dropdown') },
    { key: 'dropdown', icon: '🏷️', zh: '種族設定', en: 'Race Settings', show: can(permissions, userRole, 'manage_dropdown') },
    { key: 'leavetypes', icon: '📅', zh: '假期設定', en: 'Leave Types', show: can(permissions, userRole, 'manage_dropdown') },
    { key: 'approvers', icon: '✅', zh: '批准人設定', en: 'Approvers', show: can(permissions, userRole, 'manage_dropdown') },
    { key: 'users', icon: '👤', zh: '用戶管理', en: 'Users', show: ['super_admin', 'hr_admin'].includes(userRole) },
    { type: 'divider' },
    { key: 'logout', icon: '🚪', zh: '登出', en: 'Logout', show: true, danger: true },
  ].filter(i => i.type || i.show)

  const label = (item) => language === 'zh' ? item.zh : item.en
  const settingsTabs = ['permissions', 'dropdown', 'leavetypes', 'approvers', 'users', 'settings']

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${open ? 'bg-white text-blue-700 border-white' : 'bg-blue-600 border-blue-400 text-white hover:bg-blue-800'}`}>
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
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${item.danger ? 'text-red-500 hover:bg-red-50' : mainTab === item.key ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span>{item.icon}</span>
                <span>{label(item)}</span>
                {settingsTabs.includes(item.key) && mainTab === item.key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
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
  const [resetPasswordMode, setResetPasswordMode] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [isPlatformAdminMode, setIsPlatformAdminMode] = useState(false)

  const t = {
    zh: {
      title: 'HR 管理系統', employees: '員工管理', addEmployee: '新增員工',
      search: '搜索員工...', name: '姓名', position: '職位',
      employmentType: '類型', joinDate: '入職日期', actions: '操作',
      fullTime: '全職', partTime: '兼職', edit: '編輯', view: '查看',
      loading: '載入中...', noData: '暫無員工資料', save: '保存', cancel: '取消',
      back: '← 返回列表', fullName: '姓名', dob: '出生日期', gender: '性別',
      male: '男', female: '女', nationality: '國籍', race: '種族',
      nric: 'NRIC/IC/FIN', isPR: '是否PR', isSeaman: '是否海員',
      newEmployee: '新增員工資料', editEmployee: '編輯員工資料',
      basicInfo: '基本資料', workInfo: '工作資料', passportInfo: '護照資料', bankInfo: '銀行資料',
      yes: '是', no: '否', passport: '護照號碼', passportIssue: '護照發出日期', passportExpiry: '護照到期日',
      deleteEmployee: '刪除員工', delete: '刪除',
      deleteConfirm: '確定要刪除這個員工嗎？此操作不可撤銷。',
      deleteConfirmShort: '確定要刪除這條記錄嗎？',
      selectNationality: '選擇國籍', selectRace: '選擇種族', selectGender: '選擇性別',
      basicSalary: '基本薪資', basicAllowance: '基本津貼', annualLeave: '年假天數',
      bankName: '銀行名稱', bankCountry: '銀行國家', bankAccountNo: '銀行帳號',
      bankAccountName: '帳戶名稱', bankRemarks: '銀行備注', address: '地址',
      personalMobile: '私人手機號', personalEmail: '私人電郵',
      add: '新增', records: '條記錄', noRecords: '暫無記錄', present: '至今',
      startDate: '開始日期', endDate: '結束日期', remarks: '備注',
      tabWorkHistory: '工作經歷', tabEducation: '學歷', tabMedical: '醫療記錄', tabVisa: '簽證', tabDependents: '家屬',
      companyName: '公司名稱', institution: '學校/機構', qualification: '學歷/資格', fieldOfStudy: '專業/科目',
      recordDate: '記錄日期', medicalType: '類型', clinicName: '診所/醫院', doctorName: '醫生',
      diagnosis: '診斷', mcDays: 'MC天數', amount: '金額 ($)',
      outpatient: '門診', specialist: '專科', hospitalization: '住院', dental: '牙科', optical: '眼科', others: '其他',
      visaType: '簽證類型', visaNumber: '簽證號碼', issueDate: '發出日期', expiryDate: '到期日期',
      issuedBy: '發出機關', expired: '已過期', expiringSoon: '即將到期',
      relationship: '關係', spouse: '配偶', child: '子女', parent: '父母', sibling: '兄弟姐妹',
      prYear: 'PR年份', seamanNo: '海員號碼', seamanExpiry: '海員證過期日（如有）',
      permissionsTitle: '角色權限設定', feature: '功能', noPermission: '無權限查看此頁面',
      permissionsNote: '* Super Admin 擁有全部權限且不可修改。「管理角色權限」僅 Super Admin 可授予。',
      userMgmt: '用戶管理', addUser: '新增用戶', createUser: '建立用戶',
      password: '密碼', role: '角色', noUsers: '暫無用戶',
      userMgmtNote: '刪除用戶只會移除角色綁定，Auth 帳號需在 Supabase 後台刪除。',
      navEmployees: '員工', navPermissions: '權限設定', navUsers: '用戶管理', navDropdown: '種族設定',
    },
    en: {
      title: 'HR Management System', employees: 'Employee Management', addEmployee: 'Add Employee',
      search: 'Search employees...', name: 'Name', position: 'Position',
      employmentType: 'Type', joinDate: 'Join Date', actions: 'Actions',
      fullTime: 'Full Time', partTime: 'Part Time', edit: 'Edit', view: 'View',
      loading: 'Loading...', noData: 'No employees found', save: 'Save', cancel: 'Cancel',
      back: '← Back to List', fullName: 'Full Name', dob: 'Date of Birth', gender: 'Gender',
      male: 'Male', female: 'Female', nationality: 'Nationality', race: 'Race',
      nric: 'NRIC/IC/FIN', isPR: 'Is PR?', isSeaman: 'Is Seaman?',
      newEmployee: 'New Employee', editEmployee: 'Edit Employee',
      basicInfo: 'Basic Information', workInfo: 'Work Information', passportInfo: 'Passport Information', bankInfo: 'Bank Information',
      yes: 'Yes', no: 'No', passport: 'Passport No', passportIssue: 'Passport Issue Date', passportExpiry: 'Passport Expiry',
      deleteEmployee: 'Delete Employee', delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this employee? This cannot be undone.',
      deleteConfirmShort: 'Are you sure you want to delete this record?',
      selectNationality: 'Select Nationality', selectRace: 'Select Race', selectGender: 'Select Gender',
      basicSalary: 'Basic Salary', basicAllowance: 'Basic Allowance', annualLeave: 'Annual Leave (days)',
      bankName: 'Bank Name', bankCountry: 'Bank Country', bankAccountNo: 'Account No',
      bankAccountName: 'Account Name', bankRemarks: 'Bank Remarks', address: 'Address',
      personalMobile: 'Personal Mobile', personalEmail: 'Personal Email',
      add: 'Add', records: 'record(s)', noRecords: 'No records found', present: 'Present',
      startDate: 'Start Date', endDate: 'End Date', remarks: 'Remarks',
      tabWorkHistory: 'Work History', tabEducation: 'Education', tabMedical: 'Medical', tabVisa: 'Visa', tabDependents: 'Dependents',
      companyName: 'Company Name', institution: 'Institution', qualification: 'Qualification', fieldOfStudy: 'Field of Study',
      recordDate: 'Record Date', medicalType: 'Type', clinicName: 'Clinic/Hospital', doctorName: 'Doctor',
      diagnosis: 'Diagnosis', mcDays: 'MC Days', amount: 'Amount ($)',
      outpatient: 'Outpatient', specialist: 'Specialist', hospitalization: 'Hospitalization', dental: 'Dental', optical: 'Optical', others: 'Others',
      visaType: 'Visa Type', visaNumber: 'Visa No', issueDate: 'Issue Date', expiryDate: 'Expiry Date',
      issuedBy: 'Issued By', expired: 'Expired', expiringSoon: 'Expiring Soon',
      relationship: 'Relationship', spouse: 'Spouse', child: 'Child', parent: 'Parent', sibling: 'Sibling',
      prYear: 'PR Year', seamanNo: 'Seaman No', seamanExpiry: 'Seaman Expiry (if any)',
      permissionsTitle: 'Role Permissions', feature: 'Feature', noPermission: 'No permission to view this page',
      permissionsNote: '* Super Admin has all permissions. "Manage Roles" can only be granted by Super Admin.',
      userMgmt: 'User Management', addUser: 'Add User', createUser: 'Create User',
      password: 'Password', role: 'Role', noUsers: 'No users found',
      userMgmtNote: 'Deleting a user only removes the role binding. The Auth account must be deleted from Supabase dashboard.',
      navEmployees: 'Employees', navPermissions: 'Permissions', navUsers: 'Users', navDropdown: 'Race Settings',
    },
    ms: {
      title: 'Sistem Pengurusan HR', employees: 'Pengurusan Pekerja', addEmployee: 'Tambah Pekerja',
      search: 'Cari pekerja...', name: 'Nama', position: 'Jawatan',
      employmentType: 'Jenis', joinDate: 'Tarikh Masuk', actions: 'Tindakan',
      fullTime: 'Sepenuh Masa', partTime: 'Separuh Masa', edit: 'Edit', view: 'Lihat',
      loading: 'Memuatkan...', noData: 'Tiada data pekerja', save: 'Simpan', cancel: 'Batal',
      back: '← Kembali', fullName: 'Nama Penuh', dob: 'Tarikh Lahir', gender: 'Jantina',
      male: 'Lelaki', female: 'Perempuan', nationality: 'Kewarganegaraan', race: 'Bangsa',
      nric: 'NRIC/IC/FIN', isPR: 'Adakah PR?', isSeaman: 'Adakah Kelasi?',
      newEmployee: 'Pekerja Baru', editEmployee: 'Edit Pekerja',
      basicInfo: 'Maklumat Asas', workInfo: 'Maklumat Kerja', passportInfo: 'Maklumat Pasport', bankInfo: 'Maklumat Bank',
      yes: 'Ya', no: 'Tidak', passport: 'No. Pasport', passportIssue: 'Tarikh Keluaran Pasport', passportExpiry: 'Tarikh Luput Pasport',
      deleteEmployee: 'Padam Pekerja', delete: 'Padam',
      deleteConfirm: 'Adakah anda pasti ingin memadam pekerja ini? Tindakan ini tidak boleh dibatalkan.',
      deleteConfirmShort: 'Adakah anda pasti ingin memadam rekod ini?',
      selectNationality: 'Pilih Kewarganegaraan', selectRace: 'Pilih Bangsa', selectGender: 'Pilih Jantina',
      basicSalary: 'Gaji Asas', basicAllowance: 'Elaun Asas', annualLeave: 'Hari Cuti Tahunan',
      bankName: 'Nama Bank', bankCountry: 'Negara Bank', bankAccountNo: 'No. Akaun Bank',
      bankAccountName: 'Nama Akaun', bankRemarks: 'Catatan Bank', address: 'Alamat',
      personalMobile: 'No. Telefon Peribadi', personalEmail: 'E-mel Peribadi',
      add: 'Tambah', records: 'rekod', noRecords: 'Tiada rekod', present: 'Kini',
      startDate: 'Tarikh Mula', endDate: 'Tarikh Tamat', remarks: 'Catatan',
      tabWorkHistory: 'Sejarah Kerja', tabEducation: 'Pendidikan', tabMedical: 'Perubatan', tabVisa: 'Visa', tabDependents: 'Tanggungan',
      companyName: 'Nama Syarikat', institution: 'Institusi', qualification: 'Kelayakan', fieldOfStudy: 'Bidang Pengajian',
      recordDate: 'Tarikh Rekod', medicalType: 'Jenis', clinicName: 'Klinik/Hospital', doctorName: 'Doktor',
      diagnosis: 'Diagnosis', mcDays: 'Hari MC', amount: 'Jumlah ($)',
      outpatient: 'Pesakit Luar', specialist: 'Pakar', hospitalization: 'Kemasukan Hospital', dental: 'Pergigian', optical: 'Optik', others: 'Lain-lain',
      visaType: 'Jenis Visa', visaNumber: 'No. Visa', issueDate: 'Tarikh Keluaran', expiryDate: 'Tarikh Luput',
      issuedBy: 'Dikeluarkan Oleh', expired: 'Tamat Tempoh', expiringSoon: 'Hampir Tamat',
      relationship: 'Hubungan', spouse: 'Pasangan', child: 'Anak', parent: 'Ibu Bapa', sibling: 'Adik-Beradik',
      prYear: 'Tahun PR', seamanNo: 'No. Kelasi', seamanExpiry: 'Tarikh Luput Kelasi',
      permissionsTitle: 'Tetapan Kebenaran', feature: 'Ciri', noPermission: 'Tiada kebenaran untuk melihat halaman ini',
      permissionsNote: '* Super Admin mempunyai semua kebenaran.',
      userMgmt: 'Pengurusan Pengguna', addUser: 'Tambah Pengguna', createUser: 'Cipta Pengguna',
      password: 'Kata Laluan', role: 'Peranan', noUsers: 'Tiada pengguna',
      userMgmtNote: 'Memadam pengguna hanya mengalih keluar ikatan peranan.',
      navEmployees: 'Pekerja', navPermissions: 'Kebenaran', navUsers: 'Pengguna', navDropdown: 'Tetapan Bangsa',
    }
  }
  const text = t[language]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setCurrentUser(session.user); loadUserRole(session.user.id) }
      else setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setResetPasswordMode(true)
        setAuthLoading(false)
      return
      }
      if (session?.user) { setCurrentUser(session.user); loadUserRole(session.user.id) }
      else { setCurrentUser(null); setUserRole(null); setPermissions({}); setAuthLoading(false) }
     })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUserRole(userId) {
    // 檢查是否 platform admin
    const isPA = await isPlatformAdmin(userId)
    if (isPA) { setIsPlatformAdminMode(true); setAuthLoading(false); return }

    const { data } = await supabase.from('user_roles').select('role,display_name,email,company_id').eq('user_id', userId).single()
    const role = data?.role || null; setUserRole(role)
    setUserDisplayName(data?.display_name || '')
    if (data?.company_id) {
    setCompanyId(data.company_id)
    const { data: co } = await supabase.from('companies').select('name').eq('id', data.company_id).single()
    if (co) setCompanyName(co.name)
    }
    const perms = await loadPermissions(); setPermissions(perms)
    setAuthLoading(false); fetchRaceOptions()
    // 登入路由：有員工記錄 → 個人資料，否則 → Dashboard
    const { data: empData } = await supabase.from('employees').select('*').eq('auth_user_id', userId).maybeSingle()
    if (empData) {
      setMyEmployeeRecord(empData)
      setSelectedEmployee(empData)
      setMainTab('employees')
    } else {
      setMainTab('dashboard')
    }
  }

  async function handleLogout() {
    setSelectedEmployee(null); setMainTab('dashboard')
    await supabase.auth.signOut()
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
  if (isPlatformAdminMode) return (
  <PlatformAdminPage onLogout={handleLogout} />
  )
  if (showRegister) return (
  <RegisterPage
    language={language}
    onBackToLogin={() => setShowRegister(false)}
  />
  )
  if (resetPasswordMode) return (
  <ResetPasswordPage
    language={language}
    onDone={() => {
      setResetPasswordMode(false)
      supabase.auth.signOut()
    }}
  />
)
  if (!currentUser) return (
  <LoginPage
    language={language}
    setLanguage={setLanguage}
    onRegister={() => setShowRegister(true)}
  />
  )

  const settingsTabs = ['permissions', 'dropdown', 'leavetypes', 'approvers', 'users', 'settings']
  const isSettingsTab = settingsTabs.includes(mainTab)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── 頂部 Navbar (sticky) ── */}
      <nav className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center shadow sticky top-0 z-40">
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-tight truncate">{text.title}</h1>
          {companyName && <div className="text-blue-200 text-xs truncate">{companyName}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 桌面版顯示用戶名 */}
          <div className="hidden sm:block text-right mr-1">
            <div className="text-white font-medium text-sm">{userDisplayName || currentUser.email}</div>
            {userDisplayName && <div className="text-blue-200 text-xs">{currentUser.email}</div>}
          </div>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="bg-white text-blue-700 px-1 py-1 rounded text-xs font-medium border-0 cursor-pointer">
            <option value="zh">中文</option>
            <option value="en">EN</option>
            <option value="ms">BM</option>
          </select>
          <SettingsDropdown
            language={language} userRole={userRole} mainTab={mainTab}
            setMainTab={setMainTab} permissions={permissions}
            userDisplayName={userDisplayName} currentUser={currentUser}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      {/* ── 設定頁面麵包屑提示 ── */}
      {isSettingsTab && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center gap-2">
          <button onClick={() => setMainTab('dashboard')} className="text-blue-600 text-sm hover:underline">
            {language === 'zh' ? '← 返回首頁' : '← Back'}
          </button>
          <span className="text-gray-400 text-sm">/</span>
          <span className="text-gray-600 text-sm">
            {language === 'zh' ? {
              permissions: '權限設定', dropdown: '種族設定', leavetypes: '假期設定',
              approvers: '批准人設定', users: '用戶管理', settings: '個人設定'
            }[mainTab] : {
              permissions: 'Permissions', dropdown: 'Race Settings', leavetypes: 'Leave Types',
              approvers: 'Approvers', users: 'Users', settings: 'My Settings'
            }[mainTab]}
          </span>
        </div>
      )}

      {/* ── 內容區 (獨立滾動，底部留 56px 給底部導航) ── */}
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="p-4 max-w-5xl mx-auto">
          {mainTab === 'employees' && (
            <EmployeesTab
              text={text} language={language} userRole={userRole}
              currentUserId={currentUser?.id} permissions={permissions}
              companyId={companyId} raceOptions={raceOptions}
              myEmployeeRecord={myEmployeeRecord}
              selectedEmployee={selectedEmployee}
              setSelectedEmployee={setSelectedEmployee}
              mainTab={mainTab} setMainTab={setMainTab}
            />
          )}
          {mainTab === 'dashboard' && <DashboardTab text={text} language={language} userRole={userRole} currentUserId={currentUser?.id} selectedEmployeeId={myEmployeeRecord?.id} companyId={companyId} />}
          {mainTab === 'permissions' && <div className="bg-white rounded-xl shadow overflow-hidden"><PermissionsTab userRole={userRole} permissions={permissions} text={text} language={language} companyId={companyId} /></div>}
          {mainTab === 'leavetypes' && <div className="bg-white rounded-xl shadow overflow-hidden"><LeaveTypesTab text={text} language={language} companyId={companyId} /></div>}
          {mainTab === 'approvers' && <div className="bg-white rounded-xl shadow overflow-hidden"><LeaveApproversTab text={text} language={language} companyId={companyId} /></div>}
          {mainTab === 'leave' && <div className="bg-white rounded-xl shadow overflow-hidden"><LeaveManagementTab text={text} language={language} userRole={userRole} currentUserId={currentUser?.id} companyId={companyId} /></div>}
          {mainTab === 'users' && <div className="bg-white rounded-xl shadow overflow-hidden"><UserManagementTab text={text} language={language} currentUserRole={userRole} companyId={companyId} /></div>}
          {mainTab === 'settings' && <div className="bg-white rounded-xl shadow overflow-hidden"><SettingsTab language={language} /></div>}
          {mainTab === 'dropdown' && <div className="bg-white rounded-xl shadow overflow-hidden"><DropdownSettingsTab text={text} language={language} onRaceUpdated={fetchRaceOptions} companyId={companyId} /></div>}
        </div>
      </div>

      {/* ── 底部導航欄 ── */}
      <BottomNav
        mainTab={mainTab} setMainTab={setMainTab}
        userRole={userRole} language={language}
        myEmployeeRecord={myEmployeeRecord}
        setSelectedEmployee={setSelectedEmployee}
      />
    </div>
  )
}

export default App