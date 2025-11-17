// Import Supabase client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Initialize Supabase client
const supabase = createClient(
  "https://ajwxgdaninuzcpfwawug.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI" // Replace with your actual anon key
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

  const response = await fetch("/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      priceId: priceId,
      customer_email: session.user.email,
    }),
  });

  const sessionData = await response.json();

  const stripe = Stripe("pk_test_51STJo6BAeA4hRlOuGyvQ69OhlvaVYkJ8wEZxXOIpBISMf6as1JyEKC2piPaYSCUFiygQuKMdAqhQuQ6YqvVV3XpH0039kE4avf"); // Replace with your real Stripe publishable key
  stripe.redirectToCheckout({ sessionId: sessionData.id });
}

// ✅ Used by premium.html buttons
function startCheckout(planType) {
  if (planType === "monthly") {
    redirectToCheckout(PRICE_MONTHLY);
  } else if (planType === "yearly") {
    redirectToCheckout(PRICE_YEARLY);
  } else {
    alert("Invalid plan type selected.");
  }
}

window.startCheckout = startCheckout;