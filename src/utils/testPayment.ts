/**
 * Quick Payment Test Utility
 * 
 * Simple function to create a test payment directly from browser console
 * Usage: Just paste this in browser console on any customer detail page
 */

import { supabase } from '@/lib/supabaseClient';

export async function createTestPayment(customerId: string, leadId?: string | null) {
  try {
    const testPayment = {
      customer_id: customerId,
      lead_id: leadId || null,
      product_name: 'חבילת אימון אישי - 3 חודשים (בדיקה)',
      amount: 1299.00,
      currency: 'ILS',
      status: 'שולם' as const,
      stripe_payment_id: `pi_test_${Date.now()}`,
      transaction_id: `txn_test_${Date.now()}`,
      receipt_url: null,
      notes: 'תשלום בדיקה - נוצר אוטומטית',
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(testPayment)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating payment:', error);
      return { success: false, error };
    }

    console.log('✅ Payment created successfully!', data);
    console.log('💡 Refresh the page and click "תשלומים" button to see it');
    
    return { success: true, payment: data };
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Browser Console Helper
 * Paste this in browser console on customer detail page:
 * 
 * // Get customer ID from page
 * const customerId = window.location.pathname.includes('/leads/') 
 *   ? (await (await fetch('/api/get-customer-id')).json()).id 
 *   : prompt('Enter customer ID:');
 * 
 * // Create test payment
 * const { createTestPayment } = await import('/src/utils/testPayment.ts');
 * await createTestPayment(customerId);
 */

