# Stripe Payment Integration Setup Guide for GeoRanks

This guide will walk you through integrating Stripe payments into your GeoRanks website using Supabase Edge Functions.

## Overview

The integration consists of the following components:

1. **Supabase Edge Functions** - Two serverless functions to handle Stripe operations
2. **Frontend Pages** - Pricing page, success page, and cancel page
3. **Stripe Configuration** - Products, prices, and webhooks
4. **Database Schema** - Optional table to track payments

---

## Step 1: Set Up Stripe Account

### 1.1 Create a Stripe Account
1. Go to [https://stripe.com](https://stripe.com) and sign up for an account
2. Complete the account verification process
3. Switch to **Test Mode** (toggle in the top right) for development

### 1.2 Get Your API Keys
1. Navigate to **Developers** → **API keys** in the Stripe Dashboard
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Keep these keys secure - you'll need them later

### 1.3 Create Products and Prices
1. Go to **Products** in the Stripe Dashboard
2. Click **Add Product**

**For Monthly Premium:**
- Name: `GeoRanks Premium Monthly`
- Description: `Premium membership with unlimited access`
- Price: `$9.99`
- Billing period: `Monthly`
- Click **Save product**
- Copy the **Price ID** (starts with `price_`)

**For Yearly Premium:**
- Name: `GeoRanks Premium Yearly`
- Description: `Premium membership with unlimited access (yearly)`
- Price: `$99.99`
- Billing period: `Yearly`
- Click **Save product**
- Copy the **Price ID** (starts with `price_`)

---

## Step 2: Set Up Supabase Edge Functions

### 2.1 Install Supabase CLI
If you haven't already, install the Supabase CLI:

```bash
npm install -g supabase
```

### 2.2 Initialize Supabase Project (if not already done)
```bash
supabase login
supabase init
```

### 2.3 Create Edge Functions

Create the first Edge Function for checkout sessions:

```bash
supabase functions new create-checkout-session
```

Replace the contents of `supabase/functions/create-checkout-session/index.ts` with the code from `supabase-edge-function-create-checkout.ts`.

Create the second Edge Function for webhooks:

```bash
supabase functions new stripe-webhook
```

Replace the contents of `supabase/functions/stripe-webhook/index.ts` with the code from `supabase-edge-function-stripe-webhook.ts`.

### 2.4 Set Environment Variables

Set your Stripe secret key as a Supabase secret:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

You'll also need to set the webhook signing secret (we'll get this in Step 3):

```bash
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_webhook_secret_here
```

And set your Supabase URL and service role key:

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2.5 Deploy Edge Functions

Deploy both functions to Supabase:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

After deployment, note the function URLs. They will look like:
- `https://your-project.supabase.co/functions/v1/create-checkout-session`
- `https://your-project.supabase.co/functions/v1/stripe-webhook`

---

## Step 3: Configure Stripe Webhooks

### 3.1 Create a Webhook Endpoint
1. Go to **Developers** → **Webhooks** in the Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**

### 3.2 Get Webhook Signing Secret
1. Click on your newly created webhook endpoint
2. Click **Reveal** under **Signing secret**
3. Copy the signing secret (starts with `whsec_`)
4. Update your Supabase secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_webhook_secret_here
```

---

## Step 4: Create Database Table (Optional)

If you want to track payments in your database, create a `payments` table:

```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  stripe_session_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own payments
CREATE POLICY "Users can view own payments"
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow service role to insert payments
CREATE POLICY "Service role can insert payments"
  ON payments
  FOR INSERT
  WITH CHECK (true);
```

---

## Step 5: Update Frontend Files

### 5.1 Update Price IDs in pricing.html

Open `pricing.html` and replace the placeholder price IDs:

```html
<!-- Find these lines and replace with your actual Stripe Price IDs -->
<button class="btn-purchase" id="buyMonthly" data-price-id="price_YOUR_MONTHLY_PRICE_ID">

<button class="btn-purchase" id="buyYearly" data-price-id="price_YOUR_YEARLY_PRICE_ID">
```

### 5.2 Upload Files to Your Website

Upload the following files to your website's root directory:
- `pricing.html`
- `payment-success.html`
- `payment-cancel.html`

### 5.3 Add Link to Pricing Page

Add a link to the pricing page in your navigation menu. For example, in `index.html`:

```html
<button class="menu-btn" onclick="window.location.href='pricing.html'">💳 Premium</button>
```

---

## Step 6: Testing

### 6.1 Test the Payment Flow

1. Navigate to `pricing.html` on your website
2. Click on one of the "Get Premium" buttons
3. You should be redirected to Stripe Checkout
4. Use Stripe's test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Requires authentication:** `4000 0025 0000 3155`
   - **Declined:** `4000 0000 0000 9995`
5. Use any future expiration date, any 3-digit CVC, and any ZIP code
6. Complete the payment
7. You should be redirected to `payment-success.html`

### 6.2 Verify Webhook Events

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click on your webhook endpoint
3. Check the **Recent events** section to see if events are being received
4. Check your Supabase Edge Function logs to see if the webhook is processing correctly

### 6.3 Check Database (if applicable)

If you created the `payments` table, verify that payment records are being inserted:

```sql
SELECT * FROM payments ORDER BY created_at DESC;
```

---

## Step 7: Go Live

### 7.1 Switch to Live Mode

Once testing is complete:

1. In Stripe Dashboard, switch from **Test mode** to **Live mode**
2. Get your **Live API keys** from **Developers** → **API keys**
3. Update your Supabase secrets with live keys:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_live_secret_key
```

4. Create live products and prices (same as test mode)
5. Update `pricing.html` with live Price IDs
6. Create a new webhook endpoint for live mode
7. Update webhook signing secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_live_webhook_secret
```

---

## Troubleshooting

### Issue: "No checkout URL returned"
- **Solution:** Check that your Supabase Edge Function is deployed correctly and that the Stripe secret key is set properly.

### Issue: Webhook events not being received
- **Solution:** Verify that the webhook URL is correct and that your Edge Function is publicly accessible. Check the Stripe Dashboard for webhook delivery attempts and errors.

### Issue: CORS errors
- **Solution:** The Edge Function includes CORS headers. Make sure you're calling the function from the same domain or that CORS is properly configured.

### Issue: Payment successful but not recorded in database
- **Solution:** Check the webhook function logs in Supabase. Ensure the `payments` table exists and has the correct schema.

---

## Security Best Practices

1. **Never expose your Stripe Secret Key** - Keep it in Supabase secrets only
2. **Always verify webhook signatures** - The webhook function does this automatically
3. **Use HTTPS** - Stripe requires HTTPS for webhooks in production
4. **Validate user input** - The Edge Function validates required fields
5. **Use Row Level Security** - Enable RLS on your payments table
6. **Monitor webhook events** - Regularly check Stripe Dashboard for failed webhooks

---

## Next Steps

1. **Customize the pricing page** - Adjust features, pricing, and styling to match your brand
2. **Add user premium status** - Update your `users` table to track premium membership
3. **Implement feature gating** - Show/hide features based on premium status
4. **Add subscription management** - Allow users to cancel or upgrade subscriptions
5. **Send confirmation emails** - Use Stripe's email receipts or send custom emails
6. **Add analytics** - Track conversion rates and revenue

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## Support

If you encounter any issues or have questions:

1. Check the Supabase Edge Function logs
2. Check the Stripe Dashboard for webhook events
3. Review the browser console for JavaScript errors
4. Consult the Stripe and Supabase documentation

---

**Congratulations!** You've successfully integrated Stripe payments into your GeoRanks website. 🎉
