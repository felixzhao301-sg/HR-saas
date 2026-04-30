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

  try {
    const { price_id, company_id, plan_id, billing_cycle, success_url, cancel_url } = await req.json()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: {
        company_id,
        plan_id,
        billing_cycle,
      },
      subscription_data: {
        metadata: {
          company_id,
          plan_id,
        }
      }
    })

    return new Response(
      JSON.stringify({ session_url: session.url }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})