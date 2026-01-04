/**
 * Script to create a trainee user in PRODUCTION Supabase
 * 
 * Usage:
 * 1. Get your production service role key from:
 *    https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/settings/api
 * 2. Set it as environment variable or update the script
 * 3. Run: node scripts/create_trainee_user_production.js
 */

import { createClient } from '@supabase/supabase-js';

// Production Supabase configuration
const PRODUCTION_URL = 'https://xghoqeayrtwgymfafrdm.supabase.co';
const PRODUCTION_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaG9xZWF5cnR3Z3ltZmFmcmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjgxNjQsImV4cCI6MjA4MjUwNDE2NH0.O-IqKIo2VnDwZPTyHwp4khbrqN_5fWSfDLNSuG_xBos';

// IMPORTANT: Get your service role key from Supabase Dashboard
// https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/settings/api
// Look for "service_role" key (NOT the anon key)
const PRODUCTION_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with your actual service role key

if (PRODUCTION_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ ERROR: Please set your production service role key!');
  console.log('\n📝 Steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm/settings/api');
  console.log('2. Copy the "service_role" key (NOT the anon key)');
  console.log('3. Run: SUPABASE_SERVICE_ROLE_KEY=your_key_here node scripts/create_trainee_user_production.js');
  console.log('   OR update the script with your key\n');
  process.exit(1);
}

// Create admin client with service role
const supabaseAdmin = createClient(PRODUCTION_URL, PRODUCTION_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTraineeUser() {
  console.log('🚀 Creating trainee user in PRODUCTION...\n');
  console.log('📍 Production URL:', PRODUCTION_URL);
  console.log('');

  // Generate a unique email and password
  const timestamp = Date.now();
  const traineeEmail = `trainee${timestamp}@dietneta.com`;
  const traineePassword = 'Trainee123!';
  const traineeName = 'מתאמן בדיקה';

  try {
    // 1. Create auth user
    console.log('1️⃣ Creating auth user...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: traineeEmail,
      password: traineePassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: traineeName,
        role: 'trainee'
      }
    });

    if (userError) {
      if (userError.message?.includes('already registered')) {
        console.log('⚠️  User already exists, fetching existing user...');
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === traineeEmail);
        if (existingUser) {
          userData.user = existingUser;
          console.log('✅ Found existing user');
        } else {
          throw new Error('User exists but could not be found');
        }
      } else {
        throw userError;
      }
    } else {
      console.log('✅ Auth user created:', userData.user.email);
    }

    const userId = userData.user.id;
    console.log('   User ID:', userId);

    // 2. Create profile
    console.log('\n2️⃣ Creating profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: traineeEmail,
        full_name: traineeName,
        role: 'trainee'
      });

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      throw profileError;
    }
    console.log('✅ Profile created');

    // 3. Create customer record
    console.log('\n3️⃣ Creating customer record...');
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        full_name: traineeName,
        phone: `050${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        email: traineeEmail,
        user_id: userId
      })
      .select()
      .single();

    if (customerError) {
      console.error('❌ Error creating customer:', customerError);
      throw customerError;
    }
    console.log('✅ Customer created (ID:', customer.id, ')');

    // 4. Create lead record
    console.log('\n4️⃣ Creating lead record...');
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        customer_id: customer.id,
        full_name: traineeName,
        phone: customer.phone,
        email: traineeEmail,
        status_main: 'בטיפול',
        fitness_goal: 'ירידה במשקל',
        height: 175.0,
        weight: 75.0,
        activity_level: 'בינוני'
      })
      .select()
      .single();

    if (leadError) {
      console.error('❌ Error creating lead:', leadError);
      // Don't throw - lead is optional
      console.log('⚠️  Lead creation failed, but user can still log in');
    } else {
      console.log('✅ Lead created (ID:', lead.id, ')');
    }

    console.log('\n========================================');
    console.log('✅ TRAINEE USER CREATED SUCCESSFULLY');
    console.log('========================================\n');
    console.log('📧 LOGIN CREDENTIALS:');
    console.log('   Email:', traineeEmail);
    console.log('   Password:', traineePassword);
    console.log('   Role: trainee (client portal access)\n');
    console.log('🔗 Login URL: http://localhost:8080/login');
    console.log('   (or your production URL)\n');
    console.log('📋 User Details:');
    console.log('   User ID:', userId);
    console.log('   Customer ID:', customer.id);
    if (lead) {
      console.log('   Lead ID:', lead.id);
    }
    console.log('========================================\n');

    return {
      email: traineeEmail,
      password: traineePassword,
      userId,
      customerId: customer.id,
      leadId: lead?.id
    };

  } catch (error) {
    console.error('\n❌ ERROR CREATING TRAINEE USER:');
    console.error(error.message || error);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  }
}

// Run the script
createTraineeUser().catch(console.error);

