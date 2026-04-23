// src/tabs/IR8ATab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtSGD } from '../utils/payroll'
import IR8AModal from '../components/IR8AModal'

export default function IR8ATab({ text, language, companyId, companyName, userRole }) {
  const zh = language === 'zh'
  const CURRENT_YEAR = new Date().getFullYear()

  // IR8A covers income year (e.g. 2025), YA = year + 1
  const [year, setYear] = useState(CURRENT_YEAR - 1)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [companyUen, setCompanyUen] = useState('')
  const [showModal, setShowModal] = useState(null) // { employee, ytd, year }
  const [search, setSearch] = useState('')
  const [showResigned, setShowResigned] = useState(true)

  const canView = ['super_admin', 'hr_admin', 'hr_staff', 'finance'].includes(userRole)

  useEffect(() => {
    if (companyId) {
      fetchCompany()
    }
  }, [companyId])

  useEffect(() => {
    if (companyId) loadData()
  }, [companyId, year])

  async function fetchCompany() {
    const { data } = await supabase.from('companies').select('uen').eq('id', companyId).single()
    if (data) setCompanyUen(data.uen || '')
  }

  async function loadData() {
    setLoading(true)

    // Get all employees (including resigned ones for historical IR8A)
    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name, position, nric_fin, date_of_birth, nationality, is_pr, pr_year, join_date, resign_date, status, snap_name, snap_nric')
      .eq('company_id', companyId)
      .order('full_name')

    if (!emps || emps.length === 0) { setEmployees([]); setLoading(false); return }

    // Get all locked payroll records for this year
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

      // For each employee, use the record from the latest locked month (has cumulative YTD)
      ;(recs || []).forEach(r => {
        if (!ytdMap[r.employee_id]) {
          ytdMap[r.employee_id] = r
        }
      })
    }

    const result = emps.map(emp => ({
      ...emp,
      ytd: ytdMap[emp.id] || null,
      hasData: !!ytdMap[emp.id],
    }))

    setEmployees(result)
    setLoading(false)
  }

  const filtered = employees.filter(emp => {
    const matchSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.position?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = showResigned ? true : emp.status !== 'resigned'
    return matchSearch && matchStatus
  })

  const activeCount = employees.filter(e => e.status !== 'resigned').length
  const resignedCount = employees.filter(e => e.status === 'resigned').length
  const withDataCount = employees.filter(e => e.hasData).length

  if (!canView) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm py-20">
        {zh ? '您沒有權限查看此頁面' : 'You do not have permission to view this page'}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {zh ? 'IR8A 年度報稅表' : 'IR8A Annual Tax Returns'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh
              ? `為每位員工生成 IR8A，須於 ${year + 1} 年 3 月 1 日前交給員工`
              : `Generate IR8A for each employee — must be given by 1 Mar ${year + 1}`}
          </p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{zh ? '收入年度：' : 'Income Year:'}</span>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y} (YA {y + 1})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <span className="text-base mt-0.5">ℹ️</span>
        <div>
          <span className="font-semibold">{zh ? '重要：' : 'Important: '}</span>
          {zh
            ? `IR8A 數字來自已鎖定薪資的 YTD 數據。若某月薪資未鎖定，該月不計入。目前 ${year} 年已鎖定 ${withDataCount} 人數據。`
            : `IR8A figures are from locked payroll YTD data only. Unlocked months are excluded. ${withDataCount} employee(s) have locked data for ${year}.`}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: zh ? '在職員工' : 'Active', value: activeCount, color: 'green' },
          { label: zh ? '已離職' : 'Resigned', value: resignedCount, color: 'gray' },
          { label: zh ? '有薪資數據' : 'Has Payroll Data', value: withDataCount, color: 'blue' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl px-3 py-2.5 text-center`}>
            <div className={`text-${color}-700 font-bold text-xl`}>{value}</div>
            <div className={`text-${color}-500 text-xs mt-0.5`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={zh ? '搜索員工姓名或職位...' : 'Search name or position...'}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap">
          <input
            type="checkbox"
            checked={showResigned}
            onChange={e => setShowResigned(e.target.checked)}
            className="rounded"
          />
          {zh ? '顯示已離職' : 'Show Resigned'}
        </label>
      </div>

      {/* Employee list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">
          {zh ? '載入中...' : 'Loading...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-16 text-center border-2 border-dashed rounded-xl">
          {zh ? '暫無員工記錄' : 'No employee records'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => {
            const ytd = emp.ytd
            const isResigned = emp.status === 'resigned'

            return (
              <div key={emp.id}
                className={`border rounded-xl overflow-hidden transition-colors ${isResigned ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                {/* Mobile-first: stacked layout */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${isResigned ? 'text-gray-400' : 'text-gray-800'}`}>
                          {emp.full_name}
                        </span>
                        {isResigned && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {zh ? '已離職' : 'Resigned'}
                          </span>
                        )}
                        {!emp.hasData && (
                          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                            {zh ? '無薪資數據' : 'No payroll data'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {emp.position || '—'} · {emp.nric_fin || '—'}
                        {emp.join_date && ` · ${zh ? '入職：' : 'Joined: '}${emp.join_date}`}
                        {isResigned && emp.resign_date && ` · ${zh ? '離職：' : 'Resigned: '}${emp.resign_date}`}
                      </div>
                    </div>

                    {/* Generate button */}
                    <button
                      onClick={() => {
                        if (!emp.hasData) return
                        setShowModal({
                          employee: {
                            snap_name: ytd.snap_name || emp.full_name,
                            snap_nric: ytd.snap_nric || emp.nric_fin,
                            snap_position: ytd.snap_position || emp.position,
                            snap_dob: ytd.snap_dob || emp.date_of_birth,
                            snap_join_date: ytd.snap_join_date || emp.join_date,
                            resign_date: emp.resign_date,
                            full_name: emp.full_name,
                            nric_fin: emp.nric_fin,
                            position: emp.position,
                            date_of_birth: emp.date_of_birth,
                            join_date: emp.join_date,
                          },
                          ytd,
                          year,
                        })
                      }}
                      disabled={!emp.hasData}
                      className={`shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors
                        ${emp.hasData
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      📄 IR8A
                    </button>
                  </div>

                  {/* YTD summary — shown if data exists */}
                  {emp.hasData && ytd && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: zh ? '總收入' : 'Total Income', value: (ytd.ytd_gross || 0) },
                        { label: zh ? '花紅' : 'Bonus', value: (ytd.ytd_bonus || 0) },
                        { label: zh ? '員工CPF' : 'Employee CPF', value: (ytd.ytd_employee_cpf || 0) },
                        { label: zh ? '淨薪' : 'Net Pay', value: (ytd.ytd_net_pay || 0) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-lg px-2.5 py-2">
                          <div className="text-xs text-gray-400">{label}</div>
                          <div className="text-sm font-semibold text-gray-700">S$ {fmtSGD(value)}</div>
                        </div>
                      ))}
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