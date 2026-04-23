// src/components/PersonalDocsTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { uploadAttachment } from '../utils/attachments'
import AttachmentLink from '../components/AttachmentLink'
import { inputClass } from '../constants'

const DOC_TYPES = [
  { value: 'cv',            label_zh: '履歷 / CV',        label_en: 'CV / Resume' },
  { value: 'passport',      label_zh: '護照',             label_en: 'Passport' },
  { value: 'nric',          label_zh: 'NRIC / IC',        label_en: 'NRIC / IC' },
  { value: 'address_proof', label_zh: '地址證明',         label_en: 'Address Proof' },
  { value: 'photo',         label_zh: '個人照片',         label_en: 'Personal Photo' },
  { value: 'cert',          label_zh: '資格證書',         label_en: 'Certificate / Qualification' },
  { value: 'medical_cert',  label_zh: '體檢報告',         label_en: 'Medical Certificate' },
  { value: 'reference',     label_zh: '推薦信',           label_en: 'Reference Letter' },
  { value: 'others',        label_zh: '其他',             label_en: 'Others' },
]

const emptyForm = {
  doc_type: '',
  title: '',
  doc_date: '',
  expiry_date: '',
  remarks: '',
}

export default function PersonalDocsTab({ employeeId, companyId, language, readOnly }) {
  const zh = language === 'zh'
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRec, setEditingRec] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase
      .from('employee_personal_docs')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.doc_type) {
      alert(zh ? '請選擇文件類型' : 'Please select document type')
      return
    }
    setSaving(true)
    let attachment_url = editingRec?.attachment_url || null
    if (file) {
      attachment_url = await uploadAttachment(file, 'personal-docs')
      if (!attachment_url) { setSaving(false); return }
    }
    const payload = {
      ...form,
      employee_id: employeeId,
      company_id: companyId,
      attachment_url,
      doc_date: form.doc_date || null,
      expiry_date: form.expiry_date || null,
    }
    let error
    if (editingId) {
      ({ error } = await supabase.from('employee_personal_docs').update(payload).eq('id', editingId))
    } else {
      ({ error } = await supabase.from('employee_personal_docs').insert([payload]))
    }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setEditingRec(null)
    setForm(emptyForm); setFile(null)
    fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(zh ? '確定刪除？' : 'Delete this record?')) return
    await supabase.from('employee_personal_docs').delete().eq('id', id)
    fetchRecords()
  }

  function startEdit(rec) {
    setForm({
      doc_type: rec.doc_type || '',
      title: rec.title || '',
      doc_date: rec.doc_date || '',
      expiry_date: rec.expiry_date || '',
      remarks: rec.remarks || '',
    })
    setEditingId(rec.id); setEditingRec(rec); setFile(null); setShowForm(true)
  }

  const typeLabel = (val) => {
    const t = DOC_TYPES.find(d => d.value === val)
    return t ? (zh ? t.label_zh : t.label_en) : val
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {zh ? '份文件' : 'document(s)'}</span>
        {!readOnly && !showForm && (
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setEditingRec(null); setFile(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            + {zh ? '上傳文件' : 'Upload Document'}
          </button>
        )}
      </div>

      {/* Form */}
      {!readOnly && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '文件類型 *' : 'Document Type *'}</label>
              <select value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{zh ? t.label_zh : t.label_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '標題/說明' : 'Title / Description'}</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder={zh ? '例：2025年護照' : 'e.g. Passport 2025'} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '文件日期' : 'Document Date'}</label>
              <input type="date" value={form.doc_date} onChange={e => setForm({ ...form, doc_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '到期日期' : 'Expiry Date'}</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{zh ? '備注' : 'Remarks'}</label>
              <input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">{zh ? '上傳文件' : 'Upload File'}</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={e => setFile(e.target.files[0] || null)}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 w-full"
              />
              {editingRec?.attachment_url && !file && (
                <div className="mt-1"><AttachmentLink url={editingRec.attachment_url} label={zh ? '現有文件' : 'Current file'} /></div>
              )}
              {file && <div className="text-xs text-blue-600 mt-1">📎 {file.name}</div>}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditingId(null); setEditingRec(null) }}
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
          {zh ? '暫無個人文件' : 'No personal documents uploaded'}
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(rec => {
            const isExpired = rec.expiry_date && rec.expiry_date < today
            const expiringSoon = rec.expiry_date && !isExpired &&
              new Date(rec.expiry_date) - new Date(today) < 30 * 24 * 60 * 60 * 1000
            return (
              <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3 group hover:border-blue-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {typeLabel(rec.doc_type)}
                    </span>
                    {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{zh ? '已過期' : 'Expired'}</span>}
                    {expiringSoon && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{zh ? '即將到期' : 'Expiring soon'}</span>}
                  </div>
                  {rec.title && <div className="text-sm font-medium text-gray-800 mt-1">{rec.title}</div>}
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                    {rec.doc_date && <span>{zh ? '日期：' : 'Date: '}{rec.doc_date}</span>}
                    {rec.expiry_date && <span className={isExpired ? 'text-red-500 font-medium' : ''}>{zh ? '到期：' : 'Expires: '}{rec.expiry_date}</span>}
                  </div>
                  {rec.remarks && <div className="text-xs text-gray-400 mt-0.5">{rec.remarks}</div>}
                  {rec.attachment_url && (
                    <div className="mt-1.5">
                      <AttachmentLink url={rec.attachment_url} label={zh ? '查看文件' : 'View document'} />
                    </div>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(rec)} className="text-xs text-blue-600 hover:underline">{zh ? '編輯' : 'Edit'}</button>
                    <button onClick={() => handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{zh ? '刪除' : 'Delete'}</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}