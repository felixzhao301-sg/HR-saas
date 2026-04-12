import { supabase } from '../supabase'
import { getCompanySubscription, checkCompanyValid, getTrialDaysLeft } from './subscription'

// ─────────────────────────────────────────────
// 登入後檢查公司狀態
// 在 App.jsx 的 loadUserRole 裡調用
// 返回 { allowed, reason, company, trialDaysLeft }
// ─────────────────────────────────────────────
export async function guardCompanyAccess(companyId) {
  if (!companyId) return { allowed: false, reason: 'no_company' }

  const company = await getCompanySubscription(companyId)
  const { valid, reason } = checkCompanyValid(company)
  const trialDaysLeft = getTrialDaysLeft(company)

  return {
    allowed: valid,
    reason,
    company,
    trialDaysLeft,
  }
}

// ─────────────────────────────────────────────
// 錯誤信息（多語言）
// ─────────────────────────────────────────────
export function getGuardMessage(reason, language = 'en') {
  const messages = {
    pending_approval: {
      zh: '你的公司帳號正在審核中，請等待平台管理員批准。',
      en: 'Your company account is pending approval. Please wait for platform admin review.',
    },
    suspended: {
      zh: '你的公司帳號已被停用，請聯繫平台支援。',
      en: 'Your company account has been suspended. Please contact platform support.',
    },
    trial_expired: {
      zh: '試用期已結束，請升級計劃以繼續使用。',
      en: 'Your trial has expired. Please upgrade your plan to continue.',
    },
    subscription_expired: {
      zh: '訂閱已過期，請續訂以繼續使用。',
      en: 'Your subscription has expired. Please renew to continue.',
    },
    no_company: {
      zh: '找不到公司資料，請聯繫平台支援。',
      en: 'Company not found. Please contact platform support.',
    },
  }
  return messages[reason]?.[language] || messages[reason]?.en || 'Access denied.'
}

// ─────────────────────────────────────────────
// Platform Admin 檢查
// user_roles 有 role = 'platform_admin' 的才能進平台管理
// ─────────────────────────────────────────────
export async function isPlatformAdmin(userId) {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'platform_admin')
    .maybeSingle()
  return !!data
}