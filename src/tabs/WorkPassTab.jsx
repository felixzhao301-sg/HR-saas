// src/tabs/VisaTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { uploadAttachment } from '../utils/attachments'
import AttachmentLink from '../components/AttachmentLink'
import { inputClass } from '../constants'

const VISA_TYPES = [
  { value: 'EP',        label: 'Employment Pass (EP)' },
  { value: 'SP',        label: 'S Pass (SP)' },
  { value: 'WP',        label: 'Work Permit (WP)' },
  { value: 'DP',        label: 'Dependant Pass (DP)' },
  { value: 'LTVP',      label: 'Long Term Visit Pass (LTVP)' },
  { value: 'PEP',       label: 'Personalised Employment Pass (PEP)' },
  { value: 'EntrePass', label: 'EntrePass' },
  { value: 'Others',    label: 'Others' },
]

const emptyForm = {
  visa_type: '', visa_number: '', application_date: '',
  issue_date: '', expiry_date: '', issued_by: '', remarks: '',
}

export default function VisaTab({ employeeId, language, readOnly }) {
  const zh = language === 'zh'
  const today = new Date().toISOString().split('T')[0]

  const [records,       setRecords]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editingId,     setEditingId]     = useState(null)
  const [form,          setForm]          = useState(emptyForm)
  const [file,          setFile]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [uploadingFor,  setUploadingFor]  = useState(null)
  const [attachFile,    setAttachFile]    = useState(null)
  const [uploadingSaving, setUploadingSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase
      .from('employee_visa')
      .select('*, employee_visa_attachments(*)')
      .eq('employee_id', employeeId)
      .order('expiry_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.visa_type) { alert(zh ? '請選擇簽證類型' : 'Please select pass type'); return }
    setSaving(true)
    let attachment_url = null
    if (file) {
      attachment_url = await uploadAttachment(file, 'visa')
      if (!attachment_url) { setSaving(false); return }
    }
    const payload = {
      ...form,
      employee_id: employeeId,
      application_date: form.application_date || null,
      issue_date:       form.issue_date       || null,
      expiry_date:      form.expiry_date      || null,
    }
    let error, data
    if (editingId) {
      ;({ error } = await supabase.from('employee_visa').update(payload).eq('id', editingId))
    } else {
      ;({ data, error } = await supabase.from('employee_visa').insert([payload]).select('id').single())
      if (!error && data && attachment_url) {
        await supabase.from('employee_visa_attachments').insert([{
          visa_id: data.id, file_name: file.name, attachment_url,
        }])
      }
    }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setForm(emptyForm); setFile(null)
    fetchRecords(); setSaving(false)
  }

  async function handleAddAttachment(visaId) {
    if (!attachFile) return
    setUploadingSaving(true)
    const url = await uploadAttachment(attachFile, 'visa')
    if (!url) { setUploadingSaving(false); return }
    await supabase.from('employee_visa_attachments').insert([{
      visa_id: visaId, file_name: attachFile.name, attachment_url: url,
    }])
    setUploadingFor(null); setAttachFile(null)
    fetchRecords(); setUploadingSaving(false)
  }

  async function handleDeleteAttachment(attachId) {
    if (!window.confirm(zh ? '刪除此附件？' : 'Delete this attachment?')) return
    await supabase.from('employee_visa_attachments').delete().eq('id', attachId)
    fetchRecords()
  }

  async function handleDelete(id) {
    if (!window.confirm(zh ? '確定刪除此簽證記錄？' : 'Delete this work pass record?')) return
    await supabase.from('employee_visa').delete().eq('id', id)
    fetchRecords()
  }

  function startEdit(rec) {
    setForm({
      visa_type:        rec.visa_type        || '',
      visa_number:      rec.visa_number      || '',
      application_date: rec.application_date || '',
      issue_date:       rec.issue_date       || '',
      expiry_date:      rec.expiry_date      || '',
      issued_by:        rec.issued_by        || '',
      remarks:          rec.remarks          || '',
    })
    setEditingId(rec.id); setFile(null); setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {zh ? '條記錄' : 'record(s)'}</span>
        {!readOnly && !showForm && (
          <button onClick={() => { setForm(emptyForm); setEditingId(null); setFile(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            + {zh ? '新增' : 'Add'}
          </button>
        )}
      </div>

      {/* Form */}
      {!readOnly && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '簽證類型 *' : 'Pass Type *'}</label>
              <select value={form.visa_type} onChange={e => setForm({ ...form, visa_type: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {VISA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '簽證號碼' : 'Pass Number'}</label>
              <input value={form.visa_number} onChange={e => setForm({ ...form, visa_number: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '申請日期' : 'Application Date'}</label>
              <input type="date" value={form.application_date} onChange={e => setForm({ ...form, application_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '發出日期' : 'Issue Date'}</label>
              <input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '到期日期' : 'Expiry Date'}</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '發出機構' : 'Issued By'}</label>
              <input value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })} className={inputClass} placeholder="MOM" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{zh ? '備注' : 'Remarks'}</label>
              <input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className={inputClass} />
            </div>
            {!editingId && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">{zh ? '上傳附件（可選）' : 'Upload Attachment (optional)'}</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setFile(e.target.files[0] || null)}
                  className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 w-full" />
                {file && <div className="text-xs text-blue-600 mt-1">📎 {file.name}</div>}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditingId(null) }}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              {zh ? '取消' : 'Cancel'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : (zh ? '儲存' : 'Save')}
            </button>
          </div>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">{zh ? '載入中...' : 'Loading...'}</div>
      ) : records.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center border-2 border-dashed rounded-xl">
          {zh ? '暫無簽證記錄' : 'No work pass records'}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const isExpired    = rec.expiry_date && rec.expiry_date < today
            const expiringSoon = rec.expiry_date && !isExpired &&
              new Date(rec.expiry_date) - new Date(today) < 30 * 24 * 60 * 60 * 1000
            const attachments  = rec.employee_visa_attachments || []
            return (
              <div key={rec.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-800">{rec.visa_type}</span>
                        {isExpired    && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{zh ? '已過期' : 'Expired'}</span>}
                        {expiringSoon && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{zh ? '即將到期' : 'Expiring soon'}</span>}
                      </div>
                      {rec.visa_number && <div className="text-sm text-gray-600 mt-0.5 font-mono">{rec.visa_number}</div>}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                        {rec.application_date && <span>📋 {zh ? '申請：' : 'Applied: '}{rec.application_date}</span>}
                        {rec.issue_date       && <span>✅ {zh ? '發出：' : 'Issued: '}{rec.issue_date}</span>}
                        {rec.expiry_date      && <span className={isExpired ? 'text-red-500 font-medium' : ''}>⏳ {zh ? '到期：' : 'Expires: '}{rec.expiry_date}</span>}
                        {rec.issued_by        && <span>🏢 {rec.issued_by}</span>}
                      </div>
                      {rec.remarks && <div className="text-xs text-gray-400 mt-1">{rec.remarks}</div>}
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => startEdit(rec)} className="text-xs text-blue-600 hover:underline">{zh ? '編輯' : 'Edit'}</button>
                        <button onClick={() => handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{zh ? '刪除' : 'Delete'}</button>
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">📎 {zh ? '附件' : 'Attachments'} ({attachments.length})</span>
                      {!readOnly && (
                        <button onClick={() => { setUploadingFor(uploadingFor === rec.id ? null : rec.id); setAttachFile(null) }}
                          className="text-xs text-blue-600 hover:underline">
                          + {zh ? '添加附件' : 'Add file'}
                        </button>
                      )}
                    </div>
                    {!readOnly && uploadingFor === rec.id && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={e => setAttachFile(e.target.files[0] || null)}
                          className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 flex-1" />
                        <button onClick={() => handleAddAttachment(rec.id)}
                          disabled={!attachFile || uploadingSaving}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap">
                          {uploadingSaving ? '...' : (zh ? '上傳' : 'Upload')}
                        </button>
                        <button onClick={() => { setUploadingFor(null); setAttachFile(null) }}
                          className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    )}
                    {attachments.length === 0 ? (
                      <div className="text-xs text-gray-300">{zh ? '暫無附件' : 'No attachments yet'}</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map(att => (
                          <div key={att.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                            <AttachmentLink url={att.attachment_url} label={att.file_name || (zh ? '查看' : 'View')} />
                            {!readOnly && (
                              <button onClick={() => handleDeleteAttachment(att.id)}
                                className="text-gray-300 hover:text-red-500 text-xs ml-1">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}