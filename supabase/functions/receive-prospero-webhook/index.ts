/**
 * Prospero Webhook Handler Edge Function
 *
 * Receives webhooks from Prospero/Make when a proposal is signed.
 * Updates the proposal status from "Sent" to "Signed" in the public.proposals table
 * (same table the app uses for create/read, so the frontend sees the update).
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

const PROPOSALS_TABLE = 'proposals';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method === 'GET') {
    return new Response('Prospero webhook endpoint is active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    const rawBody = await req.text();
    let body: ProsperoWebhookBody;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const supabase = createSupabaseAdmin();

    const proposalId = body.proposalId ?? body.proposal_id ?? null;
    const proposalLink = body.proposalLink ?? body.proposal_link ?? body.link ?? null;
    const leadId = body.leadId ?? body.lead_id ?? null;

    const normalizeUrl = (url: string | null): string | null => {
      if (!url) return null;
      return url.trim().replace(/\/+$/, '');
    };
    const normalizedProposalLink = normalizeUrl(proposalLink);

    // Extract path segment from link (e.g. "P9b67-197" from "https://diet-neta-llc.goprospero.com/P9b67-197")
    const linkPathSegment = (url: string | null): string | null => {
      if (!url) return null;
      try {
        const path = new URL(url.trim()).pathname.replace(/^\/+|\/+$/g, '');
        return path || null;
      } catch {
        return null;
      }
    };
    const pathSegment = linkPathSegment(proposalLink);

    const isSigned =
      body.status === 'Signed' ||
      body.status === 'signed' ||
      body.signed === true ||
      body.signed === 'true';

    if (!isSigned) {
      return successResponse({
        message: 'Webhook received but proposal is not signed',
        received: true,
      });
    }

    let proposalFound = false;
    let proposalIdToUpdate: string | null = null;

    // 1) Match by external_proposal_id (proposals table column)
    if (proposalId) {
      const { data, error } = await supabase
        .from(PROPOSALS_TABLE)
        .select('id, lead_id, status')
        .eq('external_proposal_id', proposalId)
        .maybeSingle();
      if (!error && data) {
        proposalFound = true;
        proposalIdToUpdate = data.id;
      }
    }

    // 2) Match by proposal_link (exact: normalized then original)
    if (!proposalFound && normalizedProposalLink) {
      let { data: byLink, error: errLink } = await supabase
        .from(PROPOSALS_TABLE)
        .select('id, lead_id, status, proposal_link')
        .eq('proposal_link', normalizedProposalLink)
        .maybeSingle();
      if (!byLink && proposalLink && proposalLink !== normalizedProposalLink) {
        const res = await supabase
          .from(PROPOSALS_TABLE)
          .select('id, lead_id, status, proposal_link')
          .eq('proposal_link', proposalLink)
          .maybeSingle();
        byLink = res.data;
        errLink = res.error;
      }
      if (!errLink && byLink) {
        proposalFound = true;
        proposalIdToUpdate = byLink.id;
      }
    }

    // 3) Match by link path segment (e.g. "P9b67-197") – webhook domain may differ from stored link
    if (!proposalFound && pathSegment) {
      const { data: list, error } = await supabase
        .from(PROPOSALS_TABLE)
        .select('id, lead_id, status, proposal_link, external_proposal_id')
        .eq('status', 'Sent')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && list?.length) {
        const match = list.find(
          (p) =>
            p.external_proposal_id === pathSegment ||
            (p.proposal_link && (p.proposal_link.includes(pathSegment) || p.proposal_link.endsWith(pathSegment)))
        );
        if (match) {
          proposalFound = true;
          proposalIdToUpdate = match.id;
        }
      }
    }

    // 4) Fallback: most recent "Sent" proposal for this lead
    if (!proposalFound && leadId) {
      const { data, error } = await supabase
        .from(PROPOSALS_TABLE)
        .select('id, lead_id, status')
        .eq('lead_id', leadId)
        .eq('status', 'Sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        proposalFound = true;
        proposalIdToUpdate = data.id;
      }
    }

    if (!proposalFound || !proposalIdToUpdate) {
      return successResponse({
        message: 'Proposal not found in database',
        received: true,
        warning: 'Proposal may have been created outside this system',
        searchParams: {
          proposalId,
          proposalLink: normalizedProposalLink,
          pathSegment,
          leadId,
        },
      });
    }

    const signedAt = body.signedAt ?? body.signed_at ?? new Date().toISOString();
    const existingMetadata =
      typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const { data: updatedProposal, error: updateError } = await supabase
      .from(PROPOSALS_TABLE)
      .update({
        status: 'Signed',
        updated_at: new Date().toISOString(),
        signed_at: signedAt,
        metadata: {
          ...existingMetadata,
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
