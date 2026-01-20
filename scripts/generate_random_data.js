/**
 * Script to generate random test data for local database
 * Creates 180 customers, 300 leads, meetings, and payments with random data
 * 
 * Run with: node scripts/generate_random_data.js
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (uses service role key for admin operations)
const supabaseAdmin = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' // Default local Supabase service role key
);

// Hebrew first names (female, since this is a diet/fitness app)
const firstNames = [
  'שרה', 'רחל', 'לאה', 'מיכל', 'מוריה', 'ענת', 'נועה', 'מיכל', 'יעל', 'טל',
  'הילה', 'ליאת', 'ענבל', 'נעמה', 'רונית', 'דפנה', 'אורטל', 'עדי', 'חן', 'מור',
  'שיראל', 'אלונה', 'נתלי', 'גילי', 'קרן', 'מרים', 'עדינה', 'רינה', 'ליבי', 'ספיר'
];

// Hebrew last names
const lastNames = [
  'כהן', 'לוי', 'ישראל', 'דוד', 'משה', 'אברהם', 'יעקב', 'יוסף', 'דניאל', 'בן',
  'שלום', 'פרידמן', 'כץ', 'רוזן', 'שפירא', 'מזרחי', 'חדד', 'ביטון', 'עזרא', 'גולן'
];

// Cities in Israel
const cities = [
  'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'אשדוד', 'רמת גן', 'ראשון לציון',
  'רחובות', 'פתח תקווה', 'רעננה', 'הוד השרון', 'כפר סבא', 'רמת השרון', 'הרצליה', 'גבעתיים',
  'בני ברק', 'אשקלון', 'עכו', 'צפת', 'טבריה', 'אילת', 'קריית גת', 'לוד', 'רמלה'
];

// Sources
const sources = [
  'אינסטגרם', 'פייסבוק', 'המלצה', 'גוגל', 'טיקטוק', 'אתר', 'טלוויזיה', 'רדיו'
];

// Fitness goals
const fitnessGoals = [
  'ירידה במשקל', 'עלייה במשקל', 'חיטוב', 'הגדלת מסת שריר', 'שיפור כושר גופני',
  'שמירה על משקל', 'תזונה נכונה', 'אורח חיים בריא'
];

// Activity levels
const activityLevels = [
  'נמוך', 'בינוני', 'גבוה', 'מתאמן מקצועי'
];

// Preferred times
const preferredTimes = [
  'בוקר', 'צהריים', 'ערב', 'לילה', 'גמיש'
];

// Status main values
const statusMainOptions = [
  'פעיל', 'לא פעיל', 'מתקדמת לתהליך', 'לא רלוונטי', 'פולואפ'
];

// Status sub values (mapped to main statuses)
const statusSubOptions = {
  'לא רלוונטי': ['יקר לי', 'חוסר התאמה', 'לא מאמינה במוצר', 'פחד', 'לא הזמן המתאים'],
  'פולואפ': ['ראשוני', 'איכותי']
};

// Membership tiers
const membershipTiers = ['New', 'Standard', 'Premium', 'VIP'];

// Payment statuses (Hebrew)
const paymentStatuses = ['שולם', 'ממתין', 'הוחזר', 'נכשל'];

// Payment products
const paymentProducts = [
  'חבילת תזונה חודשית',
  'חבילת תזונה 3 חודשים',
  'חבילת תזונה 6 חודשים',
  'חבילת תזונה שנתית',
  'ייעוץ תזונתי חד פעמי',
  'תוכנית אימונים',
  'מעקב שבועי',
  'חבילת VIP'
];

// Meeting types/statuses
const meetingTypes = ['פגישת ייעוץ', 'פגישת מעקב', 'פגישת התחלה', 'פגישת סיכום'];
const meetingStatuses = ['מתוכנן', 'הושלם', 'בוטל', 'נדחה'];

// Generate random phone number
function generatePhoneNumber() {
  const prefix = ['050', '051', '052', '053', '054', '055', '056', '058'];
  const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
  const randomNumber = Math.floor(1000000 + Math.random() * 9000000).toString();
  return randomPrefix + randomNumber;
}

// Generate random email
function generateEmail(firstName, lastName, index) {
  const domains = ['gmail.com', 'walla.co.il', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}@${randomDomain}`;
}

// Generate random full name
function generateFullName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Generate random date in past
function randomDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime);
}

// Generate random birth date (age between 18 and 65)
function generateBirthDate() {
  const age = 18 + Math.floor(Math.random() * 47); // Age between 18-65
  const birthYear = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(birthYear, month, day).toISOString().split('T')[0];
}

// Generate random height (150-180 cm)
function generateHeight() {
  return (150 + Math.random() * 30).toFixed(2);
}

// Generate random weight (50-100 kg)
function generateWeight() {
  return (50 + Math.random() * 50).toFixed(2);
}

// Generate random status
function generateStatus() {
  const mainStatus = statusMainOptions[Math.floor(Math.random() * statusMainOptions.length)];
  let subStatus = null;
  
  if (statusSubOptions[mainStatus]) {
    const subOptions = statusSubOptions[mainStatus];
    // 60% chance of having a sub-status when available
    if (Math.random() < 0.6) {
      subStatus = subOptions[Math.floor(Math.random() * subOptions.length)];
    }
  }
  
  return { mainStatus, subStatus };
}

// Generate random subscription data
function generateSubscriptionData() {
  const months = [1, 2, 3, 4, 5, 6, 12];
  const selectedMonths = months[Math.floor(Math.random() * months.length)];
  const initialPrice = [500, 600, 700, 800, 900, 1000, 1200, 1500, 2000][Math.floor(Math.random() * 9)];
  
  const joinDate = randomDate(new Date(2023, 0, 1), new Date());
  const expirationDate = new Date(joinDate);
  expirationDate.setMonth(expirationDate.getMonth() + selectedMonths);
  
  return {
    months: selectedMonths,
    initialPrice: initialPrice,
    expirationDate: expirationDate.toISOString().split('T')[0],
    joinDate: joinDate.toISOString()
  };
}

// Generate customers
// Note: In the real system, customers are created/upserted when leads are created
// (check by phone number, create if doesn't exist). For mock data, we create
// customers first, then leads that link to them.
async function generateCustomers(count) {
  console.log(`\n📦 Creating ${count} customers...`);
  console.log(`   (In real system: customers are created/upserted when leads are created, based on phone number)`);
  const customers = [];
  const usedPhones = new Set(); // Track phone numbers to ensure uniqueness
  
  for (let i = 0; i < count; i++) {
    const fullName = generateFullName();
    
    // Generate unique phone number (phone is unique in customers table)
    let phone = generatePhoneNumber();
    while (usedPhones.has(phone)) {
      phone = generatePhoneNumber();
    }
    usedPhones.add(phone);
    
    const email = generateEmail(
      firstNames[Math.floor(Math.random() * firstNames.length)],
      lastNames[Math.floor(Math.random() * lastNames.length)],
      i
    );
    
    // Calculate total_spent based on membership_tier
    const membershipTier = membershipTiers[Math.floor(Math.random() * membershipTiers.length)];
    let totalSpent = 0;
    switch(membershipTier) {
      case 'New': totalSpent = Math.random() * 500; break;
      case 'Standard': totalSpent = 500 + Math.random() * 1500; break;
      case 'Premium': totalSpent = 2000 + Math.random() * 3000; break;
      case 'VIP': totalSpent = 5000 + Math.random() * 10000; break;
    }
    
    const customer = {
      full_name: fullName,
      phone: phone, // Unique identifier - used to find/create customer when creating leads
      email: email,
      membership_tier: membershipTier,
      total_spent: parseFloat(totalSpent.toFixed(2)),
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString()
    };
    
    customers.push(customer);
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
      // Try inserting one by one for this batch
      for (const customer of batch) {
        const { data: singleData, error: singleError } = await supabaseAdmin
          .from('customers')
          .insert(customer)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert ${customer.full_name}:`, singleError.message);
        } else {
          customer.id = singleData.id;
          inserted++;
        }
      }
    } else {
      // Add IDs back to customer objects
      batch.forEach((customer, idx) => {
        customer.id = data[idx].id;
      });
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} customers (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} customers\n`);
  return customers;
}

// Generate leads
// Note: In the real system, when creating a lead:
// 1. Check if customer exists by phone number
// 2. If exists, use that customer_id (and update customer info if needed)
// 3. If doesn't exist, create new customer first, then create lead
// For mock data, we link leads to pre-existing customers
async function generateLeads(count, customers) {
  console.log(`📋 Creating ${count} leads...`);
  console.log(`   (In real system: customer is found/created by phone when lead is created)`);
  
  const leads = [];
  
  // Some customers will have multiple leads (same customer, multiple opportunities)
  // Distribution: ~60% have 1 lead, ~30% have 2 leads, ~10% have 3+ leads
  const leadDistribution = [];
  for (let i = 0; i < customers.length; i++) {
    const rand = Math.random();
    if (rand < 0.6) {
      leadDistribution.push(1); // 1 lead
    } else if (rand < 0.9) {
      leadDistribution.push(2); // 2 leads
    } else {
      leadDistribution.push(3); // 3 leads
    }
  }
  
  // Adjust to get exactly 'count' leads
  let totalLeads = leadDistribution.reduce((a, b) => a + b, 0);
  while (totalLeads > count) {
    // Reduce some leads
    const idx = Math.floor(Math.random() * leadDistribution.length);
    if (leadDistribution[idx] > 1) {
      leadDistribution[idx]--;
      totalLeads--;
    }
  }
  while (totalLeads < count) {
    // Add more leads
    const idx = Math.floor(Math.random() * leadDistribution.length);
    leadDistribution[idx]++;
    totalLeads++;
  }
  
  let customerIndex = 0;
  let leadCount = 0;
  
  for (let i = 0; i < customers.length && leadCount < count; i++) {
    const customer = customers[i];
    const numLeads = leadDistribution[i] || 1;
    
    for (let j = 0; j < numLeads && leadCount < count; j++) {
      const { mainStatus, subStatus } = generateStatus();
      const subscriptionData = generateSubscriptionData();
      const height = generateHeight();
      const weight = generateWeight();
      const birthDate = generateBirthDate();
      
      // Calculate BMI: weight (kg) / (height (m))^2
      const heightInMeters = parseFloat(height) / 100;
      const bmi = parseFloat((parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(2));
      
      const lead = {
        customer_id: customer.id,
        city: cities[Math.floor(Math.random() * cities.length)],
        birth_date: birthDate,
        gender: Math.random() < 0.95 ? 'female' : (Math.random() < 0.5 ? 'male' : 'other'), // 95% female
        status_main: mainStatus,
        status_sub: subStatus,
        height: parseFloat(height),
        weight: parseFloat(weight),
        bmi: bmi,
        join_date: subscriptionData.joinDate,
        subscription_data: subscriptionData,
        source: sources[Math.floor(Math.random() * sources.length)],
        fitness_goal: fitnessGoals[Math.floor(Math.random() * fitnessGoals.length)],
        activity_level: activityLevels[Math.floor(Math.random() * activityLevels.length)],
        preferred_time: preferredTimes[Math.floor(Math.random() * preferredTimes.length)],
        notes: Math.random() < 0.3 ? `הערות: ${['צריך מעקב', 'מעוניינת במעטפת מלאה', 'בדיקה רפואית', 'תחילת תהליך'][Math.floor(Math.random() * 4)]}` : null,
        created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
        daily_protocol: {},
        workout_history: [],
        steps_history: []
      };
      
      leads.push(lead);
      leadCount++;
    }
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
      // Try inserting one by one for this batch
      for (const lead of batch) {
        const { data: singleData, error: singleError } = await supabaseAdmin
          .from('leads')
          .insert(lead)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert lead for customer ${lead.customer_id}:`, singleError.message);
        } else {
          lead.id = singleData.id;
          inserted++;
        }
      }
    } else {
      // Add IDs back to lead objects
      batch.forEach((lead, idx) => {
        lead.id = data[idx].id;
      });
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} leads (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} leads\n`);
  return leads;
}

// Generate meeting data JSONB structure
function generateMeetingData(lead, customer) {
  const meetingDate = randomDate(new Date(2023, 0, 1), new Date());
  const meetingType = meetingTypes[Math.floor(Math.random() * meetingTypes.length)];
  const status = meetingStatuses[Math.floor(Math.random() * meetingStatuses.length)];
  
  return {
    'תאריך': meetingDate.toISOString().split('T')[0],
    'תאריך פגישה': meetingDate.toISOString().split('T')[0],
    'date': meetingDate.toISOString().split('T')[0],
    'meeting_date': meetingDate.toISOString(),
    'סוג פגישה': meetingType,
    'meeting_type': meetingType,
    'סטטוס': status,
    'status': status,
    'שם': customer.full_name,
    'name': customer.full_name,
    'טלפון': customer.phone,
    'phone': customer.phone,
    'אימייל': customer.email || '',
    'email': customer.email || '',
    'הערות': Math.random() < 0.4 ? ['פגישה מוצלחת', 'צריך מעקב', 'התחלת תהליך', 'התקדמות טובה'][Math.floor(Math.random() * 4)] : '',
    'notes': Math.random() < 0.4 ? 'Meeting notes here' : '',
    'מטרה': lead.fitness_goal || '',
    'goal': lead.fitness_goal || '',
    'משקל נוכחי': lead.weight || '',
    'current_weight': lead.weight || '',
    'משקל יעד': lead.weight ? (lead.weight - 5 + Math.random() * 10).toFixed(1) : '',
    'target_weight': lead.weight ? (lead.weight - 5 + Math.random() * 10).toFixed(1) : ''
  };
}

// Generate meetings
async function generateMeetings(leads, customers) {
  console.log(`📅 Creating meetings...`);
  
  // Create meetings for 60% of leads (some leads have multiple meetings)
  const meetings = [];
  const leadsWithMeetings = new Set();
  
  // First pass: 60% of leads get at least one meeting
  for (const lead of leads) {
    if (!lead.id || !lead.customer_id) continue; // Skip leads without IDs
    
    if (Math.random() < 0.6) {
      leadsWithMeetings.add(lead.id);
      const customer = customers.find(c => c.id === lead.customer_id);
      if (!customer) continue;
      
      const meetingData = generateMeetingData(lead, customer);
      const meetingDate = new Date(meetingData.date);
      
      meetings.push({
        lead_id: lead.id,
        customer_id: lead.customer_id,
        fillout_submission_id: `fillout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${meetings.length}`,
        meeting_data: meetingData,
        created_at: randomDate(meetingDate, new Date()).toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  // Second pass: 20% of leads with meetings get a second meeting
  const leadsArray = Array.from(leadsWithMeetings);
  for (let i = 0; i < leadsArray.length; i++) {
    if (Math.random() < 0.2) {
      const leadId = leadsArray[i];
      const lead = leads.find(l => l.id === leadId);
      if (!lead) continue;
      
      const customer = customers.find(c => c.id === lead.customer_id);
      if (!customer) continue;
      
      const meetingData = generateMeetingData(lead, customer);
      const meetingDate = new Date(meetingData.date);
      
      meetings.push({
        lead_id: lead.id,
        customer_id: lead.customer_id,
        fillout_submission_id: `fillout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${meetings.length}`,
        meeting_data: meetingData,
        created_at: randomDate(meetingDate, new Date()).toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < meetings.length; i += batchSize) {
    const batch = meetings.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('meetings')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Try inserting one by one for this batch
      for (const meeting of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('meetings')
          .insert(meeting)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert meeting for lead ${meeting.lead_id}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} meetings (Total: ${inserted}/${meetings.length})`);
    }
  }
  
  console.log(`✅ Created ${inserted} meetings\n`);
  return meetings;
}

// Generate payments
async function generatePayments(customers, leads) {
  console.log(`💳 Creating payments...`);
  
  const payments = [];
  
  // Create payments for 70% of customers
  // Some customers have multiple payments
  for (const customer of customers) {
    if (Math.random() < 0.7) {
      // Find a lead for this customer
      const customerLeads = leads.filter(l => l.customer_id === customer.id);
      const lead = customerLeads.length > 0 ? customerLeads[Math.floor(Math.random() * customerLeads.length)] : null;
      
      // Generate 1-3 payments per customer
      const numPayments = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numPayments; i++) {
        const product = paymentProducts[Math.floor(Math.random() * paymentProducts.length)];
        const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
        
        // Generate amount based on product
        let amount = 0;
        if (product.includes('חודשית')) {
          amount = 500 + Math.random() * 500; // 500-1000
        } else if (product.includes('3 חודשים')) {
          amount = 1200 + Math.random() * 800; // 1200-2000
        } else if (product.includes('6 חודשים')) {
          amount = 2000 + Math.random() * 1000; // 2000-3000
        } else if (product.includes('שנתית')) {
          amount = 3500 + Math.random() * 1500; // 3500-5000
        } else if (product.includes('VIP')) {
          amount = 5000 + Math.random() * 5000; // 5000-10000
        } else {
          amount = 200 + Math.random() * 800; // 200-1000
        }
        
        const paymentDate = randomDate(new Date(2023, 0, 1), new Date());
        
        const payment = {
          customer_id: customer.id,
          lead_id: lead ? lead.id : null,
          product_name: product,
          amount: parseFloat(amount.toFixed(2)),
          currency: 'ILS',
          status: status,
          stripe_payment_id: status === 'שולם' ? `pi_${Math.random().toString(36).substr(2, 24)}` : null,
          transaction_id: status === 'שולם' || status === 'ממתין' ? `txn_${Math.random().toString(36).substr(2, 16)}` : null,
          receipt_url: status === 'שולם' ? `https://example.com/receipts/${Math.random().toString(36).substr(2, 16)}.pdf` : null,
          notes: Math.random() < 0.3 ? ['תשלום ראשון', 'תשלום חודשי', 'תשלום חד פעמי', 'החזר'][Math.floor(Math.random() * 4)] : null,
          created_at: paymentDate.toISOString(),
          updated_at: paymentDate.toISOString()
        };
        
        payments.push(payment);
      }
    }
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < payments.length; i += batchSize) {
    const batch = payments.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Try inserting one by one for this batch
      for (const payment of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('payments')
          .insert(payment)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert payment for customer ${payment.customer_id}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} payments (Total: ${inserted}/${payments.length})`);
    }
  }
  
  console.log(`✅ Created ${inserted} payments\n`);
  return payments;
}

// Main function
// Note: System logic - When creating a lead:
//   1. Check if customer exists by phone number
//   2. If exists: use existing customer_id (update customer info if needed)
//   3. If doesn't exist: create new customer first, then create lead
// For mock data, we create customers first, then leads that link to them.
async function generateRandomData() {
  console.log('🚀 Starting random data generation...');
  console.log('📊 Target: 180 customers, 300 leads, meetings, and payments\n');
  console.log('💡 Note: In production, customers are created/upserted when leads are created (by phone number)\n');
  
  try {
    // Step 1: Generate customers
    // Each customer has a unique phone number (used as identifier in real system)
    const customers = await generateCustomers(180);
    
    if (customers.length === 0) {
      console.error('❌ Failed to create any customers. Aborting.');
      return;
    }
    
    // Step 2: Generate leads
    // Leads are linked to customers via customer_id
    // Multiple leads can belong to the same customer (same phone = same customer)
    const leads = await generateLeads(300, customers);
    
    if (leads.length === 0) {
      console.error('❌ Failed to create any leads. Aborting.');
      return;
    }
    
    // Step 3: Generate meetings
    const meetings = await generateMeetings(leads, customers);
    
    // Step 4: Generate payments
    const payments = await generatePayments(customers, leads);
    
    console.log('========================================');
    console.log('✅ DATA GENERATION COMPLETE');
    console.log('========================================\n');
    console.log(`📦 Customers created: ${customers.length}`);
    console.log(`📋 Leads created: ${leads.length}`);
    console.log(`📅 Meetings created: ${meetings.length}`);
    console.log(`💳 Payments created: ${payments.length}\n`);
    console.log('You can now check your local database!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ ERROR GENERATING DATA:');
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
generateRandomData().catch(console.error);
