// src/components/IR8AModal.jsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fmtSGD } from '../utils/payroll'

export default function IR8AModal({ data, companyName, companyUen, language, onClose }) {
  const zh = language === 'zh'
  const { employee, ytd } = data
  const year = data.year // e.g. 2025 (Year of Assessment 2026)
  const ya = year + 1    // Year of Assessment

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handlePrint() {
    const safeName = (employee.snap_name || employee.full_name || 'Employee')
      .replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')
    const orig = document.title
    document.title = `${safeName}_IR8A_YA${ya}`
    window.print()
    setTimeout(() => { document.title = orig }, 1000)
  }

  // ── Income calculations matching IR8A fields ──
  // a) Gross Salary = OW items (basic + fixed allowance + other allowance + overtime + unutilised - unpaid)
  const grossSalaryFees = (ytd.ytd_basic || 0) + (ytd.ytd_fixed_allowance || 0) +
    (ytd.ytd_other_allowance || 0) + (ytd.ytd_overtime || 0) +
    (ytd.ytd_unutilised_leave || 0) - (ytd.ytd_unpaid_leave || 0)

  // b) Bonus
  const bonus = ytd.ytd_bonus || 0

  // c) Director's Fees
  const directorFees = ytd.ytd_director_fee || 0

  // d1) Allowances (already in gross salary above, but IR8A wants it separately)
  const allowances = (ytd.ytd_fixed_allowance || 0) + (ytd.ytd_other_allowance || 0)

  // d2) Commission
  const commission = ytd.ytd_commission || 0

  // Total income
  const totalIncome = grossSalaryFees + bonus + directorFees + commission

  // Deductions
  const employeeCPF = ytd.ytd_employee_cpf || 0
  const donations = ytd.ytd_cdac || 0  // CDAC/MBMF/SINDA

  const today = new Date().toLocaleDateString('en-SG', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const content = (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10px', color: '#111', background: 'white', maxWidth: '700px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, borderBottom: '2px solid #111', paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>FORM IR8A</div>
          <div style={{ fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>YA {ya}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9, color: '#555' }}>
          <div style={{ fontWeight: 'bold', fontSize: 10 }}>Return of Employee's Remuneration</div>
          <div>for the Year Ended 31 Dec {year}</div>
          <div style={{ marginTop: 4, color: '#cc0000', fontStyle: 'italic' }}>
            Fill in this form and give it to your employee by 1 Mar {ya}
          </div>
          <div style={{ color: '#666', marginTop: 2 }}>(DO NOT SUBMIT TO IRAS UNLESS REQUESTED)</div>
        </div>
      </div>

      {/* Employer / Employee Info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px', width: '50%' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Employer's Tax Ref. No. / UEN</div>
              <div style={{ fontWeight: 'bold' }}>{companyUen || '—'}</div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px', width: '50%' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Employee's Tax Reference No. (NRIC / FIN / Passport)</div>
              <div style={{ fontWeight: 'bold' }}>{employee.snap_nric || employee.nric_fin || '—'}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Full Name of Employee as per NRIC / FIN / Passport</div>
              <div style={{ fontWeight: 'bold', fontSize: 12 }}>{employee.snap_name || employee.full_name}</div>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Date of Birth</div>
              <div>{employee.snap_dob || employee.date_of_birth || '—'}</div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Designation</div>
              <div>{employee.snap_position || employee.position || '—'}</div>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Date of Commencement</div>
              <div>{employee.snap_join_date || employee.join_date || '—'}</div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Date of Cessation</div>
              <div>{employee.resign_date || '—'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* INCOME Section */}
      <div style={{ fontWeight: 'bold', fontSize: 11, background: '#f0f0f0', padding: '4px 8px', border: '1px solid #999', borderBottom: 'none' }}>
        INCOME
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <thead>
          <tr style={{ background: '#f7f7f7' }}>
            <td style={{ border: '1px solid #999', padding: '4px 8px', width: '8%', fontWeight: 'bold' }}></td>
            <td style={{ border: '1px solid #999', padding: '4px 8px', fontWeight: 'bold' }}>Description</td>
            <td style={{ border: '1px solid #999', padding: '4px 8px', width: '18%', textAlign: 'right', fontWeight: 'bold' }}>$ (SGD)</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>a)</td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontWeight: 'bold' }}>Gross Salary, Fees, Leave Pay, Wages and Overtime Pay</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                Basic: {fmtSGD(ytd.ytd_basic || 0)} · Allowances: {fmtSGD(allowances)} · OT/Other: {fmtSGD(ytd.ytd_overtime || 0)}
                {(ytd.ytd_unutilised_leave || 0) > 0 && ` · Unutilised Leave: ${fmtSGD(ytd.ytd_unutilised_leave)}`}
                {(ytd.ytd_unpaid_leave || 0) > 0 && ` · Unpaid Leave: (${fmtSGD(ytd.ytd_unpaid_leave)})`}
              </div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{fmtSGD(grossSalaryFees)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px', fontWeight: 'bold' }}>b)</td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <span style={{ fontWeight: 'bold' }}>Bonus</span>
              <span style={{ color: '#666', fontSize: 9, marginLeft: 6 }}>(non-contractual and contractual bonus)</span>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right' }}>{bonus > 0 ? fmtSGD(bonus) : '—'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px', fontWeight: 'bold' }}>c)</td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <span style={{ fontWeight: 'bold' }}>Director's Fees</span>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right' }}>{directorFees > 0 ? fmtSGD(directorFees) : '—'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>d)</td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontWeight: 'bold' }}>Others:</div>
              <table style={{ width: '100%', marginTop: 4 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', fontSize: 9, width: 20 }}>1.</td>
                    <td style={{ fontSize: 9, color: '#555' }}>Allowances (included in item a above)</td>
                    <td style={{ textAlign: 'right', fontSize: 9 }}>{fmtSGD(allowances)}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', fontSize: 9 }}>2.</td>
                    <td style={{ fontSize: 9, color: '#555' }}>Gross Commission</td>
                    <td style={{ textAlign: 'right', fontSize: 9 }}>{commission > 0 ? fmtSGD(commission) : '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', fontSize: 9 }}>3–8.</td>
                    <td style={{ fontSize: 9, color: '#999', fontStyle: 'italic' }}>Lump sum / Pension / CPF contributions / Benefits-in-kind</td>
                    <td style={{ textAlign: 'right', fontSize: 9, color: '#bbb' }}>N/A</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right', verticalAlign: 'top' }}>{commission > 0 ? fmtSGD(commission) : '—'}</td>
          </tr>
          <tr style={{ background: '#f0f4ff' }}>
            <td colSpan={2} style={{ border: '1px solid #999', padding: '6px 8px', fontWeight: 'bold', fontSize: 11 }}>
              TOTAL INCOME (a + b + c + d)
            </td>
            <td style={{ border: '1px solid #999', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: 12 }}>
              {fmtSGD(totalIncome)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* DEDUCTIONS Section */}
      <div style={{ fontWeight: 'bold', fontSize: 11, background: '#f0f0f0', padding: '4px 8px', border: '1px solid #999', borderBottom: 'none' }}>
        DEDUCTIONS
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px', width: '8%', verticalAlign: 'top' }}></td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontWeight: 'bold' }}>Employee's Compulsory Contribution to CPF</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                (Apply the appropriate CPF rates published by CPF Board. Do not include voluntary contributions.)
              </div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px', width: '18%', textAlign: 'right', fontWeight: 'bold' }}>
              {employeeCPF > 0 ? fmtSGD(employeeCPF) : '—'}
            </td>
          </tr>
          {donations > 0 && (
            <tr>
              <td style={{ border: '1px solid #999', padding: '5px 8px' }}></td>
              <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
                <div style={{ fontWeight: 'bold' }}>Donations deducted from salaries</div>
                <div style={{ fontSize: 9, color: '#666' }}>CDAC / MBMF / SINDA / Community Chest</div>
              </td>
              <td style={{ border: '1px solid #999', padding: '5px 8px', textAlign: 'right' }}>{fmtSGD(donations)}</td>
            </tr>
          )}
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}></td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <span style={{ fontWeight: 'bold' }}>Employee's income tax borne by employer?</span>
              <span style={{ marginLeft: 8, fontSize: 9 }}>* YES / <u>NO</u></span>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}></td>
          </tr>
        </tbody>
      </table>

      {/* Employer info / Declaration */}
      <div style={{ fontWeight: 'bold', fontSize: 11, background: '#f0f0f0', padding: '4px 8px', border: '1px solid #999', borderBottom: 'none' }}>
        DECLARATION
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666' }}>Name of Employer</div>
              <div style={{ fontWeight: 'bold' }}>{companyName}</div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666' }}>UEN</div>
              <div>{companyUen || '—'}</div>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666' }}>Name of Authorised Person</div>
              <div style={{ height: 20 }}></div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666' }}>Designation</div>
              <div style={{ height: 20 }}></div>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666' }}>Signature</div>
              <div style={{ height: 30 }}></div>
            </td>
            <td style={{ border: '1px solid #999', padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: '#666' }}>Date</div>
              <div>{today}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ fontSize: 8, color: '#999', borderTop: '1px solid #eee', paddingTop: 5, display: 'flex', justifyContent: 'space-between' }}>
        <span>IR8A (1/2026) · Generated by {companyName} HR System</span>
        <span>System-generated on {today}. No signature required for employee copy.</span>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          html, body { margin: 0; padding: 0; }
          body > * { display: none !important; }
          #ir8a-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 10mm; }
          @page { size: A4 portrait; margin: 0; }
        }
        #ir8a-print-root { display: none; }
      `}</style>
      {createPortal(<div id="ir8a-print-root">{content}</div>, document.body)}

      {/* Screen modal */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-4 px-2">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
          {/* Header bar */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
            <div>
              <span className="font-semibold text-gray-800 text-sm">
                IR8A — {employee.snap_name || employee.full_name}
              </span>
              <span className="ml-2 text-xs text-gray-400">YA {ya} (Year Ended 31 Dec {year})</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrint}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                🖨️ {zh ? '打印 / 存 PDF' : 'Print / Save PDF'}
              </button>
              <button onClick={onClose}
                className="px-3 py-1.5 text-gray-500 border border-gray-200 text-xs rounded-lg hover:bg-gray-50">✕</button>
            </div>
          </div>
          {/* Content */}
          <div className="p-4 sm:p-6 bg-gray-50">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm overflow-x-auto">
              {content}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}