// supabase/functions/stripe-webhook/index.ts
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // IMPORTANT
);

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret!);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ✨ When payment succeeds
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const userId = session.metadata.userId;

    // Update user as premium
    await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("id", userId);

    console.log("Premium activated for user: ", userId);
  }

  // ✨ If subscription ends or cancelled
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;

    const userId = subscription.metadata.userId;

    await supabase
      .from("users")
      .update({ is_premium: false })
      .eq("id", userId);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
