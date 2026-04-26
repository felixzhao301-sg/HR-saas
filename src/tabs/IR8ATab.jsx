// src/tabs/IR8ATab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtSGD } from '../utils/payroll'
import { loadXLSX } from '../utils/attachments'
import IR8AModal from '../components/IR8AModal'

// ── 導出工具函數 ──────────────────────────────────────────────

function calcIR8A(ytd) {
  if (!ytd) return { grossSalaryFees: 0, bonus: 0, directorFees: 0, commission: 0, allowances: 0, totalIncome: 0, employeeCPF: 0, employerCPF: 0, donations: 0 }
  const grossSalaryFees = (ytd.ytd_basic || 0) + (ytd.ytd_fixed_allowance || 0) +
    (ytd.ytd_other_allowance || 0) + (ytd.ytd_overtime || 0) +
    (ytd.ytd_unutilised_leave || 0) - (ytd.ytd_unpaid_leave || 0)
  const bonus        = ytd.ytd_bonus || 0
  const directorFees = ytd.ytd_director_fee || 0
  const commission   = ytd.ytd_commission || 0
  const allowances   = (ytd.ytd_fixed_allowance || 0) + (ytd.ytd_other_allowance || 0)
  const totalIncome  = grossSalaryFees + bonus + directorFees + commission
  const employeeCPF  = ytd.ytd_employee_cpf || 0
  const employerCPF  = ytd.ytd_employer_cpf || 0
  const donations    = ytd.ytd_cdac || 0
  return { grossSalaryFees, bonus, directorFees, commission, allowances, totalIncome, employeeCPF, employerCPF, donations }
}

// ── Excel 導出（完整數據） ────────────────────────────────────
async function exportExcel({ employees, year, ya, companyName, companyUen }) {
  const xl = await loadXLSX()
  const wb = xl.utils.book_new()

  // Sheet 1: IR8A Summary
  const headers = [
    'NRIC/FIN', 'Full Name', 'Date of Birth', 'Nationality', 'Position',
    'Date of Commencement', 'Date of Cessation',
    'Gross Salary/Fees', 'Bonus', "Director's Fees", 'Commission', 'Allowances',
    'Total Income', 'Employee CPF', 'Employer CPF', 'Donations (CDAC etc)',
    'Status', 'IR21 Filed',
  ]

  const rows = employees
    .filter(emp => emp.hasData)
    .map(emp => {
      const c = calcIR8A(emp.ytd)
      return [
        emp.nric_fin || emp.ytd?.snap_nric || '',
        emp.ytd?.snap_name || emp.full_name,
        emp.ytd?.snap_dob  || emp.date_of_birth || '',
        emp.nationality || '',
        emp.ytd?.snap_position || emp.position || '',
        emp.ytd?.snap_join_date || emp.join_date || '',
        emp.resign_date || '',
        c.grossSalaryFees, c.bonus, c.directorFees, c.commission, c.allowances,
        c.totalIncome, c.employeeCPF, c.employerCPF, c.donations,
        emp.status === 'resigned' ? 'Resigned' : 'Active',
        emp.ir21_filed ? 'Yes' : 'No',
      ]
    })

  // Totals row
  const numCols = [7,8,9,10,11,12,13,14,15] // index of numeric columns
  const totals = ['', '', '', '', '', '', 'TOTAL']
  numCols.forEach((ci, idx) => {
    const sum = rows.reduce((s, r) => s + Number(r[ci] || 0), 0)
    totals[ci] = sum
  })

  const ws1 = xl.utils.aoa_to_sheet([
    [`IR8A Summary — ${companyName} (${companyUen}) — Income Year ${year} (YA ${ya})`],
    [`Generated: ${new Date().toLocaleDateString('en-SG')}`],
    [],
    headers,
    ...rows,
    totals,
  ])
  ws1['!cols'] = headers.map((h, i) => ({ wch: i < 6 ? 22 : 15 }))
  xl.utils.book_append_sheet(wb, ws1, `IR8A ${year}`)

  // Sheet 2: No Data employees
  const noData = employees.filter(e => !e.hasData && !e.ir21_filed)
  if (noData.length > 0) {
    const ws2 = xl.utils.aoa_to_sheet([
      ['Employees with No Locked Payroll Data'],
      ['NRIC/FIN', 'Full Name', 'Status', 'Note'],
      ...noData.map(e => [e.nric_fin || '', e.full_name, e.status, 'No locked payroll records for this year']),
    ])
    ws2['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 40 }]
    xl.utils.book_append_sheet(wb, ws2, 'No Data')
  }

  xl.writeFile(wb, `IR8A_${companyName.replace(/\s+/g, '_')}_${year}.xlsx`)
}

// ── IRAS AIS CSV 導出 ─────────────────────────────────────────
// 格式參考: IRAS AIS Employer's Submission via API/CSV
function exportIRASCsv({ employees, year, ya, companyName, companyUen }) {
  // IRAS AIS IR8A fields (simplified - key required fields)
  const headers = [
    'EmployerTaxRefNo',
    'EmployeeTaxRefNo',
    'EmployeeName',
    'DateOfBirth',
    'Nationality',
    'DateOfCommencement',
    'DateOfCessation',
    'GrossSalaryFeesLeavePayWagesOvertimePay',
    'Bonus',
    'DirectorsFees',
    'GrossCommission',
    'EmployeeCPFContribution',
    'EmployerCPFContribution',
    'OtherAllowances',
    'TotalIncome',
  ]

  const rows = employees
    .filter(emp => emp.hasData && !emp.ir21_filed) // IR21 員工排除
    .map(emp => {
      const c = calcIR8A(emp.ytd)
      const nric = (emp.nric_fin || emp.ytd?.snap_nric || '').replace(/\s/g, '')
      const name = (emp.ytd?.snap_name || emp.full_name || '').toUpperCase()
      const dob  = (emp.ytd?.snap_dob || emp.date_of_birth || '').replace(/-/g, '')  // YYYYMMDD
      const comm = (emp.ytd?.snap_join_date || emp.join_date || '').replace(/-/g, '')
      const cess = emp.resign_date ? emp.resign_date.replace(/-/g, '') : ''

      return [
        companyUen,
        nric,
        name,
        dob,
        emp.nationality || '',
        comm,
        cess,
        c.grossSalaryFees.toFixed(2),
        c.bonus.toFixed(2),
        c.directorFees.toFixed(2),
        c.commission.toFixed(2),
        c.employeeCPF.toFixed(2),
        c.employerCPF.toFixed(2),
        c.allowances.toFixed(2),
        c.totalIncome.toFixed(2),
      ]
    })

  // Build CSV string
  const escape = (val) => {
    const s = String(val ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csvLines = [
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ]
  const csv = csvLines.join('\r\n')

  // Download
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `IRAS_AIS_IR8A_${companyUen}_${year}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── 主組件 ────────────────────────────────────────────────────
export default function IR8ATab({ text, language, companyId, companyName, userRole }) {
  const zh = language === 'zh'
  const CURRENT_YEAR = new Date().getFullYear()

  const [year,        setYear]        = useState(CURRENT_YEAR - 1)
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [companyUen,  setCompanyUen]  = useState('')
  const [showModal,   setShowModal]   = useState(null)
  const [search,      setSearch]      = useState('')
  const [showResigned,setShowResigned]= useState(true)
  const [exporting,   setExporting]   = useState(false)

  const canView = ['super_admin', 'hr_admin', 'hr_staff', 'finance'].includes(userRole)
  const ya = year + 1

  useEffect(() => { if (companyId) fetchCompany() }, [companyId])
  useEffect(() => { if (companyId) loadData() }, [companyId, year])

  async function fetchCompany() {
    const { data } = await supabase.from('companies').select('uen').eq('id', companyId).single()
    if (data) setCompanyUen(data.uen || '')
  }

  async function loadData() {
    setLoading(true)
    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name, position, nric_fin, date_of_birth, nationality, is_pr, pr_year, join_date, resign_date, status, ir21_filed')
      .eq('company_id', companyId)
      .order('full_name')

    if (!emps || emps.length === 0) { setEmployees([]); setLoading(false); return }

    const { data: runs } = await supabase
      .from('payroll_runs')
      .select('id, month, status')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('status', 'locked')

    const runIds = (runs || []).map(r => r.id)
    let ytdMap = {}

    if (runIds.length > 0) {
      const { data: recs } = await supabase
        .from('payroll_records')
        .select('employee_id, ytd_basic, ytd_fixed_allowance, ytd_other_allowance, ytd_overtime, ytd_bonus, ytd_commission, ytd_director_fee, ytd_unutilised_leave, ytd_unpaid_leave, ytd_gross, ytd_employee_cpf, ytd_employer_cpf, ytd_sdl, ytd_fwl, ytd_cdac, ytd_net_pay, ytd_total_company_paid, snap_name, snap_nric, snap_position, snap_dob, snap_join_date, month')
        .in('payroll_run_id', runIds)
        .order('month', { ascending: false })

      ;(recs || []).forEach(r => {
        if (!ytdMap[r.employee_id]) ytdMap[r.employee_id] = r
      })
    }

    setEmployees(emps.map(emp => ({
      ...emp,
      ytd: ytdMap[emp.id] || null,
      hasData: !!ytdMap[emp.id],
    })))
    setLoading(false)
  }

  async function handleExcelExport() {
    setExporting(true)
    try {
      await exportExcel({ employees, year, ya, companyName: companyName || '', companyUen })
    } finally { setExporting(false) }
  }

  function handleCSVExport() {
    exportIRASCsv({ employees, year, ya, companyName: companyName || '', companyUen })
  }

  const filtered = employees.filter(emp => {
    const matchSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.position?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = showResigned ? true : emp.status !== 'resigned'
    return matchSearch && matchStatus
  })

  const activeCount   = employees.filter(e => e.status !== 'resigned').length
  const resignedCount = employees.filter(e => e.status === 'resigned').length
  const withDataCount = employees.filter(e => e.hasData).length
  const ir21Count     = employees.filter(e => e.ir21_filed).length
  const excludedCount = ir21Count  // IR21 filed → excluded from IRAS CSV

  if (!canView) return (
    <div className="p-6 text-center text-gray-400 text-sm py-20">
      {zh ? '您沒有權限查看此頁面' : 'You do not have permission to view this page'}
    </div>
  )

  return (
    <div className="p-4 sm:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {zh ? 'IR8A 年度報稅表' : 'IR8A Annual Tax Returns'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh
              ? `須於 ${ya} 年 3 月 1 日前交給員工`
              : `Must be given to employees by 1 Mar ${ya}`}
          </p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">{zh ? '收入年度：' : 'Income Year:'}</span>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y} (YA {y+1})</option>)}
          </select>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <span className="text-base mt-0.5">ℹ️</span>
        <div>
          <span className="font-semibold">{zh ? '重要：' : 'Important: '}</span>
          {zh
            ? `IR8A 數字來自已鎖定薪資的 YTD 數據。目前 ${year} 年有 ${withDataCount} 人有已鎖定數據。`
            : `IR8A figures come from locked payroll YTD data. ${withDataCount} employee(s) have locked data for ${year}.`}
          {ir21Count > 0 && (
            <span className="ml-1 text-amber-700">
              {zh ? `${ir21Count} 名外籍員工已呈報 IR21，將從 IRAS CSV 中排除。` : `${ir21Count} employee(s) filed IR21 and excluded from IRAS CSV.`}
            </span>
          )}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: zh ? '在職員工' : 'Active',          value: activeCount,   color: 'green'  },
          { label: zh ? '已離職'   : 'Resigned',        value: resignedCount, color: 'gray'   },
          { label: zh ? '有薪資數據': 'Has Payroll',    value: withDataCount, color: 'blue'   },
          { label: zh ? 'IR21已呈報': 'IR21 Filed',     value: ir21Count,     color: 'amber'  },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl px-3 py-2.5 text-center`}>
            <div className={`text-${color}-700 font-bold text-xl`}>{value}</div>
            <div className={`text-${color}-500 text-xs mt-0.5`}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Export buttons ── */}
      {withDataCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <span className="text-xs font-medium text-gray-500 self-center">
            📤 {zh ? '導出：' : 'Export:'}
          </span>
          <button onClick={handleExcelExport} disabled={exporting}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
            📥 {zh ? 'Excel（完整數據）' : 'Excel (Full Data)'}
          </button>
          <button onClick={handleCSVExport}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
            📋 {zh ? 'IRAS AIS CSV' : 'IRAS AIS CSV'}
          </button>
          <span className="text-xs text-gray-400 self-center">
            {zh
              ? `IRAS CSV 包含 ${withDataCount - excludedCount} 人（排除 IR21）`
              : `IRAS CSV: ${withDataCount - excludedCount} employees (IR21 excluded)`}
          </span>
        </div>
      )}

      {/* ── Search & filter ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={zh ? '搜索員工姓名或職位...' : 'Search name or position...'}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap">
          <input type="checkbox" checked={showResigned} onChange={e => setShowResigned(e.target.checked)} className="rounded" />
          {zh ? '顯示已離職' : 'Show Resigned'}
        </label>
      </div>

      {/* ── Employee list ── */}
      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">{zh ? '載入中...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-16 text-center border-2 border-dashed rounded-xl">
          {zh ? '暫無員工記錄' : 'No employee records'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => {
            const ytd      = emp.ytd
            const calc     = calcIR8A(ytd)
            const isResigned = emp.status === 'resigned'

            return (
              <div key={emp.id}
                className={`border rounded-xl overflow-hidden transition-colors ${isResigned ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: employee info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-medium text-sm ${isResigned ? 'text-gray-400' : 'text-gray-800'}`}>
                          {emp.full_name}
                        </span>
                        {isResigned && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {zh ? '已離職' : 'Resigned'}
                          </span>
                        )}
                        {emp.ir21_filed && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                            IR21 ✓
                          </span>
                        )}
                        {!emp.hasData && (
                          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                            {zh ? '無薪資數據' : 'No payroll data'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {emp.position || '—'} · {emp.nric_fin || '—'}
                        {emp.join_date && ` · ${zh ? '入職：' : 'Joined: '}${emp.join_date}`}
                        {isResigned && emp.resign_date && ` · ${zh ? '離職：' : 'Left: '}${emp.resign_date}`}
                      </div>
                    </div>

                    {/* Right: IR8A button */}
                    <button
                      onClick={() => {
                        if (!emp.hasData) return
                        setShowModal({
                          employee: {
                            snap_name:     ytd.snap_name     || emp.full_name,
                            snap_nric:     ytd.snap_nric     || emp.nric_fin,
                            snap_position: ytd.snap_position || emp.position,
                            snap_dob:      ytd.snap_dob      || emp.date_of_birth,
                            snap_join_date:ytd.snap_join_date|| emp.join_date,
                            resign_date:   emp.resign_date,
                            full_name:     emp.full_name,
                            nric_fin:      emp.nric_fin,
                            position:      emp.position,
                            date_of_birth: emp.date_of_birth,
                            join_date:     emp.join_date,
                          },
                          ytd, year,
                        })
                      }}
                      disabled={!emp.hasData}
                      className={`shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${emp.hasData ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      📄 IR8A
                    </button>
                  </div>

                  {/* YTD summary cards — mobile 2col, desktop 4col */}
                  {emp.hasData && ytd && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: zh ? '總收入'    : 'Total Income',  value: calc.totalIncome    },
                        { label: zh ? '花紅'      : 'Bonus',         value: calc.bonus          },
                        { label: zh ? '員工CPF'   : 'Employee CPF',  value: calc.employeeCPF    },
                        { label: zh ? '淨薪'      : 'Net Pay',       value: ytd.ytd_net_pay || 0},
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-lg px-2.5 py-2">
                          <div className="text-xs text-gray-400">{label}</div>
                          <div className="text-sm font-semibold text-gray-700">S$ {fmtSGD(value)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IR21 notice */}
                  {emp.ir21_filed && (
                    <div className="mt-2 text-xs text-blue-500 bg-blue-50 rounded-lg px-2.5 py-1.5">
                      🌏 {zh ? '已呈報 IR21，此員工將從 IRAS AIS CSV 中排除' : 'IR21 filed — excluded from IRAS AIS CSV export'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <IR8AModal
          data={showModal}
          companyName={companyName || ''}
          companyUen={companyUen}
          language={language}
          onClose={() => setShowModal(null)}
        />
      )}
    </div>
  )
}