import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// 核心發送函數（唯一接觸 Edge Function 的地方）
// 換項目只需改 functionName
// ─────────────────────────────────────────────
async function _send({ to, subject, html, functionName = 'send-email' }) {
  if (!to) return { error: 'No recipient email' }
  const { error } = await supabase.functions.invoke(functionName, {
    body: { to, subject, html },
  })
  if (error) console.error('[email] send failed:', error)
  return { error }
}

// ─────────────────────────────────────────────
// 模板引擎（極簡）
// 用法：renderTemplate('Hello {{name}}', { name: 'Felix' })
// ─────────────────────────────────────────────
function renderTemplate(template, vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// ─────────────────────────────────────────────
// 內建模板庫（可按項目擴展）
// ─────────────────────────────────────────────
const EMAIL_TEMPLATES = {
  // 年假審批結果 → 通知員工
  leave_approved: {
    subject: 'Leave Request Approved – {{leaveType}}',
    html: `
      <p>Dear {{employeeName}},</p>
      <p>Your leave request has been <strong>approved</strong>.</p>
      <ul>
        <li><b>Type:</b> {{leaveType}}</li>
        <li><b>From:</b> {{startDate}}</li>
        <li><b>To:</b> {{endDate}}</li>
        <li><b>Days:</b> {{days}}</li>
      </ul>
      <p>Regards,<br/>{{companyName}}</p>
    `,
  },
  leave_rejected: {
    subject: 'Leave Request Rejected – {{leaveType}}',
    html: `
      <p>Dear {{employeeName}},</p>
      <p>Your leave request has been <strong>rejected</strong>.</p>
      <ul>
        <li><b>Type:</b> {{leaveType}}</li>
        <li><b>From:</b> {{startDate}}</li>
        <li><b>To:</b> {{endDate}}</li>
        <li><b>Days:</b> {{days}}</li>
      </ul>
      {{#reason}}<p><b>Reason:</b> {{reason}}</p>{{/reason}}
      <p>Regards,<br/>{{companyName}}</p>
    `,
  },
  // 年假提交 → 通知批准人
  leave_submitted: {
    subject: 'New Leave Request Pending Approval – {{employeeName}}',
    html: `
      <p>Dear {{approverName}},</p>
      <p>A new leave request requires your approval.</p>
      <ul>
        <li><b>Employee:</b> {{employeeName}}</li>
        <li><b>Type:</b> {{leaveType}}</li>
        <li><b>From:</b> {{startDate}}</li>
        <li><b>To:</b> {{endDate}}</li>
        <li><b>Days:</b> {{days}}</li>
      </ul>
      <p>Please log in to approve or reject.</p>
      <p>Regards,<br/>{{companyName}}</p>
    `,
  },
}

// ─────────────────────────────────────────────
// 主函數：用內建模板發送
// type: 模板名稱（見上方 EMAIL_TEMPLATES）
// to: 收件人 email
// vars: 模板變量，如 { employeeName, leaveType, ... }
// options: { functionName, customTemplate }
// ─────────────────────────────────────────────
export async function sendEmail(type, to, vars = {}, options = {}) {
  // 支持傳入自定義模板，覆蓋內建
  const template = options.customTemplate || EMAIL_TEMPLATES[type]
  if (!template) {
    console.error('[email] Unknown template type:', type)
    return { error: `Unknown template: ${type}` }
  }

  // 處理條件區塊 {{#key}}...{{/key}}（有值才顯示）
  let html = template.html.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, content) => (vars[key] ? content : '')
  )

  html = renderTemplate(html, vars)
  const subject = renderTemplate(template.subject, vars)

  return _send({ to, subject, html, functionName: options.functionName })
}

// ─────────────────────────────────────────────
// 查詢工具：取員工 email
// config 可指定表名和欄位名，適配不同項目
// ─────────────────────────────────────────────
export async function getEmployeeEmail(employeeId, config = {}) {
  const {
    table = 'employees',
    emailField = 'personal_email',
    idField = 'id',
  } = config

  try {
    const { data } = await supabase
      .from(table)
      .select(emailField)
      .eq(idField, employeeId)
      .maybeSingle()
    return data?.[emailField] || null
  } catch (err) {
    console.error('[email] getEmployeeEmail error:', err)
    return null
  }
}

// ─────────────────────────────────────────────
// 查詢工具：取批准人 emails
// config 可指定所有欄位名，適配不同項目
// ─────────────────────────────────────────────
export async function getApproverEmails(supabaseClient, companyId, leaveTypeValue, config = {}) {
  const {
    approversTable = 'leave_approvers',
    rolesTable = 'user_roles',
    leaveTypeField = 'leave_type',   // ← 如欄位是 leave_type_id 改這裡
    approver1Field = 'approver1_user_id',
    approver2Field = 'approver2_user_id',
    userIdField = 'user_id',
    emailField = 'email',
    nameField = 'display_name',
  } = config

  try {
    const { data: approverRow } = await supabaseClient
      .from(approversTable)
      .select(`${approver1Field}, ${approver2Field}`)
      .eq('company_id', companyId)
      .eq(leaveTypeField, leaveTypeValue)
      .maybeSingle()

    if (!approverRow) return []

    const userIds = [
      approverRow[approver1Field],
      approverRow[approver2Field],
    ].filter(Boolean)

    if (userIds.length === 0) return []

    const { data: roles } = await supabaseClient
      .from(rolesTable)
      .select(`${userIdField}, ${emailField}, ${nameField}`)
      .in(userIdField, userIds)
      .eq('company_id', companyId)

    return (roles || []).map(r => ({
      email: r[emailField],
      name: r[nameField],
    }))
  } catch (err) {
    console.error('[email] getApproverEmails error:', err)
    return []
  }
}

// ─────────────────────────────────────────────
// 組合函數：提交年假後批量通知所有批准人
// 這是最常用的場景，一行調用搞定
// ─────────────────────────────────────────────
export async function notifyApprovers(supabaseClient, {
  companyId,
  leaveTypeValue,
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  companyName = 'HR System',
  approversConfig = {},
  emailOptions = {},
}) {
  const approvers = await getApproverEmails(
    supabaseClient, companyId, leaveTypeValue, approversConfig
  )

  const results = await Promise.allSettled(
    approvers
      .filter(a => a.email)
      .map(a =>
        sendEmail('leave_submitted', a.email, {
          approverName: a.name,
          employeeName,
          leaveType,
          startDate,
          endDate,
          days,
          companyName,
        }, emailOptions)
      )
  )

  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) console.error('[email] Some approver emails failed:', failed)

  return { sent: approvers.length - failed.length, failed: failed.length }
}