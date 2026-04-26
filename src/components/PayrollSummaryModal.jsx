// src/components/PayrollSummaryModal.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { fmtSGD, MONTH_NAMES } from '../utils/payroll'
import { loadXLSX } from '../utils/attachments'

export default function PayrollSummaryModal({ records, companyName, companyId, year, month, language, onClose }) {
  const zh = language === 'zh'
  const monthLabel = `${MONTH_NAMES[month]} ${year}`
  const [ytdRecords, setYtdRecords] = useState([])
  const [ytdLoading, setYtdLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('monthly') // 'monthly' | 'ytd' | 'bank'

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ✅ 載入 YTD 數據（當年所有已鎖定月份的累計）
  useEffect(() => {
    if (companyId) loadYTD()
  }, [companyId, year, month])

  async function loadYTD() {
    setYtdLoading(true)
    // 取得今年所有已鎖定的 payroll_run
    const { data: runs } = await supabase
      .from('payroll_runs')
      .select('id, month')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('status', 'locked')
      .lte('month', month)

    if (!runs || runs.length === 0) { setYtdLoading(false); return }

    const runIds = runs.map(r => r.id)

    // 取每個員工最新鎖定月份的 YTD 快照（calculateYTD 已經在 lock 時寫入）
    const { data: recs } = await supabase
      .from('payroll_records')
      .select('employee_id, snap_name, snap_position, snap_bank_name, snap_bank_account_no, month, ytd_basic, ytd_fixed_allowance, ytd_other_allowance, ytd_overtime, ytd_bonus, ytd_commission, ytd_director_fee, ytd_gross, ytd_employee_cpf, ytd_employer_cpf, ytd_sdl, ytd_fwl, ytd_net_pay, ytd_total_company_paid')
      .in('payroll_run_id', runIds)
      .order('month', { ascending: false })

    // 每個員工取最新月份（YTD 是累積值，最新月份最完整）
    const empMap = {}
    ;(recs || []).forEach(r => {
      if (!empMap[r.employee_id]) empMap[r.employee_id] = r
    })

    setYtdRecords(Object.values(empMap).sort((a, b) => (a.snap_name || '').localeCompare(b.snap_name || '')))
    setYtdLoading(false)
  }

  // ── Totals helpers ──
  const tot = (field) => records.reduce((s, r) => s + Number(r[field] || 0), 0)
  const ytdTot = (field) => ytdRecords.reduce((s, r) => s + Number(r[field] || 0), 0)

  // ── Excel 下載 ──
  async function downloadExcel() {
    const xl = await loadXLSX()
    const wb = xl.utils.book_new()

    // Sheet 1: Monthly
    const monthHeaders = [
      'S/N', zh ? '員工姓名' : 'Employee', zh ? '職位' : 'Position',
      'Basic', 'Allowance', 'OT/Other', 'Bonus', 'Commission', 'Dir.Fee',
      'Unpaid Lv.', 'Gross', 'Ee CPF', 'CDAC/Fund', 'Net Pay', 'Adj.', 'Net After Adj.',
      'Er CPF', 'SDL', 'FWL', 'Co. Total'
    ]
    const monthRows = records.map((r, i) => [
      i + 1, r.snap_name, r.snap_position || '',
      Number(r.basic_salary || 0), Number(r.fixed_allowance || 0),
      Number(r.overtime || 0), Number(r.bonus || 0), Number(r.commission || 0),
      Number(r.director_fee || 0), -Number(r.unpaid_leave_amount || 0),
      Number(r.gross_salary || 0), -Number(r.employee_cpf || 0),
      -Number(r.cdac_mbmf_sinda || 0), Number(r.net_pay || 0),
      Number(r.other_adjustments_total || 0), Number(r.net_pay_after_adjustments || 0),
      Number(r.employer_cpf || 0), Number(r.sdl || 0), Number(r.fwl || 0),
      Number(r.total_company_paid || 0),
    ])
    const totalRow = [
      zh ? '合計' : 'TOTAL', '', '',
      tot('basic_salary'), tot('fixed_allowance'), tot('overtime'),
      tot('bonus'), tot('commission'), tot('director_fee'),
      -tot('unpaid_leave_amount'), tot('gross_salary'),
      -tot('employee_cpf'), -tot('cdac_mbmf_sinda'), tot('net_pay'),
      tot('other_adjustments_total'), tot('net_pay_after_adjustments'),
      tot('employer_cpf'), tot('sdl'), tot('fwl'), tot('total_company_paid'),
    ]
    const ws1 = xl.utils.aoa_to_sheet([monthHeaders, ...monthRows, totalRow])
    ws1['!cols'] = monthHeaders.map((h, i) => ({ wch: i < 3 ? 20 : 12 }))
    xl.utils.book_append_sheet(wb, ws1, zh ? `${monthLabel}月薪` : `${monthLabel} Payroll`)

    // Sheet 2: YTD
    if (ytdRecords.length > 0) {
      const ytdHeaders = [
        'S/N', zh ? '員工姓名' : 'Employee', zh ? '職位' : 'Position',
        'YTD Basic', 'YTD Allowance', 'YTD OT/Other', 'YTD Bonus', 'YTD Commission',
        'YTD Dir.Fee', 'YTD Gross', 'YTD Ee CPF', 'YTD Er CPF',
        'YTD SDL', 'YTD FWL', 'YTD Net Pay', 'YTD Co. Total'
      ]
      const ytdRows = ytdRecords.map((r, i) => [
        i + 1, r.snap_name, r.snap_position || '',
        Number(r.ytd_basic || 0), Number(r.ytd_fixed_allowance || 0),
        Number(r.ytd_overtime || 0), Number(r.ytd_bonus || 0), Number(r.ytd_commission || 0),
        Number(r.ytd_director_fee || 0), Number(r.ytd_gross || 0),
        Number(r.ytd_employee_cpf || 0), Number(r.ytd_employer_cpf || 0),
        Number(r.ytd_sdl || 0), Number(r.ytd_fwl || 0),
        Number(r.ytd_net_pay || 0), Number(r.ytd_total_company_paid || 0),
      ])
      const ytdTotalRow = [
        zh ? '合計' : 'TOTAL', '', '',
        ytdTot('ytd_basic'), ytdTot('ytd_fixed_allowance'), ytdTot('ytd_overtime'),
        ytdTot('ytd_bonus'), ytdTot('ytd_commission'), ytdTot('ytd_director_fee'),
        ytdTot('ytd_gross'), ytdTot('ytd_employee_cpf'), ytdTot('ytd_employer_cpf'),
        ytdTot('ytd_sdl'), ytdTot('ytd_fwl'), ytdTot('ytd_net_pay'), ytdTot('ytd_total_company_paid'),
      ]
      const ws2 = xl.utils.aoa_to_sheet([ytdHeaders, ...ytdRows, ytdTotalRow])
      ws2['!cols'] = ytdHeaders.map(() => ({ wch: 14 }))
      xl.utils.book_append_sheet(wb, ws2, `YTD ${year}`)
    }

    // Sheet 3: Bank Transfer
    const bankHeaders = [
      zh ? '員工' : 'Employee', zh ? '銀行' : 'Bank',
      zh ? '帳號' : 'Account No.', zh ? '轉帳金額' : 'Transfer Amount'
    ]
    const bankRows = records.map(r => [
      r.snap_name, r.snap_bank_name || '', r.snap_bank_account_no || '',
      Number(r.net_pay_after_adjustments || 0),
    ])
    const ws3 = xl.utils.aoa_to_sheet([bankHeaders, ...bankRows])
    ws3['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }]
    xl.utils.book_append_sheet(wb, ws3, zh ? '銀行轉帳' : 'Bank Transfer')

    xl.writeFile(wb, `Payroll_${companyName}_${year}_${String(month).padStart(2,'0')}.xlsx`)
  }

  // ── Print ──
  function handlePrint() {
    window.print()
  }

  // ── Tab content ──
  function MonthlyTable() {
    return (
      <div className="overflow-x-auto">
        <table className="sum-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th style={{ minWidth: 130 }}>{zh ? '姓名' : 'Name'}</th>
              <th className="hidden sm:table-cell" style={{ minWidth: 80 }}>{zh ? '職位' : 'Position'}</th>
              <th>Basic</th>
              <th>Allow.</th>
              <th className="hidden md:table-cell">OT/Other</th>
              <th className="hidden md:table-cell">Bonus</th>
              <th className="hidden md:table-cell">Comm.</th>
              <th className="hidden lg:table-cell">Dir.Fee</th>
              <th className="hidden lg:table-cell">Unpaid</th>
              <th>Gross</th>
              <th>Ee CPF</th>
              <th className="hidden md:table-cell">CDAC</th>
              <th>Net Pay</th>
              <th className="hidden lg:table-cell">Adj.</th>
              <th className="hidden lg:table-cell">Net Adj.</th>
              <th className="hidden md:table-cell">Er CPF</th>
              <th className="hidden md:table-cell">SDL</th>
              <th className="hidden lg:table-cell">FWL</th>
              <th className="blu">Co.Total</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id || i}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{r.snap_name}</td>
                <td className="hidden sm:table-cell" style={{ color: '#666', fontSize: 9 }}>{r.snap_position || '—'}</td>
                <td>{fmtSGD(r.basic_salary)}</td>
                <td>{fmtSGD(r.fixed_allowance)}</td>
                <td className="hidden md:table-cell">{Number(r.overtime) > 0 ? fmtSGD(r.overtime) : '—'}</td>
                <td className="hidden md:table-cell">{Number(r.bonus) > 0 ? fmtSGD(r.bonus) : '—'}</td>
                <td className="hidden md:table-cell">{Number(r.commission) > 0 ? fmtSGD(r.commission) : '—'}</td>
                <td className="hidden lg:table-cell">{Number(r.director_fee) > 0 ? fmtSGD(r.director_fee) : '—'}</td>
                <td className="hidden lg:table-cell neg">{Number(r.unpaid_leave_amount) > 0 ? `(${fmtSGD(r.unpaid_leave_amount)})` : '—'}</td>
                <td style={{ fontWeight: 600 }}>{fmtSGD(r.gross_salary)}</td>
                <td className="neg">{Number(r.employee_cpf) > 0 ? `(${fmtSGD(r.employee_cpf)})` : '—'}</td>
                <td className="hidden md:table-cell neg">{Number(r.cdac_mbmf_sinda) > 0 ? `(${fmtSGD(r.cdac_mbmf_sinda)})` : '—'}</td>
                <td style={{ fontWeight: 600 }}>{fmtSGD(r.net_pay)}</td>
                <td className="hidden lg:table-cell">{Number(r.other_adjustments_total) !== 0 ? fmtSGD(r.other_adjustments_total) : '—'}</td>
                <td className="hidden lg:table-cell" style={{ fontWeight: 600, color: '#166534' }}>{fmtSGD(r.net_pay_after_adjustments)}</td>
                <td className="hidden md:table-cell">{Number(r.employer_cpf) > 0 ? fmtSGD(r.employer_cpf) : '—'}</td>
                <td className="hidden md:table-cell">{fmtSGD(r.sdl)}</td>
                <td className="hidden lg:table-cell">{Number(r.fwl) > 0 ? fmtSGD(r.fwl) : '—'}</td>
                <td className="blu" style={{ fontWeight: 700 }}>{fmtSGD(r.total_company_paid)}</td>
              </tr>
            ))}
            <tr className="sum-total">
              <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>
                {zh ? '合計' : 'TOTAL'} ({records.length})
              </td>
              <td>{fmtSGD(tot('basic_salary'))}</td>
              <td>{fmtSGD(tot('fixed_allowance'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(tot('overtime'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(tot('bonus'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(tot('commission'))}</td>
              <td className="hidden lg:table-cell">{fmtSGD(tot('director_fee'))}</td>
              <td className="hidden lg:table-cell neg">({fmtSGD(tot('unpaid_leave_amount'))})</td>
              <td style={{ fontWeight: 700 }}>{fmtSGD(tot('gross_salary'))}</td>
              <td className="neg">({fmtSGD(tot('employee_cpf'))})</td>
              <td className="hidden md:table-cell neg">({fmtSGD(tot('cdac_mbmf_sinda'))})</td>
              <td style={{ fontWeight: 700 }}>{fmtSGD(tot('net_pay'))}</td>
              <td className="hidden lg:table-cell">{fmtSGD(tot('other_adjustments_total'))}</td>
              <td className="hidden lg:table-cell" style={{ fontWeight: 700, color: '#166534' }}>{fmtSGD(tot('net_pay_after_adjustments'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(tot('employer_cpf'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(tot('sdl'))}</td>
              <td className="hidden lg:table-cell">{fmtSGD(tot('fwl'))}</td>
              <td className="blu" style={{ fontWeight: 700 }}>{fmtSGD(tot('total_company_paid'))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  function YTDTable() {
    if (ytdLoading) return <div className="py-12 text-center text-gray-400 text-sm">{zh ? '載入中...' : 'Loading...'}</div>
    if (ytdRecords.length === 0) return (
      <div className="py-12 text-center text-gray-400 text-sm border-2 border-dashed rounded-xl">
        {zh ? '暫無已鎖定的薪資數據' : 'No locked payroll data for YTD'}
      </div>
    )
    return (
      <div className="overflow-x-auto">
        <p className="text-xs text-blue-600 mb-3">
          📊 {zh ? `${year} 年截至 ${MONTH_NAMES[month]} 的累計數據（已鎖定月份）` : `YTD figures up to ${MONTH_NAMES[month]} ${year} (locked months only)`}
        </p>
        <table className="sum-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th style={{ minWidth: 130 }}>{zh ? '姓名' : 'Name'}</th>
              <th className="hidden sm:table-cell">YTD Basic</th>
              <th className="hidden sm:table-cell">YTD Allow.</th>
              <th className="hidden md:table-cell">YTD OT</th>
              <th className="hidden md:table-cell">YTD Bonus</th>
              <th className="hidden md:table-cell">YTD Comm.</th>
              <th>YTD Gross</th>
              <th>YTD Ee CPF</th>
              <th className="hidden md:table-cell">YTD Er CPF</th>
              <th className="hidden lg:table-cell">YTD SDL</th>
              <th className="hidden lg:table-cell">YTD FWL</th>
              <th>YTD Net</th>
              <th className="blu">YTD Co.Total</th>
            </tr>
          </thead>
          <tbody>
            {ytdRecords.map((r, i) => (
              <tr key={r.employee_id || i}>
                <td style={{ color: '#888' }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{r.snap_name}</td>
                <td className="hidden sm:table-cell">{fmtSGD(r.ytd_basic)}</td>
                <td className="hidden sm:table-cell">{fmtSGD(Number(r.ytd_fixed_allowance || 0) + Number(r.ytd_other_allowance || 0))}</td>
                <td className="hidden md:table-cell">{Number(r.ytd_overtime) > 0 ? fmtSGD(r.ytd_overtime) : '—'}</td>
                <td className="hidden md:table-cell">{Number(r.ytd_bonus) > 0 ? fmtSGD(r.ytd_bonus) : '—'}</td>
                <td className="hidden md:table-cell">{Number(r.ytd_commission) > 0 ? fmtSGD(r.ytd_commission) : '—'}</td>
                <td style={{ fontWeight: 600 }}>{fmtSGD(r.ytd_gross)}</td>
                <td className="neg">{Number(r.ytd_employee_cpf) > 0 ? `(${fmtSGD(r.ytd_employee_cpf)})` : '—'}</td>
                <td className="hidden md:table-cell">{Number(r.ytd_employer_cpf) > 0 ? fmtSGD(r.ytd_employer_cpf) : '—'}</td>
                <td className="hidden lg:table-cell">{Number(r.ytd_sdl) > 0 ? fmtSGD(r.ytd_sdl) : '—'}</td>
                <td className="hidden lg:table-cell">{Number(r.ytd_fwl) > 0 ? fmtSGD(r.ytd_fwl) : '—'}</td>
                <td style={{ fontWeight: 600, color: '#166534' }}>{fmtSGD(r.ytd_net_pay)}</td>
                <td className="blu" style={{ fontWeight: 700 }}>{fmtSGD(r.ytd_total_company_paid)}</td>
              </tr>
            ))}
            <tr className="sum-total">
              <td colSpan={2} style={{ textAlign: 'right', paddingRight: 12 }}>{zh ? '合計' : 'TOTAL'}</td>
              <td className="hidden sm:table-cell">{fmtSGD(ytdTot('ytd_basic'))}</td>
              <td className="hidden sm:table-cell">{fmtSGD(ytdTot('ytd_fixed_allowance') + ytdTot('ytd_other_allowance'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(ytdTot('ytd_overtime'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(ytdTot('ytd_bonus'))}</td>
              <td className="hidden md:table-cell">{fmtSGD(ytdTot('ytd_commission'))}</td>
              <td style={{ fontWeight: 700 }}>{fmtSGD(ytdTot('ytd_gross'))}</td>
              <td className="neg">({fmtSGD(ytdTot('ytd_employee_cpf'))})</td>
              <td className="hidden md:table-cell">{fmtSGD(ytdTot('ytd_employer_cpf'))}</td>
              <td className="hidden lg:table-cell">{fmtSGD(ytdTot('ytd_sdl'))}</td>
              <td className="hidden lg:table-cell">{fmtSGD(ytdTot('ytd_fwl'))}</td>
              <td style={{ fontWeight: 700, color: '#166534' }}>{fmtSGD(ytdTot('ytd_net_pay'))}</td>
              <td className="blu" style={{ fontWeight: 700 }}>{fmtSGD(ytdTot('ytd_total_company_paid'))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  function BankTable() {
    return (
      <div className="overflow-x-auto">
        <table className="sum-table" style={{ maxWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{zh ? '員工' : 'Employee'}</th>
              <th style={{ textAlign: 'left' }}>{zh ? '銀行' : 'Bank'}</th>
              <th style={{ textAlign: 'left' }}>{zh ? '帳號' : 'Account No.'}</th>
              <th>{zh ? '轉帳金額' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'left' }}>{r.snap_name}</td>
                <td style={{ textAlign: 'left', fontSize: 9, color: '#666' }}>{r.snap_bank_name || '—'}</td>
                <td style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: 10 }}>{r.snap_bank_account_no || '—'}</td>
                <td style={{ fontWeight: 600, color: '#166534' }}>S$ {fmtSGD(r.net_pay_after_adjustments)}</td>
              </tr>
            ))}
            <tr className="sum-total">
              <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>{zh ? '銀行轉帳總額' : 'Total'}</td>
              <td style={{ color: '#166534' }}>S$ {fmtSGD(tot('net_pay_after_adjustments'))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  const tabs = [
    { key: 'monthly', label: zh ? '月薪明細' : 'Monthly' },
    { key: 'ytd',     label: `YTD ${year}` },
    { key: 'bank',    label: zh ? '銀行轉帳' : 'Bank Transfer' },
  ]

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #summary-root, #summary-root * { visibility: visible !important; }
          #summary-root { position: fixed; top: 0; left: 0; width: 100%; font-size: 9px; padding: 10mm; }
          .hidden { display: table-cell !important; }
          @page { size: A4 landscape; margin: 8mm; }
        }
        #summary-root { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; }
        .sum-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .sum-table th { background: #1e40af; color: white; padding: 5px 6px; text-align: right; font-size: 9px; white-space: nowrap; }
        .sum-table th:first-child, .sum-table th:nth-child(2) { text-align: left; }
        .sum-table td { padding: 4px 6px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap; font-size: 10px; }
        .sum-table td:first-child, .sum-table td:nth-child(2) { text-align: left; }
        .sum-table tr:nth-child(even) td { background: #f9fafb; }
        .sum-total td { background: #dbeafe !important; font-weight: bold; border-top: 2px solid #1e40af; }
        .neg { color: #c00; }
        .blu { color: #1e40af; }
      `}</style>

      <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-2 sm:py-8 px-2">
        <div className="bg-white rounded-xl shadow-2xl w-full" style={{ maxWidth: 1100 }}>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 border-b border-gray-100">
            <div>
              <span className="font-semibold text-gray-700 text-sm">
                {zh ? '工資匯總報告' : 'Payroll Summary'} — {monthLabel}
              </span>
              <span className="text-xs text-gray-400 ml-2">{companyName}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={downloadExcel}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex items-center gap-1.5">
                📥 {zh ? '下載 Excel' : 'Download Excel'}
              </button>
              <button onClick={handlePrint}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                🖨️ {zh ? '打印 / PDF' : 'Print / PDF'}
              </button>
              <button onClick={onClose}
                className="px-3 py-1.5 text-gray-500 border border-gray-200 text-xs rounded-lg hover:bg-gray-50">
                ✕
              </button>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pt-3 pb-2">
            {[
              { label: zh ? '總 Gross' : 'Total Gross',      value: tot('gross_salary'),              color: 'blue' },
              { label: zh ? '員工淨薪' : 'Total Net Pay',    value: tot('net_pay_after_adjustments'), color: 'green' },
              { label: 'Total CPF',                           value: tot('total_cpf'),                 color: 'purple' },
              { label: zh ? '公司總支出' : 'Total Co. Paid', value: tot('total_company_paid'),        color: 'orange' },
            ].map(c => (
              <div key={c.label} className={`bg-${c.color}-50 border border-${c.color}-200 rounded-lg px-3 py-2`}>
                <div className={`text-${c.color}-700 font-bold text-sm`}>S$ {fmtSGD(c.value)}</div>
                <div className={`text-${c.color}-500 text-xs mt-0.5`}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-100 px-4">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className="p-4" id="summary-root">
            {/* Print header */}
            <div className="hidden print:block mb-4">
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{companyName}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{zh ? '月度工資匯總' : 'Monthly Payroll Summary'} — {monthLabel}</div>
              <div style={{ fontSize: 10, color: '#999' }}>{zh ? `員工數：${records.length} 人` : `Headcount: ${records.length}`} · {new Date().toLocaleDateString()}</div>
            </div>

            {activeTab === 'monthly' && <MonthlyTable />}
            {activeTab === 'ytd'     && <YTDTable />}
            {activeTab === 'bank'    && <BankTable />}
          </div>
        </div>
      </div>
    </>
  )
}