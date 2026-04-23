// ─────────────────────────────────────────────
// utils/payroll.js  —  CPF & Payroll Engine
// Singapore rules: 2026 rates
// ─────────────────────────────────────────────

// ── CPF Rate Tables (effective 1 Jan 2026) ────
// Table 1: SC / PR 3rd year onwards
const CPF_RATES_FULL = [
  { maxAge: 55,  employer: 0.17,   employee: 0.20   }, // ≤55
  { maxAge: 60,  employer: 0.16,   employee: 0.18   }, // >55–60  (2026 rates)
  { maxAge: 65,  employer: 0.125,  employee: 0.125  }, // >60–65  (2026 rates)
  { maxAge: 70,  employer: 0.09,   employee: 0.075  }, // >65–70
  { maxAge: 999, employer: 0.075,  employee: 0.05   }, // >70
]

// PR 1st year (graduated rates)
const CPF_RATES_PR1_EMPLOYER = [
  { maxAge: 55,  employer: 0.04  },
  { maxAge: 60,  employer: 0.04  },
  { maxAge: 65,  employer: 0.04  },
  { maxAge: 70,  employer: 0.04  },
  { maxAge: 999, employer: 0.04  },
]
const CPF_RATES_PR1_EMPLOYEE = [
  { maxAge: 55,  employee: 0.05  },
  { maxAge: 60,  employee: 0.05  },
  { maxAge: 65,  employee: 0.05  },
  { maxAge: 70,  employee: 0.05  },
  { maxAge: 999, employee: 0.05  },
]

// PR 2nd year (graduated rates)
const CPF_RATES_PR2_EMPLOYER = [
  { maxAge: 55,  employer: 0.09  },
  { maxAge: 60,  employer: 0.09  },
  { maxAge: 65,  employer: 0.09  },
  { maxAge: 70,  employer: 0.065 },
  { maxAge: 999, employer: 0.065 },
]
const CPF_RATES_PR2_EMPLOYEE = [
  { maxAge: 55,  employee: 0.15  },
  { maxAge: 60,  employee: 0.15  },
  { maxAge: 65,  employee: 0.15  },
  { maxAge: 70,  employee: 0.075 },
  { maxAge: 999, employee: 0.05  },
]

// ── OW / AW Ceilings ─────────────────────────
export const OW_CEILING_2026 = 8000   // from 1 Jan 2026
export const OW_CEILING_2025 = 7400
export const AW_ANNUAL_CEILING = 102000

// ── SDL Rate ─────────────────────────────────
// 0.25% of gross, min $2 if gross ≥ $800, min $1 if $500–$799
export function calcSDL(grossSalary) {
  if (grossSalary <= 0) return 0
  const raw = grossSalary * 0.0025
  if (grossSalary >= 800) return Math.max(parseFloat(raw.toFixed(2)), 2)
  if (grossSalary >= 500) return Math.max(parseFloat(raw.toFixed(2)), 1)
  return parseFloat(raw.toFixed(2))
}

// ── FWL (Foreign Worker Levy) ─────────────────
// Only for WP holders. Rates vary by sector/skill level.
// Using standard rates. HR can override if needed.
export const FWL_RATES = {
  basic:    650,  // Basic tier
  higher:   950,  // Higher-skilled (MYE quota exceeded)
  skilled:  300,  // Skilled worker (with cert)
}

// ── CDAC / MBMF / SINDA rates ─────────────────
// Based on gross salary and race/religion
// Chinese → CDAC, Malay → MBMF, Indian/others → SINDA
export function calcCommunityFund(grossSalary, fundType) {
  if (!fundType || fundType === 'none') return 0
  const g = grossSalary

  if (fundType === 'CDAC') {
    if (g <= 0) return 0
    if (g <= 2000)  return 0.50
    if (g <= 3500)  return 1.00
    if (g <= 5000)  return 1.50
    if (g <= 7500)  return 2.00
    return 3.00 // >$7,500
  }

  if (fundType === 'MBMF') {
    if (g <= 0) return 0
    if (g <= 1000)  return 1.00
    if (g <= 2000)  return 2.00
    if (g <= 3000)  return 3.00
    if (g <= 4000)  return 4.00
    if (g <= 5000)  return 5.00
    if (g <= 6000)  return 6.00
    if (g <= 7000)  return 7.00
    if (g <= 8000)  return 8.00
    if (g <= 9000)  return 9.00
    return 10.00
  }

  if (fundType === 'SINDA') {
    if (g <= 0) return 0
    if (g <= 2000)  return 0.50
    if (g <= 3500)  return 1.00
    if (g <= 5000)  return 1.50
    return 2.00 // >$5,000
  }

  return 0
}

// Determine fund type from race
export function getFundType(race, nationality, isPR) {
  // Only SC and PR pay community fund
  if (nationality !== 'Singapore' && !isPR) return 'none'
  const r = (race || '').toLowerCase()
  if (r.includes('chinese')) return 'CDAC'
  if (r.includes('malay'))   return 'MBMF'
  if (r.includes('indian') || r.includes('tamil')) return 'SINDA'
  return 'none' // Others, Eurasian etc → no mandatory fund
}

// ── Age calculation ───────────────────────────
// CPF rate applies from 1st day of month AFTER birthday month
export function getCPFAge(dob, year, month) {
  if (!dob) return null
  const d = new Date(dob)
  const birthYear  = d.getFullYear()
  const birthMonth = d.getMonth() + 1 // 1-12

  // Age at start of month being processed
  let age = year - birthYear
  // If birthday is in this month or later, haven't turned yet for CPF purposes
  // CPF rule: new rate from 1st day of month AFTER birthday month
  if (month <= birthMonth) age -= 1

  return age
}

// ── CPF Rate lookup ───────────────────────────
export function getCPFRates(emp, year, month) {
  const { nationality, is_pr, pr_year, date_of_birth, race } = emp

  // WP / EP / SP foreigners → no CPF
  if (nationality !== 'Singapore' && !is_pr) {
    return { employer: 0, employee: 0, applicable: false }
  }

  const age = getCPFAge(date_of_birth, year, month)
  if (age === null) return { employer: 0, employee: 0, applicable: false }

  // Determine PR year for graduated rates
  const prYearNum = is_pr ? parseInt(pr_year?.replace('+', '') || '3') : 99

  let employer = 0, employee = 0

  if (!is_pr || prYearNum >= 3) {
    // SC or PR 3rd year+: full rates
    const tier = CPF_RATES_FULL.find(t => age <= t.maxAge)
    employer = tier.employer
    employee = tier.employee
  } else if (prYearNum === 1) {
    // PR 1st year
    const tE  = CPF_RATES_PR1_EMPLOYER.find(t => age <= t.maxAge)
    const tEe = CPF_RATES_PR1_EMPLOYEE.find(t => age <= t.maxAge)
    employer = tE.employer
    employee = tEe.employee
  } else {
    // PR 2nd year
    const tE  = CPF_RATES_PR2_EMPLOYER.find(t => age <= t.maxAge)
    const tEe = CPF_RATES_PR2_EMPLOYEE.find(t => age <= t.maxAge)
    employer = tE.employer
    employee = tEe.employee
  }

  return { employer, employee, applicable: true, age }
}

// ── OW ceiling for year ───────────────────────
export function getOWCeiling(year) {
  return year >= 2026 ? OW_CEILING_2026 : OW_CEILING_2025
}

// ── Round CPF ─────────────────────────────────
// Total CPF: round to nearest dollar (≥0.50 → +1, <0.50 → drop)
// Employee share: always round DOWN
function roundTotal(val) {
  return Math.round(val)   // JS Math.round follows ≥0.5 rule → correct
}
function roundEmployeeShare(val) {
  return Math.floor(val)
}

// ── Main payroll calculation ──────────────────
export function calculatePayroll({
  employee,          // employee record from DB
  year,
  month,
  workingDays,       // actual working days in month
  inputs,            // { other_allowance, other_allowance_desc, overtime, overtime_desc,
                     //   bonus, bonus_desc, commission, director_fee, director_fee_desc,
                     //   unutilised_leave_pay, unpaid_leave_days,
                     //   other_adjustments: [{desc, amount}] }
  ytdOwForCpf,       // YTD OW already subject to CPF (from previous months this year)
  fwlRate = 0,       // FWL monthly amount (0 if not WP)
}) {
  const owCeiling = getOWCeiling(year)

  // ── 1. Collect OW items ──────────────────
  const basicSalary     = Number(employee.basic_salary   || 0)
  const fixedAllowance  = Number(employee.basic_allowance|| 0)
  const otherAllowance  = Number(inputs.other_allowance  || 0)
  const overtime        = Number(inputs.overtime         || 0)
  const unutilised      = Number(inputs.unutilised_leave_pay || 0)

  // Unpaid leave deduction
  const unpaidDays   = Number(inputs.unpaid_leave_days || 0)
  const unpaidAmount = unpaidDays > 0 && workingDays > 0
    ? parseFloat(((basicSalary + fixedAllowance) / workingDays * unpaidDays).toFixed(2))
    : 0

  // ── 2. AW items ─────────────────────────
  const bonus      = Number(inputs.bonus      || 0)
  const commission = Number(inputs.commission || 0)
  const totalAW    = bonus + commission

  // ── 3. CPF Exempt (Director Fee) ────────
  const directorFee = Number(inputs.director_fee || 0)

  // ── 4. Gross Salary ──────────────────────
  // Gross = OW + AW + Director Fee - Unpaid Leave
  const totalOW    = basicSalary + fixedAllowance + otherAllowance + overtime + unutilised
  const grossSalary = parseFloat((totalOW + totalAW + directorFee - unpaidAmount).toFixed(2))

  // ── 5. CPF calculation ───────────────────
  const rates = getCPFRates(employee, year, month)
  let employerCPF = 0, employeeCPF = 0, totalCPF = 0
  let owForCPF = 0, awForCPF = 0

  if (rates.applicable) {
    // OW subject to CPF (capped at OW ceiling)
    const owBeforeUnpaid = basicSalary + fixedAllowance + otherAllowance + overtime + unutilised
    const owAfterUnpaid  = Math.max(0, owBeforeUnpaid - unpaidAmount)
    owForCPF = Math.min(owAfterUnpaid, owCeiling)

    // AW ceiling remaining = $102,000 - ytd OW already for CPF
    const awCeilingRemaining = Math.max(0, AW_ANNUAL_CEILING - ytdOwForCpf - owForCPF)
    awForCPF = Math.min(totalAW, awCeilingRemaining)

    // Director fee → NOT subject to CPF

    const totalWageForCPF = owForCPF + awForCPF

    // Calculate total CPF then split
    const totalCPFRaw    = totalWageForCPF * (rates.employer + rates.employee)
    totalCPF             = roundTotal(totalCPFRaw)
    const employeeCPFRaw = totalWageForCPF * rates.employee
    employeeCPF          = roundEmployeeShare(employeeCPFRaw)
    employerCPF          = totalCPF - employeeCPF
  }

  // ── 6. SDL ──────────────────────────────
  const sdl = calcSDL(grossSalary)

  // ── 7. FWL ──────────────────────────────
  // Passed in from settings (WP holders only)
  const fwl = Number(fwlRate || 0)

  // ── 8. Community Fund ───────────────────
  const fundType = getFundType(employee.race, employee.nationality, employee.is_pr)
  const cdacMbmfSinda = calcCommunityFund(grossSalary, fundType)

  // ── 9. Deductions & Net Pay ─────────────
  const totalDeduction = parseFloat((employeeCPF + cdacMbmfSinda).toFixed(2))
  const netPay         = parseFloat((grossSalary - totalDeduction).toFixed(2))

  // ── 10. Other Adjustments ───────────────
  const adjustments     = inputs.other_adjustments || []
  const adjustmentsTotal = parseFloat(
    adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0).toFixed(2)
  )
  const netPayAfterAdjustments = parseFloat((netPay + adjustmentsTotal).toFixed(2))

  // ── 11. Total Company Paid ───────────────
  // = Net Pay after adjustments + Employer CPF + SDL + FWL
  const totalCompanyPaid = parseFloat(
    (netPayAfterAdjustments + employerCPF + sdl + fwl).toFixed(2)
  )

  return {
    // Inputs echo
    basic_salary:          basicSalary,
    fixed_allowance:       fixedAllowance,
    other_allowance:       otherAllowance,
    other_allowance_desc:  inputs.other_allowance_desc || '',
    overtime:              overtime,
    overtime_desc:         inputs.overtime_desc || '',
    bonus:                 bonus,
    bonus_desc:            inputs.bonus_desc || '',
    commission:            commission,
    director_fee:          directorFee,
    director_fee_desc:     inputs.director_fee_desc || '',
    unutilised_leave_pay:  unutilised,
    unutilised_leave_desc: inputs.unutilised_leave_desc || '',
    unpaid_leave_days:     unpaidDays,
    unpaid_leave_amount:   unpaidAmount,

    // Calculated
    gross_salary:          grossSalary,
    ow_subject_to_cpf:     owForCPF,
    aw_subject_to_cpf:     awForCPF,
    cpf_rate_employer:     rates.employer,
    cpf_rate_employee:     rates.employee,
    employer_cpf:          employerCPF,
    employee_cpf:          employeeCPF,
    total_cpf:             totalCPF,
    sdl,
    fwl,
    cdac_mbmf_sinda:       cdacMbmfSinda,
    cdac_mbmf_sinda_type:  fundType,
    total_deduction:       totalDeduction,
    net_pay:               netPay,
    other_adjustments:     adjustments,
    other_adjustments_total: adjustmentsTotal,
    net_pay_after_adjustments: netPayAfterAdjustments,
    total_company_paid:    totalCompanyPaid,

    // For YTD tracking
    ow_for_cpf_this_month: owForCPF,
    aw_ceiling_remaining:  Math.max(0, AW_ANNUAL_CEILING - ytdOwForCpf - owForCPF - awForCPF),

    // CPF meta
    cpf_applicable: rates.applicable,
    cpf_age:        rates.age,
    fund_type:      fundType,
  }
}

// ── Calculate YTD for a given employee ────────
// Pass in all locked payroll_records for this employee this year (sorted month asc)
export function calculateYTD(records, upToMonth) {
  const filtered = records.filter(r => r.month <= upToMonth)
  const sum = (field) => filtered.reduce((s, r) => s + Number(r[field] || 0), 0)

  return {
    ytd_basic:            sum('basic_salary'),
    ytd_fixed_allowance:  sum('fixed_allowance'),
    ytd_other_allowance:  sum('other_allowance'),
    ytd_overtime:         sum('overtime'),
    ytd_bonus:            sum('bonus'),
    ytd_commission:       sum('commission'),
    ytd_director_fee:     sum('director_fee'),
    ytd_unutilised_leave: sum('unutilised_leave_pay'),
    ytd_unpaid_leave:     sum('unpaid_leave_amount'),
    ytd_gross:            sum('gross_salary'),
    ytd_employer_cpf:     sum('employer_cpf'),
    ytd_employee_cpf:     sum('employee_cpf'),
    ytd_sdl:              sum('sdl'),
    ytd_fwl:              sum('fwl'),
    ytd_cdac:             sum('cdac_mbmf_sinda'),
    ytd_net_pay:          sum('net_pay'),
    ytd_other_adjustments: sum('other_adjustments_total'),
    ytd_total_company_paid: sum('total_company_paid'),
    ytd_ow_for_cpf:       sum('ow_subject_to_cpf'),
  }
}

// ── Month name helper ─────────────────────────
export const MONTH_NAMES = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export function formatMonth(year, month) {
  return `${MONTH_NAMES[month]} ${year}`
}

// ── Working days for a month (SG calendar) ───
// Based on your Excel 2026 sheet data
// System will pull from payroll_working_days table;
// this is a fallback reference for 2026
export const WORKING_DAYS_2026 = {
  1:  { '5': 22, '5.5': 24.5, '6': 27 },
  2:  { '5': 20, '5.5': 22,   '6': 24 },
  3:  { '5': 22, '5.5': 24,   '6': 26 },
  4:  { '5': 22, '5.5': 24,   '6': 26 },
  5:  { '5': 21, '5.5': 23.5, '6': 26 },
  6:  { '5': 22, '5.5': 24,   '6': 26 },
  7:  { '5': 23, '5.5': 25,   '6': 27 },
  8:  { '5': 21, '5.5': 23.5, '6': 26 },
  9:  { '5': 22, '5.5': 24,   '6': 26 },
  10: { '5': 22, '5.5': 24.5, '6': 27 },
  11: { '5': 21, '5.5': 23,   '6': 25 },
  12: { '5': 23, '5.5': 25,   '6': 27 },
}

export function getDefaultWorkingDays(year, month, workDaysPerWeek) {
  if (year === 2026) {
    const key = String(workDaysPerWeek)
    return WORKING_DAYS_2026[month]?.[key] || 22
  }
  // Generic fallback
  return workDaysPerWeek === 6 ? 26 : workDaysPerWeek === 5.5 ? 24 : 22
}

// ── Currency formatter ────────────────────────
export function fmtSGD(val, showSign = false) {
  const n = Number(val || 0)
  const abs = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (showSign && n < 0) return `(${abs})`
  return abs
}