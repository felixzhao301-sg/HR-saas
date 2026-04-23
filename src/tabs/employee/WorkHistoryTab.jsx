// src/tabs/employee/WorkHistoryTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { emptyWorkHistory } from '../../constants'
import SubTableForm from '../../components/SubTableForm'

export default function WorkHistoryTab({ employeeId, text, readOnly }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyWorkHistory)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase.from('employee_work_history').select('*').eq('employee_id', employeeId).order('start_date', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, employee_id: employeeId }
    let error
    if (editingId) { ({ error } = await supabase.from('employee_work_history').update(payload).eq('id', editingId)) }
    else { ({ error } = await supabase.from('employee_work_history').insert([payload])) }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setForm(emptyWorkHistory); fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(text.deleteConfirmShort)) return
    await supabase.from('employee_work_history').delete().eq('id', id)
    fetchRecords()
  }

  function startEdit(rec) {
    setForm({ company_name: rec.company_name || '', position: rec.position || '', start_date: rec.start_date || '', end_date: rec.end_date || '', remarks: rec.remarks || '' })
    setEditingId(rec.id); setShowForm(true)
  }

  const fields = [
    { key: 'company_name', label: text.companyName },
    { key: 'position', label: text.position },
    { key: 'start_date', label: text.startDate, type: 'date' },
    { key: 'end_date', label: text.endDate, type: 'date' },
    { key: 'remarks', label: text.remarks, full: true, type: 'textarea' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!readOnly && !showForm && (
          <button onClick={() => { setForm(emptyWorkHistory); setEditingId(null); setShowForm(true) }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ {text.add}</button>
        )}
      </div>
      {!readOnly && showForm && (
        <SubTableForm fields={fields} form={form} setForm={setForm} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingId(null) }} saving={saving} text={text} />
      )}
      {loading ? <div className="text-sm text-gray-400 py-4 text-center">{text.loading}</div>
        : records.length === 0 ? <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">{text.noRecords}</div>
        : <div className="space-y-2 mt-3">{records.map(rec => (
          <div key={rec.id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-start group">
            <div>
              <div className="font-medium text-sm text-gray-800">{rec.company_name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{rec.position || '-'}</div>
              <div className="text-xs text-gray-400 mt-1">{rec.start_date} → {rec.end_date || text.present}</div>
              {rec.remarks && <div className="text-xs text-gray-400 mt-1">{rec.remarks}</div>}
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