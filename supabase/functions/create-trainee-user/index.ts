/**
 * Create Trainee User Edge Function
 * 
 * Creates a trainee user with password using Supabase Admin API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role key (admin access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin/manager
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'user'].includes(profile.role)) {
      throw new Error('Unauthorized: Only admins and managers can create trainee users');
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
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
      throw new Error('Invalid request body: ' + (parseError.message || 'Failed to parse JSON'));
    }

    const { email, password, customerId, leadId, invitedBy } = body;

    if (!email || !password || !customerId) {
      const missing = [];
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      if (!customerId) missing.push('customerId');
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
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
        throw new Error(`Failed to update password: ${updatePasswordError.message}`);
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
        throw new Error(`Failed to create user: ${createError?.message || 'Unknown error'}`);
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

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email,
        isNewUser: !existingUserData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[create-trainee-user] Error:', error);
    console.error('[create-trainee-user] Error stack:', error.stack);
    console.error('[create-trainee-user] Error details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error.message || 'Failed to create trainee user';
    console.error('[create-trainee-user] Returning error response:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

