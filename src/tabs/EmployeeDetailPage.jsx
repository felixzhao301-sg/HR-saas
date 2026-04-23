// src/tabs/EmployeeDetailPage.jsx
import { useState } from 'react'
import { supabase } from '../supabase'
import { emptyForm, inputClass } from '../constants'
import { can } from '../utils/permissions'
import Field from '../components/Field'
import ResignModal from '../components/ResignModal'
import WorkPassTab from './WorkPassTab'
import PersonalDocsTab from './PersonalDocsTab'
import CompanyDocumentsTab from './CompanyDocumentsTab'
import FormFields from './employee/FormFields'
import RecordsTab from './employee/RecordsTab'
import LeaveTab from './employee/LeaveTab'

const RESIGN_REASON_LABELS = {
  voluntary:    { zh: '自願離職', en: 'Voluntary Resignation' },
  terminated:   { zh: '終止合約', en: 'Contract Terminated' },
  contract_end: { zh: '合約期滿', en: 'Contract Ended' },
  retirement:   { zh: '退休',     en: 'Retirement' },
  other:        { zh: '其他',     en: 'Other' },
}

export default function EmployeeDetailPage({
  employee, setEmployee,
  language, text, userRole, currentUserId, permissions,
  companyId, raceOptions,
  onBack, onRefreshList,
}) {
  const zh = language === 'zh'
  const emp = employee
  const isResigned = emp.status === 'resigned'
  const isReadOnly = userRole === 'employee'
  const hasAccount = !!emp.auth_user_id  // ← 新增

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showResignModal, setShowResignModal] = useState(false)
  const [resignSaving, setResignSaving] = useState(false)

  const tabs = [
    { key: 'profile',   label: zh ? '資料'     : 'Profile',       icon: '👤' },
    { key: 'work_pass', label: zh ? '工作準證' : 'Work Pass',     icon: '🌏' },
    { key: 'personal',  label: zh ? '個人文件' : 'Personal Docs', icon: '📁' },
    { key: 'records',   label: zh ? '記錄'     : 'Records',       icon: '📋' },
    { key: 'co_docs',   label: zh ? '公司文件' : 'Co. Documents', icon: '🏢' },
    { key: 'leave',     label: zh ? '假期'     : 'Leave',         icon: '🌴' },
  ]

  const raceLabel = raceOptions.find(r => r.value === emp.race)
  const raceName = raceLabel ? (zh ? raceLabel.label_zh : raceLabel.label_en) : emp.race

  function startEdit() {
    setForm({
      full_name: emp.full_name || '', date_of_birth: emp.date_of_birth || '',
      gender: emp.gender || '', nationality: emp.nationality || '',
      race: emp.race || '', nric_fin: emp.nric_fin || '',
      join_date: emp.join_date || '', employment_type: emp.employment_type || 'full_time',
      position: emp.position || '', is_pr: emp.is_pr || false,
      is_seaman: emp.is_seaman || false, pr_year: emp.pr_year || '',
      seaman_no: emp.seaman_no || '', seaman_expiry: emp.seaman_expiry || '',
      passport_no: emp.passport_no || '',
      passport_issue_date: emp.passport_issue_date || '',
      passport_expiry_date: emp.passport_expiry_date || '',
      basic_salary: emp.basic_salary || '', basic_allowance: emp.basic_allowance || '',
      bank_name: emp.bank_name || '', bank_country: emp.bank_country || '',
      bank_account_no: emp.bank_account_no || '', bank_account_name: emp.bank_account_name || '',
      bank_remarks: emp.bank_remarks || '', address: emp.address || '',
      annual_leave: emp.annual_leave || '',
      personal_mobile: emp.personal_mobile || '', personal_email: emp.personal_email || '',
      work_email: emp.work_email || '',
    })
    setEditMode(true)
  }

  async function saveEdit() {
    if (!form.full_name || !form.date_of_birth || !form.gender || !form.nationality || !form.race || !form.join_date || !form.employment_type) {
      alert(zh ? '請填寫所有必填欄位' : 'Please fill all required fields'); return
    }
    setSaving(true)
    const payload = { ...form }
    ;['basic_salary', 'basic_allowance', 'annual_leave'].forEach(k => { if (payload[k] === '') payload[k] = null })
    ;['passport_issue_date', 'passport_expiry_date', 'date_of_birth', 'join_date', 'seaman_expiry', 'work_email'].forEach(k => { if (payload[k] === '') payload[k] = null })
    const { error } = await supabase.from('employees').update(payload).eq('id', emp.id)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setEmployee({ ...emp, ...payload }); setEditMode(false); onRefreshList(); setSaving(false)
  }

  async function deleteEmployee() {
    const { error } = await supabase.from('employees').delete().eq('id', emp.id)
    if (error) { alert('Error: ' + error.message); return }
    setShowDeleteConfirm(false); onBack()
  }

  async function handleResign(payload) {
    setResignSaving(true)
    const { error } = await supabase.from('employees').update({ status: 'resigned', resign_date: payload.resign_date, resign_reason: payload.resign_reason }).eq('id', emp.id)
    if (error) { alert('Error: ' + error.message); setResignSaving(false); return }
    setEmployee({ ...emp, status: 'resigned', resign_date: payload.resign_date, resign_reason: payload.resign_reason })
    setShowResignModal(false); onRefreshList(); setResignSaving(false)
  }

  async function handleUnresign() {
    if (!window.confirm(zh ? `確定要恢復 ${emp.full_name} 為在職狀態嗎？` : `Restore ${emp.full_name} to active?`)) return
    await supabase.from('employees').update({ status: 'active', resign_date: null, resign_reason: null }).eq('id', emp.id)
    setEmployee({ ...emp, status: 'active', resign_date: null, resign_reason: null })
    onRefreshList()
  }

  if (editMode) {
    return (
      <div>
        <button onClick={() => setEditMode(false)} className="text-blue-600 text-sm mb-4 hover:underline">← {text.cancel}</button>
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">{text.editEmployee}</h3>
          <FormFields f={form} setF={setForm} raceOptions={raceOptions} language={language} text={text} hasAccount={hasAccount} />
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
            <button onClick={saveEdit} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : text.save}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      {userRole === 'employee'
        ? null
        : <button onClick={onBack} className="text-blue-600 text-sm mb-4 hover:underline">{text.back}</button>}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xl font-bold flex-shrink-0">
                {emp.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-800">{emp.full_name}</h2>
                  {isResigned && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                      {zh ? '已離職' : 'Resigned'}{emp.resign_date && ` · ${emp.resign_date}`}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{emp.position || '-'}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${emp.employment_type === 'full_time' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {emp.employment_type === 'full_time' ? text.fullTime : text.partTime}
                  </span>
                  {emp.resign_reason && (
                    <span className="text-xs text-gray-400">
                      {RESIGN_REASON_LABELS[emp.resign_reason]?.[zh ? 'zh' : 'en'] || emp.resign_reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!isReadOnly && (
              <div className="flex gap-2 flex-wrap">
                {can(permissions, userRole, 'employee.edit') && !isResigned && (
                  <button onClick={startEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{text.edit}</button>
                )}
                {can(permissions, userRole, 'employee.edit') && !isResigned && (
                  <button onClick={() => setShowResignModal(true)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">
                    {zh ? '標記離職' : 'Mark Resigned'}
                  </button>
                )}
                {can(permissions, userRole, 'employee.edit') && isResigned && (
                  <button onClick={handleUnresign} className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">
                    {zh ? '恢復在職' : 'Restore Active'}
                  </button>
                )}
                {can(permissions, userRole, 'employee.delete') && (
                  <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-sm bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">{text.delete}</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab nav — desktop horizontal, mobile dropdown */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="hidden sm:flex px-4 sm:px-6 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5
                  ${activeTab === tab.key ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="sm:hidden px-4 py-2">
            <select value={activeTab} onChange={e => setActiveTab(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {tabs.map(tab => <option key={tab.key} value={tab.key}>{tab.icon} {tab.label}</option>)}
            </select>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.basicInfo}</h3>
                <Field label={text.fullName} value={emp.full_name} />
                <Field label={text.dob} value={emp.date_of_birth} />
                <Field label={text.gender} value={emp.gender === 'male' ? text.male : emp.gender === 'female' ? text.female : emp.gender} />
                <Field label={text.nationality} value={emp.nationality} />
                <Field label={text.race} value={raceName} />
                <Field label={text.nric} value={emp.nric_fin} />
                <Field label={text.isPR} value={emp.is_pr ? text.yes : text.no} />
                {emp.is_pr && emp.pr_year && <Field label={text.prYear} value={zh ? `PR 第${emp.pr_year}年` : `PR Year ${emp.pr_year}`} />}
                <Field label={text.address} value={emp.address} />
                <Field label={text.personalMobile} value={emp.personal_mobile} />
                <Field label={text.personalEmail} value={emp.personal_email} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.workInfo}</h3>
                <Field label={text.joinDate} value={emp.join_date} />
                {isResigned && <Field label={zh ? '離職日期' : 'Resign Date'} value={emp.resign_date} />}
                <Field label={text.employmentType} value={emp.employment_type === 'full_time' ? text.fullTime : text.partTime} />
                <Field label={text.position} value={emp.position} />
                <Field label={zh ? '公司電郵' : 'Work Email'} value={emp.work_email} />
                <Field label={text.isSeaman} value={emp.is_seaman ? text.yes : text.no} />
                {emp.is_seaman && <Field label={text.seamanNo} value={emp.seaman_no} />}
                {emp.is_seaman && emp.seaman_expiry && <Field label={text.seamanExpiry} value={emp.seaman_expiry} />}
                <Field label={text.annualLeave} value={emp.annual_leave} />
                {can(permissions, userRole, 'salary.view_all') && <>
                  <Field label={text.basicSalary} value={emp.basic_salary ? `$${emp.basic_salary}` : null} />
                  <Field label={text.basicAllowance} value={emp.basic_allowance ? `$${emp.basic_allowance}` : null} />
                </>}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.passportInfo}</h3>
                <Field label={text.passport} value={emp.passport_no} />
                <Field label={text.passportIssue} value={emp.passport_issue_date} />
                <Field label={text.passportExpiry} value={emp.passport_expiry_date} />
              </div>
              {can(permissions, userRole, 'salary.view_all') && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{text.bankInfo}</h3>
                  <Field label={text.bankName} value={emp.bank_name} />
                  <Field label={text.bankCountry} value={emp.bank_country} />
                  <Field label={text.bankAccountNo} value={emp.bank_account_no} />
                  <Field label={text.bankAccountName} value={emp.bank_account_name} />
                  <Field label={text.bankRemarks} value={emp.bank_remarks} />
                </div>
              )}
            </div>
          )}
          {activeTab === 'work_pass' && <WorkPassTab employeeId={emp.id} language={language} readOnly={isReadOnly} />}
          {activeTab === 'personal'  && <PersonalDocsTab employeeId={emp.id} companyId={companyId} language={language} readOnly={isReadOnly} />}
          {activeTab === 'records'   && <RecordsTab employeeId={emp.id} language={language} text={text} readOnly={isReadOnly} permissions={permissions} userRole={userRole} />}
          {activeTab === 'co_docs'   && <CompanyDocumentsTab employeeId={emp.id} companyId={companyId} currentUserId={currentUserId} language={language} readOnly={isReadOnly} />}
          {activeTab === 'leave'     && <LeaveTab employeeId={emp.id} companyId={companyId} employeeName={emp.full_name} text={text} language={language} userRole={userRole} currentUserId={currentUserId} employeeJoinDate={emp.join_date} />}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{text.deleteEmployee}</h3>
            <p className="text-sm text-gray-500 mb-6">{text.deleteConfirm}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
              <button onClick={deleteEmployee} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">{text.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Resign modal */}
      {showResignModal && (
        <ResignModal
          employee={emp}
          language={language}
          saving={resignSaving}
          onConfirm={handleResign}
          onCancel={() => setShowResignModal(false)}
        />
      )}
    </div>
  )
}