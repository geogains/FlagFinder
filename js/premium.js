// ✅ Import shared Supabase client
import { supabase } from './supabase-client.js';

// ✅ Stripe Price IDs from your Dashboard
const PRICE_MONTHLY = "price_1SXV7xB2pnEWYYPP3WmbEXAf";
const PRICE_YEARLY  = "price_1SXV9CB2pnEWYYPPlAYocHkY";

// Get anon key for function calls
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI';

// ✅ Redirect to Stripe Checkout using Supabase Edge Function
async function redirectToCheckout(priceId) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    alert("Could not connect to your account. Please refresh and try again.");
    return;
  }

  try {
    const functionUrl = `https://ajwxgdaninuzcpfwawug.supabase.co/functions/v1/create-checkout-session`;
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        priceId: priceId,
        userId: session.user.id,
        userEmail: session.user.email
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Supabase Function Error:", errorText);
      alert("Checkout error: Could not connect to payment service.");
      return;
    }

    const sessionData = await response.json();

    // Initialize Stripe
    const stripe = Stripe("pk_live_51STJnqB2pnEWYYPPlzXvgKRntTDDeb83rXzxu795jyjUMKKxCX8FsZF9D3Q538TccPik2NOe8IAu8jgQnkz5i4EQ00MJDaq4V4");
    
    // Redirect to checkout
    const { error } = await stripe.redirectToCheckout({ sessionId: sessionData.id });
    
    if (error) {
      console.error("Stripe redirect error:", error);
      alert("Failed to redirect to checkout. Please try again.");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    alert("An error occurred. Please try again.");
  }
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