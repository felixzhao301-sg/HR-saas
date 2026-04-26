// src/components/ResignModal.jsx
import { useState } from 'react'

const RESIGN_REASONS = [
  { value: 'voluntary',    label_zh: '自願離職', label_en: 'Voluntary Resignation' },
  { value: 'terminated',  label_zh: '終止合約', label_en: 'Contract Terminated' },
  { value: 'contract_end',label_zh: '合約期滿', label_en: 'Contract Ended' },
  { value: 'retirement',  label_zh: '退休',     label_en: 'Retirement' },
  { value: 'other',       label_zh: '其他',     label_en: 'Other' },
]

export default function ResignModal({ employee, language, onConfirm, onCancel, saving }) {
  const zh = language === 'zh'
  const today = new Date().toISOString().split('T')[0]

  const [resignDate,   setResignDate]   = useState(today)
  const [resignReason, setResignReason] = useState('voluntary')
  // ✅ IR21 欄位 — 只對外籍員工顯示
  const [ir21Filed,     setIr21Filed]     = useState(false)
  const [ir21FiledDate, setIr21FiledDate] = useState(today)

  // 判斷是否外籍（非新加坡人、非 PR）
  const isForeigner = employee.nationality &&
    employee.nationality !== 'Singapore' &&
    !employee.is_pr

  function handleConfirm() {
    if (!resignDate) {
      alert(zh ? '請填寫離職日期' : 'Please enter resignation date')
      return
    }
    if (ir21Filed && !ir21FiledDate) {
      alert(zh ? '請填寫 IR21 呈報日期' : 'Please enter IR21 filing date')
      return
    }
    onConfirm({
      resign_date:    resignDate,
      resign_reason:  resignReason,
      status:         'resigned',
      // ✅ IR21 數據一起傳出去
      ir21_filed:      ir21Filed,
      ir21_filed_date: ir21Filed ? ir21FiledDate : null,
    })
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

          {/* ✅ IR21 — 只對外籍員工顯示 */}
          {isForeigner && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-blue-700">
                🌏 IR21 {zh ? '（外籍員工離職申報）' : '(Foreign Employee Clearance)'}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ir21Filed}
                  onChange={e => setIr21Filed(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                {zh ? 'IR21 已向 IRAS 呈報' : 'IR21 has been filed with IRAS'}
              </label>
              {ir21Filed && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {zh ? '呈報日期 *' : 'Filing Date *'}
                  </label>
                  <input
                    type="date"
                    value={ir21FiledDate}
                    onChange={e => setIr21FiledDate(e.target.value)}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-blue-500 mt-1">
                    {zh
                      ? '標記後此員工將在 IR8A 生成時自動排除。'
                      : 'This employee will be excluded from IR8A generation once filed.'}
                  </p>
                </div>
              )}
            </div>
          )}
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