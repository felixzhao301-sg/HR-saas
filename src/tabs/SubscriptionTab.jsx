import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 278,
    maxEmployees: 10,
    features: ['Up to 10 employees', 'Payroll & CPF', 'Leave management', 'IR8A filing', 'Basic permissions'],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 59,
    yearlyPrice: 566,
    maxEmployees: 30,
    badge: 'Most Popular',
    features: ['Up to 30 employees', 'Payroll & CPF', 'Leave management', 'IR8A filing', 'Full permissions', 'Commission module', 'Excel export'],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 99,
    yearlyPrice: 950,
    maxEmployees: 100,
    features: ['Up to 100 employees', 'All Growth features', 'Priority support', 'Dedicated account manager'],
  },
]

const PRICE_IDS = {
  starter:  { monthly: 'price_1TQrk0D5czsv8XCcUN2nRxFG', yearly: 'price_1TQrk0D5czsv8XCcVvaDNrmP' },
  growth:   { monthly: 'price_1TQrlOD5czsv8XCcIvPxCFJh', yearly: 'price_1TQrngD5czsv8XCc2UZhiOb3' },
  business: { monthly: 'price_1TQrp4D5czsv8XCcMtc9LyEq', yearly: 'price_1TQrqVD5czsv8XCcwVF13szN' },
}

export default function SubscriptionTab({ company, userRole }) {
  const [billing, setBilling] = useState('monthly')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const validPlans = ['starter', 'growth', 'business']
  const [selectedPlan, setSelectedPlan] = useState(
  validPlans.includes(company?.plan) ? company.plan : 'growth'
  )

  const canManage = ['super_admin'].includes(userRole)

  useEffect(() => { fetchSubscription() }, [company?.id])

  const fetchSubscription = async () => {
    if (!company?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', company.id)
      .eq('status', 'active')
      .maybeSingle()
    setSubscription(data)
    setLoading(false)
  }

  const handleCheckout = async (planId) => {
    if (!canManage) return
    setCheckoutLoading(planId)
    setCheckoutError('')

    try {
      const priceId = PRICE_IDS[planId][billing]
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: priceId,
          company_id: company.id,
          plan_id: planId,
          billing_cycle: billing,
          success_url: window.location.origin + '?checkout=success',
          cancel_url: window.location.origin + '?checkout=cancelled',
        },
      })
      if (error) throw new Error(error.message)
      if (!data?.session_url) throw new Error('No checkout URL returned')
      window.location.href = data.session_url
    } catch (err) {
      setCheckoutError('Failed to start checkout: ' + err.message)
    } finally {
      setCheckoutLoading(null)
    }
  }

  // ── 計算狀態 ──
  const isTrialing = company?.status === 'trial'
  const isActive = company?.status === 'active'
  const trialEnds = company?.trial_ends_at ? new Date(company.trial_ends_at) : null
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24)))
    : null
  const isUrgent = daysLeft !== null && daysLeft <= 7
  const currentPlan = PLANS.find(p => p.id === company?.plan)

  // Checkout result from URL
  const params = new URLSearchParams(window.location.search)
  const checkoutStatus = params.get('checkout')

  return (
    <div style={s.container}>

      {/* ── Result Banners ── */}
      {checkoutStatus === 'success' && (
        <div style={{ ...s.banner, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#166534' }}>
          🎉 Payment successful! Your subscription is now active.
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div style={{ ...s.banner, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
          ℹ️ Checkout cancelled. You can upgrade anytime before your trial ends.
        </div>
      )}
      {checkoutError && (
        <div style={{ ...s.banner, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          ⚠️ {checkoutError}
        </div>
      )}

      {/* ── Status Card ── */}
      {isTrialing && (
        <div style={{
          ...s.trialCard,
          borderColor: isUrgent ? '#FCA5A5' : '#BFDBFE',
          background: isUrgent
            ? 'linear-gradient(135deg, #FFF1F2, #FEF2F2)'
            : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
        }}>
          <div style={s.trialLeft}>
            <div style={s.trialIcon}>{isUrgent ? '⏰' : '🎉'}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: isUrgent ? '#991B1B' : '#1E40AF', marginBottom: 4 }}>
                {isUrgent ? 'Trial Ending Soon!' : 'Free Trial Active'}
              </div>
              <div style={{ fontSize: 14, color: isUrgent ? '#B91C1C' : '#3B82F6' }}>
                {daysLeft !== null
                  ? daysLeft > 0
                    ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining · No payment required yet`
                    : 'Trial expired · Please upgrade to continue'
                  : 'Trial period active'}
              </div>
              {trialEnds && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Trial ends: {trialEnds.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Trial Progress Bar */}
          <div style={s.trialRight}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, textAlign: 'right' }}>
              Trial Progress
            </div>
            <div style={s.progressBg}>
              <div style={{
                ...s.progressFill,
                width: daysLeft !== null ? `${Math.min(100, ((30 - daysLeft) / 30) * 100)}%` : '0%',
                background: isUrgent ? '#EF4444' : '#3B82F6',
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
              Day {daysLeft !== null ? 30 - daysLeft : 0} of 30
            </div>
          </div>
        </div>
      )}

      {isActive && (
        <div style={s.activeCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#166534' }}>
                {currentPlan?.name} Plan — Active
              </div>
              {subscription && (
                <div style={{ fontSize: 13, color: '#15803D', marginTop: 2 }}>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Trial: Info Section (no credit card needed) ── */}
      {isTrialing && !isUrgent && (
        <div style={s.infoBox}>
          <div style={s.infoTitle}>🔒 No credit card required during trial</div>
          <p style={s.infoText}>
            You have full access to all features in your selected plan for the next {daysLeft} days.
            We'll remind you 7 days before your trial ends. You only need to add payment details when you're ready to continue.
          </p>
        </div>
      )}

      {/* ── Urgent: Show upgrade prompt ── */}
      {isTrialing && isUrgent && daysLeft !== null && daysLeft > 0 && (
        <div style={s.urgentBox}>
          <div style={s.urgentTitle}>⚡ Your trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}</div>
          <p style={s.urgentText}>
            Choose a plan below and upgrade now to avoid any interruption to your service.
            Your data is safe — upgrading takes less than 2 minutes.
          </p>
        </div>
      )}

      {/* ── Section Header ── */}
      <div style={s.sectionHead}>
        <h2 style={s.sectionTitle}>
          {isActive ? 'Change Plan' : isUrgent ? 'Upgrade Now' : 'Your Plan After Trial'}
        </h2>
        <div style={s.toggleWrap}>
          {['monthly', 'yearly'].map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              ...s.toggleBtn,
              background: billing === b ? '#1B3A5C' : 'transparent',
              color: billing === b ? '#fff' : '#64748b',
            }}>
              {b === 'monthly' ? 'Monthly' : 'Yearly'}
              {b === 'yearly' && <span style={s.savePill}>Save 2 months</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plans Grid ── */}
      <div style={s.plansGrid}>
        {PLANS.map(plan => {
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const isCurrent = company?.plan === plan.id && isActive
          const isPopular = plan.badge === 'Most Popular'
          const isSelected = selectedPlan === plan.id
          const isLoading = checkoutLoading === plan.id

          return (
            <div
              key={plan.id}
              onClick={() => isTrialing && setSelectedPlan(plan.id)}
              style={{
                ...s.planCard,
                border: isCurrent
                  ? '2px solid #10B981'
                  : isSelected && isTrialing
                  ? '2px solid #1B3A5C'
                  : isPopular
                  ? '2px solid #1B3A5C'
                  : '2px solid #e2e8f0',
                cursor: isTrialing ? 'pointer' : 'default',
                background: isSelected && isTrialing ? '#F0F4FF' : '#fff',
              }}
            >
              {isCurrent && <div style={{ ...s.planBadge, background: '#10B981' }}>Current Plan</div>}
              {!isCurrent && plan.badge && <div style={s.planBadge}>{plan.badge}</div>}

              {/* Selected indicator for trial */}
              {isTrialing && isSelected && !isCurrent && (
                <div style={{ ...s.planBadge, background: '#1B3A5C' }}>Selected</div>
              )}

              <h3 style={s.planName}>{plan.name}</h3>
              <p style={s.planSub}>Up to {plan.maxEmployees} employees</p>

              <div style={s.priceRow}>
                <span style={s.curr}>S$</span>
                <span style={s.price}>{price}</span>
                <span style={s.per}>/{billing === 'monthly' ? 'mo' : 'yr'}</span>
              </div>

              {isTrialing && (
                <p style={{ fontSize: 11, color: '#10B981', fontWeight: 600, marginBottom: 14 }}>
                  Free during trial · {billing === 'yearly'
                    ? `Save S$${plan.monthlyPrice * 12 - plan.yearlyPrice} vs monthly`
                    : `Switch to yearly · save S$${plan.monthlyPrice * 12 - plan.yearlyPrice}/yr`}
                </p>
              )}
              {!isTrialing && (
                <p style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginBottom: 14, minHeight: 18 }}>
                  {billing === 'yearly'
                    ? `Save S$${plan.monthlyPrice * 12 - plan.yearlyPrice} vs monthly`
                    : `Switch to yearly · save S$${plan.monthlyPrice * 12 - plan.yearlyPrice}/yr`}
                </p>
              )}

              <div style={s.featList}>
                {plan.features.map(f => (
                  <div key={f} style={s.featRow}>
                    <span style={s.check}>✓</span>
                    <span style={s.featText}>{f}</span>
                  </div>
                ))}
              </div>

              {/* ── Button logic ── */}
              {isTrialing ? (
                // During trial: only show upgrade button on urgent, otherwise show selection
                isUrgent ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleCheckout(plan.id) }}
                    disabled={!canManage || isLoading}
                    style={{
                      ...s.planBtn,
                      background: isSelected ? '#1B3A5C' : '#fff',
                      color: isSelected ? '#fff' : '#1B3A5C',
                      border: '2px solid #1B3A5C',
                      cursor: canManage ? 'pointer' : 'default',
                      opacity: !canManage ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? 'Loading...' : `Upgrade to ${plan.name}`}
                  </button>
                ) : (
                  <div style={{
                    ...s.planBtn,
                    background: isSelected ? '#EFF6FF' : '#F8FAFC',
                    color: isSelected ? '#1B3A5C' : '#94a3b8',
                    border: isSelected ? '2px solid #BFDBFE' : '2px solid #e2e8f0',
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    {isSelected ? '✓ Selected for after trial' : 'Click to select'}
                  </div>
                )
              ) : (
                // Active subscription
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent || !canManage || isLoading}
                  style={{
                    ...s.planBtn,
                    background: isCurrent ? '#F1F5F9' : isPopular ? '#1B3A5C' : '#fff',
                    color: isCurrent ? '#94a3b8' : isPopular ? '#fff' : '#1B3A5C',
                    border: isCurrent ? '2px solid #e2e8f0' : '2px solid #1B3A5C',
                    cursor: isCurrent || !canManage ? 'default' : 'pointer',
                    opacity: !canManage && !isCurrent ? 0.5 : 1,
                  }}
                >
                  {isLoading ? 'Loading...' : isCurrent ? 'Current Plan' : 'Switch Plan'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Trial CTA: Upgrade before trial ends (non-urgent) ── */}
      {isTrialing && !isUrgent && canManage && (
        <div style={s.trialCTA}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 4 }}>
              Ready to upgrade early?
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              You can upgrade anytime during your trial. Your billing starts immediately.
            </div>
          </div>
          <button
            onClick={() => handleCheckout(selectedPlan)}
            disabled={checkoutLoading === selectedPlan}
            style={s.upgradeBtn}
          >
            {checkoutLoading === selectedPlan ? 'Loading...' : `Upgrade to ${PLANS.find(p => p.id === selectedPlan)?.name} →`}
          </button>
        </div>
      )}

      {/* ── HR Services Banner ── */}
      <div style={s.servicesBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>💼</div>
          <div>
            <h3 style={s.servicesTitle}>Need hands-on HR support?</h3>
            <p style={s.servicesDesc}>
              Our certified professionals can run your monthly payroll, CPF submissions,
              IR8A filing and more — starting from S$199/month.
            </p>
          </div>
        </div>
        <a href="mailto:support@felihr.com" style={s.servicesBtn}>Enquire Now →</a>
      </div>

      {!canManage && (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 16 }}>
          Only Super Admin can manage subscriptions.
        </p>
      )}
    </div>
  )
}

const s = {
  container: {
    fontFamily: "'DM Sans', sans-serif",
    maxWidth: 960, margin: '0 auto', padding: '24px 16px',
  },
  banner: {
    padding: '12px 16px', borderRadius: 10,
    fontSize: 14, fontWeight: 600, marginBottom: 20,
  },

  // Trial card
  trialCard: {
    borderRadius: 16, border: '2px solid',
    padding: '20px 24px', marginBottom: 20,
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 16, flexWrap: 'wrap',
  },
  trialLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  trialIcon: { fontSize: 36, flexShrink: 0 },
  trialRight: { minWidth: 160 },
  progressBg: {
    height: 8, background: '#E2E8F0',
    borderRadius: 8, overflow: 'hidden', width: 160,
  },
  progressFill: { height: '100%', borderRadius: 8, transition: 'width 0.3s' },

  // Active card
  activeCard: {
    background: '#F0FDF4', border: '2px solid #BBF7D0',
    borderRadius: 16, padding: '20px 24px', marginBottom: 20,
  },

  // Info box (trial, non-urgent)
  infoBox: {
    background: '#F0F9FF', border: '1px solid #BAE6FD',
    borderRadius: 12, padding: '14px 18px', marginBottom: 20,
  },
  infoTitle: { fontWeight: 700, fontSize: 14, color: '#0369A1', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#0C4A6E', lineHeight: 1.7 },

  // Urgent box
  urgentBox: {
    background: '#FFF7ED', border: '1px solid #FED7AA',
    borderRadius: 12, padding: '14px 18px', marginBottom: 20,
  },
  urgentTitle: { fontWeight: 700, fontSize: 14, color: '#C2410C', marginBottom: 6 },
  urgentText: { fontSize: 13, color: '#9A3412', lineHeight: 1.7 },

  sectionHead: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
    flexWrap: 'wrap', gap: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: '#0F172A' },
  toggleWrap: {
    display: 'inline-flex', background: '#F1F5F9',
    borderRadius: 50, padding: 4, gap: 4,
  },
  toggleBtn: {
    padding: '8px 16px', borderRadius: 50, border: 'none',
    cursor: 'pointer', fontWeight: 600, fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all 0.2s', fontFamily: 'inherit',
  },
  savePill: {
    background: '#10B981', color: '#fff',
    fontSize: 10, fontWeight: 700,
    padding: '2px 7px', borderRadius: 20,
  },

  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20, marginBottom: 24,
  },
  planCard: {
    background: '#fff', borderRadius: 16,
    padding: 24, position: 'relative',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    transition: 'border-color 0.2s, background 0.2s',
  },
  planBadge: {
    position: 'absolute', top: -12, left: '50%',
    transform: 'translateX(-50%)',
    background: '#1B3A5C', color: '#fff',
    fontSize: 11, fontWeight: 700,
    padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap',
  },
  planName: { fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 3, marginTop: 8 },
  planSub: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  priceRow: { display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 4 },
  curr: { fontSize: 16, fontWeight: 700, color: '#1B3A5C', lineHeight: 2 },
  price: { fontSize: 42, fontWeight: 800, color: '#1B3A5C', lineHeight: 1 },
  per: { fontSize: 14, color: '#94a3b8', marginBottom: 4 },
  featList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, minHeight: 100 },
  featRow: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  check: { color: '#10B981', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 },
  featText: { fontSize: 13, color: '#374151', lineHeight: 1.5 },
  planBtn: {
    width: '100%', padding: '12px',
    borderRadius: 10, fontWeight: 700, fontSize: 14,
    transition: 'all 0.2s', fontFamily: 'inherit',
    display: 'block',
  },

  // Trial CTA
  trialCTA: {
    background: '#F8FAFC', border: '2px solid #e2e8f0',
    borderRadius: 14, padding: '20px 24px',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 16, flexWrap: 'wrap',
    marginBottom: 24,
  },
  upgradeBtn: {
    background: '#1B3A5C', color: '#fff',
    border: 'none', borderRadius: 10,
    padding: '12px 24px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'inherit', flexShrink: 0,
  },

  servicesBanner: {
    background: 'linear-gradient(135deg, #1B3A5C, #2E6DA4)',
    borderRadius: 16, padding: '24px 28px',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 20, flexWrap: 'wrap',
  },
  servicesTitle: { fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 },
  servicesDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', maxWidth: 480 },
  servicesBtn: {
    background: '#fff', color: '#1B3A5C',
    border: 'none', borderRadius: 10,
    padding: '12px 24px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', whiteSpace: 'nowrap',
    textDecoration: 'none', display: 'inline-block', flexShrink: 0,
  },
}