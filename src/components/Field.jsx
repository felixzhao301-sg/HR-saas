// src/components/Field.jsx
export default function Field({ label, value }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-800 font-medium">{value || '-'}</div>
    </div>
  )
}