// supabase/functions/stripe-webhook/index.ts
// Handles Stripe subscription events.

import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }

  // Handle subscription events
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.resumed":
      console.log("Subscription active/updated:", event.data.object.id);
      break;

    case "customer.subscription.deleted":
    case "customer.subscription.canceled":
      console.log("Subscription cancelled:", event.data.object.id);
      break;

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
