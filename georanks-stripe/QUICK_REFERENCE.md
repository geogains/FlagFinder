# Stripe Integration Quick Reference

## File Structure

```
your-website/
├── pricing.html                    # Pricing page with payment buttons
├── payment-success.html            # Success page after payment
├── payment-cancel.html             # Cancel page if user cancels
└── supabase/
    └── functions/
        ├── create-checkout-session/
        │   └── index.ts            # Creates Stripe Checkout sessions
        └── stripe-webhook/
            └── index.ts            # Handles Stripe webhook events
```

## Essential Stripe Test Cards

| Purpose | Card Number | Details |
|---------|-------------|---------|
| Success | `4242 4242 4242 4242` | Payment succeeds |
| Authentication | `4000 0025 0000 3155` | Requires 3D Secure |
| Declined | `4000 0000 0000 9995` | Payment declined |

Use any future expiration date, any 3-digit CVC, any ZIP code.

## Supabase CLI Commands

```bash
# Login to Supabase
supabase login

# Create a new Edge Function
supabase functions new function-name

# Set a secret
supabase secrets set SECRET_NAME=value

# Deploy a function
supabase functions deploy function-name

# View function logs
supabase functions logs function-name
```

## Required Environment Variables

Set these in Supabase:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Stripe Dashboard URLs

- **API Keys:** https://dashboard.stripe.com/test/apikeys
- **Products:** https://dashboard.stripe.com/test/products
- **Webhooks:** https://dashboard.stripe.com/test/webhooks
- **Payments:** https://dashboard.stripe.com/test/payments

## Database Schema (Optional)

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
```

## Webhook Events to Listen For

- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment processed
- `payment_intent.payment_failed` - Payment failed

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| CORS error | Edge Function includes CORS headers - check function deployment |
| No checkout URL | Verify Stripe secret key is set correctly |
| Webhook not firing | Check webhook URL and signing secret |
| Payment not recorded | Check Edge Function logs and database permissions |

## Testing Checklist

- [ ] Stripe account created and in test mode
- [ ] Products and prices created in Stripe
- [ ] Edge Functions deployed to Supabase
- [ ] Secrets configured in Supabase
- [ ] Webhook endpoint created in Stripe
- [ ] Price IDs updated in pricing.html
- [ ] Test payment with test card
- [ ] Verify webhook receives events
- [ ] Check database for payment record (if applicable)

## Go-Live Checklist

- [ ] Switch Stripe to live mode
- [ ] Create live products and prices
- [ ] Update Supabase secrets with live keys
- [ ] Create live webhook endpoint
- [ ] Update pricing.html with live price IDs
- [ ] Test with real card (small amount)
- [ ] Monitor webhook events
- [ ] Set up email notifications

## Key URLs to Replace

In `pricing.html`, replace:
- `YOUR_MONTHLY_PRICE_ID` → Your actual Stripe monthly price ID
- `YOUR_YEARLY_PRICE_ID` → Your actual Stripe yearly price ID

In webhook configuration:
- `https://your-project.supabase.co/functions/v1/stripe-webhook` → Your actual function URL

## Payment Flow Diagram

```
User clicks "Get Premium"
    ↓
Frontend calls create-checkout-session Edge Function
    ↓
Edge Function creates Stripe Checkout Session
    ↓
User redirected to Stripe Checkout page
    ↓
User completes payment
    ↓
Stripe sends webhook to stripe-webhook Edge Function
    ↓
Edge Function records payment in database
    ↓
User redirected to payment-success.html
```

## Support Resources

- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- Stripe Support: https://support.stripe.com
- Supabase Discord: https://discord.supabase.com
