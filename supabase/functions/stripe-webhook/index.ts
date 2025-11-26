// index.ts - Supabase Edge Function for handling Stripe Webhook

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.5.0?target=deno";
import { Resend } from "npm:resend";

const stripe = Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    console.error("❌ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle successful subscription payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const userId = session.metadata?.userId;
    const email = session.customer_details?.email;

    if (!userId || !email) {
      console.error("❌ Missing userId or email in session metadata.");
      return new Response("Missing user data", { status: 400 });
    }

    // ✅ Update is_premium to true in Supabase
    const supabaseUpdateRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ is_premium: true }),
    });

    if (!supabaseUpdateRes.ok) {
      const error = await supabaseUpdateRes.text();
      console.error("❌ Supabase update failed:", error);
    } else {
      console.log("✅ Supabase profile updated to is_premium: true");
    }

    // ✅ Send confirmation email using Resend
    try {
      await resend.emails.send({
        from: "GeoRanks <no-reply@georanks.com>",
        to: email,
        subject: "🎉 Welcome to GeoRanks Premium!",
        html: `
          <h1>You're now a Premium Member!</h1>
          <p>Thanks for upgrading, ${email}.</p>
          <p>You now have access to all ranking categories without limits.</p>
          <p>Happy ranking! 🌍</p>
          <br/>
          <strong>- The GeoRanks Team</strong>
        `,
      });

      console.log("✅ Confirmation email sent to:", email);
    } catch (emailErr) {
      console.error("❌ Failed to send confirmation email:", emailErr);
    }
  }

  return new Response("OK", { status: 200 });
});
