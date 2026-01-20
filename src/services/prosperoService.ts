/**
 * Prospero Service
 * 
 * Handles creating Prospero proposals via Make.com webhook
 */

interface CreateProsperoProposalParams {
  leadId: string;
  leadPhone: string;
  leadEmail?: string;
}

interface ProsperoResponse {
  link?: string;
  error?: string;
}

const PROSPERO_WEBHOOK_URL = 'https://hook.us1.make.com/12buvi4g3epo9z3f2li17thbhqt924jl';

/**
 * Create a new Prospero proposal by calling the Make.com webhook
 */
export const createProsperoProposal = async (
  params: CreateProsperoProposalParams
): Promise<string> => {
  try {
    const response = await fetch(PROSPERO_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: params.leadId,
        phone: params.leadPhone,
        email: params.leadEmail || '',
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

    return data.link;
  } catch (error: any) {
    console.error('[prosperoService] Error creating proposal:', error);
    throw error;
  }
};
