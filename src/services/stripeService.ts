/**
 * Stripe Service
 * 
 * ⚠️ DEPRECATED: This service is kept for backward compatibility only.
 * 
 * All API calls now go through stripeServiceEdge.ts which calls Edge Functions.
 * This keeps the secret key secure on the server side - NO keys are ever exposed to frontend.
 */

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
  priceId?: string;
  metadata?: Record<string, string>;
  billingMode?: 'one_time' | 'subscription';
  subscriptionInterval?: 'day' | 'week' | 'month' | 'year';
  billingCycles?: number | null;
  customerEmail?: string;
}

export interface StripePaymentLinkResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

/**
 * Convert currency amount to smallest unit (e.g., ILS to agorot, USD to cents)
 * @param amount - The amount in regular currency units (e.g., 100.50)
 * @param currency - The currency code ('ils', 'usd', 'eur')
 * @returns The amount in smallest currency unit (e.g., 10050 for 100.50 ILS)
 */
export const convertToSmallestUnit = (
  amount: number,
  currency: 'ils' | 'usd' | 'eur'
): number => {
  // All currencies use 100 as the smallest unit divisor
  // ILS: 1 shekel = 100 agorot
  // USD: 1 dollar = 100 cents
  // EUR: 1 euro = 100 cents
  return Math.round(amount * 100);
};

/**
 * Fetch Stripe products via Edge Function
 */
export const fetchStripeProducts = async (): Promise<StripeProductsResponse> => {
  // Always use Edge Function - never access API keys from frontend
  const { fetchStripeProducts: fetchViaEdgeFunction } = await import('./stripeServiceEdge');
  return fetchViaEdgeFunction();
};

/**
 * Create a Stripe Payment Link via Edge Function
 */
export const createStripePaymentLink = async (
  params: CreatePaymentLinkParams
): Promise<StripePaymentLinkResponse> => {
  // Always use Edge Function - never access API keys from frontend
  const { createStripePaymentLink: createViaEdgeFunction } = await import('./stripeServiceEdge');
  return createViaEdgeFunction(params);
};

/**
 * Alternative: Create a Checkout Session
 * ⚠️ DEPRECATED: This function should not be used - all API calls go through Edge Functions
 */
export const createStripeCheckoutSession = async (
  params: CreatePaymentLinkParams
): Promise<StripePaymentLinkResponse> => {
  return {
    success: false,
    error: 'This function is deprecated. Use createStripePaymentLink which routes through Edge Functions.',
  };
};
