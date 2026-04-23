// src/components/PayrollSummaryModal.jsx
// Full company monthly payroll summary — printable
import { useEffect } from 'react'
import { fmtSGD, MONTH_NAMES } from '../utils/payroll'

export default function PayrollSummaryModal({ records, companyName, year, month, language, onClose }) {
  const zh = language === 'zh'
  const monthLabel = `${MONTH_NAMES[month]} ${year}`

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Totals
  const tot = (field) => records.reduce((s, r) => s + Number(r[field] || 0), 0)

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #summary-root, #summary-root * { visibility: visible !important; }
          #summary-root { position: fixed; top: 0; left: 0; width: 100%; font-size: 9px; }
          #summary-no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
        #summary-root { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; }
        .sum-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .sum-table th { background: #1e40af; color: white; padding: 5px 6px; text-align: right; font-size: 10px; white-space: nowrap; }
        .sum-table th:first-child, .sum-table th:nth-child(2), .sum-table th:nth-child(3) { text-align: left; }
        .sum-table td { padding: 4px 6px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap; }
        .sum-table td:first-child, .sum-table td:nth-child(2), .sum-table td:nth-child(3) { text-align: left; }
        .sum-table tr:nth-child(even) td { background: #f9fafb; }
        .sum-total td { background: #dbeafe !important; font-weight: bold; border-top: 2px solid #1e40af; }
        .neg { color: #c00; }
        .blu { color: #1e40af; }
      `}</style>

      {/* Screen overlay */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8"
        id="summary-no-print">
        <div className="bg-white rounded-xl shadow-2xl w-full mx-4" style={{ maxWidth: 1100 }}>
          {/* Toolbar */}
          <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-700 text-sm">
              {zh ? '工資匯總報告' : 'Payroll Summary Report'} — {monthLabel}
            </span>
            <div className="flex gap-2">
              <button onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                🖨️ {zh ? '打印 / 存為 PDF' : 'Print / Save PDF'}
              </button>
              <button onClick={onClose}
                className="px-3 py-1.5 text-gray-500 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                ✕
              </button>
            </div>
          </div>

          {/* Report body */}
          <div className="p-6 overflow-x-auto" id="summary-root">

            {/* Header */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{companyName}</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {zh ? '月度工資匯總' : 'Monthly Payroll Summary'} — {monthLabel}
              </div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                {zh ? `員工數：${records.length} 人` : `Headcount: ${records.length}`} ·
                {zh ? ` 生成日期：${new Date().toLocaleDateString()}` : ` Generated: ${new Date().toLocaleDateString()}`}
              </div>
            </div>

            {/* Quick summary cards (screen only) */}
            <div className="grid grid-cols-4 gap-3 mb-4 print:hidden">
              {[
                { label: zh ? '總 Gross' : 'Total Gross',        value: tot('gross_salary'),             color: 'blue' },
                { label: zh ? '員工淨薪' : 'Total Net Pay',      value: tot('net_pay_after_adjustments'),color: 'green' },
                { label: zh ? 'Total CPF' : 'Total CPF',         value: tot('total_cpf'),                color: 'purple' },
                { label: zh ? '公司總支出' : 'Total Co. Paid',   value: tot('total_company_paid'),       color: 'orange' },
              ].map(c => (
                <div key={c.label} className={`bg-${c.color}-50 border border-${c.color}-200 rounded-lg px-3 py-2`}>
                  <div className={`text-${c.color}-700 font-bold`}>S$ {fmtSGD(c.value)}</div>
                  <div className={`text-${c.color}-500 text-xs`}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Main detail table */}
            <table className="sum-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>S/N</th>
                  <th style={{ minWidth: 140 }}>{zh ? '員工姓名' : 'Employee Name'}</th>
                  <th style={{ minWidth: 90 }}>{zh ? '職位' : 'Position'}</th>
                  <th>Basic</th>
                  <th>Allowance</th>
                  <th>OT/Other</th>
                  <th>Bonus</th>
                  <th>Commission</th>
                  <th>Dir. Fee</th>
                  <th>Unpaid Lv.</th>
                  <th>Gross</th>
                  <th>Ee CPF</th>
                  <th>CDAC/Fund</th>
                  <th>Net Pay</th>
                  <th>Adj.</th>
                  <th>Net After Adj.</th>
                  <th>Er CPF</th>
                  <th>SDL</th>
                  <th>FWL</th>
                  <th className="blu">Co. Total</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id || i}>
                    <td style={{ color: '#888' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500, textAlign: 'left' }}>{r.snap_name}</td>
                    <td style={{ color: '#666', fontSize: 9 }}>{r.snap_position || '—'}</td>
                    <td>{fmtSGD(r.basic_salary)}</td>
                    <td>{fmtSGD(r.fixed_allowance)}</td>
                    <td>{r.overtime > 0 ? fmtSGD(r.overtime) : '—'}</td>
                    <td>{r.bonus > 0 ? fmtSGD(r.bonus) : '—'}</td>
                    <td>{r.commission > 0 ? fmtSGD(r.commission) : '—'}</td>
                    <td>{r.director_fee > 0 ? fmtSGD(r.director_fee) : '—'}</td>
                    <td className="neg">{r.unpaid_leave_amount > 0 ? `(${fmtSGD(r.unpaid_leave_amount)})` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtSGD(r.gross_salary)}</td>
                    <td className="neg">{r.employee_cpf > 0 ? `(${fmtSGD(r.employee_cpf)})` : '—'}</td>
                    <td className="neg">{r.cdac_mbmf_sinda > 0 ? `(${fmtSGD(r.cdac_mbmf_sinda)})` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtSGD(r.net_pay)}</td>
                    <td style={{ color: Number(r.other_adjustments_total) < 0 ? '#c00' : Number(r.other_adjustments_total) > 0 ? '#007700' : '#888' }}>
                      {Number(r.other_adjustments_total) !== 0 ? fmtSGD(r.other_adjustments_total) : '—'}
                    </td>
                    <td style={{ fontWeight: 600, color: '#166534' }}>{fmtSGD(r.net_pay_after_adjustments)}</td>
                    <td>{r.employer_cpf > 0 ? fmtSGD(r.employer_cpf) : '—'}</td>
                    <td>{fmtSGD(r.sdl)}</td>
                    <td>{r.fwl > 0 ? fmtSGD(r.fwl) : '—'}</td>
                    <td className="blu" style={{ fontWeight: 700 }}>{fmtSGD(r.total_company_paid)}</td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="sum-total">
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>
                    {zh ? '合計' : 'TOTAL'} ({records.length} {zh ? '人' : 'employees'})
                  </td>
                  <td>{fmtSGD(tot('basic_salary'))}</td>
                  <td>{fmtSGD(tot('fixed_allowance'))}</td>
                  <td>{fmtSGD(tot('overtime'))}</td>
                  <td>{fmtSGD(tot('bonus'))}</td>
                  <td>{fmtSGD(tot('commission'))}</td>
                  <td>{fmtSGD(tot('director_fee'))}</td>
                  <td className="neg">({fmtSGD(tot('unpaid_leave_amount'))})</td>
                  <td style={{ fontWeight: 700 }}>{fmtSGD(tot('gross_salary'))}</td>
                  <td className="neg">({fmtSGD(tot('employee_cpf'))})</td>
                  <td className="neg">({fmtSGD(tot('cdac_mbmf_sinda'))})</td>
                  <td style={{ fontWeight: 700 }}>{fmtSGD(tot('net_pay'))}</td>
                  <td>{fmtSGD(tot('other_adjustments_total'))}</td>
                  <td style={{ fontWeight: 700, color: '#166534' }}>{fmtSGD(tot('net_pay_after_adjustments'))}</td>
                  <td>{fmtSGD(tot('employer_cpf'))}</td>
                  <td>{fmtSGD(tot('sdl'))}</td>
                  <td>{fmtSGD(tot('fwl'))}</td>
                  <td className="blu" style={{ fontWeight: 700 }}>{fmtSGD(tot('total_company_paid'))}</td>
                </tr>
              </tbody>
            </table>

            {/* Bank payment summary */}
            <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 10 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12 }}>
                {zh ? '銀行轉帳明細' : 'Bank Transfer Details'}
              </div>
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
                    <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>{zh ? '銀行轉帳總額' : 'Total Bank Transfer'}</td>
                    <td style={{ color: '#166534' }}>S$ {fmtSGD(tot('net_pay_after_adjustments'))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 16, fontSize: 10, color: '#999', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 8 }}>
              <span>{companyName} — {zh ? '月度工資匯總' : 'Monthly Payroll Summary'}</span>
              <span>{zh ? `生成日期：${new Date().toLocaleString()}` : `Generated: ${new Date().toLocaleString()}`}</span>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}