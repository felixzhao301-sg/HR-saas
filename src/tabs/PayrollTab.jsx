// src/tabs/PayrollTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  calculatePayroll, calculateYTD, getDefaultWorkingDays,
  MONTH_NAMES, fmtSGD, formatMonth,
} from '../utils/payroll'
import PayslipModal from '../components/PayslipModal'
import CPFReportModal from '../components/CPFReportModal'
import PayrollSummaryModal from '../components/PayrollSummaryModal'

const CURRENT_YEAR  = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

function MonthBadge({ status }) {
  const map   = { draft: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-100 text-blue-700', locked: 'bg-green-100 text-green-700' }
  const label = { draft: 'Draft', confirmed: 'Confirmed', locked: '🔒 Locked' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.draft}`}>{label[status] || 'Draft'}</span>
}

function AdjRow({ adj, idx, onRemove, onChange, locked }) {
  return (
    <div className="flex gap-2 items-center">
      <input value={adj.desc} onChange={e => onChange(idx, 'desc', e.target.value)}
        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Description" disabled={locked} />
      <input type="number" value={adj.amount} onChange={e => onChange(idx, 'amount', e.target.value)}
        className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="±0.00" disabled={locked} />
      {!locked && <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>}
    </div>
  )
}

// ── Mobile employee edit page ─────────────────────────────────
function MobileEditPage({ emp, inp, setInput, addAdjustment, removeAdjustment, changeAdjustment,
  comm, isLocked, canEdit, saving, run, setRun, onSave, onBack, language }) {
  const zh = language === 'zh'
  const preview = (() => {
    try {
      return calculatePayroll({ employee: emp, year: new Date().getFullYear(), month: new Date().getMonth()+1,
        workingDays: 26, inputs: { ...inp, commission: comm?.amount || 0 }, ytdOwForCpf: 0, fwlRate: inp.fwl_rate || 0 })
    } catch { return null }
  })()

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="text-blue-600 text-sm font-medium">← {zh ? '返回' : 'Back'}</button>
        <div className="flex-1">
          <div className="font-semibold text-gray-800 text-sm">{emp.full_name}</div>
          <div className="text-xs text-gray-400">{emp.position || '—'} · Basic S${fmtSGD(emp.basic_salary)}</div>
        </div>
        {!isLocked && canEdit && (
          <button onClick={onSave} disabled={saving}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
            {saving ? '...' : (zh ? '保存' : 'Save')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Preview summary */}
        {preview && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Gross', value: preview.gross_salary, color: 'gray' },
              { label: 'Net Pay', value: preview.net_pay_after_adjustments, color: 'green' },
              { label: 'Co. Total', value: preview.total_company_paid, color: 'blue' },
            ].map(c => (
              <div key={c.label} className={`bg-${c.color}-50 rounded-lg px-2 py-2 text-center`}>
                <div className={`text-${c.color}-700 font-bold text-sm`}>S${fmtSGD(c.value)}</div>
                <div className={`text-${c.color}-500 text-xs`}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Read-only basic */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Basic Salary</label>
            <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">S$ {fmtSGD(emp.basic_salary)}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fixed Allow.</label>
            <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">S$ {fmtSGD(emp.basic_allowance)}</div>
          </div>
        </div>

        {/* Variable inputs */}
        {[
          { label: zh ? '其他津貼 (OW)' : 'Other Allow. (OW)', field: 'other_allowance', descField: 'other_allowance_desc' },
          { label: zh ? '加班/其他 (OW)' : 'Overtime/Other (OW)', field: 'overtime', descField: 'overtime_desc' },
          { label: zh ? '花紅/AWS (AW)' : 'Bonus/AWS (AW)', field: 'bonus', descField: 'bonus_desc' },
          { label: zh ? '董事費' : 'Director Fee', field: 'director_fee', descField: 'director_fee_desc' },
          { label: zh ? '未用年假補償' : 'Unutilised Leave', field: 'unutilised_leave_pay', descField: 'unutilised_leave_desc' },
        ].map(({ label, field, descField }) => (
          <div key={field}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" value={inp[field] || ''} onChange={e => setInput(field, e.target.value)}
                disabled={isLocked} className="w-28 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="0.00" />
              <input value={inp[descField] || ''} onChange={e => setInput(descField, e.target.value)}
                disabled={isLocked} className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder={zh ? '說明' : 'Description'} />
            </div>
          </div>
        ))}

        {/* Commission */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">{zh ? '佣金 (AW)' : 'Commission (AW)'}</label>
          <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 flex justify-between">
            <span>S$ {fmtSGD(comm?.amount || 0)}</span>
            {comm ? <span className="text-xs text-green-500">✅ {zh ? '已確認' : 'Confirmed'}</span>
              : <span className="text-xs text-gray-400">{zh ? '佣金模塊無記錄' : 'No commission'}</span>}
          </div>
        </div>

        {/* Unpaid leave */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">{zh ? '無薪假天數' : 'Unpaid Leave Days'}</label>
          <div className="flex items-center gap-2">
            <input type="number" step="0.5" min="0" value={inp.unpaid_leave_days || ''} onChange={e => setInput('unpaid_leave_days', e.target.value)}
              disabled={isLocked} className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="0" />
            <span className="text-xs text-gray-400">{zh ? '天' : 'days'}</span>
            {preview && inp.unpaid_leave_days > 0 && <span className="text-xs text-red-500">= -S${fmtSGD(preview.unpaid_leave_amount)}</span>}
          </div>
        </div>

        {/* FWL */}
        {emp.nationality !== 'Singapore' && !emp.is_pr && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">FWL ({zh ? '外勞稅' : 'Foreign Worker Levy'})</label>
            <input type="number" value={inp.fwl_rate || ''} onChange={e => setInput('fwl_rate', e.target.value)}
              disabled={isLocked} className="w-28 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="650" />
          </div>
        )}

        {/* Other adjustments */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-500">{zh ? '其他調整 (±，不計CPF)' : 'Other Adjustments (±, no CPF)'}</label>
            {!isLocked && <button onClick={addAdjustment} className="text-xs text-blue-600 hover:underline">+ {zh ? '添加' : 'Add'}</button>}
          </div>
          <div className="space-y-2">
            {(inp.other_adjustments || []).map((adj, idx) => (
              <AdjRow key={idx} adj={adj} idx={idx} locked={isLocked}
                onRemove={removeAdjustment} onChange={changeAdjustment} />
            ))}
            {(!inp.other_adjustments || inp.other_adjustments.length === 0) && (
              <div className="text-xs text-gray-300 py-2">{zh ? '無調整項目' : 'No adjustments'}</div>
            )}
          </div>
        </div>

        {/* Payment date */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">{zh ? '付款日期' : 'Payment Date'}</label>
          <input type="date" value={run?.payment_date || ''}
            onChange={async e => {
              await supabase.from('payroll_runs').update({ payment_date: e.target.value }).eq('id', run.id)
              setRun(r => ({ ...r, payment_date: e.target.value }))
            }}
            disabled={isLocked} className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>

        {/* Full preview */}
        {preview && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-xs">
            <div className="font-semibold text-gray-600 mb-2">{zh ? '完整計算預覽' : 'Full Preview'}</div>
            {[
              ['Basic', preview.basic_salary], ['Fixed Allow.', preview.fixed_allowance],
              ['Other Allow.', preview.other_allowance], ['OT/Other', preview.overtime],
              ['Bonus', preview.bonus], ['Commission', preview.commission],
              ['Director Fee', preview.director_fee], ['Unutilised', preview.unutilised_leave_pay],
              ['Unpaid Leave', -preview.unpaid_leave_amount],
            ].filter(([, v]) => v !== 0).map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-gray-500">{l}</span>
                <span className={v < 0 ? 'text-red-500' : 'text-gray-700'}>{v < 0 ? `(${fmtSGD(Math.abs(v))})` : fmtSGD(v)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Gross</span><span>S${fmtSGD(preview.gross_salary)}</span></div>
            {preview.employee_cpf > 0 && <div className="flex justify-between text-red-400"><span>Ee CPF</span><span>({fmtSGD(preview.employee_cpf)})</span></div>}
            {preview.cdac_mbmf_sinda > 0 && <div className="flex justify-between text-red-400"><span>{preview.cdac_mbmf_sinda_type}</span><span>({fmtSGD(preview.cdac_mbmf_sinda)})</span></div>}
            <div className="flex justify-between font-semibold text-green-600 border-t pt-1 mt-1"><span>Net Pay</span><span>S${fmtSGD(preview.net_pay_after_adjustments)}</span></div>
            <div className="flex justify-between font-bold text-blue-600 border-t-2 pt-2 mt-2"><span>Co. Total</span><span>S${fmtSGD(preview.total_company_paid)}</span></div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function PayrollTab({ text, language, companyId, companyName, currentUserId, userRole, permissions }) {
  const zh = language === 'zh'
  const [year,  setYear]  = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)

  const [run,         setRun]         = useState(null)
  const [records,     setRecords]     = useState([])
  const [employees,   setEmployees]   = useState([])
  const [commissions, setCommissions] = useState({})
  const [settings,    setSettings]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [success,     setSuccess]     = useState('')
  const [error,       setError]       = useState('')
  const [activeEmpId, setActiveEmpId] = useState(null)
  const [empInputs,   setEmpInputs]   = useState({})

  // ✅ Mobile edit page
  const [mobileEmpId, setMobileEmpId] = useState(null)

  // ✅ Bulk input
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [bulkInputs,    setBulkInputs]    = useState({})
  const [bulkSaving,    setBulkSaving]    = useState(false)

  const [showPayslip, setShowPayslip] = useState(null)
  const [showCPF,     setShowCPF]     = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const canEdit  = ['super_admin','hr_admin'].includes(userRole)
  const canLock  = canEdit
  const isLocked = run?.status === 'locked'
  const isEmployee = userRole === 'employee'

  useEffect(() => { if (companyId) loadAll() }, [companyId, year, month])

  async function loadAll() {
    setLoading(true); setActiveEmpId(null); setMobileEmpId(null)
    const [{ data: settingsData }, { data: runData }, { data: empsData }, { data: commsData }] = await Promise.all([
      supabase.from('company_payroll_settings').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('payroll_runs').select('*').eq('company_id', companyId).eq('year', year).eq('month', month).maybeSingle(),
      supabase.from('employees').select('*').eq('company_id', companyId).eq('employment_type','full_time').order('full_name'),
      supabase.from('commissions').select('*').eq('company_id', companyId).eq('year', year).eq('month', month).eq('status','confirmed'),
    ])
    setSettings(settingsData); setRun(runData); setEmployees(empsData || [])
    const commMap = {}; (commsData || []).forEach(c => { commMap[c.employee_id] = c }); setCommissions(commMap)
    if (runData) {
      const { data: recs } = await supabase.from('payroll_records').select('*').eq('payroll_run_id', runData.id).order('snap_name')
      setRecords(recs || [])
      const inputs = {}
      ;(recs || []).forEach(r => {
        inputs[r.employee_id] = {
          other_allowance: r.other_allowance || 0, other_allowance_desc: r.other_allowance_desc || '',
          overtime: r.overtime || 0, overtime_desc: r.overtime_desc || '',
          bonus: r.bonus || 0, bonus_desc: r.bonus_desc || '',
          director_fee: r.director_fee || 0, director_fee_desc: r.director_fee_desc || '',
          unutilised_leave_pay: r.unutilised_leave_pay || 0, unutilised_leave_desc: r.unutilised_leave_desc || '',
          unpaid_leave_days: r.unpaid_leave_days || 0,
          other_adjustments: r.other_adjustments || [],
          fwl_rate: r.fwl || 0,
        }
      })
      setEmpInputs(inputs)
    } else { setRecords([]); setEmpInputs({}) }
    setLoading(false)
  }

  const workDaysPerWeek    = Number(settings?.work_days_per_week || 5)
  const defaultWorkingDays = getDefaultWorkingDays(year, month, workDaysPerWeek)
  const workingDays        = run?.working_days ?? defaultWorkingDays

  function getInput(empId) {
    return empInputs[empId] || {
      other_allowance: 0, other_allowance_desc: '', overtime: 0, overtime_desc: '',
      bonus: 0, bonus_desc: '', director_fee: 0, director_fee_desc: '',
      unutilised_leave_pay: 0, unutilised_leave_desc: '', unpaid_leave_days: 0,
      other_adjustments: [], fwl_rate: 0,
    }
  }
  function setInput(empId, field, value) {
    setEmpInputs(prev => ({ ...prev, [empId]: { ...getInput(empId), [field]: value } }))
  }
  function addAdjustment(empId) {
    const inp = getInput(empId)
    setEmpInputs(prev => ({ ...prev, [empId]: { ...inp, other_adjustments: [...(inp.other_adjustments || []), { desc: '', amount: 0 }] } }))
  }
  function removeAdjustment(empId, idx) {
    const inp = getInput(empId); const adjs = [...(inp.other_adjustments || [])]; adjs.splice(idx, 1)
    setEmpInputs(prev => ({ ...prev, [empId]: { ...inp, other_adjustments: adjs } }))
  }
  function changeAdjustment(empId, idx, field, value) {
    const inp = getInput(empId); const adjs = [...(inp.other_adjustments || [])]
    adjs[idx] = { ...adjs[idx], [field]: field === 'amount' ? Number(value) : value }
    setEmpInputs(prev => ({ ...prev, [empId]: { ...inp, other_adjustments: adjs } }))
  }

  function getPreview(emp) {
    const inputs = { ...getInput(emp.id), commission: commissions[emp.id]?.amount || 0 }
    try { return calculatePayroll({ employee: emp, year, month, workingDays, inputs, ytdOwForCpf: 0, fwlRate: inputs.fwl_rate || 0 }) }
    catch(err) { console.error(err); return null }
  }

  function buildRecord(runId, emp, calc) {
    const { cpf_applicable, cpf_age, fund_type, ow_for_cpf_this_month, ...dbCalc } = calc
    return {
      payroll_run_id: runId, employee_id: emp.id, company_id: companyId, year, month,
      snap_name: emp.full_name, snap_nric: emp.nric_fin, snap_position: emp.position,
      snap_nationality: emp.nationality, snap_dob: emp.date_of_birth, snap_is_pr: emp.is_pr,
      snap_pr_year: emp.pr_year, snap_bank_name: emp.bank_name, snap_bank_account_no: emp.bank_account_no,
      snap_join_date: emp.join_date, ...dbCalc,
    }
  }
  function cleanCalc(calc) {
    const { cpf_applicable, cpf_age, fund_type, ow_for_cpf_this_month, ...dbCalc } = calc; return dbCalc
  }

  async function recalcEmployee(emp, overrideInputs) {
    const inputs = overrideInputs || empInputs[emp.id] || {}
    const comm   = commissions[emp.id]
    const { data: prevRecs } = await supabase.from('payroll_records').select('ow_subject_to_cpf')
      .eq('company_id', companyId).eq('employee_id', emp.id).eq('year', year).lt('month', month)
    const ytdOwForCpf = (prevRecs || []).reduce((s, r) => s + Number(r.ow_subject_to_cpf || 0), 0)
    const calc = calculatePayroll({ employee: emp, year, month, workingDays, inputs: { ...inputs, commission: comm?.amount || 0 }, ytdOwForCpf, fwlRate: inputs.fwl_rate || 0 })
    const existingRec = records.find(r => r.employee_id === emp.id)
    if (existingRec) {
      await supabase.from('payroll_records').update({ ...cleanCalc(calc), updated_at: new Date().toISOString() }).eq('id', existingRec.id)
    } else {
      await supabase.from('payroll_records').insert([buildRecord(run.id, emp, calc)])
    }
  }

  async function handleSaveEmployee(emp) {
    if (!run) return; setSaving(true); setError('')
    await recalcEmployee(emp)
    setSuccess(zh ? `${emp.full_name} 已儲存` : `${emp.full_name} saved`)
    setTimeout(() => setSuccess(''), 4000)
    await loadAll(); setSaving(false)
  }

  async function handleCreateRun() {
    setSaving(true); setError('')
    const { data, error: e } = await supabase.from('payroll_runs').insert([{
      company_id: companyId, year, month, status: 'draft', working_days: defaultWorkingDays, created_by: currentUserId,
    }]).select().single()
    if (e) { setError(e.message); setSaving(false); return }
    const { data: prevRecs } = await supabase.from('payroll_records').select('employee_id, ow_subject_to_cpf')
      .eq('company_id', companyId).eq('year', year).lt('month', month)
    const ytdOwMap = {}
    ;(prevRecs || []).forEach(r => { ytdOwMap[r.employee_id] = (ytdOwMap[r.employee_id] || 0) + Number(r.ow_subject_to_cpf || 0) })
    const inserts = employees.map(emp => {
      const comm = commissions[emp.id]
      const inputs = { other_allowance: 0, overtime: 0, bonus: 0, commission: comm?.amount || 0, director_fee: 0, unutilised_leave_pay: 0, unpaid_leave_days: 0, other_adjustments: [] }
      const calc = calculatePayroll({ employee: emp, year, month, workingDays: data.working_days || defaultWorkingDays, inputs, ytdOwForCpf: ytdOwMap[emp.id] || 0, fwlRate: 0 })
      return buildRecord(data.id, emp, calc)
    })
    if (inserts.length) await supabase.from('payroll_records').insert(inserts)
    setSaving(false); await loadAll()
  }

  async function handleRecalcAll() {
    if (!run || isLocked) return; setSaving(true)
    for (const emp of employees) await recalcEmployee(emp)
    setSuccess(zh ? '所有薪資已重新計算' : 'All payroll recalculated')
    setTimeout(() => setSuccess(''), 4000); await loadAll(); setSaving(false)
  }

  async function handleConfirm() {
    if (!run) return
    await supabase.from('payroll_runs').update({ status: 'confirmed' }).eq('id', run.id); await loadAll()
  }

  async function handleLock() {
    if (!run || !canLock) return
    if (!window.confirm(zh ? `確定鎖定 ${formatMonth(year, month)} 薪資？鎖定後不可修改。` : `Lock ${formatMonth(year, month)} payroll?`)) return
    setSaving(true)
    const { data: allYearRecs } = await supabase.from('payroll_records').select('*').eq('company_id', companyId).eq('year', year).lte('month', month)
    const byEmp = {}
    ;(allYearRecs || []).forEach(r => { if (!byEmp[r.employee_id]) byEmp[r.employee_id] = []; byEmp[r.employee_id].push(r) })
    for (const rec of records) {
      const ytd = calculateYTD(byEmp[rec.employee_id] || [], month)
      await supabase.from('payroll_records').update({ ...ytd, updated_at: new Date().toISOString() }).eq('id', rec.id)
    }
    await supabase.from('payroll_runs').update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: currentUserId }).eq('id', run.id)
    setSaving(false); setSuccess(zh ? '薪資已鎖定' : 'Payroll locked'); setTimeout(() => setSuccess(''), 5000); await loadAll()
  }

  // ✅ Bulk input
  function initBulkInputs() {
    const inputs = {}
    employees.forEach(emp => {
      const rec = records.find(r => r.employee_id === emp.id)
      inputs[emp.id] = {
        bonus:             Number(rec?.bonus || 0),
        overtime:          Number(rec?.overtime || 0),
        other_allowance:   Number(rec?.other_allowance || 0),
        adjustment_desc:   rec?.other_adjustments?.[0]?.desc || '',
        adjustment_amount: Number(rec?.other_adjustments?.[0]?.amount || 0),
      }
    })
    setBulkInputs(inputs)
  }

  async function handleBulkSave() {
    if (!run || isLocked) return; setBulkSaving(true)
    for (const emp of employees) {
      const b = bulkInputs[emp.id] || {}
      const overrideInputs = {
        ...getInput(emp.id),
        bonus:            Number(b.bonus || 0),
        overtime:         Number(b.overtime || 0),
        other_allowance:  Number(b.other_allowance || 0),
        other_adjustments: b.adjustment_amount
          ? [{ desc: b.adjustment_desc || 'Adjustment', amount: Number(b.adjustment_amount) }]
          : [],
      }
      await recalcEmployee(emp, overrideInputs)
    }
    setBulkSaving(false); setShowBulkInput(false)
    setSuccess(zh ? '批量薪資已保存並重新計算' : 'Bulk payroll saved and recalculated')
    setTimeout(() => setSuccess(''), 5000); await loadAll()
  }

  const totalGross   = records.reduce((s, r) => s + Number(r.gross_salary || 0), 0)
  const totalNet     = records.reduce((s, r) => s + Number(r.net_pay_after_adjustments || 0), 0)
  const totalCPF     = records.reduce((s, r) => s + Number(r.total_cpf || 0), 0)
  const totalCompany = records.reduce((s, r) => s + Number(r.total_company_paid || 0), 0)

  // ── Mobile edit page ─────────────────────────────────────────
  const mobileEmp = mobileEmpId ? employees.find(e => e.id === mobileEmpId) : null
  if (mobileEmp) {
    const inp = getInput(mobileEmp.id)
    return (
      <MobileEditPage
        emp={mobileEmp}
        inp={inp}
        setInput={(field, value) => setInput(mobileEmp.id, field, value)}
        addAdjustment={() => addAdjustment(mobileEmp.id)}
        removeAdjustment={(idx) => removeAdjustment(mobileEmp.id, idx)}
        changeAdjustment={(idx, f, v) => changeAdjustment(mobileEmp.id, idx, f, v)}
        comm={commissions[mobileEmp.id]}
        isLocked={isLocked} canEdit={canEdit} saving={saving}
        run={run} setRun={setRun}
        onSave={() => handleSaveEmployee(mobileEmp)}
        onBack={() => setMobileEmpId(null)}
        language={language}
      />
    )
  }

  // ── Main list view ───────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{zh ? '薪資管理' : 'Payroll Management'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{zh ? '月度薪資計算與管理' : 'Monthly payroll calculation'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {MONTH_NAMES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Status bar */}
      {run && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <MonthBadge status={run.status} />
            <span className="text-sm text-gray-600">{zh ? `工作天數：${workingDays} 天` : `Working days: ${workingDays}`}</span>
          </div>
          {canEdit && !isLocked && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleRecalcAll} disabled={saving} className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                🔄 {zh ? '重新計算全部' : 'Recalc All'}
              </button>
              {run.status === 'draft' && (
                <button onClick={handleConfirm} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {zh ? '確認薪資' : 'Confirm Payroll'}
                </button>
              )}
              {run.status === 'confirmed' && canLock && (
                <button onClick={handleLock} disabled={saving} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  🔒 {zh ? '鎖定薪資' : 'Lock Payroll'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✅ {success}</div>}
      {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
        <span>⚠️</span>
        <span>{zh ? '此頁面只顯示全職員工。兼職薪資計算將在後續版本推出。' : 'Full-time employees only. Part-time payroll coming soon.'}</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">{zh ? '載入中...' : 'Loading...'}</div>
      ) : !run ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl py-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-gray-600 font-medium mb-2">{zh ? `${formatMonth(year, month)} 薪資尚未建立` : `${formatMonth(year, month)} payroll not yet created`}</div>
          <p className="text-xs text-gray-400 mb-6">{zh ? '建立後將自動為所有員工生成薪資記錄' : 'All employee records will be auto-created'}</p>
          {canEdit && (
            <button onClick={handleCreateRun} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
              {saving ? (zh ? '建立中...' : 'Creating...') : (zh ? `建立 ${formatMonth(year, month)} 薪資` : `Create ${formatMonth(year, month)} Payroll`)}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ✅ Summary cards — 員工角色隱藏公司總支出 */}
          {records.length > 0 && (
            <div className={`grid gap-3 mb-4 ${isEmployee ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {[
                { label: zh ? '總 Gross' : 'Total Gross',      value: totalGross,   color: 'blue',   show: true },
                { label: zh ? '員工淨薪' : 'Total Net Pay',    value: totalNet,     color: 'green',  show: true },
                { label: zh ? 'CPF 總額' : 'Total CPF',        value: totalCPF,     color: 'purple', show: !isEmployee },
                { label: zh ? '公司總支出' : 'Total Co. Paid', value: totalCompany, color: 'orange', show: !isEmployee },
              ].filter(c => c.show).map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl px-3 sm:px-4 py-3`}>
                  <div className={`text-${color}-700 font-bold text-sm sm:text-base`}>S$ {fmtSGD(value)}</div>
                  <div className={`text-${color}-500 text-xs mt-0.5`}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ✅ Reports bar */}
          {records.length > 0 && !isEmployee && (
            <div className="flex items-center gap-2 mb-3 flex-wrap p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs font-medium text-gray-500">📊 {zh ? '報告：' : 'Reports:'}</span>
              {/* ✅ 匯總報告只給 admin/finance */}
              {['super_admin','hr_admin','finance'].includes(userRole) && (
                <button onClick={() => setShowSummary(true)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  📋 {zh ? '工資匯總' : 'Payroll Summary'}
                </button>
              )}
              <button onClick={() => setShowCPF(true)}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                🏦 {zh ? 'CPF 匯總' : 'CPF Report'}
              </button>
              {/* ✅ 批量輸入 */}
              {canEdit && !isLocked && (
                <button onClick={() => { setShowBulkInput(v => !v); if (!showBulkInput) initBulkInputs() }}
                  className={`px-3 py-1.5 text-xs rounded-lg ${showBulkInput ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                  📝 {zh ? '批量輸入' : 'Bulk Input'}
                </button>
              )}
              <span className="text-xs text-gray-300 hidden sm:inline">|</span>
              <span className="text-xs text-gray-400 hidden sm:inline">📄 {zh ? '工資單：點每個員工行末的 📄' : 'Payslip: click 📄 on each row'}</span>
            </div>
          )}

          {/* ✅ Bulk input panel */}
          {showBulkInput && !isLocked && canEdit && (
            <div className="mb-4 border border-amber-200 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-amber-800">📝 {zh ? '批量薪資輸入' : 'Bulk Payroll Input'}</span>
                  <span className="text-xs text-amber-600 ml-2 hidden sm:inline">
                    {zh ? '填完後點「保存全部」一次性計算' : 'Fill in then Save All to recalculate'}
                  </span>
                </div>
                <button onClick={handleBulkSave} disabled={bulkSaving}
                  className="px-4 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                  {bulkSaving ? '...' : (zh ? '💾 保存全部' : '💾 Save All')}
                </button>
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-500">{zh ? '員工' : 'Employee'}</th>
                      <th className="text-right px-3 py-2 text-gray-500">Basic</th>
                      <th className="text-right px-3 py-2 text-gray-500">Allow.</th>
                      <th className="px-3 py-2 text-gray-500">Bonus/AWS</th>
                      <th className="px-3 py-2 text-gray-500">OT/Other</th>
                      <th className="px-3 py-2 text-gray-500">Other Allow.</th>
                      <th className="px-3 py-2 text-gray-500">{zh ? '調整說明' : 'Adj. Desc'}</th>
                      <th className="px-3 py-2 text-gray-500">{zh ? '調整金額' : 'Adj. Amt'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map(emp => {
                      const b = bulkInputs[emp.id] || {}
                      const set = (f, v) => setBulkInputs(prev => ({ ...prev, [emp.id]: { ...b, [f]: v } }))
                      return (
                        <tr key={emp.id} className="hover:bg-amber-50/30">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-800">{emp.full_name}</div>
                            <div className="text-gray-400">{emp.position || '—'}</div>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">{fmtSGD(emp.basic_salary)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{fmtSGD(emp.basic_allowance)}</td>
                          {[['bonus','Bonus'],['overtime','OT'],['other_allowance','Other Allow.']].map(([f]) => (
                            <td key={f} className="px-3 py-2">
                              <input type="number" step="0.01" value={b[f] || ''} onChange={e => set(f, e.target.value)}
                                className="w-24 border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="0" />
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <input value={b.adjustment_desc || ''} onChange={e => set('adjustment_desc', e.target.value)}
                              className="w-28 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder={zh ? '說明' : 'desc'} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" value={b.adjustment_amount || ''} onChange={e => set('adjustment_amount', e.target.value)}
                              className="w-24 border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="±0" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {employees.map(emp => {
                  const b = bulkInputs[emp.id] || {}
                  const set = (f, v) => setBulkInputs(prev => ({ ...prev, [emp.id]: { ...b, [f]: v } }))
                  return (
                    <div key={emp.id} className="p-3">
                      <div className="font-medium text-sm text-gray-800 mb-2">{emp.full_name} <span className="text-xs text-gray-400">{emp.position}</span></div>
                      <div className="grid grid-cols-2 gap-2">
                        {[['bonus','Bonus/AWS'],['overtime','OT/Other'],['other_allowance','Other Allow.'],['adjustment_amount',zh?'調整金額':'Adj. Amt']].map(([f, l]) => (
                          <div key={f}>
                            <label className="block text-xs text-gray-500 mb-0.5">{l}</label>
                            <input type="number" step="0.01" value={b[f] || ''} onChange={e => set(f, e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="0" />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-0.5">{zh ? '調整說明' : 'Adj. Description'}</label>
                          <input value={b.adjustment_desc || ''} onChange={e => set('adjustment_desc', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder={zh ? '說明' : 'description'} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Employee rows */}
          <div className="space-y-2">
            {employees.map(emp => {
              const rec    = records.find(r => r.employee_id === emp.id)
              const inp    = getInput(emp.id)
              const isOpen = activeEmpId === emp.id
              const comm   = commissions[emp.id]
              const preview = isOpen ? getPreview(emp) : null

              return (
                <div key={emp.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Summary row */}
                  <div className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${isOpen ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-gray-50'}`}
                    onClick={() => {
                      // ✅ 手機用獨立編輯頁，桌面用 inline 展開
                      if (window.innerWidth < 640) { setMobileEmpId(emp.id) }
                      else { setActiveEmpId(isOpen ? null : emp.id) }
                    }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 text-sm">{emp.full_name}</span>
                        <span className="text-xs text-gray-400 hidden sm:inline">{emp.position}</span>
                        {comm && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">{zh ? '有佣金' : 'Comm.'}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                        {emp.nationality}{emp.is_pr ? ` · PR Yr${emp.pr_year}` : ''} · Basic S${fmtSGD(emp.basic_salary)}
                      </div>
                    </div>
                    {rec ? (
                      <div className="flex gap-3 sm:gap-6 text-right">
                        <div>
                          <div className="text-xs text-gray-400">Gross</div>
                          <div className="text-sm font-medium text-gray-700">S${fmtSGD(rec.gross_salary)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">{zh ? '淨薪' : 'Net'}</div>
                          <div className="text-sm font-medium text-green-600">S${fmtSGD(rec.net_pay_after_adjustments)}</div>
                        </div>
                        {!isEmployee && (
                          <div className="hidden sm:block">
                            <div className="text-xs text-gray-400">{zh ? '公司' : 'Co.'}</div>
                            <div className="text-sm font-medium text-blue-600">S${fmtSGD(rec.total_company_paid)}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-500">⚠️ {zh ? '未計算' : 'N/A'}</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); if(rec) setShowPayslip(rec) }} disabled={!rec}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={zh ? '查看工資單' : 'View Payslip'}>📄</button>
                    <span className="text-gray-400 text-sm hidden sm:inline">{isOpen ? '▲' : '▼'}</span>
                    <span className="text-gray-400 text-sm sm:hidden">›</span>
                  </div>

                  {/* Desktop inline detail */}
                  {isOpen && (
                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b pb-1">{zh ? '收入項目' : 'Earnings'}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Basic <span className="text-gray-300">(OW)</span></label>
                              <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600">S$ {fmtSGD(emp.basic_salary)}</div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Fixed Allow. <span className="text-gray-300">(OW)</span></label>
                              <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600">S$ {fmtSGD(emp.basic_allowance)}</div>
                            </div>
                          </div>
                          {[
                            { label: zh ? '其他津貼 (OW·CPF✓)' : 'Other Allow. (OW·CPF✓)', field: 'other_allowance', descField: 'other_allowance_desc' },
                            { label: zh ? '加班/其他 (OW·CPF✓)' : 'OT/Other (OW·CPF✓)', field: 'overtime', descField: 'overtime_desc' },
                            { label: zh ? '花紅/AWS (AW·CPF✓)' : 'Bonus/AWS (AW·CPF✓)', field: 'bonus', descField: 'bonus_desc' },
                            { label: zh ? '董事費 (CPF✗)' : 'Director Fee (CPF✗)', field: 'director_fee', descField: 'director_fee_desc' },
                            { label: zh ? '未用年假補償' : 'Unutilised Leave', field: 'unutilised_leave_pay', descField: 'unutilised_leave_desc' },
                          ].map(({ label, field, descField }) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">{label}</label>
                              <div className="flex gap-2">
                                <input type="number" step="0.01" value={inp[field] || ''} onChange={e => setInput(emp.id, field, e.target.value)} disabled={isLocked}
                                  className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="0.00" />
                                <input value={inp[descField] || ''} onChange={e => setInput(emp.id, descField, e.target.value)} disabled={isLocked}
                                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder={zh ? '說明' : 'Description'} />
                              </div>
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">{zh ? '佣金 (AW·CPF✓)' : 'Commission (AW·CPF✓)'}</label>
                            <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600 flex justify-between">
                              <span>S$ {fmtSGD(comm?.amount || 0)}</span>
                              {comm ? <span className="text-xs text-green-500">✅ {zh ? '已確認' : 'Confirmed'}</span>
                                : <span className="text-xs text-gray-400">{zh ? '無記錄' : 'No entry'}</span>}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">{zh ? '無薪假天數' : 'Unpaid Leave Days'}</label>
                            <div className="flex items-center gap-2">
                              <input type="number" step="0.5" min="0" value={inp.unpaid_leave_days || ''} onChange={e => setInput(emp.id, 'unpaid_leave_days', e.target.value)} disabled={isLocked}
                                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="0" />
                              <span className="text-xs text-gray-400">{zh ? '天' : 'days'}</span>
                              {preview && inp.unpaid_leave_days > 0 && <span className="text-xs text-red-500">= -S${fmtSGD(preview.unpaid_leave_amount)}</span>}
                            </div>
                          </div>
                          {emp.nationality !== 'Singapore' && !emp.is_pr && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">FWL <span className="text-orange-400">(Employer)</span></label>
                              <input type="number" value={inp.fwl_rate || ''} onChange={e => setInput(emp.id, 'fwl_rate', e.target.value)} disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="650" />
                            </div>
                          )}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs text-gray-500">{zh ? '其他調整 (±，不計CPF)' : 'Other Adjustments (±)'}</label>
                              {!isLocked && <button onClick={() => addAdjustment(emp.id)} className="text-xs text-blue-600 hover:underline">+ {zh ? '添加' : 'Add'}</button>}
                            </div>
                            <div className="space-y-2">
                              {(inp.other_adjustments || []).map((adj, idx) => (
                                <AdjRow key={idx} adj={adj} idx={idx} locked={isLocked}
                                  onRemove={(i) => removeAdjustment(emp.id, i)}
                                  onChange={(i, f, v) => changeAdjustment(emp.id, i, f, v)} />
                              ))}
                              {(!inp.other_adjustments || inp.other_adjustments.length === 0) && <div className="text-xs text-gray-300 py-1">{zh ? '無調整項目' : 'No adjustments'}</div>}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">{zh ? '付款日期' : 'Payment Date'}</label>
                            <input type="date" value={run?.payment_date || ''}
                              onChange={async e => { await supabase.from('payroll_runs').update({ payment_date: e.target.value }).eq('id', run.id); setRun(r => ({ ...r, payment_date: e.target.value })) }}
                              disabled={isLocked} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b pb-1 mb-4">{zh ? '計算預覽' : 'Preview'}</h4>
                          {preview && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-xs">
                              {[['Basic', preview.basic_salary],['Fixed Allow.', preview.fixed_allowance],['Other Allow.', preview.other_allowance],['OT/Other', preview.overtime],['Bonus', preview.bonus],['Commission', preview.commission],['Director Fee', preview.director_fee],['Unutilised', preview.unutilised_leave_pay],['Unpaid', -preview.unpaid_leave_amount]]
                                .filter(([,v]) => v !== 0).map(([l, v]) => (
                                <div key={l} className="flex justify-between">
                                  <span className="text-gray-500">{l}</span>
                                  <span className={v < 0 ? 'text-red-500' : 'text-gray-700'}>{v < 0 ? `(${fmtSGD(Math.abs(v))})` : fmtSGD(v)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Gross</span><span>S${fmtSGD(preview.gross_salary)}</span></div>
                              {preview.employee_cpf > 0 && <div className="flex justify-between text-red-400"><span>Ee CPF ({(preview.cpf_rate_employee*100).toFixed(0)}%)</span><span>({fmtSGD(preview.employee_cpf)})</span></div>}
                              {preview.cdac_mbmf_sinda > 0 && <div className="flex justify-between text-red-400"><span>{preview.cdac_mbmf_sinda_type}</span><span>({fmtSGD(preview.cdac_mbmf_sinda)})</span></div>}
                              <div className="flex justify-between font-semibold text-green-600 border-t pt-1 mt-1"><span>Net Pay</span><span>S${fmtSGD(preview.net_pay)}</span></div>
                              {(inp.other_adjustments||[]).length > 0 && <>
                                {inp.other_adjustments.map((a,i) => <div key={i} className="flex justify-between"><span className="text-gray-500">{a.desc||'—'}</span><span className={Number(a.amount)<0?'text-red-400':'text-blue-500'}>{Number(a.amount)<0?`(${fmtSGD(Math.abs(a.amount))})`:fmtSGD(a.amount)}</span></div>)}
                                <div className="flex justify-between font-semibold text-green-600 border-t pt-1 mt-1"><span>Net after Adj.</span><span>S${fmtSGD(preview.net_pay_after_adjustments)}</span></div>
                              </>}
                              <div className="font-semibold text-gray-600 mt-3 mb-1">{zh ? '公司成本' : 'Employer Costs'}</div>
                              {preview.employer_cpf > 0 && <div className="flex justify-between"><span className="text-gray-500">Er CPF ({(preview.cpf_rate_employer*100).toFixed(0)}%)</span><span>{fmtSGD(preview.employer_cpf)}</span></div>}
                              <div className="flex justify-between"><span className="text-gray-500">SDL</span><span>{fmtSGD(preview.sdl)}</span></div>
                              {preview.fwl > 0 && <div className="flex justify-between"><span className="text-gray-500">FWL</span><span>{fmtSGD(preview.fwl)}</span></div>}
                              <div className="flex justify-between font-bold text-blue-600 border-t-2 pt-2 mt-2"><span>Co. Total</span><span>S${fmtSGD(preview.total_company_paid)}</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                      {!isLocked && canEdit && (
                        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => handleSaveEmployee(emp)} disabled={saving}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                            {saving ? (zh ? '儲存中...' : 'Saving...') : (zh ? `儲存 ${emp.full_name}` : `Save ${emp.full_name}`)}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showPayslip && <PayslipModal record={showPayslip} companyName={companyName||''} logoUrl={settings?.logo_url||''} language={language} onClose={() => setShowPayslip(null)} />}
      {showCPF && <CPFReportModal records={records} companyName={companyName||''} cpfSubmissionNo={settings?.cpf_submission_no||''} year={year} month={month} language={language} onClose={() => setShowCPF(false)} />}
      {showSummary && <PayrollSummaryModal records={records} companyName={companyName||''} companyId={companyId} year={year} month={month} language={language} onClose={() => setShowSummary(false)} />}
    </div>
  )
}