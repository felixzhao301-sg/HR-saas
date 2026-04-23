import { supabase } from '../supabase'

// ─── 計劃定義 ───────────────────────────────────────────────
export const PLANS = {
  trial: {
    name: 'Trial',
    maxEmployees: 20,
    durationDays: 30,
  },
  starter: {
    name: 'Starter',
    maxEmployees: 50,
    durationDays: 365,
  },
  pro: {
    name: 'Pro',
    maxEmployees: 200,
    durationDays: 365,
  },
  enterprise: {
    name: 'Enterprise',
    maxEmployees: 9999,
    durationDays: 365,
  },
}

// ─── 升級計劃（平台管理員手動操作，未來接 Stripe）──────────
export async function upgradePlan(companyId, plan) {
  const planConfig = PLANS[plan]
  if (!planConfig) return { error: 'Invalid plan' }

  const now = new Date()
  const endsAt = new Date(now)
  endsAt.setDate(endsAt.getDate() + planConfig.durationDays)

  const updates = {
    plan,
    status: 'active',
    max_employees: planConfig.maxEmployees,
  }

  if (plan === 'trial') {
    updates.trial_ends_at = endsAt.toISOString()
    updates.subscription_ends_at = null
  } else {
    updates.subscription_ends_at = endsAt.toISOString()
    // trial_ends_at 保留不變
  }

  const { error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)

  return { error }
}

// ─── 取得公司訂閱資料 ───────────────────────────────────────
export async function getCompanySubscription(companyId) {
  const { data } = await supabase
    .from('companies')
    .select('id, name, status, plan, trial_ends_at, subscription_ends_at')
    .eq('id', companyId)
    .single()
  return data
}

// ─── 計算試用剩餘天數 ───────────────────────────────────────
export function getTrialDaysLeft(company) {
  if (!company?.trial_ends_at) return null
  const diff = new Date(company.trial_ends_at) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── 檢查公司是否可以訪問系統 ──────────────────────────────
export function checkCompanyValid(company) {
  if (!company) return { valid: false, reason: 'no_company' }

  if (company.status === 'suspended') return { valid: false, reason: 'suspended' }
  if (company.status === 'pending') return { valid: false, reason: 'pending_approval' }

  if (company.plan === 'trial' && company.trial_ends_at) {
    if (new Date(company.trial_ends_at) < new Date()) {
      return { valid: false, reason: 'trial_expired' }
    }
  }

  if (company.plan !== 'trial' && company.subscription_ends_at) {
    if (new Date(company.subscription_ends_at) < new Date()) {
      return { valid: false, reason: 'subscription_expired' }
    }
  }

  return { valid: true, reason: null }
}