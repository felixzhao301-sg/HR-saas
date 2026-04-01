// src/components/SubTableForm.jsx
import { inputClass } from '../constants'

export default function SubTableForm({ fields, form, setForm, onSave, onCancel, saving, text }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(field => (
          <div key={field.key} className={field.full ? 'col-span-2' : ''}>
            <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
            {field.type === 'select' ? (
              <select value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} className={inputClass}>
                <option value="">-</option>
                {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} className={inputClass + ' resize-none'} rows={2} />
            ) : (
              <input type={field.type || 'text'} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} className={inputClass} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50">{text.cancel}</button>
        <button onClick={onSave} disabled={saving} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : text.save}</button>
      </div>
    </div>
  )
}