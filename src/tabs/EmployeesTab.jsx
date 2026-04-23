// src/tabs/EmployeesTab.jsx  (~250 lines — list + routing only)
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { EMPLOYEE_COLUMNS, emptyForm } from '../constants'
import { can } from '../utils/permissions'
import { loadXLSX } from '../utils/attachments'
import ResignModal from '../components/ResignModal'
import EmployeeDetailPage from './EmployeeDetailPage'
import FormFields from './employee/FormFields'
import BulkUploadModal from './employee/BulkUploadModal'

export default function EmployeesTab({
  text, language, userRole, currentUserId, permissions,
  companyId, raceOptions, myEmployeeRecord,
  selectedEmployee, setSelectedEmployee,
  mainTab, setMainTab,
}) {
  const zh = language === 'zh'
  const [employees,     setEmployees]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [showForm,      setShowForm]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [form,          setForm]          = useState(emptyForm)
  const [sortKey,       setSortKey]       = useState('full_name')
  const [sortDir,       setSortDir]       = useState('asc')
  const [showBulkUpload,setShowBulkUpload]= useState(false)
  const [showResigned,  setShowResigned]  = useState(false)
  const [resigningEmp,  setResigningEmp]  = useState(null)
  const [resignSaving,  setResignSaving]  = useState(false)
  const [purgingYear,   setPurgingYear]   = useState('')
  const [purgeConfirm,  setPurgeConfirm]  = useState(false)
  const [purging,       setPurging]       = useState(false)

  useEffect(() => { if (companyId) fetchEmployees() }, [companyId])

  async function fetchEmployees() {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('id,full_name,position,employment_type,join_date,status,resign_date')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (!error) setEmployees(data || [])
    setLoading(false)
  }

  async function viewEmployee(id) {
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).single()
    if (!error) setSelectedEmployee(data)
  }

  async function saveEmployee() {
    if (!form.full_name || !form.date_of_birth || !form.gender || !form.nationality || !form.race || !form.join_date || !form.employment_type) {
      alert(zh ? '請填寫所有必填欄位' : 'Please fill all required fields'); return
    }
    setSaving(true)
    const payload = { ...form, company_id: companyId }
    ;['basic_salary', 'basic_allowance', 'annual_leave'].forEach(k => { if (payload[k] === '') payload[k] = null })
    ;['seaman_expiry', 'passport_issue_date', 'passport_expiry_date', 'date_of_birth', 'join_date', 'work_email'].forEach(k => { if (payload[k] === '') payload[k] = null })
    const { data: newEmp, error } = await supabase.from('employees').insert([payload]).select('id').single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    if (newEmp?.id && payload.annual_leave) {
      await supabase.from('leave_balances').upsert({ employee_id: newEmp.id, year: new Date().getFullYear(), leave_type: 'annual', entitled: Number(payload.annual_leave), carried_forward: 0, adjusted: 0, used: 0, company_id: companyId }, { onConflict: 'employee_id,year,leave_type' })
    }
    setShowForm(false); setForm(emptyForm); fetchEmployees(); setSaving(false)
  }

  async function handleResign(payload) {
    setResignSaving(true)
    await supabase.from('employees').update({ status: 'resigned', resign_date: payload.resign_date, resign_reason: payload.resign_reason }).eq('id', resigningEmp.id)
    setResigningEmp(null); fetchEmployees(); setResignSaving(false)
  }

  async function handleUnresign(emp) {
    if (!window.confirm(zh ? `確定要恢復 ${emp.full_name} 為在職狀態嗎？` : `Restore ${emp.full_name} to active?`)) return
    await supabase.from('employees').update({ status: 'active', resign_date: null, resign_reason: null }).eq('id', emp.id)
    fetchEmployees()
  }

  async function handlePurgeResigned() {
    if (!purgingYear) return
    setPurging(true)
    const toDelete = employees.filter(e => e.status === 'resigned' && e.resign_date && new Date(e.resign_date).getFullYear() <= Number(purgingYear))
    for (const emp of toDelete) {
      await supabase.from('leave_balances').delete().eq('employee_id', emp.id)
      await supabase.from('leave_applications').delete().eq('employee_id', emp.id)
      await supabase.from('user_roles').delete().eq('employee_id', emp.id)
      await supabase.from('employees').delete().eq('id', emp.id)
    }
    setPurging(false); setPurgeConfirm(false); setPurgingYear('')
    fetchEmployees()
    alert(zh ? `已清除 ${toDelete.length} 名離職員工記錄` : `Purged ${toDelete.length} resigned employee records`)
  }

  async function downloadTemplate() {
    const xl = await loadXLSX()
    const ws = xl.utils.aoa_to_sheet([EMPLOYEE_COLUMNS.map(c => c.label), EMPLOYEE_COLUMNS.map(c => c.required ? '(Required)' : '(Optional)')])
    ws['!cols'] = EMPLOYEE_COLUMNS.map(() => ({ wch: 30 }))
    const wb = xl.utils.book_new(); xl.utils.book_append_sheet(wb, ws, 'Employees'); xl.writeFile(wb, 'HR_Employee_Template.xlsx')
  }

  async function downloadAllEmployees() {
    const xl = await loadXLSX()
    const { data } = await supabase.from('employees').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
    if (!data?.length) { alert(zh ? '暫無員工資料' : 'No employee data'); return }
    const headers = EMPLOYEE_COLUMNS.map(c => c.label)
    const rows = data.map(emp => EMPLOYEE_COLUMNS.map(c => { const v = emp[c.key]; if (typeof v === 'boolean') return v ? 'true' : 'false'; return v || '' }))
    const ws = xl.utils.aoa_to_sheet([headers, ...rows]); ws['!cols'] = EMPLOYEE_COLUMNS.map(() => ({ wch: 28 }))
    const wb = xl.utils.book_new(); xl.utils.book_append_sheet(wb, ws, 'Employees'); xl.writeFile(wb, `HR_Employees_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const resignedCount = employees.filter(e => e.status === 'resigned').length
  const filtered = employees.filter(emp => {
    const matchSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) || emp.position?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = showResigned ? true : emp.status !== 'resigned'
    return matchSearch && matchStatus
  })
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] || ''; const bv = b[sortKey] || ''
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  // ── Detail page ──────────────────────────────────────────
  if (selectedEmployee) {
    return (
      <div className="p-4 sm:p-6">
        {userRole === 'employee' && (
          <button onClick={() => setMainTab('dashboard')} className="text-blue-600 text-sm mb-4 hover:underline">
            ← {zh ? '返回首頁' : 'Back to Home'}
          </button>
        )}
        <EmployeeDetailPage
          employee={selectedEmployee}
          setEmployee={setSelectedEmployee}
          language={language}
          text={text}
          userRole={userRole}
          currentUserId={currentUserId}
          permissions={permissions}
          companyId={companyId}
          raceOptions={raceOptions}
          onBack={() => setSelectedEmployee(null)}
          onRefreshList={fetchEmployees}
        />
      </div>
    )
  }

  // ── List page ────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">{text.employees}</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">📥 {zh ? '下載範本' : 'Template'}</button>
          <button onClick={downloadAllEmployees} className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">📤 {zh ? '匯出' : 'Export'}</button>
          {can(permissions, userRole, 'employee.create') && (
            <button onClick={() => setShowBulkUpload(true)} className="border border-blue-400 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-50">📂 {zh ? '批量上傳' : 'Bulk Import'}</button>
          )}
          {can(permissions, userRole, 'employee.create') && (
            <button onClick={() => { setForm(emptyForm); setShowForm(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ {text.addEmployee}</button>
          )}
        </div>
      </div>

      {/* Search + resigned toggle */}
      <div className="flex gap-2 mb-4 sm:mb-6">
        <input
          type="text" placeholder={text.search} value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
        {resignedCount > 0 && (
          <button onClick={() => setShowResigned(v => !v)}
            className={`px-3 py-2 text-xs rounded-lg border whitespace-nowrap transition-colors ${showResigned ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
            {showResigned
              ? (zh ? `隱藏離職 (${resignedCount})` : `Hide Resigned (${resignedCount})`)
              : (zh ? `顯示離職 (${resignedCount})` : `Show Resigned (${resignedCount})`)}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">{text.loading}</div>
          : filtered.length === 0 ? <div className="p-8 text-center text-gray-500">{text.noData}</div>
          : (
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-600 text-sm">
                <tr>
                  {[
                    { key: 'full_name',       label: text.name },
                    { key: 'position',        label: text.position,       hide: 'hidden sm:table-cell' },
                    { key: 'employment_type', label: text.employmentType, hide: 'hidden md:table-cell' },
                    { key: 'join_date',       label: text.joinDate,       hide: 'hidden md:table-cell' },
                  ].map(col => (
                    <th key={col.key}
                      className={`px-3 sm:px-6 py-3 cursor-pointer select-none hover:bg-gray-200 transition-colors ${col.hide || ''}`}
                      onClick={() => { if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(col.key); setSortDir('asc') } }}>
                      <span className="flex items-center gap-1">{col.label}<span className="text-gray-400 text-xs">{sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
                    </th>
                  ))}
                  <th className="px-3 sm:px-6 py-3">{text.actions}</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                {sorted.map(emp => {
                  const isResigned = emp.status === 'resigned'
                  return (
                    <tr key={emp.id} className={isResigned ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${isResigned ? 'text-gray-400' : 'text-gray-800'}`}>{emp.full_name}</span>
                          {isResigned && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{zh ? '離職' : 'Resigned'}</span>}
                        </div>
                        {isResigned && emp.resign_date && <div className="text-xs text-red-400 mt-0.5">{zh ? '離職：' : 'Left: '}{emp.resign_date}</div>}
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden sm:table-cell text-gray-500">{emp.position || '-'}</td>
                      <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${emp.employment_type === 'full_time' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {emp.employment_type === 'full_time' ? text.fullTime : text.partTime}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-gray-500">{emp.join_date}</td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <button onClick={() => viewEmployee(emp.id)} className="text-blue-600 hover:underline text-sm">{text.view}</button>
                          {!isResigned && can(permissions, userRole, 'employee.edit') && (
                            <button onClick={() => setResigningEmp(emp)} className="text-xs text-red-400 hover:text-red-600 hover:underline">{zh ? '離職' : 'Resign'}</button>
                          )}
                          {isResigned && can(permissions, userRole, 'employee.edit') && (
                            <button onClick={() => handleUnresign(emp)} className="text-xs text-green-500 hover:text-green-700 hover:underline">{zh ? '復職' : 'Restore'}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* Purge resigned */}
      {resignedCount > 0 && can(permissions, userRole, 'employee.delete') && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-red-700">{zh ? '年度結束後清除離職員工' : 'Purge Resigned Employees After Year End'}</div>
              <div className="text-xs text-red-500 mt-0.5">{zh ? `目前有 ${resignedCount} 名離職員工。薪資快照數據將保留。` : `${resignedCount} resigned employee(s). Payroll snapshots will be kept.`}</div>
            </div>
            <div className="flex items-center gap-2">
              <select value={purgingYear} onChange={e => setPurgingYear(e.target.value)} className="border border-red-300 text-red-700 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                <option value="">{zh ? '選擇年份' : 'Select year'}</option>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{zh ? `清除 ${y} 年及以前` : `Purge resigned ≤ ${y}`}</option>)}
              </select>
              <button onClick={() => { if (purgingYear) setPurgeConfirm(true) }} disabled={!purgingYear}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">
                {zh ? '清除' : 'Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBulkUpload && (
        <BulkUploadModal language={language} text={text} companyId={companyId}
          onClose={() => setShowBulkUpload(false)}
          onDone={() => { setShowBulkUpload(false); fetchEmployees() }} />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{text.newEmployee}</h3>
            <FormFields f={form} setF={setForm} raceOptions={raceOptions} language={language} text={text} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
              <button onClick={saveEmployee} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : text.save}</button>
            </div>
          </div>
        </div>
      )}

      {purgeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-red-700 mb-2">⚠️ {zh ? '確認清除' : 'Confirm Purge'}</h3>
            <p className="text-sm text-gray-600 mb-1">{zh ? `將永久刪除 ${purgingYear} 年及以前所有離職員工的基本資料。` : `This will permanently delete profile data of employees who resigned in or before ${purgingYear}.`}</p>
            <p className="text-xs text-gray-400 mb-4">{zh ? '薪資快照記錄將保留。此操作不可撤銷。' : 'Payroll snapshots will be kept. This cannot be undone.'}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPurgeConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">{zh ? '取消' : 'Cancel'}</button>
              <button onClick={handlePurgeResigned} disabled={purging} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{purging ? '...' : (zh ? '確認刪除' : 'Delete')}</button>
            </div>
          </div>
        </div>
      )}

      {resigningEmp && (
        <ResignModal employee={resigningEmp} language={language} saving={resignSaving}
          onConfirm={handleResign}
          onCancel={() => setResigningEmp(null)} />
      )}
    </div>
  )
}