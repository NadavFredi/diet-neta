/**
 * Stripe Webhook Handler Edge Function
 * 
 * Receives Stripe webhook events and saves payment records to the database.
 * Handles: payment_intent.succeeded, payment_intent.payment_failed, etc.
 * 
 * NO tokens stored in frontend - all Stripe communication is server-side.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

serve(async (req) => {

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Get Stripe webhook secret from environment
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    // Note: In production, verify webhook signature
    // For now, we'll process webhooks (signature verification should be added for production)

    // Parse request body
    const rawBody = await req.text();
    let event: StripeEvent;
    
    try {
      event = JSON.parse(rawBody);
    } catch (parseError) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const supabase = createSupabaseAdmin();
    const eventType = event.type;
    const paymentIntent = event.data.object;

    // Handle different Stripe event types
    switch (eventType) {
      case 'payment_intent.succeeded': {
        
        // Extract data from payment intent
        const stripePaymentId = paymentIntent.id;
        const amount = paymentIntent.amount ? paymentIntent.amount / 100 : 0; // Convert from cents
        const currency = (paymentIntent.currency || 'ils').toUpperCase();
        const metadata = paymentIntent.metadata || {};
        
        // Extract customer_id and lead_id from metadata (should be set when creating payment link)
        const customerId = metadata.customer_id || metadata.customerId || null;
        const leadId = metadata.lead_id || metadata.leadId || null;
        const productName = metadata.product_name || metadata.productName || 'תשלום';
        
        // Extract receipt URL if available
        const receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url || null;

        if (!customerId) {
          // Still return success to Stripe (we don't want to retry)
          return successResponse({ message: 'Payment succeeded but no customer_id provided' });
        }

        // Check if payment already exists
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_id', stripePaymentId)
          .maybeSingle();

        if (existingPayment) {
          // Update existing payment
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'שולם',
              receipt_url: receiptUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPayment.id);

          if (updateError) {
            return errorResponse(`Failed to update payment: ${updateError.message}`, 500);
          }

          return successResponse({ message: 'Payment updated', paymentId: existingPayment.id });
        }

        // Create new payment record
        const paymentData = {
          customer_id: customerId,
          lead_id: leadId || null,
          product_name: productName,
          amount: amount,
          currency: currency,
          status: 'שולם' as const,
          stripe_payment_id: stripePaymentId,
          transaction_id: stripePaymentId, // Use Stripe payment ID as transaction ID
          receipt_url: receiptUrl,
        };


        const { data: newPayment, error: insertError } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (insertError) {
          return errorResponse(`Failed to create payment: ${insertError.message}`, 500);
        }

        return successResponse({ message: 'Payment created', paymentId: newPayment.id });
      }

      case 'payment_intent.payment_failed': {
        
        const stripePaymentId = paymentIntent.id;
        const metadata = paymentIntent.metadata || {};
        const customerId = metadata.customer_id || metadata.customerId || null;

        if (!customerId) {
          return successResponse({ message: 'Payment failed but no customer_id provided' });
        }

        // Check if payment exists and update status
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_id', stripePaymentId)
          .maybeSingle();

        if (existingPayment) {
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'נכשל',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPayment.id);

          if (updateError) {
            return errorResponse(`Failed to update payment: ${updateError.message}`, 500);
          }
        } else {
          // Create payment record with failed status
          const amount = paymentIntent.amount ? paymentIntent.amount / 100 : 0;
          const currency = (paymentIntent.currency || 'ils').toUpperCase();
          const productName = metadata.product_name || metadata.productName || 'תשלום';
          const leadId = metadata.lead_id || metadata.leadId || null;

          const paymentData = {
            customer_id: customerId,
            lead_id: leadId || null,
            product_name: productName,
            amount: amount,
            currency: currency,
            status: 'נכשל' as const,
            stripe_payment_id: stripePaymentId,
            transaction_id: stripePaymentId,
          };

          const { error: insertError } = await supabase
            .from('payments')
            .insert(paymentData);

          if (insertError) {
          }
        }

        return successResponse({ message: 'Payment failure recorded' });
      }

      case 'charge.refunded': {
        
        const charge = paymentIntent;
        const paymentIntentId = charge.payment_intent;
        
        if (!paymentIntentId) {
          return successResponse({ message: 'Refund processed but no payment_intent found' });
        }

        // Find payment by stripe_payment_id and update status
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_id', paymentIntentId)
          .maybeSingle();

        if (payment) {
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'הוחזר',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          if (updateError) {
          } else {
          }
        }

        return successResponse({ message: 'Refund processed' });
      }

      default:
        // Ignore other event types (we can add more handlers later)
        return successResponse({ message: `Event ${eventType} received but not processed` });
    }
  } catch (error: any) {
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});
