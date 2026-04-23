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
// 公開註冊（建立公司 + 管理員帳號 + 管理員 Profile）
// ─────────────────────────────────────────────
export async function registerCompany({ company, admin }) {
  const uenExists = await checkUENExists(company.uen)
  if (uenExists) return { error: 'UEN already registered.' }

  let userId = null
  let companyId = null

  try {
    // 1. 建立 Auth 帳號
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: admin.email,
      password: admin.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: admin.name },
      },
    })
    if (authError) return { error: authError.message }
    userId = authData.user?.id
    if (!userId) return { error: 'Failed to create account.' }

    // 2. 插入 companies 表
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: company.name.trim(),
        uen: company.uen.trim().toUpperCase(),
        address: company.address.trim(),
        postal_code: company.postalCode.trim(),
        phone: company.phone.trim() || null,
        industry: company.industry || null,
        status: 'pending',
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }])
      .select()
      .single()

    if (companyError) {
      console.error('[register] Company insert failed:', companyError)
      return { error: 'Failed to create company. Please try again.' }
    }
    companyId = companyData.id

    // 3. 插入 user_roles（super_admin）
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role: 'super_admin',
        display_name: admin.name.trim(),
        email: admin.email.trim().toLowerCase(),
        company_id: companyId,
      }])

    if (roleError) {
      console.error('[register] Role insert failed:', roleError)
      await supabase.from('companies').delete().eq('id', companyId)
      return { error: 'Failed to set up account. Please try again.' }
    }

    // 4. 自動建立 Super Admin 的 Employee Profile
    const { error: profileError } = await supabase
      .from('employees')
      .insert([{
        company_id: companyId,
        auth_user_id: userId,
        full_name: admin.name.trim(),
        work_email: admin.email.trim().toLowerCase(),
        personal_email: admin.email.trim().toLowerCase(),
        position: admin.position?.trim() || 'Director',
        employment_type: 'full_time',
        join_date: new Date().toISOString().split('T')[0],
      }])

    if (profileError) {
      // Profile 建失敗不阻止註冊，HR 可之後補填
      console.warn('[register] Profile creation failed (non-blocking):', profileError)
    }

    // 5. 通知平台管理員
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'new_company_registered',
          to: 'felix.zhao301@gmail.com',
          companyName: company.name.trim(),
          companyUen: company.uen.trim(),
          adminName: admin.name.trim(),
          adminEmail: admin.email.trim(),
        },
      })
    } catch (notifyErr) {
      console.warn('[register] Admin notification failed:', notifyErr)
    }

    return { success: true }

  } catch (err) {
    console.error('[register] Unexpected error:', err)
    return { error: err.message || 'Registration failed. Please try again.' }
  }
}

// ─────────────────────────────────────────────
// 管理員內部新增公司（直接 active）
// ─────────────────────────────────────────────
export async function createCompanyByAdmin({ company }) {
  const uenExists = await checkUENExists(company.uen)
  if (uenExists) return { error: 'UEN already registered.' }

  const { data, error } = await supabase
    .from('companies')
    .insert([{
      name: company.name.trim(),
      uen: company.uen.trim().toUpperCase(),
      address: company.address?.trim() || null,
      postal_code: company.postalCode?.trim() || null,
      phone: company.phone?.trim() || null,
      industry: company.industry || null,
      status: 'active',
      plan: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }])
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, company: data }
}