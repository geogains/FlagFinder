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

// Revoke premium access for a subscription that has ended or been canceled.
// Matches by stripe_subscription_id first (most precise), falls back to stripe_customer_id.
async function revokeUserPremium(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id ?? null;

  // Primary: match on subscription ID
  if (subscriptionId) {
    const { error, count } = await supabase
      .from("users")
      .update({ is_premium: false })
      .eq("stripe_subscription_id", subscriptionId)
      .select("id", { count: "exact", head: true });

    if (!error && (count ?? 0) > 0) {
      console.log(`✅ Premium revoked via stripe_subscription_id: ${subscriptionId}`);
      return;
    }
    if (error) {
      console.error("❌ Revoke by subscription_id failed:", error.message);
    }
  }

  // Fallback: match on customer ID
  if (customerId) {
    const { error } = await supabase
      .from("users")
      .update({ is_premium: false })
      .eq("stripe_customer_id", customerId);

    if (!error) {
      console.log(`✅ Premium revoked via stripe_customer_id: ${customerId}`);
    } else {
      console.error("❌ Revoke by customer_id failed:", error.message);
    }
  } else {
    console.error("❌ No subscription or customer ID available to revoke premium");
  }
}

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
    
    // Try multiple ways to identify the user
    const customerEmail = session.customer_details?.email || session.customer_email;
    const userId = session.client_reference_id || session.metadata?.userId;

    console.log("📧 Customer email:", customerEmail);
    console.log("👤 User ID:", userId);

    // Prefer updating by user ID (more reliable), fall back to email
    let updateError = null;
    let updateMethod = "";

    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

    const premiumUpdate = {
      is_premium: true,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripe_subscription_id: stripeSubscriptionId } : {}),
    };

    if (userId) {
      // Primary method: Update by user ID
      const { error } = await supabase
        .from("users")
        .update(premiumUpdate)
        .eq("id", userId);

      updateError = error;
      updateMethod = "user_id";
    } else if (customerEmail) {
      // Fallback method: Update by email
      const { error } = await supabase
        .from("users")
        .update(premiumUpdate)
        .eq("email", customerEmail);
      
      updateError = error;
      updateMethod = "email";
    } else {
      // No identifier available - this is a critical error
      console.error("❌ CRITICAL: No user identifier in checkout session!", {
        session_id: session.id,
        customer_details: session.customer_details,
        metadata: session.metadata
      });
      return new Response("Missing user identifier - cannot process upgrade", { status: 400 });
    }

    if (updateError) {
      console.error(`❌ Supabase update error (via ${updateMethod}):`, updateError.message);
    } else {
      console.log(`✅ User upgraded to premium via ${updateMethod}:`, userId || customerEmail);
    }

    // Only send confirmation email if we have an email address
    if (customerEmail) {
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
      <h2 style="text-align: center; font-weight: 600;">Welcome to GeoRanks Premium! 🎉</h2>

      <!-- Message -->
      <p style="text-align: center; font-size: 16px;">
        You can now enjoy full access to all Categories, Stats and Game Modes.
      </p>
      <p style="text-align: center; font-size: 16px;">
        Thanks for supporting the growth of GeoRanks.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 2rem 0;">
        <a href="https://geo-ranks.com/success" style="background: linear-gradient(90deg, #f97316, #f43f5e); color: white; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: 6px; font-weight: 600; display: inline-block;">
          Explore Premium Features
        </a>
      </div>

      <!-- Footer -->
      <p style="text-align: center; font-size: 14px; color: #888; margin-top: 2rem;">
        — GeoRanks
      </p>

    </div>
  </body>
</html>
`
        });

        console.log("✅ Email sent! Response:", emailResponse);

      } catch (emailErr) {
        console.error("❌ Email send failed:", emailErr);
      }
    } else {
      console.log("⚠️ No email address available - skipping confirmation email");
    }

    return new Response("Success", { status: 200 });
  }

  // Subscription fully deleted (fires when cancellation takes effect, whether
  // the user cancelled immediately or at period end).
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    console.log("🔔 subscription.deleted — revoking premium:", subscription.id);
    await revokeUserPremium(subscription);
    return new Response("Success", { status: 200 });
  }

  // Subscription status changed. Only revoke for terminal states where access
  // should definitively end. Do NOT revoke for "past_due" (Stripe is still
  // retrying payment) or "cancel_at_period_end" (subscription stays active
  // until period ends, deletion fires customer.subscription.deleted then).
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const revokeStatuses = ["canceled", "unpaid"];
    if (revokeStatuses.includes(subscription.status)) {
      console.log(`🔔 subscription.updated — status "${subscription.status}" — revoking premium:`, subscription.id);
      await revokeUserPremium(subscription);
    }
    return new Response("Success", { status: 200 });
  }

  return new Response("Unhandled event type", { status: 200 });
});