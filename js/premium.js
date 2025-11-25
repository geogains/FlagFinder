// ✅ Import Supabase client via ES Module
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Initialize Supabase client
const supabase = createClient(
  "https://ajwxgdaninuzcpfwawug.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI"
);

// ✅ Stripe Price IDs from your Dashboard
const PRICE_MONTHLY = "price_1STKLbBAeA4hRlOutt7HfrMX";
const PRICE_YEARLY  = "price_1STKnmBAeA4hRlOueE5oXkDP";

// ✅ Redirect to Stripe Checkout using Supabase Edge Function
async function redirectToCheckout(priceId) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    alert("Could not connect to your account. Please refresh and try again.");
    return;
  }

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
    const errorText = await response.text();
    console.error("❌ Supabase Function Error:", errorText);
    alert("Checkout error: Could not connect to payment service.");
    return;
  }

  const sessionData = await response.json();

  const stripe = Stripe("pk_test_51STJo6BAeA4hRlOuGyvQ69OhlvaVYkJ8wEZxXOIpBISMf6as1JyEKC2piPaYSCUFiygQuKMdAqhQuQ6YqvVV3XpH0039kE4avf");
  stripe.redirectToCheckout({ sessionId: sessionData.id });
}

// ✅ Main handler exposed globally
async function startCheckout(planType) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    const modal = document.getElementById("accountRequiredModal");
    if (modal) modal.classList.remove("hidden");
    return;
  }

  switch (planType) {
    case "monthly":
      await redirectToCheckout(PRICE_MONTHLY);
      break;
    case "yearly":
      await redirectToCheckout(PRICE_YEARLY);
      break;
    default:
      alert("Invalid plan type selected.");
  }
}

// ✅ Expose to global scope for HTML button onclick use
window.startStripeCheckout = startCheckout;
