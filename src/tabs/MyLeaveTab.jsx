import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'
import AttachmentLink from '../components/AttachmentLink'
import { uploadAttachment } from '../utils/attachments'
import { sendEmail, getApproverEmails } from '../utils/email'

const leaveTypesDef = (language) => [
  { value: 'annual',         label: language === 'zh' ? '年假'     : 'Annual Leave',    color: 'bg-blue-100 text-blue-700' },
  { value: 'medical',        label: language === 'zh' ? '病假'     : 'Medical Leave',   color: 'bg-green-100 text-green-700' },
  { value: 'unpaid',         label: language === 'zh' ? '無薪假'   : 'Unpaid Leave',    color: 'bg-gray-100 text-gray-700' },
  { value: 'public_holiday', label: language === 'zh' ? '公共假期' : 'Public Holiday',  color: 'bg-purple-100 text-purple-700' },
  { value: 'others',         label: language === 'zh' ? '其他'     : 'Others',          color: 'bg-yellow-100 text-yellow-700' },
]

export default function MyLeaveTab({ text, language, currentUserId, companyId }) {
  const [empRecord, setEmpRecord] = useState(null)
  const [balances, setBalances] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [leaveFile, setLeaveFile] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({
    leave_type: 'annual', start_date: '', end_date: '', days: '', reason: ''
  })

  const thisYear = new Date().getFullYear()
  const leaveTypes = leaveTypesDef(language)
  const typeLabel = (val) => leaveTypes.find(t => t.value === val)?.label || val
  const typeColor = (val) => leaveTypes.find(t => t.value === val)?.color || 'bg-gray-100 text-gray-600'
  const statusColor = (s) => s === 'approved' ? 'bg-green-100 text-green-700' : s === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
  const statusLabel = (s) => s === 'approved' ? (language === 'zh' ? '已批准' : 'Approved') : s === 'rejected' ? (language === 'zh' ? '已拒絕' : 'Rejected') : (language === 'zh' ? '待審批' : 'Pending')

  useEffect(() => { if (currentUserId && companyId) fetchAll() }, [currentUserId, companyId])

  async function fetchAll() {
    setLoading(true)
    // 找自己的 employee 記錄
    const { data: emp } = await supabase
      .from('employees')
      .select('id, full_name, join_date')
      .eq('auth_user_id', currentUserId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!emp) { setLoading(false); return }
    setEmpRecord(emp)

    const [{ data: bal }, { data: apps }] = await Promise.all([
      supabase.from('leave_balances').select('*').eq('employee_id', emp.id).eq('year', thisYear),
      supabase.from('leave_applications').select('*').eq('employee_id', emp.id).order('created_at', { ascending: false })
    ])
    setBalances(bal || [])
    setApplications(apps || [])
    setLoading(false)
  }

  function getBalance(type) {
    const b = balances.find(b => b.leave_type === type)
    if (!b) return { entitled: 0, carried_forward: 0, used: 0, adjusted: 0, remaining: 0 }
    const remaining = Number(b.entitled) + Number(b.carried_forward) + Number(b.adjusted) - Number(b.used)
    return { ...b, remaining }
  }

  async function handleApply() {
    if (!form.start_date || !form.end_date || !form.days) {
      alert(language === 'zh' ? '請填寫所有必填欄位' : 'Please fill all required fields')
      return
    }
    setSaving(true)

    let attachment_url = null
    if (leaveFile) {
      attachment_url = await uploadAttachment(leaveFile, 'leave')
      if (!attachment_url) { setSaving(false); return }
    }

    // 插入申請
    await supabase.from('leave_applications').insert([{
      employee_id: empRecord.id,
      company_id: companyId,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days: Number(form.days),
      reason: form.reason,
      status: 'pending',
      attachment_url,
    }])

    // 通知批准人
    try {
      const approvers = await getApproverEmails(companyId, empRecord.id)
      for (const approver of approvers) {
        if (approver.email) {
          await sendEmail('leave_submitted', approver.email, {
            approverName: approver.name,
            employeeName: empRecord.full_name,
            leaveType: typeLabel(form.leave_type),
            startDate: form.start_date,
            endDate: form.end_date,
            days: form.days,
            reason: form.reason,
          })
        }
      }
    } catch (err) {
      console.error('Approver notify failed:', err)
    }

    setForm({ leave_type: 'annual', start_date: '', end_date: '', days: '', reason: '' })
    setLeaveFile(null)
    setShowForm(false)
    setSuccessMsg(language === 'zh' ? '申請已提交，批准人將收到通知' : 'Application submitted, approvers notified')
    setTimeout(() => setSuccessMsg(''), 4000)
    fetchAll()
    setSaving(false)
  }

  async function handleWithdraw(id) {
    if (!window.confirm(language === 'zh' ? '確定要撤回這個申請嗎？' : 'Withdraw this application?')) return
    await supabase.from('leave_applications').delete().eq('id', id)
    fetchAll()
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">{text.loading}</div>

  if (!empRecord) return (
    <div className="p-6 text-center text-gray-400 text-sm">
      {language === 'zh' ? '找不到您的員工記錄，請聯絡 HR。' : 'No employee record found. Please contact HR.'}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{language === 'zh' ? '我的年假' : 'My Leave'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{empRecord.full_name} · {language === 'zh' ? '入職：' : 'Joined: '}{empRecord.join_date}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
            + {language === 'zh' ? '申請請假' : 'Apply Leave'}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          ✅ {successMsg}
        </div>
      )}

      {/* 假期餘額 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {leaveTypes.filter(t => t.value !== 'public_holiday').map(t => {
          const b = getBalance(t.value)
          return (
            <div key={t.value} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className={`inline-block text-xs px-2 py-0.5 rounded mb-2 ${t.color}`}>{t.label}</div>
              <div className={`text-2xl font-bold ${b.remaining < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                {b.remaining}<span className="text-sm font-normal text-gray-400 ml-1">{language === 'zh' ? '天' : 'd'}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                <div>{language === 'zh' ? '應得' : 'Entitled'}: <span className="text-gray-600">{b.entitled}</span></div>
                <div>{language === 'zh' ? '已用' : 'Used'}: <span className="text-red-400">{b.used}</span></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 申請表單 */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{language === 'zh' ? '新假期申請' : 'New Leave Application'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{language === 'zh' ? '假期類型' : 'Leave Type'}</label>
              <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} className={inputClass}>
                {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'zh' ? '開始日期' : 'Start Date'} *</label>
              <input type="date" value={form.start_date} onChange={e => {
                const start = e.target.value
                const days = form.end_date && start ? Math.round((new Date(form.end_date) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1 : form.days
                setForm({ ...form, start_date: start, days: days > 0 ? days : form.days })
              }} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'zh' ? '結束日期' : 'End Date'} *</label>
              <input type="date" value={form.end_date} onChange={e => {
                const end = e.target.value
                const days = form.start_date && end ? Math.round((new Date(end) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1 : form.days
                setForm({ ...form, end_date: end, days: days > 0 ? days : form.days })
              }} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'zh' ? '天數' : 'Days'} *</label>
              <input type="number" step="0.5" min="0.5" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} className={inputClass} placeholder="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'zh' ? '原因' : 'Reason'}</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{language === 'zh' ? '附件（如病假請附 MC 單）' : 'Attachment (e.g. MC for sick leave)'}</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setLeaveFile(e.target.files[0] || null)}
                className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {leaveFile && <div className="text-xs text-blue-600 mt-1">📎 {leaveFile.name}</div>}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setShowForm(false); setLeaveFile(null) }} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleApply} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : (language === 'zh' ? '提交申請' : 'Submit')}
            </button>
          </div>
        </div>
      )}

      {/* 申請記錄 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{language === 'zh' ? '申請記錄' : 'My Applications'}</h3>
        {applications.length === 0
          ? <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-lg">{language === 'zh' ? '暫無申請記錄' : 'No applications yet'}</div>
          : <div className="space-y-2">
            {applications.map(app => (
              <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-start group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${typeColor(app.leave_type)}`}>{typeLabel(app.leave_type)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor(app.status)}`}>{statusLabel(app.status)}</span>
                    <span className="text-xs text-gray-500 font-medium">{app.days} {language === 'zh' ? '天' : 'days'}</span>
                  </div>
                  <div className="text-sm text-gray-700">{app.start_date} → {app.end_date}</div>
                  {app.reason && <div className="text-xs text-gray-400 mt-0.5">{app.reason}</div>}
                  {app.remarks && <div className="text-xs text-orange-500 mt-0.5">{language === 'zh' ? '拒絕原因：' : 'Reason: '}{app.remarks}</div>}
                  <AttachmentLink url={app.attachment_url} label={language === 'zh' ? '查看附件' : 'View attachment'} />
                  <div className="text-xs text-gray-300 mt-1">{app.created_at?.slice(0, 10)}</div>
                </div>
                {app.status === 'pending' && (
                  <button onClick={() => handleWithdraw(app.id)} className="text-xs text-red-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                    {language === 'zh' ? '撤回' : 'Withdraw'}
                  </button>
                )}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}