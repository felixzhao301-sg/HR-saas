// src/tabs/employee/MedicalTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { emptyMedical, inputClass } from '../../constants'
import AttachmentLink from '../../components/AttachmentLink'
import AttachmentField from '../../components/AttachmentField'
import { uploadAttachment } from '../../utils/attachments'

export default function MedicalTab({ employeeId, text, language, readOnly }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRec, setEditingRec] = useState(null)
  const [form, setForm] = useState(emptyMedical)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase.from('employee_medical').select('*').eq('employee_id', employeeId).order('record_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    let attachment_url = editingRec?.attachment_url || null
    if (attachmentFile) { attachment_url = await uploadAttachment(attachmentFile, 'medical'); if (!attachment_url) { setSaving(false); return } }
    const payload = { ...form, employee_id: employeeId, attachment_url, record_date: form.record_date || null, mc_days: form.mc_days === '' ? null : form.mc_days, amount: form.amount === '' ? null : form.amount }
    let error
    if (editingId) { ({ error } = await supabase.from('employee_medical').update(payload).eq('id', editingId)) }
    else { ({ error } = await supabase.from('employee_medical').insert([payload])) }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setEditingRec(null); setForm(emptyMedical); setAttachmentFile(null); fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(text.deleteConfirmShort)) return
    await supabase.from('employee_medical').delete().eq('id', id); fetchRecords()
  }

  function startEdit(rec) {
    setForm({ record_date: rec.record_date || '', medical_type: rec.medical_type || '', doctor_name: rec.doctor_name || '', clinic_name: rec.clinic_name || '', diagnosis: rec.diagnosis || '', mc_days: rec.mc_days ?? '', amount: rec.amount ?? '', remarks: rec.remarks || '' })
    setEditingId(rec.id); setEditingRec(rec); setAttachmentFile(null); setShowForm(true)
  }

  const medicalTypeOptions = [
    { value: 'outpatient', label: text.outpatient }, { value: 'specialist', label: text.specialist },
    { value: 'hospitalization', label: text.hospitalization }, { value: 'dental', label: text.dental },
    { value: 'optical', label: text.optical }, { value: 'others', label: text.others },
  ]
  const typeLabel = (val) => medicalTypeOptions.find(o => o.value === val)?.label || val

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!readOnly && !showForm && (
          <button onClick={() => { setForm(emptyMedical); setEditingId(null); setEditingRec(null); setAttachmentFile(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ {text.add}</button>
        )}
      </div>
      {!readOnly && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-600 mb-1">{text.recordDate}</label><input type="date" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.medicalType}</label>
              <select value={form.medical_type} onChange={e => setForm({ ...form, medical_type: e.target.value })} className={inputClass}>
                <option value="">-</option>
                {medicalTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.clinicName}</label><input value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.doctorName}</label><input value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.diagnosis}</label><input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.mcDays}</label><input type="number" value={form.mc_days} onChange={e => setForm({ ...form, mc_days: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-xs text-gray-600 mb-1">{text.amount}</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} /></div>
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
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm text-gray-800">{rec.record_date}</div>
                {rec.medical_type && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{typeLabel(rec.medical_type)}</span>}
                {rec.mc_days && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">MC {rec.mc_days}d</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{rec.clinic_name || '-'}{rec.doctor_name ? ` · ${rec.doctor_name}` : ''}</div>
              {rec.diagnosis && <div className="text-xs text-gray-500 mt-0.5">{rec.diagnosis}</div>}
              {rec.amount && <div className="text-xs text-green-600 mt-0.5">${rec.amount}</div>}
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