import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// 模塊定義（新增模塊只需在這裡加）
// ─────────────────────────────────────────────
export const MODULES = [
  {
    key: 'employee',
    label_zh: '👥 員工管理',
    label_en: '👥 Employee',
    actions: [
      { key: 'employee.view_list',  label_zh: '查看所有員工列表',   label_en: 'View Employee List' },
      { key: 'employee.create',     label_zh: '新增員工',           label_en: 'Create Employee' },
      { key: 'employee.edit',       label_zh: '編輯他人員工資料',   label_en: 'Edit Employee' },
      { key: 'employee.delete',     label_zh: '刪除員工',           label_en: 'Delete Employee' },
    ],
  },
  {
    key: 'salary',
    label_zh: '💰 薪酬管理',
    label_en: '💰 Salary',
    actions: [
      { key: 'salary.view_all',  label_zh: '查看他人薪酬/銀行資料', label_en: 'View Others Salary/Bank' },
      { key: 'salary.edit',      label_zh: '編輯薪酬資料',          label_en: 'Edit Salary' },
    ],
  },
  {
    key: 'medical',
    label_zh: '🏥 醫療記錄',
    label_en: '🏥 Medical',
    actions: [
      { key: 'medical.view_all', label_zh: '查看他人醫療記錄', label_en: 'View Others Medical' },
      { key: 'medical.edit',     label_zh: '編輯醫療記錄',     label_en: 'Edit Medical' },
    ],
  },
  {
    key: 'visa',
    label_zh: '🛂 簽證管理',
    label_en: '🛂 Visa',
    actions: [
      { key: 'visa.view_all', label_zh: '查看他人簽證記錄', label_en: 'View Others Visa' },
      { key: 'visa.edit',     label_zh: '編輯簽證記錄',     label_en: 'Edit Visa' },
    ],
  },
  {
    key: 'leave',
    label_zh: '📅 年假管理',
    label_en: '📅 Leave',
    actions: [
      { key: 'leave.apply',   label_zh: '申請自己年假',         label_en: 'Apply Own Leave' },
      { key: 'leave.approve', label_zh: '審批他人年假',         label_en: 'Approve Leave' },
      { key: 'leave.manage',  label_zh: '管理假期設定/批准人',  label_en: 'Manage Leave Settings' },
    ],
  },
  {
    key: 'system',
    label_zh: '⚙️ 系統管理',
    label_en: '⚙️ System',
    actions: [
      { key: 'system.system.manage_dropdown', label_zh: '管理下拉選項',   label_en: 'Manage Dropdowns' },
      { key: 'system.manage_users',    label_zh: '管理用戶帳號',   label_en: 'Manage Users' },
      { key: 'system.system.manage_roles',    label_zh: '管理角色權限',   label_en: 'Manage Roles (Super Admin only)' },
    ],
  },
]

// 所有 action keys 的扁平列表（方便查詢）
export const ALL_ACTIONS = MODULES.flatMap(m => m.actions.map(a => a.key))

// ─────────────────────────────────────────────
// Super Admin 預設擁有所有權限
// view_own 系列由代碼邏輯控制，不放進權限表
// ─────────────────────────────────────────────
export function can(permissions, userRole, action) {
  if (userRole === 'super_admin') return true
  return !!permissions?.[action]
}

// ─────────────────────────────────────────────
// 從資料庫載入當前用戶的權限
// ─────────────────────────────────────────────
export async function loadPermissions(companyId, userRole) {
  if (userRole === 'super_admin') return {}
  const { data } = await supabase
    .from('role_permissions')
    .select('action, allowed')
    .eq('company_id', companyId)
    .eq('role', userRole)
  const map = {}
  ;(data || []).forEach(({ action, allowed }) => { map[action] = allowed })
  return map
}

// ─────────────────────────────────────────────
// 各角色預設權限（首次建立公司或重置時使用）
// ─────────────────────────────────────────────
export const DEFAULT_PERMISSIONS = {
  hr_admin: {
    'employee.view_list': true,  'employee.create': true,
    'employee.edit': true,       'employee.delete': true,
    'salary.view_all': true,     'salary.edit': true,
    'medical.view_all': true,    'medical.edit': true,
    'visa.view_all': true,       'visa.edit': true,
    'leave.apply': true,         'leave.approve': true,  'leave.manage': true,
    'system.system.manage_dropdown': true, 'system.manage_users': true,
  },
  hr_staff: {
    'employee.view_list': true,  'employee.create': true,
    'salary.view_all': true,     'medical.view_all': true,  'medical.edit': true,
    'visa.view_all': true,       'visa.edit': true,
    'leave.apply': true,         'leave.approve': true,
  },
  manager: {
    'employee.view_list': true,
    'salary.view_all': true,
    'leave.apply': true,         'leave.approve': true,
  },
  employee: {
    'leave.apply': true,
  },
  finance: {
    'employee.view_list': true,
    'salary.view_all': true,     'salary.edit': true,
    'leave.apply': true,
  },
  read_only: {
    'employee.view_list': true,
  },
}