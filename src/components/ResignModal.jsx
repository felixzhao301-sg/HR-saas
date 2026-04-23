// src/components/ResignModal.jsx
// 離職確認彈窗 — 模塊化，供 EmployeesTab 使用
import { useState } from 'react'

const RESIGN_REASONS = [
  { value: 'voluntary',      label_zh: '自願離職',    label_en: 'Voluntary Resignation' },
  { value: 'terminated',     label_zh: '終止合約',    label_en: 'Contract Terminated' },
  { value: 'contract_end',   label_zh: '合約期滿',    label_en: 'Contract Ended' },
  { value: 'retirement',     label_zh: '退休',        label_en: 'Retirement' },
  { value: 'other',          label_zh: '其他',        label_en: 'Other' },
]

export default function ResignModal({ employee, language, onConfirm, onCancel, saving }) {
  const zh = language === 'zh'
  const today = new Date().toISOString().split('T')[0]
  const [resignDate, setResignDate] = useState(today)
  const [resignReason, setResignReason] = useState('voluntary')

  function handleConfirm() {
    if (!resignDate) {
      alert(zh ? '請填寫離職日期' : 'Please enter resignation date')
      return
    }
    onConfirm({ resign_date: resignDate, resign_reason: resignReason, status: 'resigned' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">
            {zh ? '確認離職' : 'Confirm Resignation'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{employee.full_name}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            ⚠️ {zh
              ? '離職後員工將從薪資、年假等模塊中隱藏，但數據保留以供查閱和 IR8A 生成。'
              : 'After resignation, employee will be hidden from payroll & leave modules. Data is kept for records and IR8A.'}
          </div>

          {/* Resign Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {zh ? '離職日期 *' : 'Last Day of Employment *'}
            </label>
            <input
              type="date"
              value={resignDate}
              onChange={e => setResignDate(e.target.value)}
              max={today}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {zh ? '離職原因' : 'Reason for Leaving'}
            </label>
            <select
              value={resignReason}
              onChange={e => setResignReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              {RESIGN_REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {zh ? r.label_zh : r.label_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            {zh ? '取消' : 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
            {saving ? '...' : (zh ? '確認離職' : 'Confirm Resignation')}
          </button>
        </div>
      </div>
    </div>
  )
}