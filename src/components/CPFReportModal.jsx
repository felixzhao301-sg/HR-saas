// src/components/CPFReportModal.jsx
// CPF EZPay format report — printable
import { useEffect } from 'react'
import { fmtSGD, MONTH_NAMES } from '../utils/payroll'

export default function CPFReportModal({ records, companyName, cpfSubmissionNo, year, month, language, onClose }) {
  const zh = language === 'zh'
  const monthLabel = `${MONTH_NAMES[month]?.toUpperCase()} ${year}`

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Only CPF-applicable employees (SC / PR)
  const cpfRecords = records.filter(r => Number(r.employer_cpf) > 0 || Number(r.employee_cpf) > 0)

  // Summary totals
  const totalCPF   = cpfRecords.reduce((s, r) => s + Number(r.total_cpf   || 0), 0)
  const totalSDL   = records.reduce((s, r)    => s + Number(r.sdl         || 0), 0)
  const totalCDAC  = records.filter(r => r.cdac_mbmf_sinda_type === 'CDAC').reduce((s, r) => s + Number(r.cdac_mbmf_sinda || 0), 0)
  const totalMBMF  = records.filter(r => r.cdac_mbmf_sinda_type === 'MBMF').reduce((s, r) => s + Number(r.cdac_mbmf_sinda || 0), 0)
  const totalSINDA = records.filter(r => r.cdac_mbmf_sinda_type === 'SINDA').reduce((s, r) => s + Number(r.cdac_mbmf_sinda || 0), 0)
  const cdacCount  = records.filter(r => r.cdac_mbmf_sinda_type === 'CDAC' && r.cdac_mbmf_sinda > 0).length
  const mbmfCount  = records.filter(r => r.cdac_mbmf_sinda_type === 'MBMF' && r.cdac_mbmf_sinda > 0).length
  const sindaCount = records.filter(r => r.cdac_mbmf_sinda_type === 'SINDA' && r.cdac_mbmf_sinda > 0).length
  const grandTotal = totalCPF + totalSDL + totalCDAC + totalMBMF + totalSINDA

  // Detail table totals
  const detailTotalCPF      = cpfRecords.reduce((s, r) => s + Number(r.total_cpf   || 0), 0)
  const detailTotalSDL      = cpfRecords.reduce((s, r) => s + Number(r.sdl         || 0), 0)
  const detailTotalEmpCPF   = cpfRecords.reduce((s, r) => s + Number(r.employer_cpf|| 0), 0)
  const detailTotalEeeCPF   = cpfRecords.reduce((s, r) => s + Number(r.employee_cpf|| 0), 0)
  const detailTotalOW       = cpfRecords.reduce((s, r) => s + Number(r.ow_subject_to_cpf || 0), 0)
  const detailTotalAW       = cpfRecords.reduce((s, r) => s + Number(r.aw_subject_to_cpf || 0), 0)
  const detailTotalAgency   = cpfRecords.reduce((s, r) => s + Number(r.cdac_mbmf_sinda   || 0), 0)

  const summaryRows = [
    { no: 1, label: 'Total CPF Contributions',         amount: totalCPF,   donorCount: null },
    { no: 2, label: 'CPF Late Payment Interest',       amount: 0,          donorCount: null },
    { no: 3, label: 'Skills Development Levy (SDL)',   amount: totalSDL,   donorCount: null },
    { no: 4, label: 'Donation to Community Chest',     amount: 0,          donorCount: 0 },
    { no: 5, label: 'Total MBMF Contributions',        amount: totalMBMF,  donorCount: mbmfCount },
    { no: 6, label: 'Total SINDA Contributions',       amount: totalSINDA, donorCount: sindaCount },
    { no: 7, label: 'Total CDAC Contributions',        amount: totalCDAC,  donorCount: cdacCount },
    { no: 8, label: 'Total ECF Contributions',         amount: 0,          donorCount: 0 },
  ]

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cpf-report-root, #cpf-report-root * { visibility: visible !important; }
          #cpf-report-root { position: fixed; top: 0; left: 0; width: 100%; font-size: 10px; }
          #cpf-no-print { display: none !important; }
        }
        #cpf-report-root { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; }
        .cpf-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .cpf-table th { background: #2d6a4f; color: white; padding: 5px 8px; text-align: left; font-size: 11px; }
        .cpf-table td { padding: 4px 8px; border-bottom: 1px solid #eee; }
        .cpf-table tr:nth-child(even) td { background: #f9f9f9; }
        .cpf-total td { background: #e8f4f0 !important; font-weight: bold; border-top: 2px solid #2d6a4f; }
        .text-right { text-align: right; }
      `}</style>

      {/* Screen overlay */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8"
        id="cpf-no-print">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4">
          {/* Toolbar */}
          <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-700 text-sm">
              {zh ? 'CPF 匯總報告' : 'CPF Submission Report'} — {monthLabel}
            </span>
            <div className="flex gap-2">
              <button onClick={() => window.print()}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1.5">
                🖨️ {zh ? '打印 / 存為 PDF' : 'Print / Save PDF'}
              </button>
              <button onClick={onClose}
                className="px-3 py-1.5 text-gray-500 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                ✕
              </button>
            </div>
          </div>

          {/* Report body */}
          <div className="p-6" id="cpf-report-root">

            {/* CPF Board header branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, background: '#2d6a4f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                CPF
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16, color: '#2d6a4f' }}>Central Provident Fund Board</div>
                <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>Saving For Retirement</div>
              </div>
            </div>

            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 12, color: '#2d6a4f' }}>CPF EZPay</div>

            {/* Company info */}
            <table style={{ marginBottom: 16, fontSize: 12 }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: 24, paddingBottom: 4, fontWeight: 'bold', color: '#555' }}>CPF Submission No.</td>
                  <td style={{ paddingRight: 8, color: '#555' }}>:</td>
                  <td>{cpfSubmissionNo || `${companyName?.replace(/\s/g,'-').toUpperCase()}-01`}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: 24, paddingBottom: 4, fontWeight: 'bold', color: '#555' }}>Company Name</td>
                  <td style={{ paddingRight: 8, color: '#555' }}>:</td>
                  <td>{companyName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#555' }}>Contribution Details For</td>
                  <td style={{ paddingRight: 8, color: '#555' }}>:</td>
                  <td>{monthLabel}</td>
                </tr>
              </tbody>
            </table>

            {/* Summary table */}
            <table className="cpf-table" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>S/N</th>
                  <th>Description</th>
                  <th className="text-right" style={{ width: 140 }}>Amount ($)</th>
                  <th style={{ width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(r => (
                  <tr key={r.no}>
                    <td style={{ color: '#888' }}>{r.no}.</td>
                    <td>{r.label}</td>
                    <td className="text-right">{fmtSGD(r.amount)}</td>
                    <td style={{ color: '#888', fontSize: 10 }}>
                      {r.donorCount !== null ? `Donor Count: ${r.donorCount}` : ''}
                    </td>
                  </tr>
                ))}
                <tr className="cpf-total">
                  <td colSpan={2} style={{ textAlign: 'right', paddingRight: 16 }}>Grand Total</td>
                  <td className="text-right">{fmtSGD(grandTotal)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {/* Detail table */}
            <table className="cpf-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>S/N</th>
                  <th style={{ width: 110 }}>CPF Account No.</th>
                  <th>Name of Employee (as per NRIC)</th>
                  <th className="text-right" style={{ width: 90 }}>CPF To Be Paid ($)</th>
                  <th className="text-right" style={{ width: 80 }}>SDL To Be Paid ($)</th>
                  <th className="text-right" style={{ width: 90 }}>Employer CPF ($)</th>
                  <th className="text-right" style={{ width: 90 }}>Employee CPF ($)</th>
                  <th className="text-right" style={{ width: 100 }}>Ordinary Wages ($)</th>
                  <th className="text-right" style={{ width: 100 }}>Additional Wages ($)</th>
                  <th style={{ width: 60 }}>Agency</th>
                  <th className="text-right" style={{ width: 80 }}>Agency Fund ($)</th>
                </tr>
              </thead>
              <tbody>
                {cpfRecords.map((r, i) => (
                  <tr key={r.id || i}>
                    <td style={{ color: '#888' }}>{i + 1}.</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.snap_nric || '—'}</td>
                    <td style={{ textTransform: 'uppercase', fontWeight: 500 }}>{r.snap_name}</td>
                    <td className="text-right">{fmtSGD(r.total_cpf)}</td>
                    <td className="text-right">{fmtSGD(r.sdl)}</td>
                    <td className="text-right">{fmtSGD(r.employer_cpf)}</td>
                    <td className="text-right">{fmtSGD(r.employee_cpf)}</td>
                    <td className="text-right">{fmtSGD(r.ow_subject_to_cpf)}</td>
                    <td className="text-right">{fmtSGD(r.aw_subject_to_cpf)}</td>
                    <td style={{ fontSize: 10 }}>{r.cdac_mbmf_sinda_type !== 'none' ? r.cdac_mbmf_sinda_type : '—'}</td>
                    <td className="text-right">{fmtSGD(r.cdac_mbmf_sinda)}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="cpf-total">
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>Total Amount</td>
                  <td className="text-right">{fmtSGD(detailTotalCPF)}</td>
                  <td className="text-right">{fmtSGD(detailTotalSDL)}</td>
                  <td className="text-right">{fmtSGD(detailTotalEmpCPF)}</td>
                  <td className="text-right">{fmtSGD(detailTotalEeeCPF)}</td>
                  <td className="text-right">{fmtSGD(detailTotalOW)}</td>
                  <td className="text-right">{fmtSGD(detailTotalAW)}</td>
                  <td>—</td>
                  <td className="text-right">{fmtSGD(detailTotalAgency)}</td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ marginTop: 16, fontSize: 10, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
              <span>Copyright © {year} Central Provident Fund Board</span>
              <span>Last Printed {new Date().toLocaleString()}</span>
              <span>Page 1 of 1</span>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}