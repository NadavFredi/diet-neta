/**
 * Script to create test user in Supabase using environment variables from .env.local
 * 
 * Required environment variables:
 * - VITE_SUPABASE_URL or SUPABASE_URL
 * - VITE_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY
 * - TEST_USER_EMAIL (optional, defaults to 'test@dietneta.com')
 * - TEST_USER_PASSWORD (optional, defaults to 'Test123!')
 * 
 * Run with: node scripts/create_test_user_from_env.js
 * Or with: npm run create-test-user
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
function loadEnvFile() {
    try {
        const envPath = join(__dirname, '..', '.env.local');
        const envContent = readFileSync(envPath, 'utf-8');
        const envVars = {};

        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    // Remove quotes if present
                    envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            }
        });

        return envVars;
    } catch (error) {
        console.warn('⚠️  Could not read .env.local file, using process.env instead');
        return {};
    }
}

// Load environment variables
const envVars = loadEnvFile();

// Get Supabase configuration from environment variables
const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    envVars.VITE_SUPABASE_URL ||
    envVars.SUPABASE_URL ||
    'http://127.0.0.1:54321';

const supabaseServiceRoleKey =
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    envVars.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    envVars.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'; // Default local key

// Get test user credentials (optional, with defaults)
const testUserEmail =
    process.env.TEST_USER_EMAIL ||
    envVars.TEST_USER_EMAIL ||
    'manager@dietneta.com';

const testUserPassword =
    process.env.TEST_USER_PASSWORD ||
    envVars.TEST_USER_PASSWORD ||
    'Manager123!';

// Get optional user metadata
const testUserFullName =
    process.env.TEST_USER_FULL_NAME ||
    envVars.TEST_USER_FULL_NAME ||
    'משתמש בדיקה';

const testUserRole =
    process.env.TEST_USER_ROLE ||
    envVars.TEST_USER_ROLE ||
    'admin';

// Validate required variables
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Error: Missing required environment variables');
    console.error('Required:');
    console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
    console.error('  - VITE_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nOptional:');
    console.error('  - TEST_USER_EMAIL (default: test@dietneta.com)');
    console.error('  - TEST_USER_PASSWORD (default: Test123!)');
    console.error('  - TEST_USER_FULL_NAME (default: משתמש בדיקה)');
    console.error('  - TEST_USER_ROLE (default: trainee)');
    process.exit(1);
}

// Create Supabase Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createTestUser() {
    console.log('🚀 Creating test user...\n');
    console.log('Configuration:');
    console.log(`  Supabase URL: ${supabaseUrl}`);
    console.log(`  Email: ${testUserEmail}`);
    console.log(`  Password: ${testUserPassword}`);
    console.log(`  Full Name: ${testUserFullName}`);
    console.log(`  Role: ${testUserRole}\n`);

    try {
        // Create auth user
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: testUserEmail,
            password: testUserPassword,
            email_confirm: true,
            user_metadata: {
                full_name: testUserFullName,
                role: testUserRole
            }
        });

        if (userError) {
            const errorMsg = userError.message || String(userError);
            if (errorMsg.includes('already registered') ||
                errorMsg.includes('already been registered') ||
                errorMsg.includes('User already registered')) {
                console.log('⚠️  User already exists, fetching user ID...');

                // Get existing user
                const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = existingUsers.users.find(u => u.email === testUserEmail);

                if (existingUser) {
                    console.log(`✅ Found existing user (ID: ${existingUser.id})`);

                    // Update user metadata
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        user_metadata: {
                            full_name: testUserFullName,
                            role: testUserRole
                        }
                    });

                    // Create/update profile
                    await supabaseAdmin
                        .from('profiles')
                        .upsert({
                            id: existingUser.id,
                            email: testUserEmail,
                            full_name: testUserFullName,
                            role: testUserRole
                        });

                    console.log('✅ User profile updated');

                    // If role is trainee, create customer and lead records
                    if (testUserRole === 'trainee') {
                        // Create/update customer record
                        const { data: existingCustomer } = await supabaseAdmin
                            .from('customers')
                            .select('*')
                            .eq('user_id', existingUser.id)
                            .maybeSingle();

                        if (existingCustomer) {
                            await supabaseAdmin
                                .from('customers')
                                .update({
                                    full_name: testUserFullName,
                                    email: testUserEmail
                                })
                                .eq('id', existingCustomer.id);
                            console.log('✅ Customer record updated');
                        } else {
                            const { data: newCustomer } = await supabaseAdmin
                                .from('customers')
                                .insert({
                                    full_name: testUserFullName,
                                    email: testUserEmail,
                                    user_id: existingUser.id
                                })
                                .select()
                                .single();

                            if (newCustomer) {
                                console.log('✅ Customer record created');

                                // Create lead record
                                await supabaseAdmin
                                    .from('leads')
                                    .upsert({
                                        customer_id: newCustomer.id,
                                        full_name: testUserFullName,
                                        email: testUserEmail,
                                        status_main: 'בטיפול'
                                    }, { onConflict: 'phone' });

                                console.log('✅ Lead record created/updated');
                            }
                        }
                    }
                } else {
                    console.error('❌ User exists but could not be found in list');
                    return;
                }
            } else {
                throw userError;
            }
        } else {
            console.log(`✅ User created (ID: ${userData.user.id})`);

            // Create profile
            await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: userData.user.id,
                    email: testUserEmail,
                    full_name: testUserFullName,
                    role: testUserRole
                });

            console.log('✅ Profile created');

            // If role is trainee, create customer and lead records
            if (testUserRole === 'trainee') {
                const { data: customer } = await supabaseAdmin
                    .from('customers')
                    .insert({
                        full_name: testUserFullName,
                        email: testUserEmail,
                        user_id: userData.user.id
                    })
                    .select()
                    .single();

                if (customer) {
                    console.log('✅ Customer record created');

                    // Create lead record
                    await supabaseAdmin
                        .from('leads')
                        .upsert({
                            customer_id: customer.id,
                            full_name: testUserFullName,
                            email: testUserEmail,
                            status_main: 'בטיפול'
                        }, { onConflict: 'phone' });

                    console.log('✅ Lead record created/updated');
                }
            }
        }

        console.log('\n========================================');
        console.log('✅ TEST USER CREATED SUCCESSFULLY');
        console.log('========================================\n');
        console.log('📧 USER CREDENTIALS:');
        console.log(`   Email: ${testUserEmail}`);
        console.log(`   Password: ${testUserPassword}`);
        console.log(`   Role: ${testUserRole}`);
        console.log(`   Full Name: ${testUserFullName}\n`);
        console.log('========================================\n');
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
        process.exit(1);
    }
}

// Run the script
createTestUser().catch(console.error);
