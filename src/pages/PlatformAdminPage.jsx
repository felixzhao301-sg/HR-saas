// src/pages/PlatformAdminPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PLANS, upgradePlan } from '../utils/subscription'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'

const PLATFORM_ROLES = [
  { value: 'platform_admin', label: 'Platform Admin', desc: 'Full access — manage staff and companies' },
  { value: 'platform_staff', label: 'Platform Staff', desc: 'View companies and enter company systems' },
]

const INDUSTRY_OPTIONS = [
  'Marine & Offshore', 'Construction', 'Manufacturing', 'Logistics', 'Retail',
  'F&B', 'Healthcare', 'Finance', 'Technology', 'Education', 'Others',
]

function InfoRow({ label, value, last }) {
  if (!value && value !== 0) return null
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${!last ? 'border-b border-gray-100' : ''}`}>
      <span className="text-sm text-gray-500 shrink-0 mr-4">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

function SectionCard({ icon, title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100/60 border-b border-gray-200">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  )
}

function MyProfileModal({ user, onClose, onLogout }) {
  const [name, setName] = useState(user?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('user_roles').update({ display_name: name }).eq('user_id', user.id)
    setSaving(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000)
  }
  async function handleReset() {
    await supabase.auth.resetPasswordForEmail(user.email)
    setResetSent(true); setTimeout(() => setResetSent(false), 5000)
  }
  async function handleLogout() { await supabase.auth.signOut(); onLogout() }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">My Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <div className="font-medium text-gray-800">{name || '—'}</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
              <div className="text-xs text-blue-600 font-medium mt-0.5">{user?.role === 'platform_admin' ? 'Platform Admin' : 'Platform Staff'}</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Login Email</label>
            <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">{user?.email}</div>
          </div>
          <button onClick={handleReset} className="w-full py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
            {resetSent ? '✅ Reset email sent!' : '🔐 Send Password Reset Email'}
          </button>
          {success && <div className="text-xs text-green-600 text-center">✅ Profile updated</div>}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t">
          <button onClick={handleLogout} className="flex-1 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Logout</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompanyDetailPage({ companyId, onBack, onEnter, isAdmin }) {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { fetchCompany() }, [companyId])

  async function fetchCompany() {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').eq('id', companyId).single()
    if (data) {
      setCompany(data)
      setForm({
        name: data.name || '', uen: data.uen || '',
        address: data.address || '', postal_code: data.postal_code || '',
        phone: data.phone || '', industry: data.industry || '',
        max_employees: data.max_employees || 20,
        trial_ends_at: data.trial_ends_at ? data.trial_ends_at.slice(0,10) : '',
        subscription_ends_at: data.subscription_ends_at ? data.subscription_ends_at.slice(0,10) : '',
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, max_employees: Number(form.max_employees), trial_ends_at: form.trial_ends_at || null, subscription_ends_at: form.subscription_ends_at || null }
    const { data, error } = await supabase.from('companies').update(payload).eq('id', companyId).select().single()
    if (!error && data) setCompany(data)
    setSaving(false); setSuccess(true); setEditMode(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  const statusColor = (s) => s === 'active' ? 'bg-green-100 text-green-700' : s === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
  if (!company) return <div className="text-sm text-gray-400 py-12 text-center">Company not found</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-blue-600 text-sm hover:underline">← Companies</button>
        <div className="flex gap-2">
          {onEnter && (
            <button onClick={() => onEnter(company)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">🚀 Enter</button>
          )}
          {isAdmin && !editMode && (
            <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">✏️ Edit</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold shrink-0">
          {company.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-gray-800 text-lg">{company.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(company.status)}`}>{company.status}</span>
            <span className="text-xs text-gray-400">{company.uen}</span>
            <span className="text-xs text-gray-400">Joined {company.created_at?.slice(0,10)}</span>
          </div>
        </div>
      </div>

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">✅ Company updated successfully</div>}

      {editMode ? (
        <div className="space-y-4">
          <SectionCard icon="🏢" title="Company Information">
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">UEN</label>
                  <input value={form.uen} onChange={e => setForm({...form, uen: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} placeholder="+65 6123 4567" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
                  <input value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
                  <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className={inputClass}>
                    <option value="">— Select —</option>
                    {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </SectionCard>
          <SectionCard icon="📋" title="Subscription">
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Employees</label>
                <input type="number" value={form.max_employees} onChange={e => setForm({...form, max_employees: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trial Ends</label>
                  <input type="date" value={form.trial_ends_at} onChange={e => setForm({...form, trial_ends_at: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subscription Ends</label>
                  <input type="date" value={form.subscription_ends_at} onChange={e => setForm({...form, subscription_ends_at: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>
          </SectionCard>
          <div className="flex gap-2">
            <button onClick={() => setEditMode(false)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <SectionCard icon="🏢" title="Company Information">
            <InfoRow label="Company Name" value={company.name} />
            <InfoRow label="UEN" value={company.uen} />
            <InfoRow label="Phone" value={company.phone} />
            <InfoRow label="Address" value={company.address} />
            <InfoRow label="Postal Code" value={company.postal_code} />
            <InfoRow label="Industry" value={company.industry} last />
          </SectionCard>
          <SectionCard icon="📋" title="Subscription">
            <InfoRow label="Status" value={<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(company.status)}`}>{company.status}</span>} />
            <InfoRow label="Plan" value={company.plan} />
            <InfoRow label="Max Employees" value={company.max_employees} />
            <InfoRow label="Trial Ends" value={company.trial_ends_at?.slice(0,10)} />
            <InfoRow label="Subscription Ends" value={company.subscription_ends_at?.slice(0,10)} last />
          </SectionCard>
          <SectionCard icon="🕐" title="System">
            <InfoRow label="Company ID" value={<span className="text-xs font-mono text-gray-400">{company.id}</span>} />
            <InfoRow label="Created" value={company.created_at?.slice(0,10)} last />
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function CompaniesTab({ currentUser, onEnterCompany, onViewCompany }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState('')
  const isAdmin = currentUser?.role === 'platform_admin'

  useEffect(() => { fetchCompanies() }, [])

  async function fetchCompanies() {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    setCompanies(data || []); setLoading(false)
  }

  async function handleStatusChange(companyId, status) {
    setSavingId(companyId)
    await supabase.from('companies').update({ status }).eq('id', companyId)
    await fetchCompanies(); setSavingId(null)
  }

  async function handlePlanChange(companyId, plan) {
    setSavingId(companyId)
    await upgradePlan(companyId, plan)
    await fetchCompanies(); setSavingId(null)
  }

  const statusColor = (s) => s === 'active' ? 'bg-green-100 text-green-700' : s === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
  const filtered = companies.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.uen?.toLowerCase().includes(search.toLowerCase()))

  function getDaysLeft(company) {
    const date = company.plan === 'trial' ? company.trial_ends_at : company.subscription_ends_at
    if (!date) return '—'
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? `${diff} days` : 'Expired'
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: companies.length, color: 'text-gray-800' },
          { label: 'Active', value: companies.filter(c => c.status === 'active').length, color: 'text-green-600' },
          { label: 'Pending', value: companies.filter(c => c.status === 'pending').length, color: 'text-yellow-600' },
          { label: 'Suspended', value: companies.filter(c => c.status === 'suspended').length, color: 'text-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by company name or UEN..."
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white mb-4" />

      <div className="space-y-3">
        {loading ? <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
          : filtered.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">No companies found</div>
          : filtered.map(company => (
          <div key={company.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-200 transition-colors">
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-base shrink-0">
                  {company.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <button onClick={() => onViewCompany(company.id)} className="font-semibold text-gray-800 hover:text-blue-600 text-left truncate block w-full">
                    {company.name}
                  </button>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(company.status)}`}>{company.status}</span>
                    <span className="text-xs text-gray-400">{company.uen}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => onViewCompany(company.id)} className="text-xs text-blue-600 hover:underline shrink-0">View →</button>
            </div>
            <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span>Plan: <b className="text-gray-700">{company.plan || 'trial'}</b></span>
              <span>Expires: <b className={getDaysLeft(company) === 'Expired' ? 'text-red-500' : 'text-gray-700'}>{getDaysLeft(company)}</b></span>
              <span>Employees: <b className="text-gray-700">{company.max_employees ?? 20}</b></span>
            </div>
            <div className="px-4 pb-3 flex gap-2 flex-wrap border-t border-gray-50 pt-3">
              {onEnterCompany && (
                <button onClick={() => onEnterCompany(company)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">🚀 Enter</button>
              )}
              {isAdmin && (
                <select value={company.plan || 'trial'} onChange={e => handlePlanChange(company.id, e.target.value)}
                  disabled={savingId === company.id}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                  {Object.entries(PLANS).map(([key, p]) => <option key={key} value={key}>{p.name}</option>)}
                </select>
              )}
              {isAdmin && company.status !== 'active' && (
                <button onClick={() => handleStatusChange(company.id, 'active')} disabled={savingId === company.id}
                  className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">Activate</button>
              )}
              {isAdmin && company.status !== 'suspended' && (
                <button onClick={() => handleStatusChange(company.id, 'suspended')} disabled={savingId === company.id}
                  className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50">Suspend</button>
              )}
              {isAdmin && company.status !== 'pending' && (
                <button onClick={() => handleStatusChange(company.id, 'pending')} disabled={savingId === company.id}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 disabled:opacity-50">Set Pending</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlatformStaffTab({ currentUser }) {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'platform_staff' })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const isAdmin = currentUser?.role === 'platform_admin'

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase.from('user_roles').select('user_id, role, display_name, email, created_at')
      .in('role', ['platform_admin', 'platform_staff']).is('company_id', null).order('created_at', { ascending: true })
    setStaffList(data || []); setLoading(false)
  }

  function resetForm() { setForm({ name: '', email: '', password: '', role: 'platform_staff' }); setShowForm(false); setEditingStaff(null); setError('') }

  async function handleCreate() {
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) { setError('Please fill all required fields'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true)
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password })
    if (authErr || !authData.user) { setError(authErr?.message || 'Failed to create account'); setSaving(false); return }
    const { error: roleErr } = await supabase.from('user_roles').insert([{ user_id: authData.user.id, role: form.role, display_name: form.name.trim(), email: form.email.trim().toLowerCase(), company_id: null }])
    if (roleErr) { setError('Account created but role failed: ' + roleErr.message); setSaving(false); return }
    setSuccess(`✅ Account created: ${form.name}`); setTimeout(() => setSuccess(''), 5000)
    resetForm(); fetchStaff(); setSaving(false)
  }

  async function handleSaveEdit() {
    setSaving(true)
    await supabase.from('user_roles').update({ display_name: editingStaff.display_name, role: editingStaff.role }).eq('user_id', editingStaff.user_id)
    setSuccess('✅ Updated'); setTimeout(() => setSuccess(''), 3000)
    resetForm(); fetchStaff(); setSaving(false)
  }

  async function handleSendReset(email) {
    await supabase.auth.resetPasswordForEmail(email)
    setSuccess(`✅ Reset email sent to ${email}`); setTimeout(() => setSuccess(''), 5000)
  }

  async function handleDelete(userId) {
    if (!window.confirm('Remove this platform staff member?')) return
    await supabase.from('user_roles').delete().eq('user_id', userId); fetchStaff()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Platform Staff</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage platform team members and their access</p>
        </div>
        {isAdmin && !showForm && !editingStaff && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Add Staff</button>
        )}
      </div>

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{success}</div>}

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Platform Staff</h3>
          {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <div className="space-y-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} /></div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputClass + ' pr-16'} placeholder="••••••" />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">{showPwd ? 'Hide' : 'Show'}</button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Staff can reset via "Forgot Password"</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={inputClass}>
                {PLATFORM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">{PLATFORM_ROLES.find(r => r.value === form.role)?.desc}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Account'}</button>
          </div>
        </div>
      )}

      {editingStaff && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Edit: {editingStaff.display_name}</h3>
          <div className="space-y-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Display Name</label><input value={editingStaff.display_name} onChange={e => setEditingStaff({...editingStaff, display_name: e.target.value})} className={inputClass} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email (readonly)</label><div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">{editingStaff.email}</div></div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
              <select value={editingStaff.role} onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} disabled={editingStaff.user_id === currentUser?.id} className={inputClass + ' disabled:opacity-50'}>
                {PLATFORM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button onClick={() => handleSendReset(editingStaff.email)} className="w-full py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">🔐 Send Password Reset Email</button>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-sm text-gray-400 py-8 text-center">Loading...</div> : (
        <div className="space-y-2">
          {staffList.map(staff => (
            <div key={staff.user_id} className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-3 ${staff.user_id === currentUser?.id ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {staff.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 truncate">{staff.display_name || '—'}{staff.user_id === currentUser?.id && <span className="text-xs text-blue-500 ml-2">You</span>}</div>
                  <div className="text-xs text-gray-400 truncate">{staff.email}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${staff.role === 'platform_admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {staff.role === 'platform_admin' ? 'Admin' : 'Staff'}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditingStaff({...staff}); setShowForm(false) }} className="text-xs text-blue-600 hover:underline">Edit</button>
                  {staff.user_id !== currentUser?.id && (
                    <button onClick={() => handleDelete(staff.user_id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="text-xs font-semibold text-gray-600 mb-2">Role Permissions</div>
        {PLATFORM_ROLES.map(r => (
          <div key={r.value} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${r.value === 'platform_admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{r.label}</span>
            <span>{r.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlatformAdminPage({ onLogout, onEnterCompany }) {
  const [activeTab, setActiveTab] = useState('companies')
  const [viewingCompanyId, setViewingCompanyId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => { fetchCurrentUser() }, [])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: role } = await supabase.from('user_roles').select('display_name, role').eq('user_id', user.id).maybeSingle()
    setCurrentUser({ id: user.id, email: user.email, display_name: role?.display_name || '', role: role?.role || 'platform_admin' })
  }

  async function handleLogout() { await supabase.auth.signOut(); onLogout() }

  const displayName = currentUser?.display_name || currentUser?.email?.split('@')[0] || 'Admin'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-gray-900 text-white px-4 sm:px-6 py-3 flex justify-between items-center shadow sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {viewingCompanyId && (
            <button onClick={() => setViewingCompanyId(null)} className="text-gray-400 hover:text-white text-lg">←</button>
          )}
          <div>
            <h1 className="text-base font-bold">Platform Admin</h1>
            <p className="text-gray-400 text-xs hidden sm:block">HR SaaS Management Console</p>
          </div>
        </div>
        <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">{displayName?.[0]?.toUpperCase()}</div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-gray-400">{currentUser?.role === 'platform_admin' ? 'Admin' : 'Staff'}</div>
          </div>
          <span className="text-gray-400 text-xs">▼</span>
        </button>
      </nav>

      {!viewingCompanyId && (
        <div className="bg-gray-900 border-t border-gray-700 px-4 sm:px-6">
          <div className="flex gap-1">
            {[{ key: 'companies', label: '🏢 Companies' }, { key: 'staff', label: '👥 Staff' }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-400 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        {viewingCompanyId ? (
          <CompanyDetailPage companyId={viewingCompanyId} onBack={() => setViewingCompanyId(null)} onEnter={onEnterCompany} isAdmin={currentUser?.role === 'platform_admin'} />
        ) : activeTab === 'companies' ? (
          <CompaniesTab currentUser={currentUser} onEnterCompany={onEnterCompany} onViewCompany={(id) => setViewingCompanyId(id)} />
        ) : (
          <PlatformStaffTab currentUser={currentUser} />
        )}
      </div>

      {showProfile && currentUser && (
        <MyProfileModal user={currentUser} onClose={() => setShowProfile(false)} onLogout={handleLogout} />
      )}
    </div>
  )
}