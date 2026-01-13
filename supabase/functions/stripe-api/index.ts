/**
 * Stripe API Edge Function
 * 
 * Proxies Stripe API requests to keep secret key secure on server-side
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdmin, verifyUser } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { parseJsonBody } from '../_shared/utils.ts';

serve(async (req) => {
  // Handle CORS preflight - MUST be first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  // Also handle CORS for other requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    // Verify the requesting user is authenticated
    const user = await verifyUser(authHeader);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get Stripe secret key from server-side environment (NO VITE_ prefix)
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return errorResponse('Stripe secret key not configured. Please set STRIPE_SECRET_KEY as Supabase secret.', 500);
    }

    // Validate key format
    if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
      return errorResponse('Invalid Stripe secret key format', 500);
    }

    // Parse request body
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (parseError: any) {
      return errorResponse('Invalid request body: ' + (parseError.message || 'Failed to parse JSON'), 400);
    }

    const { action, ...params } = body;

    if (!action) {
      return errorResponse('Missing required field: action', 400);
    }

    // Route to appropriate operation
    switch (action) {
      case 'fetchProducts': {
        // Fetch products and prices
        const productsUrl = 'https://api.stripe.com/v1/products?active=true&limit=100';
        const pricesUrl = 'https://api.stripe.com/v1/prices?active=true&limit=100';

        const [productsResponse, pricesResponse] = await Promise.all([
          fetch(productsUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          }),
          fetch(pricesUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          }),
        ]);

        if (!productsResponse.ok || !pricesResponse.ok) {
          const errorData = await productsResponse.json().catch(() => ({}));
          return errorResponse(
            errorData.error?.message || 'Failed to fetch Stripe products',
            productsResponse.status
          );
        }

        const productsData = await productsResponse.json();
        const pricesData = await pricesResponse.json();

        // Group prices by product
        const pricesByProduct: Record<string, any[]> = {};
        (pricesData.data || []).forEach((price: any) => {
          const productId = price.product;
          if (!pricesByProduct[productId]) {
            pricesByProduct[productId] = [];
          }
          pricesByProduct[productId].push({
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            type: price.type,
            recurring: price.recurring,
          });
        });

        // Map products with their prices
        const products = (productsData.data || [])
          .map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            prices: pricesByProduct[product.id] || [],
          }))
          .filter((product: any) => product.prices.length > 0);

        return successResponse({ products });
      }

      case 'createPaymentLink': {
        const { priceId, amount, currency, productName, description, metadata } = params;

        if (!priceId && (!amount || !currency)) {
          return errorResponse('Either priceId or (amount and currency) are required', 400);
        }

        // Create payment link
        const formData = new URLSearchParams();
        
        if (priceId) {
          formData.append('line_items[0][price]', priceId);
          formData.append('line_items[0][quantity]', '1');
        } else {
          formData.append('line_items[0][price_data][currency]', currency.toLowerCase());
          formData.append('line_items[0][price_data][unit_amount]', String(amount));
          formData.append('line_items[0][price_data][product_data][name]', productName || 'Payment');
          if (description) {
            formData.append('line_items[0][price_data][product_data][description]', description);
          }
          formData.append('line_items[0][quantity]', '1');
        }

        // Add metadata if provided
        if (metadata) {
          Object.entries(metadata).forEach(([key, value]) => {
            formData.append(`metadata[${key}]`, String(value));
          });
        }

        const response = await fetch('https://api.stripe.com/v1/payment_links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return errorResponse(
            errorData.error?.message || `HTTP error! status: ${response.status}`,
            response.status
          );
        }

        const data = await response.json();
        return successResponse({
          paymentUrl: data.url,
          paymentLinkId: data.id,
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('[stripe-api] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
