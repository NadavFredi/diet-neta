# Quick Payment Test - Super Simple! 🚀

## Method 1: Browser Console (Fastest!)

1. **Open any customer/lead detail page** in your app
2. **Open Browser Console** (F12 → Console tab)
3. **Paste this code:**

```javascript
// Get customer ID from current page
const customerId = window.__CUSTOMER_ID__ || prompt('Enter Customer ID:');

// Create test payment
const testPayment = {
  customer_id: customerId,
  product_name: 'חבילת אימון אישי - 3 חודשים (בדיקה)',
  amount: 1299.00,
  currency: 'ILS',
  status: 'שולם',
  stripe_payment_id: `pi_test_${Date.now()}`,
  transaction_id: `txn_test_${Date.now()}`,
  notes: 'תשלום בדיקה'
};

const { data, error } = await supabase.from('payments').insert(testPayment).select().single();

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Payment created!', data);
  alert('✅ Payment created! Click "תשלומים" button to see it.');
  window.location.reload();
}
```

4. **Press Enter** - Done! ✅

## Method 2: Add Test Button (One-time setup)

Add this to `ClientHero.tsx` temporarily for testing:

```tsx
{/* Temporary Test Button - Remove after testing */}
<Button
  onClick={async () => {
    if (!customer?.id) return;
    const testPayment = {
      customer_id: customer.id,
      lead_id: lead?.id || null,
      product_name: 'חבילת אימון אישי - 3 חודשים (בדיקה)',
      amount: 1299.00,
      currency: 'ILS',
      status: 'שולם',
      stripe_payment_id: `pi_test_${Date.now()}`,
      transaction_id: `txn_test_${Date.now()}`,
      notes: 'תשלום בדיקה'
    };
    const { error } = await supabase.from('payments').insert(testPayment);
    if (!error) {
      alert('✅ Test payment created!');
      window.location.reload();
    }
  }}
  variant="outline"
  size="sm"
>
  🧪 Test Payment
</Button>
```

## That's it! 

After creating a payment, click the **"תשלומים"** button to see it in the modal.

