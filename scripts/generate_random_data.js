/**
 * Script to generate random test data for local database
 * Creates 180 customers and 300 leads with random data
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
async function generateCustomers(count) {
  console.log(`\n📦 Creating ${count} customers...`);
  const customers = [];
  
  for (let i = 0; i < count; i++) {
    const fullName = generateFullName();
    const phone = generatePhoneNumber();
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
      phone: phone,
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
async function generateLeads(count, customers) {
  console.log(`📋 Creating ${count} leads...`);
  
  const leads = [];
  
  // Some customers will have multiple leads
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
        const { error: singleError } = await supabaseAdmin
          .from('leads')
          .insert(lead)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert lead for customer ${lead.customer_id}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} leads (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} leads\n`);
  return leads;
}

// Main function
async function generateRandomData() {
  console.log('🚀 Starting random data generation...');
  console.log('📊 Target: 180 customers, 300 leads\n');
  
  try {
    // Step 1: Generate customers
    const customers = await generateCustomers(180);
    
    if (customers.length === 0) {
      console.error('❌ Failed to create any customers. Aborting.');
      return;
    }
    
    // Step 2: Generate leads
    await generateLeads(300, customers);
    
    console.log('========================================');
    console.log('✅ DATA GENERATION COMPLETE');
    console.log('========================================\n');
    console.log(`📦 Customers created: ${customers.length}`);
    console.log(`📋 Leads created: 300\n`);
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
