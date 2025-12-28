/**
 * Script to create test users in Supabase
 * Run with: npm run create-users
 * 
 * This uses the Supabase Admin API to create users properly
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (uses service role key for admin operations)
const supabaseAdmin = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' // Default local Supabase service role key
);

async function createTestUsers() {
  console.log('🚀 Creating test users...\n');

  // 1. Create Manager User
  try {
    const { data: managerData, error: managerError } = await supabaseAdmin.auth.admin.createUser({
      email: 'manager@dietneta.com',
      password: 'Manager123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'מנהל מערכת',
        role: 'admin'
      }
    });

    if (managerError) {
      const errorMsg = managerError.message || String(managerError);
      if (errorMsg.includes('already registered') || errorMsg.includes('already been registered') || errorMsg.includes('User already registered')) {
        console.log('⚠️  Manager user already exists, updating profile...');
        // Get existing user
        const { data: existingManager } = await supabaseAdmin.auth.admin.listUsers();
        const manager = existingManager.users.find(u => u.email === 'manager@dietneta.com');
        
        if (manager) {
          // Update profile
          await supabaseAdmin
            .from('profiles')
            .upsert({
              id: manager.id,
              email: 'manager@dietneta.com',
              full_name: 'מנהל מערכת',
              role: 'admin'
            });
          console.log('✅ Manager profile updated');
        }
      } else {
        throw managerError;
      }
    } else {
      console.log('✅ Manager user created:', managerData.user.email);
      
      // Create profile
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: managerData.user.id,
          email: 'manager@dietneta.com',
          full_name: 'מנהל מערכת',
          role: 'admin'
        });
      console.log('✅ Manager profile created');
    }
  } catch (error) {
    console.error('❌ Error creating manager user:', error.message);
  }

  // 2. Create Client User
  let clientUserId = null;
  
  try {
    const { data: clientData, error: clientError } = await supabaseAdmin.auth.admin.createUser({
      email: 'client@dietneta.com',
      password: 'Client123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'לקוח בדיקה',
        role: 'trainee'
      }
    });

    if (clientError) {
      const errorMsg = clientError.message || String(clientError);
      if (errorMsg.includes('already registered') || errorMsg.includes('already been registered') || errorMsg.includes('User already registered')) {
        console.log('⚠️  Client user already exists, fetching user ID...');
        // Get existing user
        const { data: existingClient } = await supabaseAdmin.auth.admin.listUsers();
        const client = existingClient.users.find(u => u.email === 'client@dietneta.com');
        
        if (client) {
          clientUserId = client.id;
          console.log('✅ Found existing client user (ID:', clientUserId, ')');
        } else {
          console.error('❌ Client user exists but could not be found in list');
          return;
        }
      } else {
        throw clientError;
      }
    } else {
      clientUserId = clientData.user.id;
      console.log('✅ Client user created (ID:', clientUserId, ')');
    }
    
    // Now create/update profile and customer records (for both new and existing users)
    if (clientUserId) {
      // Create/update profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: clientUserId,
          email: 'client@dietneta.com',
          full_name: 'לקוח בדיקה',
          role: 'trainee'
        });
      
      if (profileError) {
        console.error('❌ Error creating/updating profile:', profileError);
      } else {
        console.log('✅ Client profile created/updated');
      }
      
      // Create customer record - first check if exists, then upsert
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('user_id', clientUserId)
        .maybeSingle();
      
      let customer;
      if (existingCustomer) {
        // Update existing customer
        const { data: updatedCustomer, error: updateError } = await supabaseAdmin
          .from('customers')
          .update({
            full_name: 'לקוח בדיקה',
            phone: '0501234567',
            email: 'client@dietneta.com'
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Error updating customer:', updateError);
          customer = existingCustomer; // Use existing if update fails
        } else {
          customer = updatedCustomer;
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: insertError } = await supabaseAdmin
          .from('customers')
          .insert({
            full_name: 'לקוח בדיקה',
            phone: '0501234567',
            email: 'client@dietneta.com',
            user_id: clientUserId
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Error creating customer:', insertError);
        } else {
          customer = newCustomer;
        }
      }
      
      if (customer) {
        console.log('✅ Client customer record created/updated (ID:', customer.id, ')');
        
        // Create lead record
        const { data: lead, error: leadError } = await supabaseAdmin
          .from('leads')
          .upsert({
            customer_id: customer.id,
            full_name: 'לקוח בדיקה',
            phone: '0501234567',
            email: 'client@dietneta.com',
            status_main: 'בטיפול',
            fitness_goal: 'ירידה במשקל',
            height: 175.0,
            weight: 75.0,
            activity_level: 'בינוני'
          }, { onConflict: 'phone' })
          .select()
          .single();
        
        if (leadError) {
          console.error('❌ Error creating/updating lead:', leadError);
        } else {
          console.log('✅ Client lead record created/updated (ID:', lead?.id || 'N/A', ')');
        }
      } else {
        console.warn('⚠️  Customer record not created/updated');
      }
    }
  } catch (error) {
    console.error('❌ Error creating client user:', error.message);
  }

  console.log('\n========================================');
  console.log('✅ TEST USERS CREATED SUCCESSFULLY');
  console.log('========================================\n');
  console.log('📧 MANAGER USER:');
  console.log('   Email: manager@dietneta.com');
  console.log('   Password: Manager123!');
  console.log('   Role: admin (sees full dashboard)\n');
  console.log('📧 CLIENT USER:');
  console.log('   Email: client@dietneta.com');
  console.log('   Password: Client123!');
  console.log('   Role: trainee (sees only client portal)\n');
  console.log('========================================\n');
}

// Run the script
createTestUsers().catch(console.error);

