// @deno-types="npm:@types/stripe"
import Stripe from "npm:stripe";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

// Initialize services
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

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
    console.error("❌ Signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    let customerEmail = session.customer_details?.email;

    // ⚠️ Stripe CLI test events contain no email → override with your real email
    if (!customerEmail) {
      console.log("⚠️ No customer email in event → using test override email");
      customerEmail = "kieronjcrooks@outlook.com"; // your test address
    }

    console.log("📧 Email to use:", customerEmail);

    // Update Supabase
    const { error } = await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("email", customerEmail);

    if (error) {
      console.error("❌ Supabase update error:", error.message);
    } else {
      console.log(`✅ Updated user ${customerEmail} to premium.`);
    }

    // Send email
    try {
      console.log("📬 Attempting to send confirmation email...");

      const emailResponse = await resend.emails.send({
        from: "GeoRanks <support@geo-ranks.com>",
        to: customerEmail,
        subject: "🎉 Welcome to GeoRanks Premium!",
        html: `
          <h1>You're now a Premium Member!</h1>
          <p>Thanks for upgrading, ${customerEmail}.</p>
          <p>Enjoy full access to every ranking category.</p>
          <br/>
          <strong>– The GeoRanks Team</strong>
        `,
      });

      console.log("✅ Email sent! Response:", emailResponse);
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr);
    }

    return new Response("Success", { status: 200 });
  }

  return new Response("Unhandled event type", { status: 200 });
});
