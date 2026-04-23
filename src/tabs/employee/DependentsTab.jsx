// src/tabs/employee/DependentsTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { COUNTRIES, emptyDependent } from '../../constants'
import SubTableForm from '../../components/SubTableForm'

export default function DependentsTab({ employeeId, text, readOnly }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyDependent)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecords() }, [employeeId])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase.from('employee_dependents').select('*').eq('employee_id', employeeId).order('created_at', { ascending: true })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, employee_id: employeeId }
    let error
    if (editingId) { ({ error } = await supabase.from('employee_dependents').update(payload).eq('id', editingId)) }
    else { ({ error } = await supabase.from('employee_dependents').insert([payload])) }
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setShowForm(false); setEditingId(null); setForm(emptyDependent); fetchRecords(); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm(text.deleteConfirmShort)) return
    await supabase.from('employee_dependents').delete().eq('id', id); fetchRecords()
  }

  function startEdit(rec) {
    setForm({ name: rec.name || '', relationship: rec.relationship || '', date_of_birth: rec.date_of_birth || '', nationality: rec.nationality || '', nric_fin: rec.nric_fin || '', remarks: rec.remarks || '' })
    setEditingId(rec.id); setShowForm(true)
  }

  const relationshipOptions = [
    { value: 'spouse', label: text.spouse }, { value: 'child', label: text.child },
    { value: 'parent', label: text.parent }, { value: 'sibling', label: text.sibling },
    { value: 'others', label: text.others },
  ]
  const fields = [
    { key: 'name', label: text.fullName },
    { key: 'relationship', label: text.relationship, type: 'select', options: relationshipOptions },
    { key: 'date_of_birth', label: text.dob, type: 'date' },
    { key: 'nationality', label: text.nationality, type: 'select', options: COUNTRIES.map(c => ({ value: c, label: c })) },
    { key: 'nric_fin', label: text.nric },
    { key: 'remarks', label: text.remarks, full: true, type: 'textarea' },
  ]
  const relLabel = (val) => relationshipOptions.find(o => o.value === val)?.label || val

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{records.length} {text.records}</span>
        {!readOnly && !showForm && (
          <button onClick={() => { setForm(emptyDependent); setEditingId(null); setShowForm(true) }}
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
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm text-gray-800">{rec.name}</div>
                {rec.relationship && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{relLabel(rec.relationship)}</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{rec.nationality || '-'}</div>
              {rec.date_of_birth && <div className="text-xs text-gray-400 mt-0.5">{rec.date_of_birth}</div>}
              {rec.nric_fin && <div className="text-xs text-gray-400 mt-0.5">{rec.nric_fin}</div>}
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