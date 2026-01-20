/**
 * Admin User Operations Edge Function
 * 
 * Handles admin user operations (create, update, delete, list) using Supabase Admin API
 * This function runs server-side with the service role key, keeping it secure
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
    // Parse request body first to check for invitation token
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (parseError: any) {
      return errorResponse('Invalid request body: ' + (parseError.message || 'Failed to parse JSON'), 400);
    }

    const { action, invitationToken, invitationId, ...params } = body;

    // For invitation acceptance (createUser with invitationToken), skip auth check
    const isInvitationAcceptance = action === 'createUser' && invitationToken && invitationId;
    
    let user = null;
    if (!isInvitationAcceptance) {
      // Get authorization header for regular admin operations
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return errorResponse('Missing authorization header', 401);
      }

      // Verify the requesting user is authenticated
      user = await verifyUser(authHeader);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      // Create Supabase admin client
      const supabaseAdmin = createSupabaseAdmin();

      // Check if user is admin/manager
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || !['admin', 'user'].includes(profile.role)) {
        return errorResponse('Unauthorized: Only admins and managers can perform admin user operations', 403);
      }
    } else {
      // For invitation acceptance, verify the invitation token
      const supabaseAdmin = createSupabaseAdmin();
      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (invitationError || !invitation) {
        return errorResponse('Invalid invitation', 401);
      }

      // Verify token using SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(invitation.token_salt + invitationToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (computedHash !== invitation.token_hash) {
        return errorResponse('Invalid invitation token', 401);
      }

      // Check if invitation is expired or already used
      if (invitation.status === 'accepted' || invitation.status === 'expired' || invitation.status === 'revoked') {
        return errorResponse('Invitation is no longer valid', 401);
      }

      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < new Date()) {
        return errorResponse('Invitation has expired', 401);
      }
    }

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    if (!action) {
      return errorResponse('Missing required field: action', 400);
    }

    // Route to appropriate operation
    switch (action) {
      case 'createUser': {
        const { email, password, email_confirm = true, user_metadata = {} } = params;
        
        if (!email) {
          return errorResponse('Missing required field: email', 400);
        }

        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm,
          user_metadata,
        });

        if (createError || !newUser.user) {
          return errorResponse(`Failed to create user: ${createError?.message || 'Unknown error'}`, 400);
        }

        return successResponse({
          user: newUser.user,
        });
      }

      case 'updateUser': {
        const { userId, updates } = params;
        
        if (!userId) {
          return errorResponse('Missing required field: userId', 400);
        }

        if (!updates || typeof updates !== 'object') {
          return errorResponse('Missing or invalid field: updates', 400);
        }

        // Update user
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          updates
        );

        if (updateError) {
          return errorResponse(`Failed to update user: ${updateError.message}`, 400);
        }

        return successResponse({
          user: updatedUser.user,
        });
      }

      case 'deleteUser': {
        const { userId } = params;
        
        if (!userId) {
          return errorResponse('Missing required field: userId', 400);
        }

        // Delete user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          return errorResponse(`Failed to delete user: ${deleteError.message}`, 400);
        }

        return successResponse({
          success: true,
        });
      }

      case 'listUsers': {
        const { page = 1, perPage = 50 } = params;

        // List users
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

        if (listError) {
          return errorResponse(`Failed to list users: ${listError.message}`, 400);
        }

        return successResponse({
          users: usersData.users || [],
          total: usersData.users?.length || 0,
        });
      }

      case 'getUserByEmail': {
        const { email } = params;
        
        if (!email) {
          return errorResponse('Missing required field: email', 400);
        }

        // List users and find by email
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          return errorResponse(`Failed to list users: ${listError.message}`, 400);
        }

        const user = usersData.users?.find(u => u.email === email);

        return successResponse({
          user: user || null,
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
