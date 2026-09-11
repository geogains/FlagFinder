# GeoRanks Stripe Payment Integration

This package contains everything you need to add Stripe payment functionality to your GeoRanks website using Supabase Edge Functions.

## 📦 What's Included

### Frontend Files
- **pricing.html** - Premium membership pricing page with payment buttons
- **payment-success.html** - Success page displayed after successful payment
- **payment-cancel.html** - Page displayed when user cancels payment

### Backend Files (Supabase Edge Functions)
- **supabase-edge-function-create-checkout.ts** - Creates Stripe Checkout Sessions
- **supabase-edge-function-stripe-webhook.ts** - Handles Stripe webhook events

### Documentation
- **SETUP_GUIDE.md** - Complete step-by-step setup instructions
- **QUICK_REFERENCE.md** - Quick reference for common tasks and troubleshooting
- **README.md** - This file

## 🚀 Quick Start

1. **Read the Setup Guide** - Start with `SETUP_GUIDE.md` for detailed instructions
2. **Set up Stripe** - Create account, products, and get API keys
3. **Deploy Edge Functions** - Deploy the two Supabase Edge Functions
4. **Configure Webhooks** - Set up Stripe webhooks to point to your Edge Function
5. **Update Frontend** - Replace placeholder Price IDs with your actual Stripe Price IDs
6. **Test** - Use Stripe test cards to verify the integration
7. **Go Live** - Switch to live mode when ready

## 📋 Prerequisites

- Supabase account and project
- Stripe account (free to create)
- Supabase CLI installed
- Basic knowledge of HTML/JavaScript
- Your GeoRanks website files

## 🎯 Features

- ✅ Secure payment processing with Stripe Checkout
- ✅ Serverless architecture using Supabase Edge Functions
- ✅ Webhook handling for payment confirmation
- ✅ Support for one-time payments (easily adaptable for subscriptions)
- ✅ Mobile-responsive pricing page
- ✅ Success and cancellation pages
- ✅ Optional payment tracking in database
- ✅ User authentication integration with Supabase Auth

## 💰 Pricing Tiers Included

The pricing page includes three tiers:

1. **Free** - Basic features (current plan)
2. **Premium Monthly** - $9.99/month with all premium features
3. **Premium Yearly** - $99.99/year (save $20)

You can easily customize these tiers, prices, and features in `pricing.html`.

## 🔐 Security

This integration follows Stripe and Supabase security best practices:

- API keys stored securely in Supabase secrets (never exposed to frontend)
- Webhook signature verification to prevent fraud
- CORS headers configured for secure API calls
- Row Level Security (RLS) on database tables
- HTTPS required for production webhooks

## 🛠️ Customization

### Change Pricing
Edit the pricing cards in `pricing.html` to adjust:
- Price amounts
- Feature lists
- Plan names
- Styling

### Add Subscription Support
To enable recurring subscriptions instead of one-time payments:
1. Change `mode: 'payment'` to `mode: 'subscription'` in the Edge Function
2. Create subscription products in Stripe instead of one-time products
3. Handle subscription events in the webhook function

### Track Premium Status
Uncomment the code in `supabase-edge-function-stripe-webhook.ts` to automatically update user premium status in your database.

## 📊 Payment Tracking

The integration includes an optional `payments` table schema to track all transactions. This allows you to:

- View payment history
- Generate revenue reports
- Track user purchases
- Handle refunds and disputes

## 🧪 Testing

Use these Stripe test cards:

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0025 0000 3155 | Requires authentication |
| 4000 0000 0000 9995 | Declined |

## 📚 Documentation

- **SETUP_GUIDE.md** - Comprehensive setup instructions with screenshots
- **QUICK_REFERENCE.md** - Quick commands and troubleshooting tips

## 🆘 Troubleshooting

Common issues and solutions are documented in:
- Section 7 of `SETUP_GUIDE.md`
- "Common Issues & Fixes" table in `QUICK_REFERENCE.md`

## 🔄 Workflow

```
User visits pricing.html
    ↓
Clicks "Get Premium"
    ↓
Frontend calls Supabase Edge Function
    ↓
Edge Function creates Stripe Checkout Session
    ↓
User redirected to Stripe Checkout
    ↓
User enters payment details
    ↓
Payment processed by Stripe
    ↓
Stripe sends webhook to your Edge Function
    ↓
Edge Function records payment in database
    ↓
User redirected to success page
```

## 🌐 Browser Compatibility

The integration works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Mobile Support

All pages are fully responsive and optimized for mobile devices.

## 🔗 Useful Links

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Testing](https://stripe.com/docs/testing)

## 📝 License

This integration code is provided as-is for use with your GeoRanks website.

## 🤝 Support

For issues related to:
- **Stripe** - Contact Stripe Support or check their documentation
- **Supabase** - Visit Supabase Discord or documentation
- **This Integration** - Review the setup guide and troubleshooting sections

## 🎉 Next Steps

After setting up payments:

1. Add premium feature gating to your game modes
2. Create a subscription management page
3. Set up email notifications for payments
4. Add analytics to track conversions
5. Implement promotional codes/discounts
6. Create a premium-only leaderboard

---

**Ready to get started?** Open `SETUP_GUIDE.md` and follow the step-by-step instructions!
