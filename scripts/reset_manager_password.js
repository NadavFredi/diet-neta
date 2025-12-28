/**
 * Script to reset manager user password
 * Run with: node scripts/reset_manager_password.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetManagerPassword() {
  const email = 'manager@dietneta.com';
  const newPassword = 'Manager123!';

  try {
    console.log(`Resetting password for ${email}...`);

    // Get user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`User ${email} not found. Creating new user...`);
      
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'מנהל מערכת',
          role: 'admin',
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return;
      }

      console.log('✅ User created successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}`);
      return;
    }

    // Update password for existing user
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return;
    }

    console.log('✅ Password reset successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);
    
    // Also ensure profile is correct
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email,
        full_name: 'מנהל מערכת',
        role: 'admin',
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.warn('Warning: Could not update profile:', profileError);
    } else {
      console.log('✅ Profile updated successfully!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

resetManagerPassword();
