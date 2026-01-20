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

    } catch (parseError: any) {
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

    // Check if user already exists in auth (case-insensitive email check)
    // Use getUserByEmail if available, otherwise list all users
    let existingUserData = null;
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      // Case-insensitive email comparison
      existingUserData = existingUser?.users?.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
      );

    } catch (listError: any) {
      // Continue - will try to create user and handle error if it exists
    }

    let userId: string;

    if (existingUserData) {
      // Check if the user profile exists and is active
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', existingUserData.id)
        .maybeSingle();

      userId = existingUserData.id;
      
      // Update password
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updatePasswordError) {
        return errorResponse(`Failed to update password: ${updatePasswordError.message}`, 400);
      }

      // If profile doesn't exist, create it; otherwise update it
      if (!existingProfile) {
        // Create profile with trainee role
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email,
            role: 'trainee',
            customer_id: customerId,
            is_active: true,
          });

        if (profileError) {
          // Continue even if profile creation fails
        }
      } else {
        // Update profile role to trainee and ensure it's active (reactivate if inactive)
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'trainee', is_active: true })
          .eq('id', userId);

        if (profileUpdateError) {
          // Continue even if profile update fails
        }
      }

      // Update customer record with user_id
      const { error: customerUpdateError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: userId })
        .eq('id', customerId);

      if (customerUpdateError) {
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
        // If error is about email already existing, try to find and reactivate the user
        const errorMsg = createError?.message?.toLowerCase() || '';
        const isEmailExistsError = 
          errorMsg.includes('already been registered') || 
          errorMsg.includes('already exists') ||
          errorMsg.includes('user already registered') ||
          errorMsg.includes('email address has already been registered') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('email') && errorMsg.includes('registered');
        
        if (isEmailExistsError) {
          
          // Try to find the user by listing all users again
          try {
            const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
            const foundUser = allUsers?.users?.find(
              u => u.email?.toLowerCase() === email.toLowerCase()
            );
            
            if (foundUser) {
              userId = foundUser.id;
              
              // Update password
              const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { password }
              );

              if (updatePasswordError) {
                return errorResponse(`Failed to update password: ${updatePasswordError.message}`, 400);
              }

              // Check and update/create profile
              const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('id, role, is_active')
                .eq('id', userId)
                .maybeSingle();

              if (!existingProfile) {
                // Create profile
                const { error: profileError } = await supabaseAdmin
                  .from('profiles')
                  .insert({
                    id: userId,
                    email,
                    role: 'trainee',
                    customer_id: customerId,
                    is_active: true,
                  });

                if (profileError) {
                }
              } else {
                // Update profile
                const { error: profileUpdateError } = await supabaseAdmin
                  .from('profiles')
                  .update({ role: 'trainee', is_active: true })
                  .eq('id', userId);

                if (profileUpdateError) {
                }
              }

              // Update customer record
              const { error: customerUpdateError } = await supabaseAdmin
                .from('customers')
                .update({ user_id: userId })
                .eq('id', customerId);

              if (customerUpdateError) {
              }

              // Log audit event
              await supabaseAdmin.from('invitation_audit_log').insert({
                invitation_id: null,
                action: 'created_with_password',
                performed_by: invitedBy || user.id,
                metadata: { email, customerId, leadId, method: 'direct_password', userId, reactivated: true },
              });

              return successResponse({
                userId,
                email,
                isNewUser: false,
              });
            }
          } catch (findError: any) {
          }
        }
        
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
          is_active: true,
        });

      if (profileError) {
        // Continue even if profile creation fails (it might already exist)
      }

      // Update customer record with user_id
      const { error: customerUpdateError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: userId })
        .eq('id', customerId);

      if (customerUpdateError) {
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

    const errorMessage = error.message || 'Failed to create trainee user';
    
    return errorResponse(errorMessage, 400);
  }
});
