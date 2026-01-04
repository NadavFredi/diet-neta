/**
 * Create Trainee User Edge Function
 * 
 * Creates a trainee user with password using Supabase Admin API
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

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    // Check if user is admin/manager
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'user'].includes(profile.role)) {
      return errorResponse('Unauthorized: Only admins and managers can create trainee users', 403);
    }

    // Parse request body
    let body;
    try {
      body = await parseJsonBody(req);
      console.log('[create-trainee-user] Request body received:', {
        email: body.email,
        customerId: body.customerId,
        leadId: body.leadId,
        invitedBy: body.invitedBy,
        hasPassword: !!body.password,
        passwordLength: body.password?.length,
      });
    } catch (parseError: any) {
      console.error('[create-trainee-user] JSON parse error:', parseError);
      return errorResponse('Invalid request body: ' + (parseError.message || 'Failed to parse JSON'), 400);
    }

    const { email, password, customerId, leadId, invitedBy } = body;

    if (!email || !password || !customerId) {
      const missing = [];
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      if (!customerId) missing.push('customerId');
      return errorResponse(`Missing required fields: ${missing.join(', ')}`, 400);
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const existingUserData = existingUser?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUserData) {
      // User exists - update password and role
      userId = existingUserData.id;
      
      // Update password
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updatePasswordError) {
        return errorResponse(`Failed to update password: ${updatePasswordError.message}`, 400);
      }

      // Update profile role to trainee
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'trainee' })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
        // Continue even if profile update fails
      }

      // Update customer record with user_id for existing users
      const { error: customerUpdateError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: userId })
        .eq('id', customerId);

      if (customerUpdateError) {
        console.error('Customer update error:', customerUpdateError);
        // Continue even if customer update fails (non-critical)
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: 'trainee',
        },
      });

      if (createError || !newUser.user) {
        return errorResponse(`Failed to create user: ${createError?.message || 'Unknown error'}`, 400);
      }

      userId = newUser.user.id;

      // Create profile with trainee role
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          role: 'trainee',
          customer_id: customerId,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue even if profile creation fails (it might already exist)
      }

      // Update customer record with user_id
      const { error: customerUpdateError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: userId })
        .eq('id', customerId);

      if (customerUpdateError) {
        console.error('Customer update error:', customerUpdateError);
        // Continue even if customer update fails (non-critical)
      }
    }

    // Log audit event
    await supabaseAdmin.from('invitation_audit_log').insert({
      invitation_id: null,
      action: 'created_with_password',
      performed_by: invitedBy || user.id,
      metadata: { email, customerId, leadId, method: 'direct_password', userId },
    });

    return successResponse({
      userId,
      email,
      isNewUser: !existingUserData,
    });
  } catch (error: any) {
    console.error('[create-trainee-user] Error:', error);
    console.error('[create-trainee-user] Error stack:', error.stack);
    console.error('[create-trainee-user] Error details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error.message || 'Failed to create trainee user';
    console.error('[create-trainee-user] Returning error response:', errorMessage);
    
    return errorResponse(errorMessage, 400);
  }
});
