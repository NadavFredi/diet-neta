/**
 * Test script to manually trigger Fillout webhook automation
 * 
 * Usage:
 * node scripts/test-fillout-automation.js <customer_id>
 * 
 * Example:
 * node scripts/test-fillout-automation.js "123e4567-e89b-12d3-a456-426614174000"
 */

const customerId = process.argv[2];
const leadId = process.argv[3] || null;

if (!customerId) {
  console.error('❌ Error: Customer ID is required');
  console.log('\nUsage: node scripts/test-fillout-automation.js <customer_id> [lead_id]');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const webhookUrl = `${SUPABASE_URL}/functions/v1/receive-fillout-webhook`;

const testPayload = {
  formId: 'n5VwsjFk5ous',
  submissionId: `test-${Date.now()}`,
  submissionTime: new Date().toISOString(),
  urlParameters: [
    {
      name: 'customer_id',
      value: customerId
    },
    ...(leadId ? [{
      name: 'lead_id',
      value: leadId
    }] : [])
  ],
  questions: []
};

console.log('🧪 Testing Fillout Automation...');
console.log('📤 Sending webhook to:', webhookUrl);
console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));
console.log('\n');

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify(testPayload)
})
  .then(async (response) => {
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Webhook received successfully!');
      console.log('📝 Check the function logs to see if automation was triggered:');
      console.log('   supabase functions logs receive-fillout-webhook --follow');
    } else {
      console.log('\n❌ Webhook failed!');
    }
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Supabase functions are running: npm run functions:local');
    console.log('   2. Customer ID exists in database');
    console.log('   3. Customer has a phone number');
    console.log('   4. intro_questionnaire template exists');
  });
