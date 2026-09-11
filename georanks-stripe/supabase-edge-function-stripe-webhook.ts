// Supabase Edge Function: stripe-webhook
// Deploy this to your Supabase project as an Edge Function
// This handles Stripe webhook events for payment confirmation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2024-11-20',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  try {
    // Verify the webhook signature
    const body = await req.text()
    const receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
      undefined,
      cryptoProvider
    )

    console.log(`🔔 Event received: ${receivedEvent.id} - ${receivedEvent.type}`)

    // Handle the event
    switch (receivedEvent.type) {
      case 'checkout.session.completed': {
        const session = receivedEvent.data.object as Stripe.Checkout.Session
        
        // Initialize Supabase client
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Extract metadata
        const userId = session.metadata?.userId
        const customerEmail = session.customer_email

        console.log(`Payment successful for user: ${userId}, email: ${customerEmail}`)

        // Store payment information in your database
        // Example: Update user's premium status or record the transaction
        if (userId && userId !== 'guest') {
          const { error } = await supabaseClient
            .from('payments')
            .insert({
              user_id: userId,
              stripe_session_id: session.id,
              amount: session.amount_total,
              currency: session.currency,
              status: 'completed',
              created_at: new Date().toISOString(),
            })

          if (error) {
            console.error('Error storing payment:', error)
          }

          // You could also update the user's status to premium
          // await supabaseClient
          //   .from('users')
          //   .update({ is_premium: true })
          //   .eq('id', userId)
        }

        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = receivedEvent.data.object as Stripe.PaymentIntent
        console.log(`PaymentIntent was successful: ${paymentIntent.id}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = receivedEvent.data.object as Stripe.PaymentIntent
        console.log(`PaymentIntent failed: ${paymentIntent.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${receivedEvent.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    )
  }
})
