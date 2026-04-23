// src/tabs/employee/EducationTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { emptyEducation, inputClass } from '../../constants'
import AttachmentLink from '../../components/AttachmentLink'
import AttachmentField from '../../components/AttachmentField'
import { uploadAttachment } from '../../utils/attachments'

export default function EducationTab({ employeeId, text, language, readOnly }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRec, setEditingRec] = useState(null)
  const [form, setForm] = useState(emptyEducation)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase.from('employee_education').select('*').eq('employee_id', employeeId).order('start_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    let attachment_url = editingRec?.attachment_url || null
    if (attachmentFile) { attachment_url = await uploadAttachment(attachmentFile, 'education'); if (!attachment_url) { setSaving(false); return } }
    const payload = { ...form, employee_id: employeeId, attachment_url, start_date: form.start_date || null, end_date: form.end_date || null }
    let error
    if (editingId) { ({ error } = await supabase.from('employee_education').update(payload).eq('id', editingId)) }
    else { ({ error } = await supabase.from('employee_education').insert([payload])) }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setEditingRec(null); setForm(emptyEducation); setAttachmentFile(null); fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(text.deleteConfirmShort)) return
    await supabase.from('employee_education').delete().eq('id', id); fetchRecords()
  }

  function startEdit(rec) {
    setForm({ institution: rec.institution || '', qualification: rec.qualification || '', field_of_study: rec.field_of_study || '', start_date: rec.start_date || '', end_date: rec.end_date || '', remarks: rec.remarks || '' })
    setEditingId(rec.id); setEditingRec(rec); setAttachmentFile(null); setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!readOnly && !showForm && (
          <button onClick={() => { setForm(emptyEducation); setEditingId(null); setEditingRec(null); setAttachmentFile(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ {text.add}</button>
        )}
      </div>
      {!readOnly && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{text.institution}</label><input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.qualification}</label><input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.fieldOfStudy}</label><input value={form.field_of_study} onChange={e => setForm({ ...form, field_of_study: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.startDate}</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.endDate}</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputClass} /></div>
            <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">{text.remarks}</label><textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className={inputClass + ' resize-none'} rows={2} /></div>
            <AttachmentField label={language === 'zh' ? '附件' : 'Attachment'} existingUrl={editingRec?.attachment_url} existingLabel={language === 'zh' ? '查看現有附件' : 'View existing'} onFileChange={setAttachmentFile} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); setEditingRec(null) }} className="px-3 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : text.save}</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        : records.length === 0 ? <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">{text.noRecords}</div>
        : <div className="space-y-2 mt-3">{records.map(rec => (
          <div key={rec.id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-start group">
            <div>
              <div className="font-medium text-sm text-gray-800">{rec.institution}</div>
              <div className="text-xs text-gray-500 mt-0.5">{rec.qualification}{rec.field_of_study ? ` · ${rec.field_of_study}` : ''}</div>
              <div className="text-xs text-gray-400 mt-1">{rec.start_date} → {rec.end_date || text.present}</div>
              {rec.remarks && <div className="text-xs text-gray-400 mt-0.5">{rec.remarks}</div>}
              <AttachmentLink url={rec.attachment_url} label={language === 'zh' ? '查看附件' : 'View attachment'} />
            </div>
            {!readOnly && (
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(rec)} className="text-xs text-blue-600 hover:underline">{text.edit}</button>
                <button onClick={() => handleDelete(rec.id)} className="text-xs text-red-500 hover:underline">{text.delete}</button>
              </div>
            )}
          </div>
        ))}</div>}
    </div>
  )
}