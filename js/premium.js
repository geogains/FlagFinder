// Import Supabase client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Initialize Supabase client
const supabase = createClient(
  "https://ajwxgdaninuzcpfwawug.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI"
);

// ✅ Stripe price IDs (update with your actual IDs from Stripe)
const PRICE_MONTHLY = "price_1STKLbBAeA4hRlOutt7HfrMX";
const PRICE_YEARLY  = "price_1STKnmBAeA4hRlOueE5oXkDP";

// ✅ Shared redirect function
async function redirectToCheckout(priceId) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    alert("Could not connect to your account. Please refresh and try again.");
    return;
  }

  // FIX: Use the full Supabase function URL. Supabase functions are typically hosted at:
  // [SUPABASE_URL]/functions/v1/[FUNCTION_NAME]
  // We need to construct the full URL using the initialized client's URL.
  const functionUrl = `${supabase.supabaseUrl}/functions/v1/create-checkout-session`;
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      priceId: priceId,
      userId: session.user.id,
    }),
  });

  if (!response.ok) {
    // FIX: Handle non-JSON error response from server (e.g., "The page c..." error)
    const errorText = await response.text();
    console.error("Supabase Function Error:", errorText);
    alert("Checkout error: Could not connect to payment service.");
    return;
  }
  const sessionData = await response.json();

  const stripe = Stripe("pk_test_51STJo6BAeA4hRlOuGyvQ69OhlvaVYkJ8wEZxXOIpBISMf6as1JyEKC2piPaYSCUFiygQuKMdAqhQuQ6YqvVV3XpH0039kE4avf"); // Replace with your real Stripe publishable key
  stripe.redirectToCheckout({ sessionId: sessionData.id });
}

// ✅ Used by premium.html buttons
async function startCheckout(planType) {
  // Check if user is logged in FIRST
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    // Show the account required modal
    document.getElementById("accountRequiredModal")?.classList.remove("hidden");
    return;
  }

  // User is logged in, proceed to Stripe
  if (planType === "monthly") {
    redirectToCheckout(PRICE_MONTHLY);
  } else if (planType === "yearly") {
    redirectToCheckout(PRICE_YEARLY);
  } else {
    alert("Invalid plan type selected.");
  }
}

window.startStripeCheckout = startCheckout;