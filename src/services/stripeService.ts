/**
 * Stripe Service
 * 
 * Service for creating Stripe payment links/checkout sessions
 * Uses Stripe REST API via backend proxy or direct API calls
 */

export interface CreatePaymentLinkParams {
  amount: number; // Amount in smallest currency unit (e.g., cents for USD, agorot for ILS)
  currency: 'ils' | 'usd' | 'eur'; // Stripe uses lowercase currency codes
  customerEmail?: string;
  customerName?: string;
  description?: string;
}

export interface StripePaymentLinkResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

/**
 * Get Stripe secret key from environment variables
 */
const getStripeSecretKey = (): string | null => {
  const key = import.meta.env.VITE_STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[Stripe] Missing VITE_STRIPE_SECRET_KEY environment variable');
    return null;
  }
  return key;
};

/**
 * Convert currency code to Stripe format (lowercase)
 */
const normalizeCurrency = (currency: 'ILS' | 'USD' | 'EUR'): 'ils' | 'usd' | 'eur' => {
  return currency.toLowerCase() as 'ils' | 'usd' | 'eur';
};

/**
 * Create a Stripe Payment Link via REST API
 * 
 * Note: In production, this should be done via a backend proxy to keep the secret key secure.
 * For now, we'll use a direct API call (not recommended for production without proper security).
 */
export const createStripePaymentLink = async (
  params: CreatePaymentLinkParams
): Promise<StripePaymentLinkResponse> => {
  try {
    const secretKey = getStripeSecretKey();
    
    if (!secretKey) {
      return {
        success: false,
        error: 'Stripe configuration not found. Please check environment variables.',
      };
    }

    // Validate amount
    if (params.amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than zero',
      };
    }

    // Stripe API endpoint for creating payment links
    // In production, this should go through your backend API
    const url = 'https://api.stripe.com/v1/payment_links';

    // Prepare request body
    const formData = new URLSearchParams();
    formData.append('line_items[0][price_data][currency]', params.currency);
    formData.append('line_items[0][price_data][product_data][name]', params.description || 'Payment');
    formData.append('line_items[0][price_data][unit_amount]', String(params.amount));
    formData.append('line_items[0][quantity]', '1');

    // Add customer information if provided
    if (params.customerEmail) {
      formData.append('customer_email', params.customerEmail);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
      console.error('[Stripe] API Error:', errorData);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    
    // Extract payment URL from response
    const paymentUrl = data.url || data.hosted_url;

    if (!paymentUrl) {
      return {
        success: false,
        error: 'Payment link was created but no URL was returned',
      };
    }

    return {
      success: true,
      paymentUrl,
    };
  } catch (error: any) {
    console.error('[Stripe] Error creating payment link:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create Stripe payment link',
    };
  }
};

/**
 * Alternative: Create a Checkout Session (more flexible, requires redirect)
 * This is kept as a reference but not used by default
 */
export const createStripeCheckoutSession = async (
  params: CreatePaymentLinkParams
): Promise<StripePaymentLinkResponse> => {
  try {
    const secretKey = getStripeSecretKey();
    
    if (!secretKey) {
      return {
        success: false,
        error: 'Stripe configuration not found. Please check environment variables.',
      };
    }

    if (params.amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than zero',
      };
    }

    const url = 'https://api.stripe.com/v1/checkout/sessions';

    const formData = new URLSearchParams();
    formData.append('payment_method_types[]', 'card');
    formData.append('mode', 'payment');
    formData.append('success_url', `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
    formData.append('cancel_url', `${window.location.origin}/payment/cancel`);
    formData.append('line_items[0][price_data][currency]', params.currency);
    formData.append('line_items[0][price_data][product_data][name]', params.description || 'Payment');
    formData.append('line_items[0][price_data][unit_amount]', String(params.amount));
    formData.append('line_items[0][quantity]', '1');

    if (params.customerEmail) {
      formData.append('customer_email', params.customerEmail);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    const paymentUrl = data.url;

    if (!paymentUrl) {
      return {
        success: false,
        error: 'Checkout session was created but no URL was returned',
      };
    }

    return {
      success: true,
      paymentUrl,
    };
  } catch (error: any) {
    console.error('[Stripe] Error creating checkout session:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create Stripe checkout session',
    };
  }
};

/**
 * Helper to convert amount to smallest currency unit
 * ILS: shekels to agorot (multiply by 100)
 * USD/EUR: dollars/euros to cents (multiply by 100)
 */
export const convertToSmallestUnit = (amount: number, currency: 'ILS' | 'USD' | 'EUR'): number => {
  return Math.round(amount * 100);
};
