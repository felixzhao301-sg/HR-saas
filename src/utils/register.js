//註冊邏輯（模塊化）這是核心邏輯
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
// 公開註冊（建立公司 + 管理員帳號）
// ─────────────────────────────────────────────
export async function registerCompany({ company, admin }) {
  // 1. 檢查 UEN 重複
  const uenExists = await checkUENExists(company.uen)
  if (uenExists) return { error: 'UEN already registered.' }

  // 2. 建立 Auth 帳號（Supabase 會自動發確認郵件）
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: admin.email,
    password: admin.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { display_name: admin.name }
    }
  })
  if (authError) return { error: authError.message }

  const userId = authData.user?.id
  if (!userId) return { error: 'Failed to create account.' }

  // 3. 插入 companies 表
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert([{
      name: company.name,
      uen: company.uen,
      address: company.address,
      postal_code: company.postalCode,
      phone: company.phone,
      industry: company.industry,
      status: 'pending',
    }])
    .select()
    .single()
  if (companyError) return { error: companyError.message }

  // 4. 插入 user_roles（super_admin）
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert([{
      user_id: userId,
      role: 'super_admin',
      display_name: admin.name,
      email: admin.email,
      company_id: companyData.id,
    }])
  if (roleError) return { error: roleError.message }

  return { success: true }
}

// ─────────────────────────────────────────────
// 管理員內部新增公司（直接 active，無需確認）
// 只建立公司記錄，不建立帳號
// ─────────────────────────────────────────────
export async function createCompanyByAdmin({ company }) {
  const uenExists = await checkUENExists(company.uen)
  if (uenExists) return { error: 'UEN already registered.' }

  const { data, error } = await supabase
    .from('companies')
    .insert([{
      name: company.name,
      uen: company.uen,
      address: company.address,
      postal_code: company.postalCode,
      phone: company.phone,
      industry: company.industry,
      status: 'active',
    }])
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, company: data }
}