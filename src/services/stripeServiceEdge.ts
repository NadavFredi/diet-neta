/**
 * Stripe Service (Edge Function Wrapper)
 * 
 * Frontend service that calls the stripe-api Edge Function
 * This keeps the secret key secure on the server side
 */

import { supabase } from '@/lib/supabaseClient';

export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  prices: StripePrice[];
}

export interface StripePrice {
  id: string;
  product_id: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  type: 'one_time' | 'recurring';
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  };
}

export interface StripeProductsResponse {
  success: boolean;
  products?: StripeProduct[];
  error?: string;
}

export interface CreatePaymentLinkParams {
  amount?: number;
  currency: 'ils' | 'usd' | 'eur';
  productName?: string;
  description?: string;
  priceId?: string; // Stripe Price ID (if using existing price)
  metadata?: Record<string, string>;
}

export interface StripePaymentLinkResponse {
  success: boolean;
  paymentUrl?: string;
  paymentLinkId?: string;
  error?: string;
}

/**
 * Fetch Stripe products via Edge Function
 */
export const fetchStripeProducts = async (): Promise<StripeProductsResponse> => {
  try {
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated. Please log in to fetch Stripe products.',
      };
    }

    // Call Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/stripe-api`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'fetchProducts',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `Failed to fetch Stripe products: ${response.status}`,
      };
    }

    return {
      success: true,
      products: result.data.products || [],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to fetch Stripe products',
    };
  }
};

/**
 * Create a Stripe Payment Link via Edge Function
 */
export const createStripePaymentLink = async (
  params: CreatePaymentLinkParams
): Promise<StripePaymentLinkResponse> => {
  try {
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated. Please log in to create payment links.',
      };
    }

    // Call Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/stripe-api`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'createPaymentLink',
        ...params,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `Failed to create payment link: ${response.status}`,
      };
    }

    return {
      success: true,
      paymentUrl: result.data.paymentUrl,
      paymentLinkId: result.data.paymentLinkId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to create Stripe payment link',
    };
  }
};
