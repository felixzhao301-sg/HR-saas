// src/tabs/employee/BulkUploadModal.jsx
import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import { EMPLOYEE_COLUMNS, EMPLOYEE_COLUMNS_EXAMPLE } from '../../constants'
import { loadXLSX } from '../../utils/attachments'

// 必填欄位列表（與 constants.js 同步）
const REQUIRED_KEYS = EMPLOYEE_COLUMNS.filter(c => c.required).map(c => c.key)

export default function BulkUploadModal({ onClose, onDone, language, text, companyId }) {
  const zh = language === 'zh'
  const [step,      setStep]      = useState('upload')
  const [rows,      setRows]      = useState([])
  const [errors,    setErrors]    = useState([])
  const [importing, setImporting] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [importLog, setImportLog] = useState([])
  const fileRef = useRef()

  // ── 下載範本（含示例數據行）───────────────────────────────────
  async function downloadTemplate() {
    const xl = await loadXLSX()

    const headers   = EMPLOYEE_COLUMNS.map(c => c.label)
    const reqRow    = EMPLOYEE_COLUMNS.map(c => c.required ? '(Required *)' : '(Optional)')
    const exampleRow = EMPLOYEE_COLUMNS.map(c => EMPLOYEE_COLUMNS_EXAMPLE[c.key] ?? '')

    const ws = xl.utils.aoa_to_sheet([headers, reqRow, exampleRow])

    // 設置欄寬
    ws['!cols'] = EMPLOYEE_COLUMNS.map(() => ({ wch: 30 }))

    // 標記必填欄位標題為黃色（透過 cell style，SheetJS 社區版有限支援）
    // 標題行格式提示
    ws['A1'] && (ws['A1'].s = { fill: { fgColor: { rgb: 'FFF3CD' } } })

    const wb = xl.utils.book_new()
    xl.utils.book_append_sheet(wb, ws, 'Employees')

    // 說明 Sheet
    const infoData = [
      ['HR SaaS Employee Import Template'],
      [''],
      ['欄位說明 / Field Guide'],
      ['欄位', '格式 / 範例', '必填'],
      ...EMPLOYEE_COLUMNS.map(c => [
        c.label,
        EMPLOYEE_COLUMNS_EXAMPLE[c.key] || '',
        c.required ? '✅ 必填' : '選填',
      ]),
      [''],
      ['注意事項 / Notes'],
      ['1. 日期格式 / Date format: YYYY-MM-DD (e.g. 2024-01-15)'],
      ['2. gender: male 或 female'],
      ['3. employment_type: full_time 或 part_time'],
      ['4. is_pr / is_seaman: true 或 false'],
      ['5. pr_year: 1, 2, 或 3+'],
      ['6. nationality: 請用英文國名 (e.g. Singapore, Malaysia, China)'],
      ['7. 第 1 行為欄位名稱，第 2 行為必填說明，第 3 行為示例，從第 4 行開始填寫實際數據'],
      ['8. Row 1 = headers, Row 2 = required indicator, Row 3 = example, Row 4+ = your data'],
    ]
    const wsInfo = xl.utils.aoa_to_sheet(infoData)
    wsInfo['!cols'] = [{ wch: 45 }, { wch: 30 }, { wch: 10 }]
    xl.utils.book_append_sheet(wb, wsInfo, zh ? '說明' : 'Guide')

    xl.writeFile(wb, 'HR_Employee_Template.xlsx')
  }

  // ── 解析上傳文件 ──────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    const xl = await loadXLSX()
    const buf = await file.arrayBuffer()
    const wb  = xl.read(buf, { type: 'array', cellDates: true })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    const raw = xl.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' })

    if (!raw.length) { alert(zh ? '檔案是空的' : 'File is empty'); return }

    // 建立 label → key 映射
    const labelToKey = {}
    EMPLOYEE_COLUMNS.forEach(c => { labelToKey[c.label] = c.key })

    // 過濾掉說明行（(Required *), (Optional), 示例行）
    const skipValues = ['(Required *)', '(Optional)', EMPLOYEE_COLUMNS_EXAMPLE.full_name]
    const dataRows = raw.filter(row => {
      const firstVal = Object.values(row)[0]
      return firstVal && !skipValues.includes(String(firstVal).trim())
    })

    if (!dataRows.length) { alert(zh ? '沒有找到有效資料（請從第4行開始填寫）' : 'No valid data found (please start from row 4)'); return }

    const parsed = dataRows.map((row, idx) => {
      const obj = { _row: idx + 4 }
      Object.keys(row).forEach(header => {
        const key = labelToKey[header] || header
        let val = row[header]
        if (val === null || val === undefined) val = ''
        obj[key] = String(val).trim()
      })

      // 類型轉換
      obj.is_pr      = obj.is_pr?.toLowerCase()      === 'true'
      obj.is_seaman  = obj.is_seaman?.toLowerCase()  === 'true'
      obj.annual_leave    = obj.annual_leave    === '' ? null : Number(obj.annual_leave)    || null
      obj.basic_salary    = obj.basic_salary    === '' ? null : Number(obj.basic_salary)    || null
      obj.basic_allowance = obj.basic_allowance === '' ? null : Number(obj.basic_allowance) || null

      // 空日期轉 null
      ;['seaman_expiry','passport_issue_date','passport_expiry_date','date_of_birth','join_date','work_email'].forEach(k => {
        if (obj[k] === '') obj[k] = null
      })

      return obj
    })

    // 驗證必填欄位
    const errs = []
    parsed.forEach(row => {
      REQUIRED_KEYS.forEach(key => {
        const col = EMPLOYEE_COLUMNS.find(c => c.key === key)
        if (!row[key] && row[key] !== 0 && row[key] !== false) {
          errs.push(`Row ${row._row}: ${col?.label || key} ${zh ? '為必填欄位' : 'is required'}`)
        }
      })
      // 額外驗證
      if (row.gender && !['male','female'].includes(row.gender?.toLowerCase())) {
        errs.push(`Row ${row._row}: gender ${zh ? '必須是 male 或 female' : 'must be male or female'}`)
      }
      if (row.employment_type && !['full_time','part_time'].includes(row.employment_type)) {
        errs.push(`Row ${row._row}: employment_type ${zh ? '必須是 full_time 或 part_time' : 'must be full_time or part_time'}`)
      }
      if (row.is_pr && !['1','2','3+'].includes(row.pr_year)) {
        errs.push(`Row ${row._row}: ${zh ? 'is_pr 為 true 時，pr_year 必須填 1, 2 或 3+' : 'pr_year must be 1, 2, or 3+ when is_pr is true'}`)
      }
    })

    setErrors(errs); setRows(parsed); setStep('preview')
  }

  // ── 執行匯入 ─────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true); setStep('importing')
    const thisYear = new Date().getFullYear()
    const log = []
    let done = 0

    for (const row of rows) {
      const { _row, ...data } = row
      // 加入 company_id
      const payload = { ...data, company_id: companyId, status: 'active' }

      const { data: newEmp, error } = await supabase.from('employees').insert([payload]).select('id').single()

      if (error) {
        log.push({ row: _row, name: data.full_name, ok: false, msg: error.message })
      } else {
        log.push({ row: _row, name: data.full_name, ok: true })
        // 自動建立年假餘額
        if (newEmp?.id && data.annual_leave) {
          await supabase.from('leave_balances').upsert({
            employee_id:    newEmp.id,
            company_id:     companyId,
            year:           thisYear,
            leave_type:     'annual',
            entitled:       Number(data.annual_leave),
            carried_forward: 0,
            adjusted:        0,
            used:            0,
          }, { onConflict: 'employee_id,year,leave_type' })
        }
      }

      done++; setProgress(Math.round(done / rows.length * 100))
    }

    setImportLog(log); setImporting(false); setStep('done')
  }

  const successCount = importLog.filter(l => l.ok).length
  const failCount    = importLog.filter(l => !l.ok).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{zh ? '批量上傳員工' : 'Bulk Import Employees'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 space-y-2">
                <div className="font-semibold">📋 {zh ? '使用說明' : 'Instructions'}</div>
                <ol className="list-decimal pl-5 space-y-1 text-xs">
                  <li>{zh ? '點擊「下載範本」取得 Excel 範本' : 'Click "Download Template" to get the Excel template'}</li>
                  <li>{zh ? '在範本第 4 行開始填寫員工數據（第 1-3 行為說明和示例）' : 'Fill in employee data from row 4 (rows 1-3 are headers and example)'}</li>
                  <li>{zh ? '必填欄位（標 * 的）必須填寫，否則會上傳失敗' : 'Required fields (marked *) must be filled or upload will fail'}</li>
                  <li>{zh ? '上傳完成後可以預覽，確認無誤再點「確認匯入」' : 'Preview before confirming the import'}</li>
                </ol>
              </div>

              {/* Required fields reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-amber-700 mb-2">⚠️ {zh ? '必填欄位' : 'Required Fields'}</div>
                <div className="flex flex-wrap gap-1.5">
                  {EMPLOYEE_COLUMNS.filter(c => c.required).map(c => (
                    <span key={c.key} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{c.label.split(' / ')[0]}</span>
                  ))}
                </div>
              </div>

              <button onClick={downloadTemplate}
                className="w-full py-2.5 border border-blue-300 text-blue-600 rounded-lg text-sm hover:bg-blue-50 flex items-center justify-center gap-2">
                📥 {zh ? '下載範本（含示例數據）' : 'Download Template (with example)'}
              </button>

              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-4xl mb-3">📂</div>
                <div className="text-gray-600 font-medium">{zh ? '點擊選擇 Excel 或 CSV 檔案' : 'Click to select Excel or CSV file'}</div>
                <div className="text-gray-400 text-sm mt-1">.xlsx / .csv</div>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} />
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {errors.length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="font-medium text-red-700 mb-2">❌ {zh ? `發現 ${errors.length} 個錯誤，請修正後重新上傳` : `Found ${errors.length} errors — please fix and re-upload`}</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-red-600 max-h-48 overflow-y-auto">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                  ✅ {zh ? `預覽：${rows.length} 筆員工資料，驗證通過` : `Preview: ${rows.length} employee records validated`}
                </div>
              )}

              {!errors.length && (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['full_name','gender','nationality','employment_type','join_date','basic_salary','bank_name','bank_account_no'].map(k => (
                          <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          {['full_name','gender','nationality','employment_type','join_date','basic_salary','bank_name','bank_account_no'].map(k => (
                            <td key={k} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(row[k] ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                      {rows.length > 8 && (
                        <tr><td colSpan={8} className="px-3 py-2 text-gray-400 text-center">... {zh ? `還有 ${rows.length - 8} 筆` : `and ${rows.length - 8} more`}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-gray-700 font-medium mb-3">{zh ? '匯入中...' : 'Importing...'}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-sm text-gray-400">{progress}%</div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 ${failCount === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className={`font-semibold text-sm mb-1 ${failCount === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {failCount === 0
                    ? `✅ ${zh ? `成功匯入 ${successCount} 名員工` : `Successfully imported ${successCount} employees`}`
                    : `⚠️ ${zh ? `匯入完成：${successCount} 成功，${failCount} 失敗` : `Import done: ${successCount} success, ${failCount} failed`}`}
                </div>
              </div>
              {failCount > 0 && (
                <div className="overflow-y-auto max-h-48 rounded-xl border border-red-200">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-red-50"><th className="px-3 py-2 text-left text-red-600">Row</th><th className="px-3 py-2 text-left text-red-600">Name</th><th className="px-3 py-2 text-left text-red-600">Error</th></tr></thead>
                    <tbody>
                      {importLog.filter(l => !l.ok).map((l, i) => (
                        <tr key={i} className="border-t border-red-100">
                          <td className="px-3 py-2">{l.row}</td>
                          <td className="px-3 py-2">{l.name}</td>
                          <td className="px-3 py-2 text-red-500">{l.msg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
          <div>
            {step === 'preview' && (
              <button onClick={() => { setStep('upload'); setRows([]); setErrors([]) }} className="text-sm text-gray-500 hover:text-gray-700">
                ← {zh ? '重新選擇' : 'Re-select'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 'done'
              ? <button onClick={onDone} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{zh ? '完成' : 'Done'}</button>
              : <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">{text.cancel}</button>
            }
            {step === 'preview' && !errors.length && (
              <button onClick={handleImport} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {zh ? `確認匯入 ${rows.length} 筆` : `Import ${rows.length} records`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}