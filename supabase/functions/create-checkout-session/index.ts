// supabase/functions/create-checkout-session/index.ts
// Create a Stripe Checkout Session for Monthly or Yearly subscription.

import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req) => {
  try {
    const { priceId } = await req.json();

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Missing priceId" }),
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancelled`,
    });

    return new Response(
      JSON.stringify({ id: session.id }),
      { status: 200 }
    );

  } catch (error) {
    console.log("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
