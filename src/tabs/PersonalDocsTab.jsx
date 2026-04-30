import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── 工具函數 ──────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatMoney(val) {
  if (!val && val !== 0) return '—'
  return 'S$' + Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function getMonthLabel(year, month) {
  return `${MONTHS[month - 1]} ${year}`
}

// ─── Payslip 詳情模態框 ──────────────────────────
function PayslipModal({ record, employee, onClose }) {
  const modalRef = useRef(null)

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payslip ${getMonthLabel(record.year, record.month)}`,
          text: `My payslip for ${getMonthLabel(record.year, record.month)} - Net Pay: ${formatMoney(record.net_pay_after_adjustments || record.net_pay)}`,
        })
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(
        `Payslip ${getMonthLabel(record.year, record.month)}\nNet Pay: ${formatMoney(record.net_pay_after_adjustments || record.net_pay)}`
      )
      alert('Payslip info copied to clipboard!')
    }
  }

  const handleDownload = () => {
    // 生成簡單的文字版 payslip 下載
    const lines = [
      `PAYSLIP - ${getMonthLabel(record.year, record.month)}`,
      `Employee: ${employee?.full_name || ''}`,
      `Company: ${record.company_name || ''}`,
      `Payment Date: ${record.payment_date || '—'}`,
      '',
      '─── EARNINGS ───────────────────────',
      `Basic Salary:        ${formatMoney(record.basic_salary)}`,
      `Fixed Allowance:     ${formatMoney(record.fixed_allowance)}`,
      `Other Allowance:     ${formatMoney(record.other_allowance)}`,
      `Overtime:            ${formatMoney(record.overtime)}`,
      `Bonus:               ${formatMoney(record.bonus)}`,
      `Commission:          ${formatMoney(record.commission)}`,
      `Gross Salary:        ${formatMoney(record.gross_salary)}`,
      '',
      '─── DEDUCTIONS ─────────────────────',
      `Employee CPF:        ${formatMoney(record.employee_cpf)}`,
      `Unpaid Leave:        ${formatMoney(record.unpaid_leave_amount)}`,
      '',
      '─── NET PAY ────────────────────────',
      `Net Pay:             ${formatMoney(record.net_pay_after_adjustments || record.net_pay)}`,
      '',
      `Employer CPF:        ${formatMoney(record.employer_cpf)}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payslip_${record.year}_${String(record.month).padStart(2,'0')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const netPay = record.net_pay_after_adjustments || record.net_pay

  const sections = [
    {
      title: 'Earnings',
      icon: '💰',
      color: '#10B981',
      items: [
        { label: 'Basic Salary', value: record.basic_salary },
        { label: 'Fixed Allowance', value: record.fixed_allowance },
        { label: 'Other Allowance', value: record.other_allowance },
        { label: 'Overtime', value: record.overtime },
        { label: 'Bonus', value: record.bonus },
        { label: 'Commission', value: record.commission },
        { label: 'Director Fee', value: record.director_fee },
      ].filter(i => i.value),
    },
    {
      title: 'Deductions',
      icon: '➖',
      color: '#EF4444',
      items: [
        { label: 'Employee CPF', value: record.employee_cpf },
        { label: 'Unpaid Leave', value: record.unpaid_leave_amount },
        { label: 'CDAC/MBMF/SINDA', value: record.cdac_mbmf_sinda },
        { label: 'SDL', value: record.sdl },
      ].filter(i => i.value),
    },
    {
      title: 'Employer Contributions',
      icon: '🏢',
      color: '#6366F1',
      items: [
        { label: 'Employer CPF', value: record.employer_cpf },
        { label: 'SDL', value: record.sdl },
        { label: 'FWL', value: record.fwl },
      ].filter(i => i.value),
    },
  ]

  return (
    <div style={ms.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={modalRef} style={ms.modal}>
        {/* Header */}
        <div style={ms.header}>
          <div>
            <div style={ms.headerLabel}>Payslip</div>
            <div style={ms.headerMonth}>{getMonthLabel(record.year, record.month)}</div>
            {record.payment_date && (
              <div style={ms.headerDate}>Payment date: {record.payment_date}</div>
            )}
          </div>
          <button onClick={onClose} style={ms.closeBtn}>✕</button>
        </div>

        {/* Net Pay Hero */}
        <div style={ms.netPayCard}>
          <div style={ms.netPayLabel}>Net Pay</div>
          <div style={ms.netPayAmount}>{formatMoney(netPay)}</div>
          <div style={ms.grossRow}>
            <span>Gross: {formatMoney(record.gross_salary)}</span>
            <span>·</span>
            <span>Employee CPF: {formatMoney(record.employee_cpf)}</span>
          </div>
        </div>

        {/* Sections */}
        <div style={ms.body}>
          {sections.map(sec => (
            sec.items.length > 0 && (
              <div key={sec.title} style={ms.section}>
                <div style={ms.secTitle}>
                  <span>{sec.icon}</span>
                  <span style={{ color: sec.color }}>{sec.title}</span>
                </div>
                {sec.items.map(item => (
                  <div key={item.label} style={ms.row}>
                    <span style={ms.rowLabel}>{item.label}</span>
                    <span style={ms.rowValue}>{formatMoney(item.value)}</span>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>

        {/* Actions */}
        <div style={ms.actions}>
          <button onClick={handleDownload} style={ms.dlBtn}>
            ⬇ Download
          </button>
          <button onClick={handleShare} style={ms.shareBtn}>
            ↗ Share
          </button>
        </div>
      </div>
    </div>
  )
}

const ms = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 9999, display: 'flex', alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    background: '#fff', borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: 540,
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 20px 0',
  },
  headerLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' },
  headerMonth: { fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2 },
  headerDate: { fontSize: 13, color: '#64748b', marginTop: 2 },
  closeBtn: {
    background: '#F1F5F9', border: 'none', borderRadius: '50%',
    width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#64748b',
  },
  netPayCard: {
    margin: '16px 20px',
    background: 'linear-gradient(135deg, #1B3A5C, #2E6DA4)',
    borderRadius: 16, padding: '20px 24px', textAlign: 'center',
  },
  netPayLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' },
  netPayAmount: { fontSize: 36, fontWeight: 800, color: '#fff', marginTop: 4, marginBottom: 8 },
  grossRow: { display: 'flex', justifyContent: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  body: { padding: '0 20px 8px' },
  section: { marginBottom: 16 },
  secTitle: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 8 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #F1F5F9',
  },
  rowLabel: { fontSize: 14, color: '#475569' },
  rowValue: { fontSize: 14, fontWeight: 600, color: '#0F172A' },
  actions: {
    display: 'flex', gap: 12, padding: '16px 20px 32px',
    borderTop: '1px solid #F1F5F9',
  },
  dlBtn: {
    flex: 1, padding: '12px', borderRadius: 12,
    border: '2px solid #1B3A5C', background: '#fff',
    color: '#1B3A5C', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  shareBtn: {
    flex: 1, padding: '12px', borderRadius: 12,
    border: 'none', background: '#1B3A5C',
    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
}

// ─── IR8A 卡片 ───────────────────────────────────
function IR8ACard({ record, employee }) {
  const handleDownload = () => {
    const lines = [
      `IR8A - Year of Assessment ${record.year + 1}`,
      `Employee: ${employee?.full_name || ''}`,
      `NRIC/FIN: ${employee?.nric_fin || ''}`,
      '',
      `Gross Salary:        ${formatMoney(record.ytd_gross || record.gross_salary)}`,
      `Employee CPF:        ${formatMoney(record.ytd_employee_cpf || record.employee_cpf)}`,
      `Employer CPF:        ${formatMoney(record.ytd_employer_cpf || record.employer_cpf)}`,
      `Net Pay:             ${formatMoney(record.ytd_net_pay || record.net_pay)}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IR8A_${record.year}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={ds.docCard}>
      <div style={ds.docIcon}>📄</div>
      <div style={{ flex: 1 }}>
        <div style={ds.docTitle}>IR8A — {record.year}</div>
        <div style={ds.docSub}>Year of Assessment {record.year + 1}</div>
        <div style={ds.docMeta}>Gross: {formatMoney(record.ytd_gross || record.gross_salary)}</div>
      </div>
      <div style={ds.docActions}>
        <button onClick={handleDownload} style={ds.actionBtn}>⬇</button>
      </div>
    </div>
  )
}

// ─── 主組件 ──────────────────────────────────────
export default function PersonalDocsTab({ employee, companyId, language }) {
  const [activeTab, setActiveTab] = useState('payslip')
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState(null)

  useEffect(() => {
    if (employee?.id) fetchPayrollData()
  }, [employee?.id])

  async function fetchPayrollData() {
    setLoading(true)
    try {
      // 拿近12個月的薪資記錄
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const yearAgo = oneYearAgo.getFullYear()
      const monthAgo = oneYearAgo.getMonth() + 1

      const { data } = await supabase
        .from('payroll_records')
        .select(`
          *,
          payroll_runs!inner(status, payment_date, working_days)
        `)
        .eq('employee_id', employee.id)
        .eq('payroll_runs.status', 'locked')
        .or(`year.gt.${yearAgo},and(year.eq.${yearAgo},month.gte.${monthAgo})`)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (data) {
        const records = data.map(r => ({
          ...r,
          payment_date: r.payroll_runs?.payment_date,
        }))
        setPayrollRecords(records)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // IR8A: 取每年最後一個 locked 記錄（有 ytd_ 數據）
  const ir8aRecords = payrollRecords
    .filter(r => r.ytd_gross)
    .reduce((acc, r) => {
      if (!acc[r.year] || r.month > acc[r.year].month) acc[r.year] = r
      return acc
    }, {})

  const tabs = [
    { key: 'payslip', label: 'Payslip', icon: '💵' },
    { key: 'ir8a', label: 'IR8A', icon: '📄' },
    { key: 'ir21', label: 'IR21', icon: '📋' },
  ]

  return (
    <div style={ds.container}>

      {/* Tab Bar */}
      <div style={ds.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...ds.tabBtn,
              background: activeTab === tab.key ? '#1B3A5C' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#64748b',
              borderBottom: activeTab === tab.key ? 'none' : '2px solid #e2e8f0',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={ds.content}>

        {/* ── Payslip Tab ── */}
        {activeTab === 'payslip' && (
          <div>
            <div style={ds.sectionHeader}>
              <div style={ds.sectionTitle}>Payslips</div>
              <div style={ds.sectionSub}>Last 12 months</div>
            </div>

            {loading ? (
              <div style={ds.empty}>Loading...</div>
            ) : payrollRecords.length === 0 ? (
              <div style={ds.empty}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 600, color: '#475569' }}>No payslips yet</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                  Payslips will appear here once payroll is processed
                </div>
              </div>
            ) : (
              <div style={ds.list}>
                {payrollRecords.map(record => (
                  <button
                    key={`${record.year}-${record.month}`}
                    onClick={() => setSelectedRecord(record)}
                    style={ds.payslipRow}
                  >
                    <div style={ds.payslipLeft}>
                      <div style={ds.payslipMonth}>{getMonthLabel(record.year, record.month)}</div>
                      {record.payment_date && (
                        <div style={ds.payslipDate}>Paid: {record.payment_date}</div>
                      )}
                    </div>
                    <div style={ds.payslipRight}>
                      <div style={ds.payslipAmount}>
                        {formatMoney(record.net_pay_after_adjustments || record.net_pay)}
                      </div>
                      <div style={ds.payslipGross}>
                        Gross {formatMoney(record.gross_salary)}
                      </div>
                    </div>
                    <div style={ds.chevron}>›</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── IR8A Tab ── */}
        {activeTab === 'ir8a' && (
          <div>
            <div style={ds.sectionHeader}>
              <div style={ds.sectionTitle}>IR8A</div>
              <div style={ds.sectionSub}>Annual tax documents</div>
            </div>

            {loading ? (
              <div style={ds.empty}>Loading...</div>
            ) : Object.keys(ir8aRecords).length === 0 ? (
              <div style={ds.empty}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 600, color: '#475569' }}>No IR8A available</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                  IR8A will appear here after year-end payroll is locked
                </div>
              </div>
            ) : (
              <div style={ds.list}>
                {Object.values(ir8aRecords)
                  .sort((a, b) => b.year - a.year)
                  .map(record => (
                    <IR8ACard key={record.year} record={record} employee={employee} />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── IR21 Tab ── */}
        {activeTab === 'ir21' && (
          <div>
            <div style={ds.sectionHeader}>
              <div style={ds.sectionTitle}>IR21</div>
              <div style={ds.sectionSub}>Tax clearance for foreign employees</div>
            </div>

            {employee?.ir21_filed ? (
              <div style={ds.docCard}>
                <div style={ds.docIcon}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={ds.docTitle}>IR21 Filed</div>
                  <div style={ds.docSub}>
                    Filed date: {employee.ir21_filed_date || '—'}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      background: '#DCFCE7', color: '#166534',
                      fontSize: 11, fontWeight: 700,
                      padding: '2px 10px', borderRadius: 20,
                    }}>✓ Filed</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={ds.empty}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, color: '#475569' }}>No IR21 on file</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                  IR21 is required for foreign employees upon cessation of employment
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedRecord && (
        <PayslipModal
          record={selectedRecord}
          employee={employee}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  )
}

const ds = {
  container: {
    fontFamily: "'DM Sans', sans-serif",
    background: '#fff',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '2px solid #e2e8f0',
    background: '#fff',
    position: 'sticky', top: 0, zIndex: 10,
  },
  tabBtn: {
    flex: 1, padding: '14px 8px',
    border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    borderRadius: '8px 8px 0 0',
  },
  content: { padding: '0 0 80px' },
  sectionHeader: { padding: '20px 16px 12px' },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: '#0F172A' },
  sectionSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  list: { display: 'flex', flexDirection: 'column' },

  // Payslip row
  payslipRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px', borderBottom: '1px solid #F1F5F9',
    background: '#fff', border: 'none', cursor: 'pointer',
    textAlign: 'left', width: '100%',
    transition: 'background 0.15s',
  },
  payslipLeft: { flex: 1 },
  payslipMonth: { fontSize: 15, fontWeight: 700, color: '#0F172A' },
  payslipDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  payslipRight: { textAlign: 'right' },
  payslipAmount: { fontSize: 16, fontWeight: 800, color: '#1B3A5C' },
  payslipGross: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  chevron: { fontSize: 20, color: '#CBD5E1', fontWeight: 300 },

  // Doc card (IR8A, IR21)
  docCard: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    padding: '16px', borderBottom: '1px solid #F1F5F9',
  },
  docIcon: { fontSize: 32, flexShrink: 0 },
  docTitle: { fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 },
  docSub: { fontSize: 13, color: '#64748b' },
  docMeta: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  docActions: { display: 'flex', gap: 8, flexShrink: 0 },
  actionBtn: {
    width: 36, height: 36, borderRadius: '50%',
    border: '1.5px solid #e2e8f0', background: '#fff',
    cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  empty: {
    textAlign: 'center', padding: '48px 24px',
    color: '#94a3b8', fontSize: 14,
  },
}