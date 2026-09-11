// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// Allowed origin for CORS
const ALLOWED_ORIGIN = "https://www.geo-ranks.com";

// Server-side allowlist of GeoRanks Premium Stripe Price IDs. The browser
// chooses which of these to request, but the server decides which are
// actually eligible for Premium checkout — never trust priceId blindly.
// Must be kept in sync by hand with PRICE_MONTHLY / PRICE_YEARLY in
// js/premium.js (there is no shared build step between the site and the
// Deno edge functions to source this from one place without adding a
// bundler, which is more complexity than this two-value list warrants).
const ALLOWED_PRICE_IDS = new Set([
  "price_1TsgvjB2pnEWYYPPkGP7bf1X", // Premium — Monthly
  "price_1TsgwMB2pnEWYYPPWxYFNiro", // Premium — Yearly
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Require a valid Supabase JWT from the caller. Platform-level verify_jwt
  // is controlled by supabase/config.toml's [functions.create-checkout-session]
  // block (now verify_jwt = true), NOT by anything in this function's
  // deno.json — that key has no effect on gateway JWT gating. Even so,
  // gateway verification alone only proves this is a validly-signed
  // Supabase JWT — the anon key is itself a validly-signed JWT with no
  // user attached, so that alone would not stop an anon-key request.
  // auth.getUser() below is what actually resolves and verifies a real
  // authenticated user, mirroring create-portal-session's own manual check.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Get the request body. userId is intentionally NOT accepted here —
    // the GeoRanks user is always the server-verified `user` resolved above.
    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Missing priceId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Reject anything not on the server allowlist — no silent fallback to
    // a different price.
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      console.warn("Rejected checkout attempt for non-allowlisted priceId:", priceId, "user:", user.id);
      return new Response(
        JSON.stringify({ error: "Invalid priceId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Stripe checkout session, attributed to the server-verified user.
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
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
      },
    });

    // Return the session ID
    return new Response(JSON.stringify({ id: session.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
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
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
