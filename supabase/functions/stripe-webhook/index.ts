// supabase/functions/stripe-webhook/index.ts
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      endpointSecret!
    );

    // Handle subscription events
    if (event.type === "checkout.session.completed") {
      console.log("Checkout complete:", event.data.object.id);
      // TODO: Mark user as premium in database
    }

    if (event.type === "customer.subscription.deleted") {
      console.log("Subscription cancelled:", event.data.object.id);
      // TODO: Remove premium access
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err.message);

    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }
});
