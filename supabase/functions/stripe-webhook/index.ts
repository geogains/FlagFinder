// stripe-webhook/index.ts

// @deno-types="npm:@types/stripe"
import Stripe from "npm:stripe";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load secrets from environment
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_details?.email;

    if (!customerEmail) {
      return new Response("Missing customer email.", { status: 400 });
    }

    // Update Supabase user
    const { error } = await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("email", customerEmail);

    if (error) {
      console.error("Supabase update error:", error.message);
      return new Response("Failed to update user.", { status: 500 });
    }

    console.log(`User ${customerEmail} upgraded to premium.`);
    return new Response("Success", { status: 200 });
  }

  // Return success for unhandled events
  return new Response("Unhandled event type", { status: 200 });
});

