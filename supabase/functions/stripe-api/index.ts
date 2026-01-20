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
    // Priority 1: Try Supabase secrets (production) or env vars (local dev with --env-file)
    let stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    // Priority 2: For local development, could fallback to database if needed
    // (Currently not implemented - use --env-file .env.local when running functions locally)
    
    if (!stripeSecretKey) {
      return errorResponse(
        'Stripe secret key not configured. ' +
        'For local development: Run Edge Functions with --env-file .env.local OR set as Supabase secret. ' +
        'For production: Set STRIPE_SECRET_KEY as Supabase secret.',
        500
      );
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
        // Helper function to fetch all pages from Stripe API
        const fetchAllPages = async (url: string, allItems: any[] = []): Promise<any[]> => {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Failed to fetch: ${response.status}`);
          }

          const data = await response.json();
          const items = data.data || [];
          const combined = [...allItems, ...items];

          // Check if there are more pages
          if (data.has_more && data.data && data.data.length > 0) {
            const lastItemId = data.data[data.data.length - 1].id;
            const nextUrl = `${url}${url.includes('?') ? '&' : '?'}starting_after=${lastItemId}`;
            return fetchAllPages(nextUrl, combined);
          }

          return combined;
        };

        try {
          // Fetch all products and prices (handle pagination)
          const productsUrl = 'https://api.stripe.com/v1/products?active=true&limit=100';
          const pricesUrl = 'https://api.stripe.com/v1/prices?active=true&limit=100';

          const [allProducts, allPrices] = await Promise.all([
            fetchAllPages(productsUrl),
            fetchAllPages(pricesUrl),
          ]);

          // Debug: Log raw data structure

          // Group prices by product
          const pricesByProduct: Record<string, any[]> = {};
          allPrices.forEach((price: any) => {
            const productId = price.product;
            if (!pricesByProduct[productId]) {
              pricesByProduct[productId] = [];
            }
            
            // Skip prices without unit_amount (tiered/volume pricing not supported yet)
            if (price.unit_amount === null || price.unit_amount === undefined) {
              return;
            }
            
            // Only include active prices
            if (price.active === false) {
              return;
            }
            
            // Map Stripe price to our interface format
            const mappedPrice = {
              id: price.id,
              product_id: productId,
              active: price.active !== false,
              unit_amount: price.unit_amount,
              currency: price.currency || 'ils',
              type: price.type === 'recurring' ? 'recurring' : 'one_time',
              recurring: price.recurring ? {
                interval: price.recurring.interval || 'month',
                interval_count: price.recurring.interval_count || 1,
              } : undefined,
            };
            
            pricesByProduct[productId].push(mappedPrice);
          });

          // Map products with their prices
          const products = allProducts
            .filter((product: any) => product.active !== false) // Only active products
            .map((product: any) => ({
              id: product.id,
              name: product.name,
              description: product.description,
              active: product.active !== false,
              prices: pricesByProduct[product.id] || [],
            }))
            .filter((product: any) => product.prices.length > 0); // Only include products with valid prices

          return successResponse({ products });
        } catch (fetchError: any) {
          return errorResponse(
            fetchError.message || 'Failed to fetch Stripe products',
            500
          );
        }
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
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
