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
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ Missing Stripe signature");
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const rawBody = await req.arrayBuffer();
  const textBody = new TextDecoder("utf-8").decode(rawBody);

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      textBody,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("❌ Signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    let customerEmail = session.customer_details?.email;

    if (!customerEmail) {
      console.log("⚠️ No customer email in event → using test override");
      customerEmail = "kieronjcrooks@outlook.com";
    }

    console.log("📧 Email to use:", customerEmail);

    const { error } = await supabase
      .from("users")
      .update({ is_premium: true })
      .eq("email", customerEmail);

    if (error) {
      console.error("❌ Supabase update error:", error.message);
    } else {
      console.log(`✅ User ${customerEmail} upgraded to premium`);
    }

    try {
      const emailResponse = await resend.emails.send({
        from: "GeoRanks <support@geo-ranks.com>",
        to: customerEmail,
        subject: "🎉 Welcome to GeoRanks Premium!",
        html: `
<!DOCTYPE html>
<html lang="en" style="font-family: 'Poppins', sans-serif;">
  <head>
    <meta charset="UTF-8" />
    <title>Premium Confirmation</title>
  </head>
  <body style="background-color: #f5f7fa; padding: 2rem; color: #0d315a; font-family: 'Poppins', sans-serif;">
    <div style="max-width: 480px; margin: auto; background: #ffffff; padding: 2rem; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);">
      
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img 
          src="https://geo-ranks.com/assets/logo.png" 
          alt="GeoRanks Logo" 
          style="width: 180px; max-width: 100%; height: auto;" 
        />
      </div>

      <!-- Header -->
      <h2 style="text-align: center; font-weight: 600;">You're now a Premium Member!</h2>

      <!-- Message -->
      <p style="text-align: center; font-size: 16px;">
        Thanks for upgrading, ${customerEmail}.
      </p>
      <p style="text-align: center; font-size: 16px;">
        Enjoy full access to every ranking category.
      </p>

      <!-- Footer -->
      <p style="text-align: center; font-size: 14px; color: #888; margin-top: 2rem;">
        — The GeoRanks Team
      </p>

    </div>
  </body>
</html>
`,
      });
      console.log("✅ Email sent:", emailResponse);
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr);
    }

    return new Response("Success", { status: 200 });
  }

  return new Response("Unhandled event type", { status: 200 });
});
