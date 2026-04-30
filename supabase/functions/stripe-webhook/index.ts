import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`Processing event: ${event.type}`)

  // ─── 1. 付款成功（訂閱建立）───────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const companyId = session.metadata?.company_id
    const planId = session.metadata?.plan_id
    const billingCycle = session.metadata?.billing_cycle

    if (companyId) {
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1))

      // 更新公司狀態
      await supabase.from('companies').update({
        status: 'active',
        plan: planId,
        subscription_ends_at: periodEnd.toISOString(),
      }).eq('id', companyId)

      // 建立訂閱記錄
      await supabase.from('subscriptions').upsert({
        company_id: companyId,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      })

      console.log(`Company ${companyId} upgraded to ${planId}`)
    }
  }

  // ─── 2. 發票付款成功 ──────────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice

    // 從 subscription metadata 拿 company_id
    let companyId: string | null = null

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      )
      companyId = subscription.metadata?.company_id || null
    }

    if (companyId && invoice.id) {
      // 寫入 invoices 表
      await supabase.from('invoices').upsert({
        company_id: companyId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
        amount: (invoice.amount_paid || 0) / 100,  // Stripe 用分，轉換為元
        currency: invoice.currency?.toUpperCase() || 'SGD',
        status: 'paid',
        invoice_pdf: invoice.invoice_pdf,
        paid_at: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString(),
      })

      // 同時更新訂閱的續期日期
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
        await supabase.from('subscriptions').update({
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          status: 'active',
        }).eq('stripe_subscription_id', invoice.subscription)

        // 更新公司訂閱到期日
        await supabase.from('companies').update({
          subscription_ends_at: new Date(sub.current_period_end * 1000).toISOString(),
          status: 'active',
        }).eq('id', companyId)
      }

      console.log(`Invoice ${invoice.id} recorded for company ${companyId}`)
    }
  }

  // ─── 3. 發票付款失敗 ──────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice

    let companyId: string | null = null
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      )
      companyId = subscription.metadata?.company_id || null
    }

    if (companyId && invoice.id) {
      // 記錄失敗發票
      await supabase.from('invoices').upsert({
        company_id: companyId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'SGD',
        status: 'open',
        invoice_pdf: invoice.invoice_pdf,
      })

      console.log(`Invoice payment failed for company ${companyId}`)
    }
  }

  // ─── 4. 訂閱取消 ─────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const companyId = subscription.metadata?.company_id

    await supabase.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)

    if (companyId) {
      await supabase.from('companies')
        .update({ status: 'suspended' })
        .eq('id', companyId)

      console.log(`Company ${companyId} subscription cancelled`)
    }
  }

  // ─── 5. 訂閱即將取消（客戶設置了 cancel_at_period_end）────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription

    await supabase.from('subscriptions')
      .update({
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  })
})