// src/tabs/employee/BulkUploadModal.jsx
import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import { EMPLOYEE_COLUMNS } from '../../constants'
import { loadXLSX } from '../../utils/attachments'

export default function BulkUploadModal({ onClose, onDone, language, text, companyId }) {
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    const xl = await loadXLSX()
    const buf = await file.arrayBuffer()
    const wb = xl.read(buf, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = xl.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' })
    if (!raw.length) { alert(language === 'zh' ? '檔案是空的' : 'File is empty'); return }
    const labelToKey = {}
    EMPLOYEE_COLUMNS.forEach(c => { labelToKey[c.label] = c.key })
    const dataRows = raw.filter(row => { const v = Object.values(row)[0]; return v !== '(Required)' && v !== '(Optional)' && v !== '' && v != null })
    if (!dataRows.length) { alert(language === 'zh' ? '沒有找到有效資料' : 'No valid data found'); return }
    const parsed = dataRows.map((row, idx) => {
      const obj = { _row: idx + 3 }
      Object.keys(row).forEach(header => { const key = labelToKey[header] || header; let val = row[header]; if (val === null || val === undefined) val = ''; obj[key] = String(val).trim() })
      obj.is_pr = obj.is_pr?.toLowerCase() === 'true'
      obj.is_seaman = obj.is_seaman?.toLowerCase() === 'true'
      obj.annual_leave = obj.annual_leave === '' ? null : Number(obj.annual_leave) || null
      obj.basic_salary = obj.basic_salary === '' ? null : Number(obj.basic_salary) || null
      obj.basic_allowance = obj.basic_allowance === '' ? null : Number(obj.basic_allowance) || null
      ;['seaman_expiry', 'passport_issue_date', 'passport_expiry_date', 'date_of_birth', 'join_date', 'work_email'].forEach(k => { if (obj[k] === '') obj[k] = null })
      return obj
    })
    const errs = []
    parsed.forEach(row => { EMPLOYEE_COLUMNS.filter(c => c.required).forEach(c => { if (!row[c.key]) errs.push(`Row ${row._row}: ${c.label} is required`) }) })
    setErrors(errs); setRows(parsed); setStep('preview')
  }

  async function handleImport() {
    setImporting(true); setStep('importing')
    const validRows = rows.map(r => { const { _row, ...rest } = r; return rest })
    let done = 0
    const thisYear = new Date().getFullYear()
    for (const row of validRows) {
      const { data: newEmp } = await supabase.from('employees').insert([row]).select('id').single()
      if (newEmp?.id && row.annual_leave) {
        await supabase.from('leave_balances').upsert({ employee_id: newEmp.id, year: thisYear, leave_type: 'annual', entitled: Number(row.annual_leave), carried_forward: 0, adjusted: 0, used: 0 }, { onConflict: 'employee_id,year,leave_type' })
      }
      done++; setProgress(Math.round(done / validRows.length * 100))
    }
    setImporting(false); onDone()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{language === 'zh' ? '批量上傳員工' : 'Bulk Import Employees'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">{language === 'zh' ? '請先下載範本，填寫後再上傳。' : 'Please download the template first, fill it in, then upload.'}</div>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-4xl mb-3">📂</div>
                <div className="text-gray-600 font-medium">{language === 'zh' ? '點擊選擇 Excel 或 CSV 檔案' : 'Click to select Excel or CSV file'}</div>
                <div className="text-gray-400 text-sm mt-1">.xlsx / .csv</div>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} />
              </div>
            </div>
          )}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className={`p-3 rounded-xl text-sm ${errors.length ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                {errors.length
                  ? <><div className="font-medium mb-1">{language === 'zh' ? `發現 ${errors.length} 個錯誤` : `Found ${errors.length} errors`}</div><ul className="list-disc pl-4 space-y-0.5">{errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul></>
                  : <div>{language === 'zh' ? `預覽：${rows.length} 筆員工資料` : `Preview: ${rows.length} employees ready`}</div>}
              </div>
              {!errors.length && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-50">{['full_name', 'gender', 'nationality', 'employment_type', 'join_date', 'position'].map(k => <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 border-b">{k}</th>)}</tr></thead>
                    <tbody>{rows.slice(0, 10).map((row, i) => <tr key={i} className="border-b border-gray-100">{['full_name', 'gender', 'nationality', 'employment_type', 'join_date', 'position'].map(k => <td key={k} className="px-3 py-2 text-gray-700">{String(row[k] || '-')}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-gray-700 font-medium mb-3">{language === 'zh' ? '匯入中...' : 'Importing...'}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="text-sm text-gray-400">{progress}%</div>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
          <button onClick={() => { setStep('upload'); setRows([]); setErrors([]) }} className="text-sm text-gray-500 hover:text-gray-700">
            {step === 'preview' ? `← ${language === 'zh' ? '重新選擇' : 'Re-select'}` : ' '}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
            {step === 'preview' && !errors.length && (
              <button onClick={handleImport} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {language === 'zh' ? `確認匯入 ${rows.length} 筆` : `Import ${rows.length} records`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}