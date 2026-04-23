// src/components/CompanyDocumentsTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { uploadAttachment } from '../utils/attachments'
import AttachmentLink from '../components/AttachmentLink'
import { inputClass } from '../constants'

const DOC_TYPES = [
  { value: 'employment_letter',   label_zh: '入職信',         label_en: 'Employment Letter' },
  { value: 'confirmation',        label_zh: '轉正確認信',     label_en: 'Confirmation Letter' },
  { value: 'increment',           label_zh: '加薪信',         label_en: 'Salary Increment Letter' },
  { value: 'evaluation',          label_zh: '績效評估',       label_en: 'Performance Evaluation' },
  { value: 'warning',             label_zh: '警告信',         label_en: 'Warning Letter' },
  { value: 'termination',         label_zh: '終止合約信',     label_en: 'Termination Letter' },
  { value: 'coe',                 label_zh: '在職證明',       label_en: 'Certificate of Employment' },
  { value: 'contract',            label_zh: '合約',           label_en: 'Employment Contract' },
  { value: 'promotion',           label_zh: '晉升信',         label_en: 'Promotion Letter' },
  { value: 'others',              label_zh: '其他',           label_en: 'Others' },
]

const TYPE_COLORS = {
  employment_letter: 'bg-blue-100 text-blue-700',
  confirmation:      'bg-green-100 text-green-700',
  increment:         'bg-emerald-100 text-emerald-700',
  evaluation:        'bg-purple-100 text-purple-700',
  warning:           'bg-red-100 text-red-600',
  termination:       'bg-red-100 text-red-700',
  coe:               'bg-gray-100 text-gray-600',
  contract:          'bg-blue-100 text-blue-700',
  promotion:         'bg-yellow-100 text-yellow-700',
  others:            'bg-gray-100 text-gray-500',
}

const emptyForm = {
  document_type: '',
  title: '',
  document_date: '',
  remarks: '',
}

export default function CompanyDocumentsTab({ employeeId, companyId, currentUserId, language, readOnly }) {
  const zh = language === 'zh'
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRec, setEditingRec] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('document_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.document_type) {
      alert(zh ? '請選擇文件類型' : 'Please select document type')
      return
    }
    setSaving(true)
    let attachment_url = editingRec?.attachment_url || null
    if (file) {
      attachment_url = await uploadAttachment(file, 'company-docs')
      if (!attachment_url) { setSaving(false); return }
    }
    const payload = {
      ...form,
      employee_id: employeeId,
      company_id: companyId,
      created_by: currentUserId,
      attachment_url,
      document_date: form.document_date || null,
    }
    let error
    if (editingId) {
      ({ error } = await supabase.from('employee_documents').update(payload).eq('id', editingId))
    } else {
      ({ error } = await supabase.from('employee_documents').insert([payload]))
    }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setEditingRec(null)
    setForm(emptyForm); setFile(null)
    fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(zh ? '確定刪除此文件記錄？' : 'Delete this document?')) return
    await supabase.from('employee_documents').delete().eq('id', id)
    fetchRecords()
  }

  function startEdit(rec) {
    setForm({
      document_type: rec.document_type || '',
      title: rec.title || '',
      document_date: rec.document_date || '',
      remarks: rec.remarks || '',
    })
    setEditingId(rec.id); setEditingRec(rec); setFile(null); setShowForm(true)
  }

  const typeLabel = (val) => {
    const t = DOC_TYPES.find(d => d.value === val)
    return t ? (zh ? t.label_zh : t.label_en) : val
  }

  const filtered = filterType ? records.filter(r => r.document_type === filterType) : records

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{records.length} {zh ? '份文件' : 'document(s)'}</span>
          {/* Filter */}
          {records.length > 0 && (
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white text-gray-600">
              <option value="">{zh ? '全部類型' : 'All types'}</option>
              {DOC_TYPES.map(t => (
                <option key={t.value} value={t.value}>{zh ? t.label_zh : t.label_en}</option>
              ))}
            </select>
          )}
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setEditingRec(null); setFile(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 whitespace-nowrap">
            + {zh ? '新增文件' : 'Add Document'}
          </button>
        )}
      </div>

      {/* Form */}
      {!readOnly && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '文件類型 *' : 'Document Type *'}</label>
              <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })} className={inputClass}>
                <option value="">—</option>
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{zh ? t.label_zh : t.label_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '標題' : 'Title'}</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder={zh ? '例：2025年加薪通知' : 'e.g. Salary Increment 2025'}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{zh ? '文件日期' : 'Document Date'}</label>
              <input type="date" value={form.document_date} onChange={e => setForm({ ...form, document_date: e.target.value })} className={inputClass} />
            </div>
            <div>
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
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center border-2 border-dashed rounded-xl">
          {zh ? '暫無公司文件' : 'No company documents'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(rec => (
            <div key={rec.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3 group hover:border-blue-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[rec.document_type] || 'bg-gray-100 text-gray-500'}`}>
                    {typeLabel(rec.document_type)}
                  </span>
                  {rec.document_date && (
                    <span className="text-xs text-gray-400">{rec.document_date}</span>
                  )}
                </div>
                {rec.title && <div className="text-sm font-medium text-gray-800 mt-1">{rec.title}</div>}
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
          ))}
        </div>
      )}
    </div>
  )
}