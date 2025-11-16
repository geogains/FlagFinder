// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

Deno.serve(async (req) => {
  // --- CORS support (IMPORTANT) ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { plan, userId } = await req.json();

    if (!plan || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing plan or userId" }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const prices: Record<string, string> = {
      monthly: "price_1SdFgxBAeA4hRlOu9dcnPBRb",
      yearly: "price_1SdFh9BAeA4hRlOuGDR6VFuD",
    };

    const priceId = prices[plan];

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.geo-ranks.com/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.geo-ranks.com/cancelled.html",
      metadata: { userId },
    });

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );

  } catch (error) {
    console.error("CHECKOUT ERROR:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
