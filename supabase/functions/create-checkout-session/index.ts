// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// CORS for browser access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

Deno.serve(async (req) => {
  // Handle browser preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get origin of request (localhost or production)
    const origin =
      req.headers.get("origin") ?? "https://www.geo-ranks.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancelled`,
    });

    return new Response(JSON.stringify({ id: session.id }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Checkout error:", err);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
