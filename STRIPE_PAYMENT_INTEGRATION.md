# Stripe Payment Center Integration

## Overview
A complete Stripe Payment Center has been implemented in the Lead/Client profile page, allowing admins to generate Stripe payment links and send them instantly via WhatsApp using customizable templates.

## Files Created/Modified

### 1. Redux State Management
- **`src/store/slices/paymentSlice.ts`**: Redux slice managing payment state
  - `currentAmount`: Payment amount input
  - `selectedCurrency`: Currency selection (ILS, USD, EUR)
  - `isGeneratingLink`: Loading state for link generation
  - `lastGeneratedLink`: Last successfully generated payment URL
  - `paymentMessageTemplate`: WhatsApp message template with `{{payment_link}}` placeholder
  - `error`: Error messages

### 2. Stripe Service
- **`src/services/stripeService.ts`**: Stripe API integration service
  - `createStripePaymentLink()`: Creates Stripe payment links via REST API
  - `createStripeCheckoutSession()`: Alternative method for checkout sessions
  - `convertToSmallestUnit()`: Converts amounts to smallest currency units (cents/agorot)

### 3. UI Component
- **`src/components/dashboard/LeadPaymentCard.tsx`**: Main payment card component
  - Currency selector (ILS, USD, EUR)
  - Amount input with currency symbol
  - Template editor integration (gear icon button)
  - Template preview
  - Create & Send button
  - Error handling and loading states

### 4. Placeholder Support
- **`src/utils/whatsappPlaceholders.ts`**: Added `payment_link` placeholder
  - Available in Template Editor for payment messages

### 5. Integration
- **`src/components/dashboard/ActionDashboard.tsx`**: Added LeadPaymentCard to the grid
- **`src/store/store.ts`**: Added payment reducer to Redux store

## Features

### Core Functionality
1. **Currency Selection**: Choose between ILS (₪), USD ($), or EUR (€)
2. **Amount Input**: Enter payment amount with validation
3. **Template Editor**: Edit WhatsApp message template with rich text editor
   - Supports `{{payment_link}}` placeholder
   - Supports all other existing placeholders (name, phone, email, etc.)
   - Emoji picker integration
   - Rich text formatting (bold, italic, underline, etc.)
4. **Stripe Integration**: Generates secure payment links via Stripe API
5. **WhatsApp Integration**: Automatically sends payment link via Green API
6. **Template Persistence**: Payment message template saved to localStorage

### User Flow
1. Admin selects currency and enters amount
2. Admin can edit the message template (optional)
3. Admin clicks "צור ושלח בקשת תשלום" (Create & Send Payment)
4. System generates Stripe payment link
5. System replaces `{{payment_link}}` placeholder in template
6. System sends WhatsApp message with payment link
7. Success/error feedback via toast notifications

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Stripe Configuration
VITE_STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test or live)

# Green API Configuration (if not already set)
VITE_GREEN_API_ID_INSTANCE=your_instance_id
VITE_GREEN_API_TOKEN_INSTANCE=your_token
```

## Security Note

⚠️ **Important**: The current implementation uses the Stripe secret key directly from the frontend. This is **NOT recommended for production**.

### Recommended Production Setup:
1. Create a backend API endpoint (e.g., `/api/stripe/create-payment-link`)
2. Store `STRIPE_SECRET_KEY` on the backend only
3. Frontend calls your backend API
4. Backend makes the Stripe API call and returns the payment URL

Example backend endpoint structure:
```typescript
// Backend: /api/stripe/create-payment-link
POST /api/stripe/create-payment-link
Body: { amount, currency, customerEmail, customerName, description }
Response: { success, paymentUrl, error }
```

Then update `stripeService.ts` to call your backend instead of Stripe directly.

## Default Payment Template

The default template is:
```
שלום {{name}},

אנא לחץ על הקישור הבא כדי להשלים את התשלום:

{{payment_link}}

תודה!
```

This can be customized via the template editor.

## Error Handling

The component handles:
- Invalid amounts (empty, zero, negative)
- Missing phone numbers
- Stripe API errors
- Green API errors
- Network errors

All errors are displayed to the user via toast notifications and inline error messages.

## RTL Support

All UI components are fully RTL-compatible for Hebrew text.

## Testing

To test the integration:
1. Ensure environment variables are set
2. Select a lead/customer with a valid phone number
3. Enter an amount and select currency
4. Optionally edit the message template
5. Click "צור ושלח בקשת תשלום"
6. Verify the payment link is generated
7. Verify the WhatsApp message is sent with the payment link

## Future Enhancements

Potential improvements:
- Payment status tracking via webhooks
- Payment history in the lead profile
- Multiple payment link templates
- Recurring payment support
- Payment analytics dashboard
