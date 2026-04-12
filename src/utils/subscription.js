import { supabase } from '../supabase'

// ─────────────────────────────────────────────
// 訂閱計劃定義（之後接 Stripe 改這裡）
// ─────────────────────────────────────────────
export const PLANS = {
  trial: {
    name: 'Trial',
    maxEmployees: 20,
    durationDays: 30,
    price: 0,
  },
  basic: {
    name: 'Basic',
    maxEmployees: 50,
    durationDays: 30,
    price: 49,
  },
  pro: {
    name: 'Pro',
    maxEmployees: 200,
    durationDays: 30,
    price: 99,
  },
  enterprise: {
    name: 'Enterprise',
    maxEmployees: 9999,
    durationDays: 30,
    price: null, // 聯繫報價
  },
}

// ─────────────────────────────────────────────
// 取公司訂閱狀態
// ─────────────────────────────────────────────
export async function getCompanySubscription(companyId) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, status, plan, trial_ends_at, subscription_ends_at, max_employees')
    .eq('id', companyId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

// ─────────────────────────────────────────────
// 檢查公司是否有效（status + 到期）
// 返回 { valid, reason }
// ─────────────────────────────────────────────
export function checkCompanyValid(company) {
  if (!company) return { valid: false, reason: 'company_not_found' }
  if (company.status === 'pending') return { valid: false, reason: 'pending_approval' }
  if (company.status === 'suspended') return { valid: false, reason: 'suspended' }

  const now = new Date()

  // Trial 到期檢查
  if (company.plan === 'trial' && company.trial_ends_at) {
    if (new Date(company.trial_ends_at) < now) {
      return { valid: false, reason: 'trial_expired' }
    }
  }

  // 付費訂閱到期檢查
  if (company.plan !== 'trial' && company.subscription_ends_at) {
    if (new Date(company.subscription_ends_at) < now) {
      return { valid: false, reason: 'subscription_expired' }
    }
  }

  return { valid: true, reason: null }
}

// ─────────────────────────────────────────────
// 取剩餘試用天數
// ─────────────────────────────────────────────
export function getTrialDaysLeft(company) {
  if (!company?.trial_ends_at) return 0
  const diff = new Date(company.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ─────────────────────────────────────────────
// 升級計劃（預留 Stripe 接口）
// 現在只更新資料庫，之後加 Stripe checkout
// ─────────────────────────────────────────────
export async function upgradePlan(companyId, plan) {
  const planConfig = PLANS[plan]
  if (!planConfig) return { error: 'Invalid plan' }

  const subscriptionEndsAt = new Date()
  subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + planConfig.durationDays)

  const { error } = await supabase
    .from('companies')
    .update({
      plan,
      status: 'active',
      max_employees: planConfig.maxEmployees,
      subscription_ends_at: subscriptionEndsAt.toISOString(),
    })
    .eq('id', companyId)

  if (error) return { error: error.message }
  return { success: true }
}