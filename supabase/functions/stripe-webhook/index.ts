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

// Apply an arbitrary update to public.users for a given subscription.
// Matches by stripe_subscription_id first (most precise), falls back to stripe_customer_id.
async function syncUserBySubscription(
  subscription: Stripe.Subscription,
  update: Record<string, unknown>
): Promise<boolean> {
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id ?? null;

  // Primary: match on subscription ID
  if (subscriptionId) {
    const { error, count } = await supabase
      .from("users")
      .update(update)
      .eq("stripe_subscription_id", subscriptionId)
      .select("id", { count: "exact", head: true });

    if (!error && (count ?? 0) > 0) {
      console.log(`✅ Synced user via stripe_subscription_id ${subscriptionId}:`, JSON.stringify(update));
      return true;
    }
    if (error) {
      console.error("❌ Sync by subscription_id failed:", error.message);
    }
  }

  // Fallback: match on customer ID
  if (customerId) {
    const { error } = await supabase
      .from("users")
      .update(update)
      .eq("stripe_customer_id", customerId);

    if (!error) {
      console.log(`✅ Synced user via stripe_customer_id ${customerId}:`, JSON.stringify(update));
      return true;
    }
    console.error("❌ Sync by customer_id failed:", error.message);
  } else {
    console.error("❌ No subscription or customer ID available to sync user");
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email helpers
// ─────────────────────────────────────────────────────────────────────────────

// Fetch user row columns needed for email operations, keyed by stripe_customer_id.
async function fetchUserForEmail(subscription: Stripe.Subscription): Promise<{
  id: string;
  email: string | null;
  cancellation_email_sent_at: string | null;
  premium_ended_email_sent_at: string | null;
  premium_until: string | null;
} | null> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id ?? null;

  if (!customerId) {
    console.error("❌ fetchUserForEmail: no customer ID on subscription", subscription.id);
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, cancellation_email_sent_at, premium_ended_email_sent_at, premium_until")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !data) {
    console.error("❌ fetchUserForEmail: lookup failed for customer", customerId, error?.message);
    return null;
  }
  return data;
}

// Send "cancellation confirmed" email — once per cancellation cycle.
// periodEnd may be null if Stripe did not include current_period_end in the event.
// Fallback chain: Stripe periodEnd → DB premium_until → generic wording.
// Flag is set AFTER a successful Resend call so failed sends remain retryable.
async function maybeSendCancellationEmail(
  subscription: Stripe.Subscription,
  periodEnd: string | null
): Promise<void> {
  console.log("CANCELLATION EMAIL: entering for subscription", subscription.id);
  const user = await fetchUserForEmail(subscription);
  if (!user) return;

  if (user.cancellation_email_sent_at) {
    console.log("CANCELLATION EMAIL skipped — already sent at", user.cancellation_email_sent_at);
    return;
  }
  if (!user.email) {
    console.log("CANCELLATION EMAIL skipped — no email on file for user", user.id);
    return;
  }

  // Resolve effective end date with three-tier fallback.
  let effectiveEndDate: string | null = null;
  let endDateSentence: string;

  if (periodEnd) {
    console.log("CANCELLATION EMAIL: using Stripe periodEnd:", periodEnd);
    effectiveEndDate = periodEnd;
  } else if (user.premium_until) {
    console.log("CANCELLATION EMAIL: using DB premium_until fallback:", user.premium_until);
    effectiveEndDate = user.premium_until;
  } else {
    console.log("CANCELLATION EMAIL: sending without explicit end date fallback");
  }

  if (effectiveEndDate) {
    const formattedDate = new Date(effectiveEndDate).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
    endDateSentence = `Your Premium access will remain active until <strong>${formattedDate}</strong>.`;
  } else {
    endDateSentence = "Your Premium access will remain active until the end of your current billing period.";
  }

  try {
    const sendResult = await resend.emails.send({
      from: "GeoRanks <support@geo-ranks.com>",
      to: user.email,
      subject: "Your GeoRanks Premium cancellation is confirmed",
      html: `
<!DOCTYPE html>
<html lang="en" style="font-family: 'Poppins', sans-serif;">
  <head>
    <meta charset="UTF-8" />
    <title>Premium Cancellation Confirmed</title>
  </head>
  <body style="background-color: #f5f7fa; padding: 2rem; color: #0d315a; font-family: 'Poppins', sans-serif;">
    <div style="max-width: 480px; margin: auto; background: #ffffff; padding: 2rem; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);">

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img
          src="https://geo-ranks.com/assets/logo.png"
          alt="GeoRanks Logo"
          style="width: 180px; max-width: 100%; height: auto;"
        />
      </div>

      <h2 style="text-align: center; font-weight: 600;">Cancellation Confirmed</h2>

      <p style="text-align: center; font-size: 16px;">
        We've confirmed your GeoRanks Premium cancellation.
      </p>
      <p style="text-align: center; font-size: 16px;">
        ${endDateSentence}
      </p>
      <p style="text-align: center; font-size: 16px;">
        After that, your account will return to the free plan.
      </p>
      <p style="text-align: center; font-size: 16px;">
        Changed your mind? You can reactivate your subscription at any time before then from your <a href="https://www.geo-ranks.com/account.html" style="color: #f97316;">account page</a>.
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="https://www.geo-ranks.com/account.html" style="background: linear-gradient(90deg, #f97316, #f43f5e); color: white; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: 6px; font-weight: 600; display: inline-block;">
          Resubscribe Anytime
        </a>
      </div>

      <p style="text-align: center; font-size: 14px; color: #888; margin-top: 2rem;">
        — GeoRanks
      </p>

    </div>
  </body>
</html>
`,
    });
    console.log("CANCELLATION EMAIL sent to:", user.email, "resend id:", sendResult?.data?.id ?? "n/a");

    // Set dedup flag only after a confirmed successful send.
    const { error: flagError } = await supabase
      .from("users")
      .update({ cancellation_email_sent_at: new Date().toISOString() })
      .eq("id", user.id);
    if (flagError) {
      console.error("❌ CANCELLATION EMAIL: failed to set dedup flag (send succeeded):", flagError.message);
    }
  } catch (err) {
    console.error("❌ CANCELLATION EMAIL: Resend failed:", (err as Error).message);
  }
}

// Send "premium has ended" email — once per subscription deletion.
// Flag is set AFTER a successful Resend call so failed sends remain retryable.
async function maybeSendPremiumEndedEmail(subscription: Stripe.Subscription): Promise<void> {
  console.log("PREMIUM ENDED EMAIL: entering for subscription", subscription.id);
  const user = await fetchUserForEmail(subscription);
  if (!user) return;

  if (user.premium_ended_email_sent_at) {
    console.log("PREMIUM ENDED EMAIL skipped — already sent at", user.premium_ended_email_sent_at);
    return;
  }
  if (!user.email) {
    console.log("PREMIUM ENDED EMAIL skipped — no email on file for user", user.id);
    return;
  }

  console.log("PREMIUM ENDED EMAIL: sending to", user.email);
  try {
    const sendResult = await resend.emails.send({
      from: "GeoRanks <support@geo-ranks.com>",
      to: user.email,
      subject: "Your GeoRanks Premium has ended",
      html: `
<!DOCTYPE html>
<html lang="en" style="font-family: 'Poppins', sans-serif;">
  <head>
    <meta charset="UTF-8" />
    <title>Premium Access Ended</title>
  </head>
  <body style="background-color: #f5f7fa; padding: 2rem; color: #0d315a; font-family: 'Poppins', sans-serif;">
    <div style="max-width: 480px; margin: auto; background: #ffffff; padding: 2rem; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);">

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img
          src="https://geo-ranks.com/assets/logo.png"
          alt="GeoRanks Logo"
          style="width: 180px; max-width: 100%; height: auto;"
        />
      </div>

      <h2 style="text-align: center; font-weight: 600;">Your Premium Access Has Ended</h2>

      <p style="text-align: center; font-size: 16px;">
        Your GeoRanks Premium access has now ended.
      </p>
      <p style="text-align: center; font-size: 16px;">
        Your account is back on the free plan. Thanks for supporting GeoRanks — we hope to see you again!
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="https://www.geo-ranks.com/premium.html" style="background: linear-gradient(90deg, #f97316, #f43f5e); color: white; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: 6px; font-weight: 600; display: inline-block;">
          Upgrade Again
        </a>
      </div>

      <p style="text-align: center; font-size: 14px; color: #888; margin-top: 2rem;">
        — GeoRanks
      </p>

    </div>
  </body>
</html>
`,
    });
    console.log("PREMIUM ENDED EMAIL sent to:", user.email, "resend id:", sendResult?.data?.id ?? "n/a");

    // Set dedup flag only after a confirmed successful send.
    const { error: flagError } = await supabase
      .from("users")
      .update({ premium_ended_email_sent_at: new Date().toISOString() })
      .eq("id", user.id);
    if (flagError) {
      console.error("❌ PREMIUM ENDED EMAIL: failed to set dedup flag (send succeeded):", flagError.message);
    }
  } catch (err) {
    console.error("❌ PREMIUM ENDED EMAIL: Resend failed:", (err as Error).message);
  }
}

serve(async (req) => {
  // Version sentinel — update this string and redeploy to confirm new code is live.
  console.log("WEBHOOK V2 invoked:", req.method, new Date().toISOString());

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

    // Retrieve the full subscription to get current_period_end for premium_until.
    // The checkout session carries the subscription ID but not the full object.
    let premiumUntil: string | null = null;
    if (stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
      } catch (err) {
        console.error("⚠️ Could not retrieve subscription for premium_until:", (err as Error).message);
      }
    }

    const premiumUpdate: Record<string, unknown> = {
      is_premium: true,
      premium_since: new Date().toISOString(),  // set once at activation; not overwritten on renewals
      cancellation_email_sent_at: null,         // reset so future cancellations can send again
      premium_ended_email_sent_at: null,        // reset on new subscription
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripe_subscription_id: stripeSubscriptionId } : {}),
      ...(premiumUntil ? { premium_until: premiumUntil } : {}),
    };

    console.log("WEBHOOK V2 checkout premium update payload:", JSON.stringify(premiumUpdate));

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

  // Subscription fully deleted — fires when cancellation takes effect,
  // whether the user cancelled immediately or at period end.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const periodEndUnix = subscription.current_period_end;
    if (!periodEndUnix) {
      console.error("DELETED EVENT: missing current_period_end on subscription:", subscription.id);
    }
    const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
    console.log("DELETED EVENT RECEIVED — subscription:", subscription.id, "customer:", subscription.customer, "period_end:", periodEnd);
    console.log("🔔 subscription.deleted — revoking premium:", subscription.id, "period_end:", periodEnd);
    const deletedUpdate: Record<string, unknown> = {
      is_premium: false,
      stripe_subscription_id: null,
      ...(periodEnd ? { premium_until: periodEnd } : {}),
    };
    console.log("WEBHOOK V2 subscription.deleted payload:", JSON.stringify(deletedUpdate));
    await syncUserBySubscription(subscription, deletedUpdate);
    await maybeSendPremiumEndedEmail(subscription);
    return new Response("Success", { status: 200 });
  }

  // Subscription status changed — sync premium access with current Stripe state.
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const periodEndUnix = subscription.current_period_end;
    if (!periodEndUnix) {
      console.error("SUBSCRIPTION UPDATED: missing current_period_end on subscription:", subscription.id);
    }
    const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

    console.log("SUBSCRIPTION UPDATED RECEIVED — id:", subscription.id,
      "| status:", subscription.status,
      "| cancel_at_period_end:", subscription.cancel_at_period_end,
      "| current_period_end:", periodEnd);

    if (subscription.status === "active" || subscription.status === "trialing") {
      console.log("SUBSCRIPTION UPDATED: entering active/trialing branch");
      // Covers all active cases:
      //   - normal renewal (current_period_end advances)
      //   - cancel_at_period_end=true: access continues until period ends, premium_until reflects boundary
      //   - reactivation (cancel_at_period_end flipped back to false): reset cancellation flag
      const activeUpdate: Record<string, unknown> = {
        is_premium: true,
        ...(periodEnd ? { premium_until: periodEnd } : {}),
        // On reactivation, reset the cancellation flag so future cancellations can send again.
        ...(!subscription.cancel_at_period_end ? { cancellation_email_sent_at: null } : {}),
      };
      console.log(`WEBHOOK V2 subscription.updated payload (status="${subscription.status}" cancel_at_period_end=${subscription.cancel_at_period_end}):`, JSON.stringify(activeUpdate));
      await syncUserBySubscription(subscription, activeUpdate);

      // Send cancellation-confirmed email when the user schedules cancellation at period end.
      if (subscription.cancel_at_period_end) {
        if (periodEnd) {
          console.log("SUBSCRIPTION UPDATED: cancel_at_period_end=true — calling maybeSendCancellationEmail with Stripe periodEnd");
        } else {
          console.log("SUBSCRIPTION UPDATED: cancel_at_period_end=true — calling maybeSendCancellationEmail with null periodEnd, fallback expected");
        }
        await maybeSendCancellationEmail(subscription, periodEnd);
      } else {
        console.log("SUBSCRIPTION UPDATED: cancel_at_period_end=false — skipping cancellation email");
      }
    } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
      // Terminal — revoke premium now.
      // Note: customer.subscription.deleted will also fire for "canceled" shortly after;
      // both setting is_premium=false is safe and idempotent.
      const revokeUpdate: Record<string, unknown> = {
        is_premium: false,
        ...(periodEnd ? { premium_until: periodEnd } : {}),
      };
      console.log(`WEBHOOK V2 subscription.updated payload (status="${subscription.status}"):`, JSON.stringify(revokeUpdate));
      await syncUserBySubscription(subscription, revokeUpdate);
    }
    // past_due: Stripe is actively retrying payment — do not change is_premium.
    // incomplete / incomplete_expired / paused: not reached from active subscriptions here.

    return new Response("Success", { status: 200 });
  }

  return new Response("Unhandled event type", { status: 200 });
});