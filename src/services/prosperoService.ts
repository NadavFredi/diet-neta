/**
 * Prospero Service
 * 
 * Handles creating Prospero proposals via Make.com webhook
 */

import { supabase } from '@/lib/supabaseClient';

interface CreateProsperoProposalParams {
  leadId: string;
  leadPhone: string;
  leadEmail?: string;
  leadName?: string;
  subscriptionData?: {
    currency?: string;
    initialPrice?: number;
  };
}

interface ProsperoResponse {
  link?: string;
  error?: string;
  proposalId?: string; // Optional Prospero proposal ID
}

const PROSPERO_WEBHOOK_URL = 'https://hook.us1.make.com/12buvi4g3epo9z3f2li17thbhqt924jl';

/**
 * Convert currency code to symbol
 */
const getCurrencySymbol = (currencyCode: string): string => {
  switch (currencyCode?.toUpperCase()) {
    case 'ILS':
      return '₪';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    default:
      return '₪'; // Default to ILS symbol
  }
};

/**
 * Create a new Prospero proposal by calling the Make.com webhook
 * and save it to the database with status "Sent"
 */
export const createProsperoProposal = async (
  params: CreateProsperoProposalParams
): Promise<string> => {
  try {
    // Extract subscription data
    const currencyCode = params.subscriptionData?.currency || 'ILS';
    const currencySymbol = getCurrencySymbol(currencyCode);
    const price = params.subscriptionData?.initialPrice || 0;
    const name = params.leadName || '';

    // Call Make.com webhook to create proposal
    const response = await fetch(PROSPERO_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: params.leadId,
        phone: params.leadPhone,
        email: params.leadEmail || '',
        name: name,
        currency: currencySymbol,
        Price: String(price),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create proposal: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: ProsperoResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.link) {
      throw new Error('Response missing proposal link');
    }

    // Get customer_id from lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('customer_id')
      .eq('id', params.leadId)
      .single();

    if (leadError) {
      // Continue anyway, customer_id is optional
    }

    // Save proposal to database with status "Sent"
    const { error: insertError } = await supabase
      .from('prospero_proposals')
      .insert({
        lead_id: params.leadId,
        customer_id: leadData?.customer_id || null,
        proposal_link: data.link,
        prospero_proposal_id: data.proposalId || null,
        status: 'Sent',
        metadata: {
          phone: params.leadPhone,
          email: params.leadEmail || null,
        },
      });

    if (insertError) {
      // Don't throw - the proposal was created successfully, just DB save failed
      // In production, you might want to log this to an error tracking service
    }

    return data.link;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Fetch Prospero proposals for a specific lead
 */
export interface ProsperoProposal {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  customer_id: string | null;
  proposal_link: string;
  prospero_proposal_id: string | null;
  status: 'Sent' | 'Signed';
  metadata: any;
}

export const getProsperoProposals = async (leadId: string): Promise<ProsperoProposal[]> => {
  try {
    const { data, error } = await supabase
      .from('prospero_proposals')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error: any) {
    throw new Error(`Failed to fetch proposals: ${error?.message || 'Unknown error'}`);
  }
};
