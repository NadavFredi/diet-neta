// Supabase Edge Function to create payment records
// This endpoint allows creating payment records for customers/leads

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

interface CreatePaymentRequest {
  customer_id: string;
  lead_id?: string | null;
  product_name: string;
  amount: number;
  currency?: string;
  status: 'שולם' | 'ממתין' | 'הוחזר' | 'נכשל';
  stripe_payment_id?: string;
  transaction_id?: string;
  receipt_url?: string;
  notes?: string;
}

serve(async (req) => {
  console.log('[create-payment] Function called:', {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log('[create-payment] Handling OPTIONS request');
    return corsResponse;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Authorization header required', 401);
    }

    // Create Supabase client with admin privileges
    const supabase = createSupabaseAdmin();

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[create-payment] Auth error:', authError);
      return errorResponse('Invalid or expired token', 401);
    }

    console.log('[create-payment] Authenticated user:', user.id);

    // Parse request body
    const body: CreatePaymentRequest = await req.json();
    console.log('[create-payment] Request body:', body);

    // Validate required fields
    if (!body.customer_id) {
      return errorResponse('customer_id is required', 400);
    }

    if (!body.product_name || body.product_name.trim() === '') {
      return errorResponse('product_name is required', 400);
    }

    if (typeof body.amount !== 'number' || body.amount < 0) {
      return errorResponse('amount must be a positive number', 400);
    }

    if (!body.status || !['שולם', 'ממתין', 'הוחזר', 'נכשל'].includes(body.status)) {
      return errorResponse('status must be one of: שולם, ממתין, הוחזר, נכשל', 400);
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', body.customer_id)
      .single();

    if (customerError || !customer) {
      console.error('[create-payment] Customer not found:', customerError);
      return errorResponse('Customer not found', 404);
    }

    // Verify lead exists if provided
    if (body.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, customer_id')
        .eq('id', body.lead_id)
        .single();

      if (leadError || !lead) {
        console.error('[create-payment] Lead not found:', leadError);
        return errorResponse('Lead not found', 404);
      }

      // Verify lead belongs to the customer
      if (lead.customer_id !== body.customer_id) {
        return errorResponse('Lead does not belong to the specified customer', 400);
      }
    }

    // Prepare payment data
    const paymentData = {
      customer_id: body.customer_id,
      lead_id: body.lead_id || null,
      product_name: body.product_name.trim(),
      amount: body.amount,
      currency: body.currency || 'ILS',
      status: body.status,
      stripe_payment_id: body.stripe_payment_id || null,
      transaction_id: body.transaction_id || null,
      receipt_url: body.receipt_url || null,
      notes: body.notes || null,
      created_by: user.id,
    };

    console.log('[create-payment] Inserting payment:', paymentData);

    // Insert payment record
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (insertError) {
      console.error('[create-payment] Insert error:', insertError);
      return errorResponse(`Failed to create payment: ${insertError.message}`, 500);
    }

    console.log('[create-payment] Payment created successfully:', payment.id);

    return successResponse({
      success: true,
      payment: {
        id: payment.id,
        customer_id: payment.customer_id,
        lead_id: payment.lead_id,
        product_name: payment.product_name,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        stripe_payment_id: payment.stripe_payment_id,
        transaction_id: payment.transaction_id,
        receipt_url: payment.receipt_url,
        notes: payment.notes,
        created_at: payment.created_at,
      },
    });
  } catch (error: any) {
    console.error('[create-payment] Unexpected error:', error);
    return errorResponse(
      error.message || 'Internal server error',
      500
    );
  }
});

