// Stripe setup
console.log("Supabase client in premium.js =", window.supabaseClient);
const stripe = Stripe(
  "pk_test_51STJo6BAeA4hRlOuGyvQ69OhlvaVYkJ8wEZxXOIpBISMf6as1JyEKC2piPaYSCUFiygQuKMdAqhQuQ6YqvVV3XpH0039kE4avf"
);

const CHECKOUT_URL =
  "https://ajwxgdaninuzcpfwawug.supabase.co/functions/v1/create-checkout-session";

const PRICE_MONTHLY = "price_1STKLbBAeA4hRlOutt7HfrMX";
const PRICE_YEARLY = "price_1STKnmBAeA4hRlOueE5oXkDP";

// Supabase client (needed to get userId)
const supabase = window.supabaseClient;

async function redirectToCheckout(priceId) {
  // get current Supabase user
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    alert("You must be logged in to purchase premium.");
    return;
  }

  const userId = session.user.id;

  // send BOTH priceId + userId to backend
  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, userId }),
  });

  const data = await res.json();

  if (data.error) {
    alert("Checkout error: " + data.error);
    return;
  }

  // redirect to Stripe
  stripe.redirectToCheckout({ sessionId: data.id });
}

// Handle modal
const modal = document.getElementById("premium-modal");
const openBtn = document.getElementById("open-premium-modal");
const closeBtn = document.getElementById("close-premium-modal");
const planButtons = document.querySelectorAll(".premium-select-btn");

openBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

// pricing buttons
planButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const plan = btn.dataset.plan;

    if (plan === "monthly") redirectToCheckout(PRICE_MONTHLY);
    if (plan === "yearly") redirectToCheckout(PRICE_YEARLY);
  });
});
