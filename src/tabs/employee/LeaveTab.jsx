// src/tabs/employee/LeaveTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { inputClass } from '../../constants'
import AttachmentLink from '../../components/AttachmentLink'
import { uploadAttachment } from '../../utils/attachments'
import { sendEmail } from '../../utils/email'

export default function LeaveTab({ employeeId, companyId, employeeName, text, language, userRole, currentUserId, employeeJoinDate }) {
  const zh = language === 'zh'
  const thisYear = new Date().getFullYear()
  const [balances, setBalances] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ leave_type: 'annual', year: thisYear, adjusted: 0, entitled: 0, carried_forward: 0 })
  const [leaveFile, setLeaveFile] = useState(null)
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', days: '', reason: '' })

  const leaveTypes = [
    { value: 'annual',         label: zh ? '年假'     : 'Annual Leave',    color: 'bg-blue-100 text-blue-700' },
    { value: 'medical',        label: zh ? '病假'     : 'Medical Leave',   color: 'bg-green-100 text-green-700' },
    { value: 'unpaid',         label: zh ? '無薪假'   : 'Unpaid Leave',    color: 'bg-gray-100 text-gray-700' },
    { value: 'public_holiday', label: zh ? '公共假期' : 'Public Holiday',  color: 'bg-purple-100 text-purple-700' },
    { value: 'others',         label: zh ? '其他'     : 'Others',          color: 'bg-yellow-100 text-yellow-700' },
  ]
  const typeLabel = (val) => leaveTypes.find(t => t.value === val)?.label || val
  const typeColor = (val) => leaveTypes.find(t => t.value === val)?.color || 'bg-gray-100 text-gray-600'

  useEffect(() => { fetchAll() }, [employeeId])

  async function fetchAll() {
    setLoading(true)
    const [{ data: bal }, { data: apps }] = await Promise.all([
      supabase.from('leave_balances').select('*').eq('employee_id', employeeId).eq('year', thisYear),
      supabase.from('leave_applications').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false }),
    ])
    setBalances(bal || [])
    setApplications(apps || [])
    setLoading(false)
  }

  function getBalance(type) {
    const b = balances.find(b => b.leave_type === type)
    if (!b) return { entitled: 0, carried_forward: 0, used: 0, adjusted: 0, remaining: 0 }
    return { ...b, remaining: Number(b.entitled) + Number(b.carried_forward) + Number(b.adjusted) - Number(b.used) }
  }

  async function handleApply() {
    if (!form.start_date || !form.end_date || !form.days) { alert(zh ? '請填寫所有必填欄位' : 'Please fill all required fields'); return }
    setSaving(true)
    let attachment_url = null
    if (leaveFile) { attachment_url = await uploadAttachment(leaveFile, 'leave'); if (!attachment_url) { setSaving(false); return } }
    await supabase.from('leave_applications').insert([{ employee_id: employeeId, leave_type: form.leave_type, start_date: form.start_date, end_date: form.end_date, days: Number(form.days), reason: form.reason, status: 'pending', attachment_url }])
    try {
      const { data: approverRow } = await supabase.from('leave_approvers').select('approver1_user_id, approver2_user_id').eq('company_id', companyId).eq('employee_id', employeeId).maybeSingle()
      if (approverRow) {
        const userIds = [approverRow.approver1_user_id, approverRow.approver2_user_id].filter(Boolean)
        if (userIds.length > 0) {
          const { data: roles } = await supabase.from('user_roles').select('email,display_name').in('user_id', userIds).eq('company_id', companyId)
          for (const approver of (roles || [])) {
            if (approver.email) await sendEmail('leave_submitted', approver.email, { approverName: approver.display_name, employeeName, leaveType: typeLabel(form.leave_type), startDate: form.start_date, endDate: form.end_date, days: form.days })
          }
        }
      }
    } catch (err) { console.error('Approver notify failed:', err) }
    setForm({ leave_type: 'annual', start_date: '', end_date: '', days: '', reason: '' }); setLeaveFile(null); setShowForm(false); fetchAll(); setSaving(false)
  }

  async function handleAdjust() {
    setSaving(true)
    await supabase.from('leave_balances').upsert({ employee_id: employeeId, year: adjustForm.year, leave_type: adjustForm.leave_type, entitled: Number(adjustForm.entitled), carried_forward: Number(adjustForm.carried_forward), adjusted: Number(adjustForm.adjusted) }, { onConflict: 'employee_id,year,leave_type' })
    setShowAdjust(false); fetchAll(); setSaving(false)
  }

  async function handleCancel(id) {
    if (!window.confirm(zh ? '確定要取消這個申請嗎？' : 'Cancel this application?')) return
    await supabase.from('leave_applications').delete().eq('id', id); fetchAll()
  }

  const canManage = ['super_admin', 'hr_admin', 'hr_staff'].includes(userRole)
  const statusColor = (s) => s === 'approved' ? 'bg-green-100 text-green-700' : s === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
  const statusLabel = (s) => s === 'approved' ? (zh ? '已批准' : 'Approved') : s === 'rejected' ? (zh ? '已拒絕' : 'Rejected') : (zh ? '待審批' : 'Pending')

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">{text.loading}</div>

  return (
    <div className="space-y-6">
      {/* Balance */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{thisYear} {zh ? '假期餘額' : 'Leave Balance'}</h3>
            {employeeJoinDate && (
              <div className="text-xs text-gray-400 mt-0.5">
                {zh ? '入職：' : 'Joined: '}{employeeJoinDate}{' · '}
                {(() => { const join = new Date(employeeJoinDate); const now = new Date(); const months = Math.floor((now - join) / (1000 * 60 * 60 * 24 * 30.44)); const y = Math.floor(months / 12); const m = months % 12; return zh ? `工齡：${y}年${m}個月` : `Service: ${y}y ${m}m` })()}
              </div>
            )}
          </div>
          {canManage && <button onClick={() => setShowAdjust(!showAdjust)} className="text-xs text-blue-600 border border-blue-300 px-3 py-1 rounded hover:bg-blue-50">{zh ? '調整額度' : 'Adjust'}</button>}
        </div>
        {showAdjust && canManage && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '假期類型' : 'Type'}</label>
                <select value={adjustForm.leave_type} onChange={e => setAdjustForm({ ...adjustForm, leave_type: e.target.value })} className={inputClass}>
                  {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '年份' : 'Year'}</label><input type="number" value={adjustForm.year} onChange={e => setAdjustForm({ ...adjustForm, year: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '應得天數' : 'Entitled'}</label><input type="number" step="0.5" value={adjustForm.entitled} onChange={e => setAdjustForm({ ...adjustForm, entitled: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '結轉天數' : 'Carried Forward'}</label><input type="number" step="0.5" value={adjustForm.carried_forward} onChange={e => setAdjustForm({ ...adjustForm, carried_forward: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '額外調整' : 'Adjustment'}</label><input type="number" step="0.5" value={adjustForm.adjusted} onChange={e => setAdjustForm({ ...adjustForm, adjusted: e.target.value })} className={inputClass} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdjust(false)} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={handleAdjust} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : text.save}</button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {leaveTypes.filter(t => t.value !== 'public_holiday').map(t => {
            const b = getBalance(t.value)
            return (
              <div key={t.value} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className={`inline-block text-xs px-2 py-0.5 rounded mb-2 ${t.color}`}>{t.label}</div>
                <div className={`text-2xl font-bold ${b.remaining < 0 ? 'text-red-500' : 'text-gray-800'}`}>{b.remaining}<span className="text-sm font-normal text-gray-400 ml-1">{zh ? '天' : 'days'}</span></div>
                <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                  <div>{zh ? '應得' : 'Entitled'}: <span className="text-gray-600">{b.entitled}</span></div>
                  <div>{zh ? '結轉CF' : 'Carry Fwd'}: <span className="text-gray-600">{b.carried_forward}</span></div>
                  {Number(b.adjusted) !== 0 && <div>{zh ? '額外調整' : 'Adjusted'}: <span className={Number(b.adjusted) > 0 ? 'text-blue-500' : 'text-orange-400'}>{Number(b.adjusted) > 0 ? '+' : ''}{b.adjusted}</span></div>}
                  <div className="border-t border-gray-100 pt-0.5 mt-0.5">{zh ? '已用' : 'Used'}: <span className="text-red-400">{b.used}</span></div>
                  <div className="border-t border-gray-100 pt-0.5 mt-0.5">{zh ? '餘額' : 'Balance'}: <span className={b.remaining < 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>{b.remaining}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Applications */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{zh ? '申請記錄' : 'Applications'}</h3>
          {!showForm && <button onClick={() => setShowForm(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ {zh ? '申請請假' : 'Apply'}</button>}
        </div>
        {showForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{zh ? '假期類型' : 'Leave Type'}</label>
                <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} className={inputClass}>
                  {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '開始日期' : 'Start Date'} *</label>
                <input type="date" value={form.start_date} onChange={e => { const s = e.target.value; const d = form.end_date && s ? Math.round((new Date(form.end_date) - new Date(s)) / (1000 * 60 * 60 * 24)) + 1 : form.days; setForm({ ...form, start_date: s, days: d > 0 ? d : form.days }) }} className={inputClass} />
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '結束日期' : 'End Date'} *</label>
                <input type="date" value={form.end_date} onChange={e => { const end = e.target.value; const d = form.start_date && end ? Math.round((new Date(end) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1 : form.days; setForm({ ...form, end_date: end, days: d > 0 ? d : form.days }) }} className={inputClass} />
              </div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '天數' : 'Days'} *</label><input type="number" step="0.5" min="0.5" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} className={inputClass} placeholder="1" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">{zh ? '原因' : 'Reason'}</label><input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={inputClass} /></div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">{zh ? '附件' : 'Attachment'}</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setLeaveFile(e.target.files[0] || null)} className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {leaveFile && <div className="text-xs text-blue-600 mt-1">📎 {leaveFile.name}</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setLeaveFile(null) }} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
              <button onClick={handleApply} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : (zh ? '提交申請' : 'Submit')}</button>
            </div>
          </div>
        )}
        {applications.length === 0 && !showForm
          ? <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">{zh ? '暫無申請記錄' : 'No applications'}</div>
          : <div className="space-y-2">{applications.map(app => (
            <div key={app.id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${typeColor(app.leave_type)}`}>{typeLabel(app.leave_type)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor(app.status)}`}>{statusLabel(app.status)}</span>
                  <span className="text-xs text-gray-500 font-medium">{app.days} {zh ? '天' : 'days'}</span>
                </div>
                <div className="text-sm text-gray-700">{app.start_date} → {app.end_date}</div>
                {app.reason && <div className="text-xs text-gray-400 mt-0.5">{app.reason}</div>}
                <AttachmentLink url={app.attachment_url} label={zh ? '查看附件' : 'View attachment'} />
                <div className="text-xs text-gray-300 mt-1">{app.created_at?.slice(0, 10)}</div>
              </div>
              {app.status === 'pending' && canManage && (
                <button onClick={() => handleCancel(app.id)} className="text-xs text-red-400 hover:underline opacity-0 group-hover:opacity-100">{zh ? '撤回' : 'Withdraw'}</button>
              )}
            </div>
          ))}</div>}
      </div>
    </div>
  )
}