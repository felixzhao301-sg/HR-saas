import { supabase } from '../supabase'

async function _send(payload) {
  if (!payload.to) return { error: 'No recipient email' }
  const { error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })
  if (error) console.error('[email] send failed:', error)
  return { error: error?.message || null }
}

export async function sendEmail(type, to, vars = {}) {
  return _send({ type, to, ...vars })
}

export async function getEmployeeEmail(employeeId) {
  try {
    const { data } = await supabase
      .from('employees')
      .select('personal_email')
      .eq('id', employeeId)
      .maybeSingle()
    return data?.personal_email || null
  } catch (err) {
    console.error('[email] getEmployeeEmail error:', err)
    return null
  }
}

// 按 employee_id 查批准人 emails
export async function getApproverEmails(companyId, employeeId) {
  try {
    const { data: approverRow } = await supabase
      .from('leave_approvers')
      .select('approver1_user_id, approver2_user_id')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (!approverRow) return []

    const userIds = [
      approverRow.approver1_user_id,
      approverRow.approver2_user_id,
    ].filter(Boolean)

    if (userIds.length === 0) return []

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, email, display_name')
      .in('user_id', userIds)
      .eq('company_id', companyId)

    return (roles || []).map(r => ({ email: r.email, name: r.display_name }))
  } catch (err) {
    console.error('[email] getApproverEmails error:', err)
    return []
  }
}

// 提交年假後通知批准人
export async function notifyApprovers({ companyId, employeeId, employeeName,
  leaveType, startDate, endDate, days, reason }) {
  const approvers = await getApproverEmails(companyId, employeeId)
  const results = await Promise.allSettled(
    approvers.filter(a => a.email).map(a =>
      sendEmail('leave_submitted', a.email, {
        approverName: a.name,
        employeeName,
        leaveType,
        startDate,
        endDate,
        days,
        reason,
      })
    )
  )
  const failed = results.filter(r => r.status === 'rejected')
  return { sent: approvers.length - failed.length, failed: failed.length }
}