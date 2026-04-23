import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { inputClass } from '../constants'
import {
  calculatePayroll, calculateYTD, getDefaultWorkingDays,
  MONTH_NAMES, fmtSGD, formatMonth,
} from '../utils/payroll'
import PayslipModal from '../components/PayslipModal'
import CPFReportModal from '../components/CPFReportModal'
import PayrollSummaryModal from '../components/PayrollSummaryModal'

const CURRENT_YEAR  = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

// ── Small helpers ─────────────────────────────
function MonthBadge({ status }) {
  const map = {
    draft:     'bg-gray-100 text-gray-600',
    confirmed: 'bg-blue-100 text-blue-700',
    locked:    'bg-green-100 text-green-700',
  }
  const label = { draft: 'Draft', confirmed: 'Confirmed', locked: '🔒 Locked' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.draft}`}>
      {label[status] || 'Draft'}
    </span>
  )
}

function AdjRow({ adj, idx, onRemove, onChange, locked }) {
  return (
    <div className="flex gap-2 items-center">
      <input
        value={adj.desc}
        onChange={e => onChange(idx, 'desc', e.target.value)}
        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Description"
        disabled={locked}
      />
      <input
        type="number"
        value={adj.amount}
        onChange={e => onChange(idx, 'amount', e.target.value)}
        className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="±0.00"
        disabled={locked}
      />
      {!locked && (
        <button onClick={() => onRemove(idx)}
          className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────
export default function PayrollTab({ text, language, companyId, companyName, currentUserId, userRole, permissions }) {
  const zh = language === 'zh'

  const [year,  setYear]  = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)

  // Run state
  const [run,         setRun]         = useState(null)   // payroll_run row
  const [records,     setRecords]     = useState([])     // payroll_record rows
  const [employees,   setEmployees]   = useState([])     // all employees
  const [commissions, setCommissions] = useState({})     // map emp_id → commission
  const [settings,    setSettings]    = useState(null)   // company_payroll_settings
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [success,     setSuccess]     = useState('')
  const [error,       setError]       = useState('')

  // Which employee's detail form is open
  const [activeEmpId, setActiveEmpId] = useState(null)
  const [empInputs,   setEmpInputs]   = useState({})  // map emp_id → inputs

  const canEdit = ['super_admin','hr_admin'].includes(userRole)
  const canLock = canEdit // payroll.lock permission
  const isLocked = run?.status === 'locked'

  // ── Report modals ─────────────────────────
  const [showPayslip,  setShowPayslip]  = useState(null)   // payroll_record
  const [showCPF,      setShowCPF]      = useState(false)
  const [showSummary,  setShowSummary]  = useState(false)
  const [companyLogo,  setCompanyLogo]  = useState('')

  useEffect(() => { if (companyId) loadAll() }, [companyId, year, month])

  // ── Data loading ──────────────────────────
  async function loadAll() {
    setLoading(true)
    setActiveEmpId(null)

    const [
      { data: settingsData },
      { data: runData },
      { data: empsData },
      { data: commsData },
    ] = await Promise.all([
      supabase.from('company_payroll_settings').select('*').eq('company_id', companyId).maybeSingle(),
      supabase.from('payroll_runs').select('*').eq('company_id', companyId).eq('year', year).eq('month', month).maybeSingle(),
      supabase.from('employees').select('*').eq('company_id', companyId).eq('employment_type','full_time').order('full_name'), // ⚠️ 兼職 part_time 另外處理
      supabase.from('commissions').select('*').eq('company_id', companyId).eq('year', year).eq('month', month).eq('status','confirmed'),
    ])

    setSettings(settingsData)
    setRun(runData)
    setEmployees(empsData || [])

    const commMap = {}
    ;(commsData || []).forEach(c => { commMap[c.employee_id] = c })
    setCommissions(commMap)

    // Load records if run exists
    if (runData) {
      const { data: recs } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('payroll_run_id', runData.id)
        .order('snap_name')
      setRecords(recs || [])

      // Build inputs map from existing records
      const inputs = {}
      ;(recs || []).forEach(r => {
        inputs[r.employee_id] = {
          other_allowance:      r.other_allowance || 0,
          other_allowance_desc: r.other_allowance_desc || '',
          overtime:             r.overtime || 0,
          overtime_desc:        r.overtime_desc || '',
          bonus:                r.bonus || 0,
          bonus_desc:           r.bonus_desc || '',
          director_fee:         r.director_fee || 0,
          director_fee_desc:    r.director_fee_desc || '',
          unutilised_leave_pay: r.unutilised_leave_pay || 0,
          unutilised_leave_desc:r.unutilised_leave_desc || '',
          unpaid_leave_days:    r.unpaid_leave_days || 0,
          other_adjustments:    r.other_adjustments || [],
          fwl_rate:             r.fwl || 0,
        }
      })
      setEmpInputs(inputs)
    } else {
      setRecords([])
      setEmpInputs({})
    }

    setLoading(false)
  }

  // Default working days
  const workDaysPerWeek = Number(settings?.work_days_per_week || 5)
  const defaultWorkingDays = getDefaultWorkingDays(year, month, workDaysPerWeek)
  const workingDays = run?.working_days ?? defaultWorkingDays

  // ── Create payroll run ────────────────────
  async function handleCreateRun() {
    setSaving(true); setError('')
    const { data, error: e } = await supabase.from('payroll_runs').insert([{
      company_id: companyId,
      year, month,
      status: 'draft',
      working_days: defaultWorkingDays,
      created_by: currentUserId,
    }]).select().single()
    if (e) { setError(e.message); setSaving(false); return }

    // Auto-create records for all employees
    await createRecordsForRun(data)
    setSaving(false)
    await loadAll()
  }

  async function createRecordsForRun(runRow) {
    // Get YTD OW for each employee (from previous months this year)
    const { data: prevRecs } = await supabase
      .from('payroll_records')
      .select('employee_id, ow_subject_to_cpf')
      .eq('company_id', companyId)
      .eq('year', year)
      .lt('month', month)

    const ytdOwMap = {}
    ;(prevRecs || []).forEach(r => {
      ytdOwMap[r.employee_id] = (ytdOwMap[r.employee_id] || 0) + Number(r.ow_subject_to_cpf || 0)
    })

    const inserts = employees.map(emp => {
      const comm = commissions[emp.id]
      const inputs = {
        other_allowance: 0, overtime: 0, bonus: 0,
        commission: comm?.amount || 0,
        director_fee: 0, unutilised_leave_pay: 0,
        unpaid_leave_days: 0, other_adjustments: [],
      }
      const calc = calculatePayroll({
        employee: emp, year, month,
        workingDays: runRow.working_days || defaultWorkingDays,
        inputs,
        ytdOwForCpf: ytdOwMap[emp.id] || 0,
        fwlRate: 0,
      })
      return buildRecord(runRow.id, emp, calc)
    })

    if (inserts.length) {
      await supabase.from('payroll_records').insert(inserts)
    }
  }

  function buildRecord(runId, emp, calc) {
    // Strip out meta fields that are NOT in the DB table
    const {
      cpf_applicable, cpf_age, fund_type,
      ow_for_cpf_this_month,
      ...dbCalc
    } = calc

    return {
      payroll_run_id:       runId,
      employee_id:          emp.id,
      company_id:           companyId,
      year, month,
      // Snapshot
      snap_name:            emp.full_name,
      snap_nric:            emp.nric_fin,
      snap_position:        emp.position,
      snap_nationality:     emp.nationality,
      snap_dob:             emp.date_of_birth,
      snap_is_pr:           emp.is_pr,
      snap_pr_year:         emp.pr_year,
      snap_bank_name:       emp.bank_name,
      snap_bank_account_no: emp.bank_account_no,
      snap_join_date:       emp.join_date,
      // Calculated fields (DB columns only)
      ...dbCalc,
    }
  }

  // Strip meta-only fields before any DB write
  function cleanCalc(calc) {
    const { cpf_applicable, cpf_age, fund_type, ow_for_cpf_this_month, ...dbCalc } = calc
    return dbCalc
  }

  // ── Recalculate one employee ──────────────
  async function recalcEmployee(emp) {
    const inputs = empInputs[emp.id] || {}
    const comm   = commissions[emp.id]

    // YTD OW from previous months
    const { data: prevRecs } = await supabase
      .from('payroll_records')
      .select('ow_subject_to_cpf')
      .eq('company_id', companyId)
      .eq('employee_id', emp.id)
      .eq('year', year)
      .lt('month', month)
    const ytdOwForCpf = (prevRecs || []).reduce((s, r) => s + Number(r.ow_subject_to_cpf || 0), 0)

    const fullInputs = {
      ...inputs,
      commission: comm?.amount || 0,
    }

    const calc = calculatePayroll({
      employee: emp, year, month,
      workingDays,
      inputs: fullInputs,
      ytdOwForCpf,
      fwlRate: inputs.fwl_rate || 0,
    })

    // Find existing record
    const existingRec = records.find(r => r.employee_id === emp.id)
    if (existingRec) {
      await supabase.from('payroll_records')
        .update({ ...cleanCalc(calc), updated_at: new Date().toISOString() })
        .eq('id', existingRec.id)
    } else {
      await supabase.from('payroll_records')
        .insert([buildRecord(run.id, emp, calc)])
    }
  }

  async function handleSaveEmployee(emp) {
    if (!run) return
    setSaving(true); setError('')
    await recalcEmployee(emp)
    setSuccess(zh ? `${emp.full_name} 已儲存` : `${emp.full_name} saved`)
    setTimeout(() => setSuccess(''), 4000)
    await loadAll()
    setSaving(false)
  }

  // ── Recalculate all ───────────────────────
  async function handleRecalcAll() {
    if (!run || isLocked) return
    setSaving(true)
    for (const emp of employees) {
      await recalcEmployee(emp)
    }
    setSuccess(zh ? '所有薪資已重新計算' : 'All payroll recalculated')
    setTimeout(() => setSuccess(''), 4000)
    await loadAll()
    setSaving(false)
  }

  // ── Confirm run ───────────────────────────
  async function handleConfirm() {
    if (!run) return
    await supabase.from('payroll_runs').update({ status: 'confirmed' }).eq('id', run.id)
    await loadAll()
  }

  // ── Lock run ─────────────────────────────
  async function handleLock() {
    if (!run || !canLock) return
    if (!window.confirm(zh
      ? `確定鎖定 ${formatMonth(year, month)} 薪資？鎖定後不可修改。`
      : `Lock ${formatMonth(year, month)} payroll? This cannot be undone.`)) return

    setSaving(true)
    // Calculate and save YTD for all records
    const { data: allYearRecs } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('year', year)
      .lte('month', month)

    // Group by employee
    const byEmp = {}
    ;(allYearRecs || []).forEach(r => {
      if (!byEmp[r.employee_id]) byEmp[r.employee_id] = []
      byEmp[r.employee_id].push(r)
    })

    // Update YTD for each record in this run
    for (const rec of records) {
      const empRecs = byEmp[rec.employee_id] || []
      const ytd = calculateYTD(empRecs, month)
      await supabase.from('payroll_records')
        .update({ ...ytd, updated_at: new Date().toISOString() })
        .eq('id', rec.id)
    }

    await supabase.from('payroll_runs').update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: currentUserId,
    }).eq('id', run.id)

    setSaving(false)
    setSuccess(zh ? '薪資已鎖定' : 'Payroll locked')
    setTimeout(() => setSuccess(''), 5000)
    await loadAll()
  }

  // ── Input helpers ─────────────────────────
  function getInput(empId) {
    return empInputs[empId] || {
      other_allowance: 0, other_allowance_desc: '',
      overtime: 0, overtime_desc: '',
      bonus: 0, bonus_desc: '',
      director_fee: 0, director_fee_desc: '',
      unutilised_leave_pay: 0, unutilised_leave_desc: '',
      unpaid_leave_days: 0,
      other_adjustments: [],
      fwl_rate: 0,
    }
  }

  function setInput(empId, field, value) {
    setEmpInputs(prev => ({
      ...prev,
      [empId]: { ...getInput(empId), [field]: value }
    }))
  }

  function addAdjustment(empId) {
    const inp = getInput(empId)
    setEmpInputs(prev => ({
      ...prev,
      [empId]: { ...inp, other_adjustments: [...(inp.other_adjustments || []), { desc: '', amount: 0 }] }
    }))
  }

  function removeAdjustment(empId, idx) {
    const inp = getInput(empId)
    const adjs = [...(inp.other_adjustments || [])]
    adjs.splice(idx, 1)
    setEmpInputs(prev => ({ ...prev, [empId]: { ...inp, other_adjustments: adjs } }))
  }

  function changeAdjustment(empId, idx, field, value) {
    const inp = getInput(empId)
    const adjs = [...(inp.other_adjustments || [])]
    adjs[idx] = { ...adjs[idx], [field]: field === 'amount' ? Number(value) : value }
    setEmpInputs(prev => ({ ...prev, [empId]: { ...inp, other_adjustments: adjs } }))
  }

  // Live preview calculation
  function getPreview(emp) {
    const inputs = { ...getInput(emp.id), commission: commissions[emp.id]?.amount || 0 }
    try {
      return calculatePayroll({
      employee: emp, year, month, workingDays, inputs,
      ytdOwForCpf: 0,
      fwlRate: inputs.fwl_rate || 0
      })
    } catch(err) {
      console.error('calculatePayroll error:', err, { emp, inputs }) // ← 改這行
      return null
    }
  }

  // Summary totals
  const totalGross    = records.reduce((s, r) => s + Number(r.gross_salary || 0), 0)
  const totalNet      = records.reduce((s, r) => s + Number(r.net_pay_after_adjustments || 0), 0)
  const totalCPF      = records.reduce((s, r) => s + Number(r.total_cpf || 0), 0)
  const totalCompany  = records.reduce((s, r) => s + Number(r.total_company_paid || 0), 0)

  // ── Render ────────────────────────────────
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {zh ? '薪資管理' : 'Payroll Management'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh ? '月度薪資計算與管理' : 'Monthly payroll calculation and management'}
          </p>
        </div>
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {MONTH_NAMES.slice(1).map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status / Action bar */}
      {run && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <MonthBadge status={run.status} />
            <span className="text-sm text-gray-600">
              {zh ? `工作天數：${workingDays} 天` : `Working days: ${workingDays}`}
            </span>
            {run.payment_date && (
              <span className="text-sm text-gray-500">
                {zh ? `付款日：${run.payment_date}` : `Payment: ${run.payment_date}`}
              </span>
            )}
          </div>
          {canEdit && !isLocked && (
            <div className="flex gap-2">
              <button onClick={handleRecalcAll} disabled={saving}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                🔄 {zh ? '重新計算全部' : 'Recalc All'}
              </button>
              {run.status === 'draft' && (
                <button onClick={handleConfirm}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {zh ? '確認薪資' : 'Confirm Payroll'}
                </button>
              )}
              {run.status === 'confirmed' && canLock && (
                <button onClick={handleLock} disabled={saving}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  🔒 {zh ? '鎖定薪資' : 'Lock Payroll'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✅ {success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* ⚠️ Part-time notice */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
        <span>⚠️</span>
        <span>{zh ? '此頁面只顯示全職員工。兼職薪資計算將在後續版本推出。' : 'Full-time employees only. Part-time payroll coming soon.'}</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">{zh ? '載入中...' : 'Loading...'}</div>
      ) : !run ? (
        /* No run yet — show create button */
        <div className="border-2 border-dashed border-gray-300 rounded-xl py-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-gray-600 font-medium mb-2">
            {zh ? `${formatMonth(year, month)} 薪資尚未建立` : `${formatMonth(year, month)} payroll not yet created`}
          </div>
          <p className="text-xs text-gray-400 mb-6">
            {zh ? '建立後將自動為所有員工生成薪資記錄' : 'All employee records will be auto-created'}
          </p>
          {canEdit && (
            <button onClick={handleCreateRun} disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
              {saving ? (zh ? '建立中...' : 'Creating...') : (zh ? `建立 ${formatMonth(year, month)} 薪資` : `Create ${formatMonth(year, month)} Payroll`)}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary bar */}
          {records.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: zh ? '總 Gross' : 'Total Gross', value: totalGross, color: 'blue' },
                { label: zh ? '員工淨薪' : 'Total Net Pay', value: totalNet, color: 'green' },
                { label: zh ? 'CPF 總額' : 'Total CPF', value: totalCPF, color: 'purple' },
                { label: zh ? '公司總支出' : 'Total Company Paid', value: totalCompany, color: 'orange' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl px-4 py-3`}>
                  <div className={`text-${color}-700 font-bold text-base`}>S$ {fmtSGD(value)}</div>
                  <div className={`text-${color}-500 text-xs mt-0.5`}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Reports bar ── */}
          {records.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs font-medium text-gray-500 mr-1">
                📊 {zh ? '報告：' : 'Reports:'}
              </span>
              <button
                onClick={() => setShowSummary(true)}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                📋 {zh ? '工資匯總' : 'Payroll Summary'}
              </button>
              <button
                onClick={() => setShowCPF(true)}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                🏦 {zh ? 'CPF 匯總' : 'CPF Report'}
              </button>
              <span className="text-xs text-gray-300 mx-1">|</span>
              <span className="text-xs text-gray-400">
                📄 {zh ? '工資單：點每個員工行末的 📄 按鈕' : 'Payslip: click 📄 button on each employee row'}
              </span>
            </div>
          )}

          {/* Employee rows */}
          <div className="space-y-2">
            {employees.map(emp => {
              const rec     = records.find(r => r.employee_id === emp.id)
              const inp     = getInput(emp.id)
              const isOpen  = activeEmpId === emp.id
              const comm    = commissions[emp.id]
              const preview = isOpen ? getPreview(emp) : null

              return (
                <div key={emp.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Employee summary row */}
                  <div
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors
                      ${isOpen ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-gray-50'}`}
                    onClick={() => setActiveEmpId(isOpen ? null : emp.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{emp.full_name}</span>
                        {emp.position && <span className="text-xs text-gray-400">{emp.position}</span>}
                        {comm && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                            {zh ? '有佣金' : 'Commission'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {emp.nationality}{emp.is_pr ? ` · PR Yr${emp.pr_year}` : ''} ·{' '}
                        Basic S${fmtSGD(emp.basic_salary)}
                      </div>
                    </div>
                    {rec ? (
                      <div className="flex gap-6 text-right">
                        <div>
                          <div className="text-xs text-gray-400">{zh ? 'Gross' : 'Gross'}</div>
                          <div className="text-sm font-medium text-gray-700">S$ {fmtSGD(rec.gross_salary)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">{zh ? '淨薪' : 'Net Pay'}</div>
                          <div className="text-sm font-medium text-green-600">S$ {fmtSGD(rec.net_pay_after_adjustments)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">{zh ? '公司支出' : 'Co. Total'}</div>
                          <div className="text-sm font-medium text-blue-600">S$ {fmtSGD(rec.total_company_paid)}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-500">⚠️ {zh ? '未計算' : 'Not calculated'}</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); if(rec) setShowPayslip(rec) }}
                      disabled={!rec}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={zh ? '查看工資單' : 'View Payslip'}>
                      📄
                    </button>
                    <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {/* Detail form */}
                  {isOpen && (
                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* LEFT: Inputs */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b pb-1">
                            {zh ? '收入項目' : 'Earnings'}
                          </h4>

                          {/* Basic (read-only) */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                {zh ? '基本薪資' : 'Basic Salary'} <span className="text-gray-300">(OW)</span>
                              </label>
                              <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600">
                                S$ {fmtSGD(emp.basic_salary)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                {zh ? '固定津貼' : 'Fixed Allowance'} <span className="text-gray-300">(OW)</span>
                              </label>
                              <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600">
                                S$ {fmtSGD(emp.basic_allowance)}
                              </div>
                            </div>
                          </div>

                          {/* Other Allowance */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '其他津貼' : 'Other Allowance'} <span className="text-gray-300">(OW · CPF ✓)</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={inp.other_allowance || ''}
                                onChange={e => setInput(emp.id, 'other_allowance', e.target.value)}
                                disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="0.00"/>
                              <input value={inp.other_allowance_desc || ''}
                                onChange={e => setInput(emp.id, 'other_allowance_desc', e.target.value)}
                                disabled={isLocked}
                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder={zh ? '說明' : 'Description'}/>
                            </div>
                          </div>

                          {/* Overtime */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '加班/其他' : 'Overtime / Other'} <span className="text-gray-300">(OW · CPF ✓)</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={inp.overtime || ''}
                                onChange={e => setInput(emp.id, 'overtime', e.target.value)}
                                disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="0.00"/>
                              <input value={inp.overtime_desc || ''}
                                onChange={e => setInput(emp.id, 'overtime_desc', e.target.value)}
                                disabled={isLocked}
                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder={zh ? '說明' : 'Description'}/>
                            </div>
                          </div>

                          {/* Bonus */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '花紅/AWS' : 'Bonus / AWS'} <span className="text-gray-300">(AW · CPF ✓)</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={inp.bonus || ''}
                                onChange={e => setInput(emp.id, 'bonus', e.target.value)}
                                disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="0.00"/>
                              <input value={inp.bonus_desc || ''}
                                onChange={e => setInput(emp.id, 'bonus_desc', e.target.value)}
                                disabled={isLocked}
                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder={zh ? '說明' : 'Description'}/>
                            </div>
                          </div>

                          {/* Commission (read from commission module) */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '佣金' : 'Commission'} <span className="text-gray-300">(AW · CPF ✓)</span>
                            </label>
                            <div className="border border-gray-100 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600 flex justify-between">
                              <span>S$ {fmtSGD(comm?.amount || 0)}</span>
                              {!comm && <span className="text-xs text-gray-400">{zh ? '佣金模塊無記錄' : 'No commission entry'}</span>}
                              {comm && <span className="text-xs text-green-500">✅ {zh ? '已確認' : 'Confirmed'}</span>}
                            </div>
                          </div>

                          {/* Director Fee */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '董事費' : 'Director Fee'}
                              <span className="ml-1 text-xs text-orange-400">(CPF ✗ · 需報稅)</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={inp.director_fee || ''}
                                onChange={e => setInput(emp.id, 'director_fee', e.target.value)}
                                disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="0.00"/>
                              <input value={inp.director_fee_desc || ''}
                                onChange={e => setInput(emp.id, 'director_fee_desc', e.target.value)}
                                disabled={isLocked}
                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder={zh ? '說明' : 'Description'}/>
                            </div>
                          </div>

                          {/* Unutilised Leave */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '未用年假補償' : 'Unutilised Leave Pay'} <span className="text-gray-300">(OW)</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="number" step="0.01" value={inp.unutilised_leave_pay || ''}
                                onChange={e => setInput(emp.id, 'unutilised_leave_pay', e.target.value)}
                                disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="0.00"/>
                              <input value={inp.unutilised_leave_desc || ''}
                                onChange={e => setInput(emp.id, 'unutilised_leave_desc', e.target.value)}
                                disabled={isLocked}
                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder={zh ? '說明' : 'Description'}/>
                            </div>
                          </div>

                          {/* Unpaid Leave */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '無薪假天數' : 'Unpaid Leave Days'}
                              <span className="text-xs text-gray-400 ml-1">
                                ({zh ? '自動計算扣款' : 'auto-calculates deduction'})
                              </span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input type="number" step="0.5" min="0" value={inp.unpaid_leave_days || ''}
                                onChange={e => setInput(emp.id, 'unpaid_leave_days', e.target.value)}
                                disabled={isLocked}
                                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="0"/>
                              <span className="text-xs text-gray-400">{zh ? '天' : 'days'}</span>
                              {preview && inp.unpaid_leave_days > 0 && (
                                <span className="text-xs text-red-500">
                                  = -S$ {fmtSGD(preview.unpaid_leave_amount)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* FWL (WP only) */}
                          {emp.nationality !== 'Singapore' && !emp.is_pr && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                FWL <span className="text-xs text-orange-400">({zh ? '外勞稅·公司負擔' : 'Employer cost'})</span>
                              </label>
                              <input type="number" value={inp.fwl_rate || ''}
                                onChange={e => setInput(emp.id, 'fwl_rate', e.target.value)}
                                disabled={isLocked}
                                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                placeholder="650"/>
                            </div>
                          )}

                          {/* Other Adjustments */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-xs text-gray-500">
                                {zh ? '其他調整' : 'Other Adjustments'}
                                <span className="text-gray-400 ml-1">(+/-，{zh ? '不計CPF' : 'no CPF/tax'})</span>
                              </label>
                              {!isLocked && (
                                <button onClick={() => addAdjustment(emp.id)}
                                  className="text-xs text-blue-600 hover:underline">
                                  + {zh ? '添加' : 'Add'}
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {(inp.other_adjustments || []).map((adj, idx) => (
                                <AdjRow
                                  key={idx} adj={adj} idx={idx}
                                  locked={isLocked}
                                  onRemove={(i) => removeAdjustment(emp.id, i)}
                                  onChange={(i, f, v) => changeAdjustment(emp.id, i, f, v)}
                                />
                              ))}
                              {(!inp.other_adjustments || inp.other_adjustments.length === 0) && (
                                <div className="text-xs text-gray-300 py-2">
                                  {zh ? '無調整項目' : 'No adjustments'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payment date */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              {zh ? '付款日期' : 'Payment Date'}
                            </label>
                            <input type="date"
                              value={run?.payment_date || ''}
                              onChange={async e => {
                                await supabase.from('payroll_runs')
                                  .update({ payment_date: e.target.value }).eq('id', run.id)
                                setRun(r => ({ ...r, payment_date: e.target.value }))
                              }}
                              disabled={isLocked}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"/>
                          </div>
                        </div>

                        {/* RIGHT: Live preview / result */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b pb-1 mb-4">
                            {zh ? '計算預覽' : 'Calculation Preview'}
                          </h4>
                          {preview && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-xs">
                              {/* Earnings */}
                              <div className="font-semibold text-gray-600 mb-2">{zh ? '收入' : 'Earnings'}</div>
                              {[
                                ['Basic Salary', preview.basic_salary],
                                ['Fixed Allowance', preview.fixed_allowance],
                                [inp.other_allowance_desc || 'Other Allowance', preview.other_allowance],
                                [inp.overtime_desc || 'Overtime/Other', preview.overtime],
                                [inp.bonus_desc || 'Bonus/AWS', preview.bonus],
                                ['Commission', preview.commission],
                                [inp.director_fee_desc || 'Director Fee', preview.director_fee],
                                [inp.unutilised_leave_desc || 'Unutilised Leave', preview.unutilised_leave_pay],
                                ['Unpaid Leave', -preview.unpaid_leave_amount],
                              ].map(([label, val]) => val !== 0 && (
                                <div key={label} className="flex justify-between">
                                  <span className="text-gray-500">{label}</span>
                                  <span className={val < 0 ? 'text-red-500' : 'text-gray-700'}>
                                    {val < 0 ? `(${fmtSGD(Math.abs(val))})` : fmtSGD(val)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1">
                                <span>{zh ? '總收入 Gross' : 'Gross Salary'}</span>
                                <span>S$ {fmtSGD(preview.gross_salary)}</span>
                              </div>

                              {/* Deductions */}
                              <div className="font-semibold text-gray-600 mt-3 mb-1">{zh ? '扣款' : 'Deductions'}</div>
                              {preview.employee_cpf > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">
                                    Employee CPF ({(preview.cpf_rate_employee * 100).toFixed(0)}%)
                                  </span>
                                  <span className="text-red-400">({fmtSGD(preview.employee_cpf)})</span>
                                </div>
                              )}
                              {preview.cdac_mbmf_sinda > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">{preview.cdac_mbmf_sinda_type}</span>
                                  <span className="text-red-400">({fmtSGD(preview.cdac_mbmf_sinda)})</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1">
                                <span>{zh ? '淨薪 Net Pay' : 'Net Pay'}</span>
                                <span className="text-green-600">S$ {fmtSGD(preview.net_pay)}</span>
                              </div>

                              {/* Other Adjustments */}
                              {(inp.other_adjustments || []).length > 0 && (
                                <>
                                  <div className="font-semibold text-gray-600 mt-3 mb-1">{zh ? '其他調整' : 'Other Adjustments'}</div>
                                  {inp.other_adjustments.map((a, i) => (
                                    <div key={i} className="flex justify-between">
                                      <span className="text-gray-500">{a.desc || '—'}</span>
                                      <span className={Number(a.amount) < 0 ? 'text-red-400' : 'text-blue-500'}>
                                        {Number(a.amount) < 0 ? `(${fmtSGD(Math.abs(a.amount))})` : `+${fmtSGD(a.amount)}`}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1">
                                    <span>{zh ? '調整後淨薪' : 'Net after Adj.'}</span>
                                    <span className="text-green-600">S$ {fmtSGD(preview.net_pay_after_adjustments)}</span>
                                  </div>
                                </>
                              )}

                              {/* Employer costs */}
                              <div className="font-semibold text-gray-600 mt-3 mb-1">{zh ? '公司成本' : 'Employer Costs'}</div>
                              {preview.employer_cpf > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Employer CPF ({(preview.cpf_rate_employer * 100).toFixed(0)}%)</span>
                                  <span className="text-gray-700">{fmtSGD(preview.employer_cpf)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">SDL</span>
                                <span className="text-gray-700">{fmtSGD(preview.sdl)}</span>
                              </div>
                              {preview.fwl > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">FWL</span>
                                  <span className="text-gray-700">{fmtSGD(preview.fwl)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-gray-800 border-t-2 border-gray-300 pt-2 mt-2">
                                <span>{zh ? '公司總支出' : 'Total Company Paid'}</span>
                                <span className="text-blue-600">S$ {fmtSGD(preview.total_company_paid)}</span>
                              </div>

                              {/* CPF info */}
                              {preview.cpf_applicable && (
                                <div className="mt-3 pt-2 border-t border-gray-200 text-gray-400 space-y-0.5">
                                  <div>OW for CPF: S$ {fmtSGD(preview.ow_subject_to_cpf)}</div>
                                  {preview.aw_subject_to_cpf > 0 && <div>AW for CPF: S$ {fmtSGD(preview.aw_subject_to_cpf)}</div>}
                                  <div>Age: {preview.cpf_age}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Save button */}
                      {!isLocked && canEdit && (
                        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleSaveEmployee(emp)}
                            disabled={saving}
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

      {/* ── Modals ── */}
      {showPayslip && (
        <PayslipModal
          record={showPayslip}
          companyName={companyName || ''}
          logoUrl={settings?.logo_url || ''}
          language={language}
          onClose={() => setShowPayslip(null)}
        />
      )}
      {showCPF && (
        <CPFReportModal
          records={records}
          companyName={companyName || ''}
          cpfSubmissionNo={settings?.cpf_submission_no || ''}
          year={year} month={month}
          language={language}
          onClose={() => setShowCPF(false)}
        />
      )}
      {showSummary && (
        <PayrollSummaryModal
          records={records}
          companyName={companyName || ''}
          year={year} month={month}
          language={language}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}