// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// Allowed origin for CORS
const ALLOWED_ORIGIN = "https://www.geo-ranks.com";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Check for POST method
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405, 
        headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } 
      });
    }

    // Get the request body
    const body = await req.json();
    const { priceId, userId } = body;

    // Validate parameters
    if (!priceId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing priceId or userId" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          } 
        }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "https://www.geo-ranks.com/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.geo-ranks.com/cancelled.html",
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    // Return the session ID
    return new Response(JSON.stringify({ id: session.id }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      },
    });

  } catch (err) {
    console.error("Error creating checkout session:", err.message);
    
    // Handle JSON parsing errors
    if (err instanceof SyntaxError) {
        return new Response(
            JSON.stringify({ error: "Invalid JSON input" }),
            { 
                status: 400, 
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                } 
            }
        );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        } 
      }
    );
  }
});