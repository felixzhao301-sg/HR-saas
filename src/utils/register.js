// src/utils/register.js
import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// 檢查 UEN 是否已被註冊
// ─────────────────────────────────────────────
export async function checkUENExists(uen) {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('uen', uen)
    .maybeSingle()
  return !!data
}

// ─────────────────────────────────────────────
// 公開註冊流程：
// 1. 建立 Auth 帳號（發送確認郵件）
// 2. 建立公司（status = trial）
// 3. 建立 super_admin 角色
// 用戶點郵件確認後即可登入，開始 30 天試用
// 分離型設計：Admin 不自動建立 Employee Profile
// ─────────────────────────────────────────────
export async function registerCompany({ company, admin }) {
  const uenExists = await checkUENExists(company.uen)
  if (uenExists) return { error: 'UEN already registered.' }

  let userId = null
  let companyId = null

  try {
    // 1. 建立 Auth 帳號（Supabase 自動發送確認郵件）
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    admin.email.trim().toLowerCase(),
      password: admin.password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
        data: { display_name: admin.name.trim() },
      },
    })
    if (authError) return { error: authError.message }
    userId = authData.user?.id
    if (!userId) return { error: 'Failed to create account.' }

    // 2. 建立公司（status = trial，直接可用，無需人工審批）
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name:          company.name.trim(),
        uen:           company.uen.trim().toUpperCase(),
        address:       company.address?.trim() || null,
        postal_code:   company.postalCode?.trim() || null,
        phone:         company.phone?.trim() || null,
        industry:      company.industry || null,
        status:        'trial',   // ✅ 直接進入試用期，無需人工審批
        plan:          'trial',
        max_employees: 20,
        trial_ends_at: trialEndsAt,
      }])
      .select()
      .single()

    if (companyError) {
      console.error('[register] Company insert failed:', companyError)
      return { error: 'Failed to create company. Please try again.' }
    }
    companyId = companyData.id

    // 3. 建立 super_admin 角色
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{
        user_id:      userId,
        role:         'super_admin',
        display_name: admin.name.trim(),
        email:        admin.email.trim().toLowerCase(),
        company_id:   companyId,
      }])

    if (roleError) {
      console.error('[register] Role insert failed:', roleError)
      // 回滾公司記錄
      await supabase.from('companies').delete().eq('id', companyId)
      return { error: 'Failed to set up account. Please try again.' }
    }

    // 4. 分離型設計：不自動建立 Employee Profile
    // 如需薪資功能，請登入後到「員工管理」手動新增個人員工檔案

    // 5. 通知平台管理員（非阻斷，失敗不影響註冊）
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          action:      'notify-admin',
          to:          'felix.zhao301@gmail.com',
          companyName: company.name.trim(),
          companyUen:  company.uen.trim(),
          adminName:   admin.name.trim(),
          adminEmail:  admin.email.trim().toLowerCase(),
        },
      })
    } catch (notifyErr) {
      console.warn('[register] Admin notification failed (non-blocking):', notifyErr)
    }

    return { success: true }

  } catch (err) {
    console.error('[register] Unexpected error:', err)
    return { error: err.message || 'Registration failed. Please try again.' }
  }
}

// ─────────────────────────────────────────────
// 管理員內部新增公司（Platform Admin 使用，直接 active）
// ─────────────────────────────────────────────
export async function createCompanyByAdmin({ company }) {
  const uenExists = await checkUENExists(company.uen)
  if (uenExists) return { error: 'UEN already registered.' }

  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('companies')
    .insert([{
      name:          company.name.trim(),
      uen:           company.uen.trim().toUpperCase(),
      address:       company.address?.trim() || null,
      postal_code:   company.postalCode?.trim() || null,
      phone:         company.phone?.trim() || null,
      industry:      company.industry || null,
      status:        'active',
      plan:          'trial',
      max_employees: 20,
      trial_ends_at: trialEndsAt,
    }])
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, company: data }
}