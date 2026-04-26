// src/tabs/YearEndTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function YearEndTab({ language, companyId, userRole }) {
  const zh = language === 'zh'
  const currentYear = new Date().getFullYear()

  const [fromYear,   setFromYear]   = useState(currentYear - 1)
  const [toYear,     setToYear]     = useState(currentYear)
  const [employees,  setEmployees]  = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [preview,    setPreview]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [done,       setDone]       = useState(false)
  const [log,        setLog]        = useState([])

  const canRun = ['super_admin', 'hr_admin'].includes(userRole)

  useEffect(() => { if (companyId) fetchData() }, [companyId])

  async function fetchData() {
    setLoading(true)
    const [{ data: emps }, { data: lts }] = await Promise.all([
      supabase.from('employees').select('id, full_name, status').eq('company_id', companyId).eq('status', 'active').order('full_name'),
      supabase.from('leave_types').select('id, name, carry_forward_days').eq('company_id', companyId).eq('is_active', true),
    ])
    setEmployees(emps || [])
    setLeaveTypes(lts || [])
    setLoading(false)
  }

  async function handlePreview() {
    setPreviewing(true); setPreview([]); setDone(false); setLog([])

    const empIds = employees.map(e => e.id)
    const { data: balances } = await supabase
      .from('leave_balances')
      .select('*')
      .in('employee_id', empIds)
      .eq('year', fromYear)
      .eq('leave_type', 'annual')

    const annualLT = leaveTypes.find(lt =>
      lt.name?.toLowerCase().includes('annual') || lt.name?.includes('年假')
    )
    const maxCarryForward = annualLT?.carry_forward_days ?? 0

    const rows = employees.map(emp => {
      const bal = balances?.find(b => b.employee_id === emp.id)
      if (!bal) {
        return { emp, bal: null, remaining: 0, carryForward: 0, newEntitled: 0, note: zh ? '無餘額記錄' : 'No balance record' }
      }
      const remaining = Number(bal.entitled || 0) + Number(bal.carried_forward || 0) + Number(bal.adjusted || 0) - Number(bal.used || 0)
      const carryForward = maxCarryForward > 0 ? Math.min(Math.max(remaining, 0), maxCarryForward) : 0
      const newEntitled = Number(bal.entitled || 0)
      const note = remaining <= 0
        ? (zh ? '無餘額可結轉' : 'No balance to carry forward')
        : maxCarryForward === 0
          ? (zh ? '此假期類型不結轉' : 'No carry forward for this type')
          : (zh ? `結轉 ${carryForward} 天` : `Carry forward ${carryForward} days`)
      return { emp, bal, remaining: Math.max(remaining, 0), carryForward, newEntitled, note }
    })

    setPreview(rows)
    setPreviewing(false)
  }

  async function handleProcess() {
    if (!window.confirm(zh
      ? `確定執行 ${fromYear} → ${toYear} 年度結算？此操作不可撤銷。`
      : `Confirm year-end rollover from ${fromYear} to ${toYear}? This cannot be undone.`)) return

    setProcessing(true); setProgress(0); setLog([])
    const results = []
    let done = 0

    for (const row of preview) {
      const { emp, bal, carryForward, newEntitled } = row
      try {
        if (bal) {
          await supabase.from('leave_balances').update({ used: 0, adjusted: 0 }).eq('id', bal.id)
        }
        await supabase.from('leave_balances').upsert({
          employee_id:     emp.id,
          company_id:      companyId,
          year:            toYear,
          leave_type:      'annual',
          entitled:        newEntitled,
          carried_forward: carryForward,
          adjusted:        0,
          used:            0,
        }, { onConflict: 'employee_id,year,leave_type' })
        results.push({ name: emp.full_name, ok: true, carryForward })
      } catch (err) {
        results.push({ name: emp.full_name, ok: false, msg: err.message })
      }
      done++
      setProgress(Math.round(done / preview.length * 100))
    }

    setLog(results); setProcessing(false); setDone(true)
  }

  if (!canRun) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm py-20">
        {zh ? '您沒有權限執行年度結算' : 'You do not have permission to run year-end settlement'}
      </div>
    )
  }

  const successCount = log.filter(l => l.ok).length
  const failCount    = log.filter(l => !l.ok).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl">

      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">
          📅 {zh ? '年度結算 — 年假結轉' : 'Year-End Settlement — Leave Carry Forward'}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {zh
            ? '將上一年度剩餘年假按公司政策結轉至新年度，並重置已用天數。'
            : 'Roll over remaining annual leave to the new year per company policy, and reset used days.'}
        </p>
      </div>

      {/* 設定區 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {zh ? '結算年度（從）' : 'From Year'}
            </label>
            <select value={fromYear}
              onChange={e => { setFromYear(Number(e.target.value)); setPreview([]); setDone(false) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {[currentYear - 2, currentYear - 1, currentYear].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {zh ? '新年度（至）' : 'To Year'}
            </label>
            <select value={toYear}
              onChange={e => { setToYear(Number(e.target.value)); setPreview([]); setDone(false) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 政策說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
          <div className="font-semibold">📋 {zh ? '結轉政策（來自假期設定）' : 'Carry Forward Policy (from Leave Types)'}</div>
          {leaveTypes.length === 0 ? (
            <div className="text-gray-400">{zh ? '未找到假期類型設定' : 'No leave types configured'}</div>
          ) : leaveTypes.map(lt => (
            <div key={lt.id}>
              {lt.name}: {lt.carry_forward_days > 0
                ? (zh ? `最多結轉 ${lt.carry_forward_days} 天` : `Max ${lt.carry_forward_days} days carry forward`)
                : (zh ? '不結轉' : 'No carry forward')}
            </div>
          ))}
        </div>

        {/* 警告 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ {zh
            ? `此操作將為 ${employees.length} 名在職員工建立 ${toYear} 年度年假記錄，並重置 ${fromYear} 年已用天數。`
            : `This will create ${toYear} annual leave records for ${employees.length} active employees and reset ${fromYear} used days.`}
        </div>
      </div>

      {/* 預覽 + 執行按鈕 */}
      {!done && (
        <div className="flex gap-2 mb-4">
          <button onClick={handlePreview} disabled={previewing || loading || employees.length === 0}
            className="flex-1 py-2.5 text-sm border border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-50">
            {previewing ? (zh ? '計算中...' : 'Calculating...') : (zh ? '🔍 預覽結算結果' : '🔍 Preview Results')}
          </button>
          {preview.length > 0 && (
            <button onClick={handleProcess} disabled={processing}
              className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
              {processing ? `${progress}%` : (zh ? '✅ 確認執行結算' : '✅ Run Settlement')}
            </button>
          )}
        </div>
      )}

      {/* 進度條 */}
      {processing && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-gray-400 text-center mt-1">{progress}%</div>
        </div>
      )}

      {/* 預覽結果 */}
      {preview.length > 0 && !done && (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">{zh ? '預覽結算結果' : 'Preview'}</span>
            <span className="text-xs text-gray-400">{preview.length} {zh ? '名員工' : 'employees'}</span>
          </div>

          {/* 桌面版表格 */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500">{zh ? '員工' : 'Employee'}</th>
                  <th className="text-right px-3 py-2 text-gray-500">{zh ? `${fromYear}年餘額` : `${fromYear} Remaining`}</th>
                  <th className="text-right px-3 py-2 text-gray-500">{zh ? '結轉天數' : 'Carry Fwd'}</th>
                  <th className="text-right px-3 py-2 text-gray-500">{zh ? `${toYear}年應得` : `${toYear} Entitled`}</th>
                  <th className="px-3 py-2 text-gray-500">{zh ? '說明' : 'Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.emp.full_name}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{row.remaining}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-600">{row.carryForward}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{row.newEntitled}</td>
                    <td className="px-3 py-2.5 text-gray-400">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 手機版卡片 */}
          <div className="sm:hidden divide-y divide-gray-100">
            {preview.map((row, i) => (
              <div key={i} className="px-4 py-3">
                <div className="font-medium text-gray-800 text-sm mb-1">{row.emp.full_name}</div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{zh ? '餘額' : 'Remaining'}: <b>{row.remaining}</b></span>
                  <span>{zh ? '結轉' : 'CF'}: <b className="text-blue-600">{row.carryForward}</b></span>
                  <span>{zh ? '新應得' : 'New'}: <b>{row.newEntitled}</b></span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{row.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 完成結果 */}
      {done && (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 ${failCount === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`font-semibold text-sm ${failCount === 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {failCount === 0
                ? `✅ ${zh ? `年度結算完成！${successCount} 名員工已更新。` : `Settlement complete! ${successCount} employees updated.`}`
                : `⚠️ ${zh ? `${successCount} 成功，${failCount} 失敗` : `${successCount} success, ${failCount} failed`}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {zh
                ? `${fromYear} 年已用天數已重置，${toYear} 年年假記錄已建立。`
                : `${fromYear} used days reset. ${toYear} leave records created.`}
            </div>
          </div>

          {failCount > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden">
              {log.filter(l => !l.ok).map((l, i) => (
                <div key={i} className="px-4 py-2 text-xs text-red-600 border-b last:border-0">
                  {l.name}: {l.msg}
                </div>
              ))}
            </div>
          )}

          <button onClick={() => { setPreview([]); setDone(false); setLog([]) }}
            className="w-full py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
            {zh ? '← 返回' : '← Back'}
          </button>
        </div>
      )}
    </div>
  )
}