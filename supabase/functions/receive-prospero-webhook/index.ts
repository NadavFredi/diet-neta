/**
 * Prospero Webhook Handler Edge Function
 * 
 * Receives webhooks from Make.com when a Prospero proposal is signed
 * Updates the proposal status from "Sent" to "Signed" in the database
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

interface ProsperoWebhookBody {
  proposalId?: string;
  proposal_id?: string;
  proposalLink?: string;
  proposal_link?: string;
  link?: string;
  leadId?: string;
  lead_id?: string;
  status?: string;
  signed?: boolean;
  signedAt?: string;
  signed_at?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Handle GET requests (for webhook verification)
  if (req.method === 'GET') {
    return new Response('Prospero webhook endpoint is active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Parse request body
    const rawBody = await req.text();
    let body: ProsperoWebhookBody;
    
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const supabase = createSupabaseAdmin();

    // Extract proposal identifier - try multiple possible field names
    const proposalId = body.proposalId || body.proposal_id || null;
    const proposalLink = body.proposalLink || body.proposal_link || body.link || null;
    const leadId = body.leadId || body.lead_id || null;

    // Determine if proposal is signed
    // Check status field or signed boolean
    const isSigned = body.status === 'Signed' || 
                     body.status === 'signed' || 
                     body.signed === true ||
                     body.signed === 'true';

    if (!isSigned) {
      // If not signed, just acknowledge the webhook
      return successResponse({ 
        message: 'Webhook received but proposal is not signed',
        received: true 
      });
    }

    // Find the proposal in database
    let proposalQuery = supabase
      .from('prospero_proposals')
      .select('id, lead_id, status');

    let proposalFound = false;
    let proposalIdToUpdate: string | null = null;

    // Try to find by Prospero proposal ID
    if (proposalId) {
      const { data: proposalById, error: errorById } = await proposalQuery
        .eq('prospero_proposal_id', proposalId)
        .maybeSingle();

      if (!errorById && proposalById) {
        proposalFound = true;
        proposalIdToUpdate = proposalById.id;
      }
    }

    // Try to find by proposal link if not found by ID
    if (!proposalFound && proposalLink) {
      const { data: proposalByLink, error: errorByLink } = await supabase
        .from('prospero_proposals')
        .select('id, lead_id, status')
        .eq('proposal_link', proposalLink)
        .maybeSingle();

      if (!errorByLink && proposalByLink) {
        proposalFound = true;
        proposalIdToUpdate = proposalByLink.id;
      }
    }

    // Try to find by lead_id if provided (get the most recent proposal for that lead)
    if (!proposalFound && leadId) {
      const { data: proposalByLead, error: errorByLead } = await supabase
        .from('prospero_proposals')
        .select('id, lead_id, status')
        .eq('lead_id', leadId)
        .eq('status', 'Sent') // Only update proposals that are still "Sent"
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!errorByLead && proposalByLead) {
        proposalFound = true;
        proposalIdToUpdate = proposalByLead.id;
      }
    }

    if (!proposalFound || !proposalIdToUpdate) {
      // Log but don't fail - webhook might be for a proposal we don't have
      return successResponse({ 
        message: 'Proposal not found in database',
        received: true,
        warning: 'Proposal may have been created outside this system'
      });
    }

    // Update proposal status to "Signed"
    const signedAt = body.signedAt || body.signed_at || new Date().toISOString();
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('prospero_proposals')
      .update({
        status: 'Signed',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(body.metadata || {}),
          signed_at: signedAt,
          webhook_received_at: new Date().toISOString(),
        },
      })
      .eq('id', proposalIdToUpdate)
      .select()
      .single();

    if (updateError) {
      return errorResponse(`Failed to update proposal status: ${updateError.message}`, 500);
    }

    return successResponse({
      message: 'Proposal status updated to Signed',
      proposalId: updatedProposal.id,
      status: updatedProposal.status,
    });

  } catch (error: any) {
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});
