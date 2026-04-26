import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass, ROLE_LABELS } from '../constants'

export default function UserManagementTab({ text, language, currentUserRole, companyId }) {
  const [employees, setEmployees] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [preselectedEmpId, setPreselectedEmpId] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('employee')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [sortKey, setSortKey] = useState('full_name')
  const [sortDir, setSortDir] = useState('asc')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)

  const zh = language === 'zh'
  const roles = ['super_admin', 'hr_admin', 'hr_staff', 'manager', 'employee', 'finance', 'read_only']

  useEffect(() => { if (companyId) loadAll() }, [companyId])

  async function loadAll() {
    setLoading(true)
    await Promise.all([fetchEmployees(), fetchUserRoles(), fetchCompanyName()])
    setLoading(false)
  }

  async function fetchCompanyName() {
    const { data } = await supabase.from('companies').select('name').eq('id', companyId).single()
    if (data) setCompanyName(data.name)
  }

  async function fetchEmployees() {
    const { data, error: err } = await supabase.from('employees')
      .select('id, full_name, personal_email, work_email, auth_user_id, position')
      .eq('company_id', companyId)
      .eq('status', 'active')  // ✅ 只顯示在職員工
    if (!err) setEmployees(data || [])
  }

  async function fetchUserRoles() {
    const { data, error: err } = await supabase.from('user_roles')
      .select('user_id, role, display_name, email, created_at').eq('company_id', companyId)
    if (!err) {
      const map = {}; (data || []).forEach(u => { map[u.user_id] = u }); setUserRoles(map)
    }
  }

  function getUserRole(emp) {
    if (!emp.auth_user_id) return null
    return userRoles[emp.auth_user_id] || null
  }

  function resetForm() {
    setNewEmployeeId(''); setNewName(''); setNewEmail('')
    setNewPassword(''); setNewRole('employee')
    setShowForm(false); setPreselectedEmpId(''); setError('')
  }

  function openFormForEmployee(emp) {
    setPreselectedEmpId(emp.id); setNewEmployeeId(emp.id)
    setNewName(emp.full_name || ''); setNewEmail(emp.work_email || emp.personal_email || '')
    setEditingUser(null); setShowForm(true); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectEmployee(empId) {
    setNewEmployeeId(empId)
    if (!empId) { setNewName(''); setNewEmail(''); return }
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setNewName(emp.full_name || ''); setNewEmail(emp.work_email || emp.personal_email || '')
  }

  async function handleCreateUser() {
    setError('')
    if (!newEmployeeId) { setError(zh ? '請選擇員工記錄' : 'Please select an employee record'); return }
    if (!newEmail.trim()) { setError(zh ? '請填寫 Email' : 'Please enter an email'); return }
    if (!newPassword || newPassword.length < 6) { setError(zh ? '密碼至少 6 位' : 'Password must be at least 6 characters'); return }
    setSaving(true); setEmailStatus(null)
    const { data, error: fnError } = await supabase.functions.invoke('send-email', {
      body: { action: 'create-user', email: newEmail.trim().toLowerCase(), password: newPassword,
        displayName: newName.trim(), role: newRole, companyId, employeeId: newEmployeeId,
        companyName, language, siteUrl: window.location.origin },
    })
    setSaving(false)
    if (fnError || data?.error) { setError(fnError?.message || data?.error || (zh ? '創建失敗' : 'Creation failed')); return }
    setEmailStatus({ sent: true, to: newEmail.trim().toLowerCase(), type: 'invite' })
    setSuccess(zh ? `✅ 帳號已建立：${newName}` : `✅ Account created: ${newName}`)
    setTimeout(() => { setSuccess(''); setEmailStatus(null) }, 8000)
    resetForm(); await loadAll()
  }

  async function handleSaveEdit() {
    if (!editName.trim()) { setError(zh ? '姓名不能為空' : 'Name cannot be empty'); return }
    setSaving(true); setError('')
    await supabase.from('user_roles').update({ display_name: editName.trim() }).eq('user_id', editingUser.user_id)
    setSuccess(zh ? '更新成功' : 'Updated'); setEditingUser(null); setEditName(''); setEditEmail('')
    await loadAll(); setSaving(false); setTimeout(() => setSuccess(''), 5000)
  }

  async function handleChangeRole(userId, newRoleVal) {
    await supabase.from('user_roles').update({ role: newRoleVal }).eq('user_id', userId); await fetchUserRoles()
  }

  async function handleSendResetEmail(email) {
    if (!email) { setError(zh ? '此用戶沒有 Email' : 'No email'); return }
    setSaving(true); setError(''); setEmailStatus(null)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email)
    setSaving(false)
    if (e) { setError(e.message) } else {
      setEmailStatus({ sent: true, to: email, type: 'reset' })
      setSuccess(zh ? `重設密碼郵件已發送至 ${email}` : `Reset email sent to ${email}`)
      setTimeout(() => { setSuccess(''); setEmailStatus(null) }, 8000)
    }
  }

  // ✅ 刪除帳號 — 同時刪 user_roles + 清空 auth_user_id + 調用 Edge Function 刪 auth.users
  async function handleDeleteUser(userId) {
    if (!window.confirm(zh
      ? '確定要移除這個用戶的帳號嗎？此操作將同時刪除登入權限。'
      : 'Remove this user account? This will also delete their login access.')) return

    setSaving(true)

    // 1. 刪 user_roles
    await supabase.from('user_roles').delete().eq('user_id', userId)

    // 2. 清空 employees.auth_user_id
    await supabase.from('employees').update({ auth_user_id: null }).eq('auth_user_id', userId)

    // 3. ✅ 調用 Edge Function 刪 auth.users
    try {
      await supabase.functions.invoke('send-email', {
        body: { action: 'delete-user', auth_user_id: userId }
      })
    } catch (err) {
      console.error('[delete-user] failed:', err)
      // 不阻斷流程 — user_roles 已刪，用戶已無法登入
    }

    setSaving(false)
    setSuccess(zh ? '✅ 帳號已刪除，登入權限已移除' : '✅ Account deleted and login access removed')
    setTimeout(() => setSuccess(''), 5000)
    await loadAll()
  }

  const unlinkedEmployees = employees.filter(e => !e.auth_user_id)
  const linkedCount   = employees.filter(e => e.auth_user_id).length
  const unlinkedCount = employees.length - linkedCount

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedEmployees = [...employees].sort((a, b) => {
    const ur_a = getUserRole(a); const ur_b = getUserRole(b)
    let valA = '', valB = ''
    if (sortKey === 'full_name')  { valA = a.full_name || ''; valB = b.full_name || '' }
    else if (sortKey === 'email') { valA = ur_a?.email || a.personal_email || ''; valB = ur_b?.email || b.personal_email || '' }
    else if (sortKey === 'status') { valA = ur_a ? '1' : '0'; valB = ur_b ? '1' : '0' }
    else if (sortKey === 'role')  { valA = ur_a?.role || 'zzz'; valB = ur_b?.role || 'zzz' }
    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{text.userMgmt}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{zh ? '管理公司用戶帳號和角色' : 'Manage company user accounts and roles'}</p>
        </div>
        {!showForm && !editingUser && unlinkedCount > 0 && (
          <button onClick={() => { setShowForm(true); setEditingUser(null); setError('') }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            + {text.addUser}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs">
          <span className="text-green-700 font-semibold">{linkedCount}</span>
          <span className="text-green-600 ml-1">{zh ? '有帳號' : 'with account'}</span>
        </div>
        {unlinkedCount > 0 && (
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs">
            <span className="text-amber-700 font-semibold">{unlinkedCount}</span>
            <span className="text-amber-600 ml-1">{zh ? '未建帳號' : 'no account'}</span>
          </div>
        )}
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-xs">
          <span className="text-gray-700 font-semibold">{employees.length}</span>
          <span className="text-gray-500 ml-1">{zh ? '員工總數' : 'total'}</span>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-4 rounded-lg overflow-hidden border border-green-200">
          <div className="p-3 bg-green-50 text-sm text-green-700 font-medium">{success}</div>
          {emailStatus && (
            <div className={`px-3 py-2 text-xs flex items-center gap-2 ${emailStatus.sent ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
              <span>{emailStatus.sent ? '📧' : '⚠️'}</span>
              {emailStatus.sent
                ? (emailStatus.type === 'invite'
                  ? (zh ? `邀請郵件已發送至 ${emailStatus.to}` : `Invitation email sent to ${emailStatus.to}`)
                  : (zh ? `重設密碼郵件已發送至 ${emailStatus.to}` : `Reset email sent to ${emailStatus.to}`))
                : (zh ? `郵件發送失敗，請手動通知。Email: ${emailStatus.to}` : `Email failed. Notify manually: ${emailStatus.to}`)}
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">{zh ? '新增用戶帳號' : 'Add User Account'}</h3>
          <p className="text-xs text-gray-400 mb-3">{zh ? '所有帳號必須關聯員工檔案。' : 'All accounts must be linked to an employee profile.'}</p>
          {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{zh ? '① 選擇員工記錄 *' : '① Select Employee *'}</label>
              {unlinkedEmployees.length === 0
                ? <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">✓ {zh ? '所有員工已有帳號' : 'All employees have accounts'}</div>
                : <select value={newEmployeeId} onChange={e => handleSelectEmployee(e.target.value)} className={inputClass}>
                    <option value="">{zh ? '— 請選擇員工 —' : '— Select employee —'}</option>
                    {unlinkedEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.position ? ` (${e.position})` : ''}</option>)}
                  </select>}
            </div>
            {newEmployeeId && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{zh ? '② 登入 Email *' : '② Login Email *'}</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputClass} placeholder="user@example.com" />
                  <p className="text-xs text-gray-400 mt-1">{zh ? '已自動從員工檔案帶入，可修改' : 'Auto-filled from profile, editable'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{zh ? '③ 臨時密碼 *' : '③ Temporary Password *'}</label>
                  <div className="relative">
                    <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass + ' pr-16'} placeholder="••••••" />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                      {showNewPwd ? (zh ? '隱藏' : 'Hide') : (zh ? '顯示' : 'Show')}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{zh ? '至少 6 位。系統將同時發送邀請郵件。' : 'Min 6 chars. Invitation email will be sent.'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{zh ? '④ 系統角色 *' : '④ System Role *'}</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className={inputClass}>
                    {roles.filter(r => r !== 'super_admin').map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleCreateUser} disabled={saving || !newEmployeeId}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? (zh ? '創建中...' : 'Creating...') : text.createUser}
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editingUser && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{zh ? `編輯帳號：${editingUser.display_name}` : `Edit: ${editingUser.display_name}`}</h3>
          {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{zh ? '姓名 *' : 'Name *'}</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">{editEmail || '—'}</div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{zh ? '重設密碼' : 'Reset Password'}</label>
              <button type="button" onClick={() => handleSendResetEmail(editingUser.email)} disabled={saving}
                className="w-full py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                📧 {zh ? `發送重設密碼郵件` : `Send password reset email`}
              </button>
              {emailStatus && (
                <div className={`mt-2 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${emailStatus.sent ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                  {emailStatus.sent ? `✅ ${zh ? '郵件已發送至' : 'Email sent to'} ${emailStatus.to}` : `⚠️ ${zh ? '郵件發送失敗' : 'Email failed'}`}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setEditingUser(null); setError(''); setEmailStatus(null) }} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">{saving ? '...' : (zh ? '儲存' : 'Save')}</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">{text.loading}</div>
      ) : employees.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">{zh ? '尚無員工記錄' : 'No employee records'}</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { key: 'full_name', label: zh ? '員工' : 'Employee' },
                  { key: 'email',     label: 'Email' },
                  { key: 'status',    label: zh ? '帳號狀態' : 'Account' },
                  { key: 'role',      label: text.role },
                ].map(({ key, label }) => (
                  <th key={key} onClick={() => handleSort(key)}
                    className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer hover:text-blue-600 select-none">
                    {label}
                    {sortKey !== key ? <span className="ml-1 text-gray-300">↕</span> : <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map(emp => {
                const ur = getUserRole(emp)
                const hasAccount = !!ur
                return (
                  <tr key={emp.id} className={`border-b border-gray-100 last:border-0 transition-colors ${!hasAccount ? 'bg-amber-50/40' : 'hover:bg-gray-50'} ${editingUser?.user_id === emp.auth_user_id ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{emp.full_name}</div>
                      {emp.position && <div className="text-xs text-gray-400 mt-0.5">{emp.position}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{ur?.email || emp.personal_email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {hasAccount
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ {zh ? '已建立' : 'Active'}</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">⚠️ {zh ? '無帳號' : 'No account'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {hasAccount
                        ? <select value={ur.role} onChange={e => handleChangeRole(emp.auth_user_id, e.target.value)}
                            disabled={ur.role === 'super_admin' && currentUserRole !== 'super_admin'}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 bg-white">
                            {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasAccount ? (
                        <div className="flex gap-3 justify-center">
                          <button onClick={() => { setEditingUser({ user_id: emp.auth_user_id, ...ur }); setEditName(ur.display_name||''); setEditEmail(ur.email||''); setShowForm(false); setError(''); setEmailStatus(null) }}
                            className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                          {ur.role !== 'super_admin' && (
                            <button onClick={() => handleDeleteUser(emp.auth_user_id)} disabled={saving}
                              className="text-xs text-red-500 hover:underline disabled:opacity-50">{text.delete}</button>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => openFormForEmployee(emp)}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          {zh ? '建立帳號' : 'Create Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ 更新底部說明 */}
      <p className="mt-4 text-xs text-gray-400">
        * {zh
          ? '刪除帳號將同時移除角色綁定和登入權限。員工檔案將保留在員工管理中。'
          : 'Deleting an account removes role binding and login access. Employee profile is kept in the employee list.'}
      </p>
    </div>
  )
}