// src/tabs/employee/VisaInlineTab.jsx
// Entry visa records (Tourist, Business, etc.) — inside Records tab
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { inputClass } from '../../constants'
import AttachmentLink from '../../components/AttachmentLink'
import { uploadAttachment } from '../../utils/attachments'

const VISA_TYPES = ['Tourist', 'Business', 'Student', 'Transit', 'Long-Term Visit', 'Dependant', 'Others']

const emptyForm = { visa_type: '', visa_number: '', issue_date: '', expiry_date: '', issued_by: '', remarks: '' }

export default function VisaInlineTab({ employeeId, language, text, readOnly }) {
  const zh = language === 'zh'
  const today = new Date().toISOString().split('T')[0]
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRec, setEditingRec] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase.from('employee_visa').select('*').eq('employee_id', employeeId).order('expiry_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    let attachment_url = editingRec?.attachment_url || null
    if (attachmentFile) { attachment_url = await uploadAttachment(attachmentFile, 'visa'); if (!attachment_url) { setSaving(false); return } }
    const payload = { ...form, employee_id: employeeId, issue_date: form.issue_date || null, expiry_date: form.expiry_date || null, attachment_url }
    let error
    if (editingId) { ({ error } = await supabase.from('employee_visa').update(payload).eq('id', editingId)) }
    else { ({ error } = await supabase.from('employee_visa').insert([payload])) }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setEditingRec(null); setForm(emptyForm); setAttachmentFile(null); fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(zh ? '確定刪除？' : 'Delete?')) return
    await supabase.from('employee_visa').delete().eq('id', id); fetchRecords()
  }

  function startEdit(rec) {
    setForm({ visa_type: rec.visa_type || '', visa_number: rec.visa_number || '', issue_date: rec.issue_date || '', expiry_date: rec.expiry_date || '', issued_by: rec.issued_by || '', remarks: rec.remarks || '' })
    setEditingId(rec.id); setEditingRec(rec); setAttachmentFile(null); setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {zh ? '條記錄' : 'record(s)'}</span>
        {!readOnly && !showForm && (
          <button onClick={() => { setForm(emptyForm); setEditingId(null); setEditingRec(null); setAttachmentFile(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ {zh ? '新增' : 'Add'}</button>
        )}
      </div>
      {!readOnly && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{zh ? '簽證類型' : 'Visa Type'}</label>
              <select value={form.visa_type} onChange={e => setForm({ ...form, visa_type: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {VISA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{zh ? '簽證號碼' : 'Visa Number'}</label><input value={form.visa_number} onChange={e => setForm({ ...form, visa_number: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{zh ? '發出日期' : 'Issue Date'}</label><input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{zh ? '到期日期' : 'Expiry Date'}</label><input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{zh ? '發出國家/機構' : 'Issued By'}</label><input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{zh ? '備注' : 'Remarks'}</label><input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className={inputClass} /></div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{zh ? '附件' : 'Attachment'}</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setAttachmentFile(e.target.files[0] || null)}
                className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 w-full" />
              {editingRec?.attachment_url && !attachmentFile && <div className="mt-1"><AttachmentLink url={editingRec.attachment_url} label={zh ? '現有附件' : 'Current file'} /></div>}
              {attachmentFile && <div className="text-xs text-blue-600 mt-1">📎 {attachmentFile.name}</div>}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); setEditingRec(null) }} className="px-3 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">{zh ? '取消' : 'Cancel'}</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : (zh ? '儲存' : 'Save')}</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-sm text-gray-400 py-8 text-center">{zh ? '載入中...' : 'Loading...'}</div>
        : records.length === 0 ? <div className="text-sm text-gray-400 py-10 text-center border-2 border-dashed rounded-xl">{zh ? '暫無簽證記錄' : 'No visa records'}</div>
        : <div className="space-y-2">{records.map(rec => {
          const isExpired = rec.expiry_date && rec.expiry_date < today
          const expiringSoon = rec.expiry_date && !isExpired && new Date(rec.expiry_date) - new Date(today) < 30 * 24 * 60 * 60 * 1000
          return (
            <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3 group hover:border-blue-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-800">{rec.visa_type}</span>
                  {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{zh ? '已過期' : 'Expired'}</span>}
                  {expiringSoon && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{zh ? '即將到期' : 'Expiring soon'}</span>}
                </div>
                {rec.visa_number && <div className="text-xs text-gray-500 mt-0.5 font-mono">{rec.visa_number}</div>}
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                  {rec.issue_date && <span>{zh ? '發出：' : 'Issued: '}{rec.issue_date}</span>}
                  {rec.expiry_date && <span className={isExpired ? 'text-red-500 font-medium' : ''}>{zh ? '到期：' : 'Expires: '}{rec.expiry_date}</span>}
                  {rec.issued_by && <span>{rec.issued_by}</span>}
                </div>
                {rec.remarks && <div className="text-xs text-gray-400 mt-0.5">{rec.remarks}</div>}
                {rec.attachment_url && <div className="mt-1"><AttachmentLink url={rec.attachment_url} label={zh ? '查看附件' : 'View attachment'} /></div>}
              </div>
              {!readOnly && (
                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(rec)} className="text-xs text-blue-600 hover:underline">{zh ? '編輯' : 'Edit'}</button>
                  <button onClick={() => handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{zh ? '刪除' : 'Delete'}</button>
                </div>
              )}
            </div>
          )
        })}</div>}
    </div>
  )
}