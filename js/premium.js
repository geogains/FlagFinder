// Stripe setup
const stripe = Stripe(
  "pk_test_51STJo6BAeA4hRlOuGyvQ69OhlvaVYkJ8wEZxXOIpBISMf6as1JyEKC2piPaYSCUFiygQuKMdAqhQuQ6YqvVV3XpH0039kE4avf"
);

const CHECKOUT_URL =
  "https://ajwxgdaninuzcpfwawug.supabase.co/functions/v1/create-checkout-session";

const PRICE_MONTHLY = "price_1STKLbBAeA4hRlOutt7HfrMX";
const PRICE_YEARLY  = "price_1STKnmBAeA4hRlOueE5oXkDP";

// 👇 Supabase client (set on window in account.html)
const supabase = window.supabaseClient || createClient(
  "https://ajwxgdaninuzcpfwawug.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI"
);

async function redirectToCheckout(priceId) {
  if (!supabase) {
    console.error("Supabase client not found on window");
    alert("Could not connect to your account. Please refresh and try again.");
    return;
  }

  // 1️⃣ Get current logged-in user from Supabase
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting session:", error);
    alert("Could not verify your session. Please sign in again.");
    return;
  }

  if (!session?.user?.id) {
    alert("You must be logged in to purchase premium.");
    return;
  }

  const userId = session.user.id;

  // 2️⃣ Send BOTH priceId + userId to Supabase function
  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, userId }), // ✅ Step 3 requirement
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Checkout error:", data.error || res.statusText);
    alert("Checkout error: " + (data.error || "Please try again."));
    return;
  }

  // 3️⃣ Redirect to Stripe Checkout
  // Your function currently returns { id: session.id }
  // so we use data.id here.
  await stripe.redirectToCheckout({ sessionId: data.id });
}

// Handle modal
const modal       = document.getElementById("premium-modal");
const openBtn     = document.getElementById("open-premium-modal");
const closeBtn    = document.getElementById("close-premium-modal");
const planButtons = document.querySelectorAll(".premium-select-btn");

if (openBtn && modal) {
  openBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });
}

if (closeBtn && modal) {
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

// Pricing buttons
planButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const plan = btn.dataset.plan;

    if (plan === "monthly") redirectToCheckout(PRICE_MONTHLY);
    if (plan === "yearly")  redirectToCheckout(PRICE_YEARLY);
  });
});

// Used by premium.html buttons
function startCheckout(planType) {
  if (planType === "monthly") {
    redirectToCheckout(PRICE_MONTHLY);
  } else if (planType === "yearly") {
    redirectToCheckout(PRICE_YEARLY);
  } else {
    alert("Invalid plan type selected.");
  }
}