/**
 * Stripe Service
 * 
 * Service for creating Stripe payment links/checkout sessions
 * Uses Stripe REST API via backend proxy or direct API calls
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
  unit_amount: number; // Amount in smallest currency unit (e.g., cents)
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

/**
 * Fetch Stripe products from backend proxy
 * In production, this should go through your backend API
 */
export const fetchStripeProducts = async (): Promise<StripeProductsResponse> => {
  try {
    const secretKey = getStripeSecretKey();
    
    if (!secretKey) {
      return {
        success: false,
        error: 'Stripe configuration not found. Please check environment variables.',
      };
    }

    // Fetch products with prices
    const productsUrl = 'https://api.stripe.com/v1/products?active=true&limit=100';
    const pricesUrl = 'https://api.stripe.com/v1/prices?active=true&limit=100';

    // Fetch products and prices in parallel
    const [productsResponse, pricesResponse] = await Promise.all([
      fetch(productsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
        },
      }),
      fetch(pricesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
        },
      }),
    ]);

    if (!productsResponse.ok || !pricesResponse.ok) {
      const errorData = await productsResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || 'Failed to fetch Stripe products',
      };
    }

    const productsData = await productsResponse.json();
    const pricesData = await pricesResponse.json();

    // Group prices by product
    const pricesByProduct: Record<string, StripePrice[]> = {};
    (pricesData.data || []).forEach((price: any) => {
      const productId = price.product;
      if (!pricesByProduct[productId]) {
        pricesByProduct[productId] = [];
      }
      pricesByProduct[productId].push({
        id: price.id,
        product_id: productId,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount,
        type: price.type,
        recurring: price.recurring || undefined,
      });
    });

    // Map products with their prices
    const products: StripeProduct[] = (productsData.data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      active: product.active,
      prices: pricesByProduct[product.id] || [],
    })).filter((product: StripeProduct) => product.prices.length > 0); // Only include products with prices

    return {
      success: true,
      products,
    };
  } catch (error: any) {
    console.error('[Stripe] Error fetching products:', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch Stripe products',
    };
  }
};

export interface CreatePaymentLinkParams {
  amount: number; // Amount in smallest currency unit (e.g., cents for USD, agorot for ILS)
  currency: 'ils' | 'usd' | 'eur'; // Stripe uses lowercase currency codes
  customerEmail?: string;
  customerName?: string;
  description?: string;
  // Subscription parameters
  billingMode?: 'one_time' | 'subscription';
  subscriptionInterval?: 'month' | 'week';
  billingCycles?: number | null; // null = continuous/unlimited
  // Stripe Price ID (if using existing Stripe Price)
  priceId?: string;
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
    console.error('[Stripe] Missing VITE_STRIPE_SECRET_KEY environment variable');
    console.error('[Stripe] Please add VITE_STRIPE_SECRET_KEY to your .env.local file');
    console.error('[Stripe] Example: VITE_STRIPE_SECRET_KEY=sk_test_51AbCdEf...');
    console.error('[Stripe] ⚠️ IMPORTANT: After adding the key, restart your dev server (npm run dev)');
    return null;
  }
  
  // Check if it's a placeholder value
  if (key.includes('...') || key.length < 20) {
    console.error('[Stripe] Invalid or placeholder Stripe secret key detected');
    console.error('[Stripe] The key appears to be a placeholder. Please replace it with your actual Stripe secret key from https://dashboard.stripe.com/apikeys');
    return null;
  }
  
  // Validate key format (Stripe keys start with sk_test_ or sk_live_)
  if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
    console.error('[Stripe] ❌ Invalid Stripe secret key format detected!');
    console.error('[Stripe] Your key starts with:', key.substring(0, 8));
    console.error('[Stripe] Expected format: Key should start with "sk_test_" (test mode) or "sk_live_" (live mode)');
    console.error('[Stripe]');
    console.error('[Stripe] Common mistakes:');
    console.error('[Stripe] - Using publishable key (pk_...) instead of secret key (sk_...)');
    console.error('[Stripe] - Using restricted key (rk_...) instead of secret key');
    console.error('[Stripe] - Using webhook signing secret (whsec_...) instead of secret key');
    console.error('[Stripe]');
    console.error('[Stripe] 📝 How to get your Stripe Secret Key:');
    console.error('[Stripe] 1. Go to https://dashboard.stripe.com/apikeys');
    console.error('[Stripe] 2. Click "Create secret key" or use an existing one');
    console.error('[Stripe] 3. Copy the key that starts with "sk_test_" (for testing)');
    console.error('[Stripe] 4. Add it to .env.local as: VITE_STRIPE_SECRET_KEY=sk_test_...');
    console.error('[Stripe] 5. Restart your dev server');
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
    
    const isSubscription = params.billingMode === 'subscription';
    const interval = params.subscriptionInterval || 'month';
    
    // If priceId is provided, use it directly (preferred method)
    if (params.priceId) {
      formData.append('line_items[0][price]', params.priceId);
      formData.append('line_items[0][quantity]', '1');
    } else {
      // Otherwise, create price_data dynamically
      if (isSubscription) {
        // Subscription mode
        formData.append('line_items[0][price_data][currency]', params.currency);
        formData.append('line_items[0][price_data][product_data][name]', params.description || 'Subscription');
        formData.append('line_items[0][price_data][recurring][interval]', interval);
        formData.append('line_items[0][price_data][unit_amount]', String(params.amount));
        formData.append('line_items[0][quantity]', '1');
        
        // Set billing cycle limit if specified (otherwise continuous)
        if (params.billingCycles !== null && params.billingCycles !== undefined && params.billingCycles > 0) {
          formData.append('subscription_data[billing_cycle_anchor]', 'now');
          // Note: Stripe Payment Links API doesn't directly support billing cycle limits
          // For now, we'll create the subscription without cycle limits
          // In production, you might want to handle this via webhooks or use Checkout Sessions
        }
      } else {
        // One-time payment mode
        formData.append('line_items[0][price_data][currency]', params.currency);
        formData.append('line_items[0][price_data][product_data][name]', params.description || 'Payment');
        formData.append('line_items[0][price_data][unit_amount]', String(params.amount));
        formData.append('line_items[0][quantity]', '1');
      }
    }

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
      
      // Enhanced error logging for 401 Unauthorized
      if (response.status === 401) {
        console.error('[Stripe] 401 Unauthorized Error - Possible issues:');
        console.error('1. Check if VITE_STRIPE_SECRET_KEY is set in .env.local');
        console.error('2. Verify the key starts with sk_test_ or sk_live_');
        console.error('3. Ensure the dev server was restarted after adding the env variable');
        console.error('4. Check that the key is not expired or revoked');
        console.error('[Stripe] Current key prefix:', secretKey?.substring(0, 12) || 'NOT SET');
        console.error('[Stripe] Full error response:', errorData);
      }
      
      console.error('[Stripe] API Error:', errorData);
      return {
        success: false,
        error: response.status === 401 
          ? 'Stripe API authentication failed. Please check your VITE_STRIPE_SECRET_KEY in .env.local file and restart the dev server.'
          : errorMessage,
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
