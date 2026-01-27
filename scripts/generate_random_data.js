/**
 * Script to generate random test data for local database
 * Creates data for all tables displayed to users with at least 100 records each:
 * - 150 customers
 * - 200 leads
 * - 150+ meetings
 * - 150+ payments
 * - 100+ subscription_types
 * - 100+ exercises
 * - 100+ workout_templates
 * - 100+ nutrition_templates
 * - 100+ budgets
 * - 100+ collections
 * 
 * Run with: npm run generate-random-data
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

// Exercise names (Hebrew)
const exerciseNames = [
  'סקוואט', 'לאנץ', 'דדליפט', 'פראס', 'בנץ פרס', 'משיכה', 'לחיצת כתפיים', 'כפיפות בטן',
  'פלאנק', 'בורפי', 'קפיצות', 'ריצה במקום', 'מתח', 'דיפ', 'לחיצת רגליים', 'כפיפת ברכיים',
  'הרמת אגן', 'גשר', 'מעברי צד', 'כפיפות בטן צד', 'ריצת מדרגות', 'קפיצות על קופסה',
  'כפיפות ידיים', 'טרייספס', 'בייספס', 'לחיצת חזה', 'פליי', 'לחיצת רגליים', 'כפיפת רגליים',
  'הרמת עגל', 'מתח אופקי', 'פלאנק צד', 'כפיפות בטן הפוך', 'ריצת אינטרוולים', 'קפיצות רוחב',
  'כפיפות בטן עם כדור', 'פלאנק עם הרמת רגל', 'כפיפות בטן עם הרמת רגליים', 'ריצת סיבולת',
  'כפיפות בטן עם סיבוב', 'פלאנק עם הרמת יד', 'כפיפות בטן עם הרמת ידיים', 'ריצת ספרינט',
  'כפיפות בטן עם הרמת יד ורגל', 'פלאנק עם הרמת יד ורגל', 'כפיפות בטן עם הרמת ידיים ורגליים',
  'ריצת אינטרוולים ארוכים', 'כפיפות בטן עם הרמת ידיים ורגליים', 'פלאנק עם הרמת ידיים ורגליים'
];

// Workout template names
const workoutTemplateNames = [
  'תוכנית חיטוב בסיסית', 'תוכנית כוח מתחילה', 'תוכנית אירובי', 'תוכנית פול בודי',
  'תוכנית רגליים', 'תוכנית עליון', 'תוכנית ליבה', 'תוכנית HIIT',
  'תוכנית יוגה', 'תוכנית פילאטיס', 'תוכנית פונקציונלית', 'תוכנית קרדיו',
  'תוכנית כוח מתקדמת', 'תוכנית גמישות', 'תוכנית שיקום', 'תוכנית איזון',
  'תוכנית קואורדינציה', 'תוכנית סיבולת', 'תוכנית מהירות', 'תוכנית כוח מתפרץ'
];

// Nutrition template names
const nutritionTemplateNames = [
  'תוכנית תזונה דלת קלוריות', 'תוכנית תזונה עשירה בחלבון', 'תוכנית תזונה מאוזנת',
  'תוכנית תזונה דלת פחמימות', 'תוכנית תזונה דלת שומן', 'תוכנית תזונה קטוגנית',
  'תוכנית תזונה צמחונית', 'תוכנית תזונה טבעונית', 'תוכנית תזונה ללא גלוטן',
  'תוכנית תזונה ללא לקטוז', 'תוכנית תזונה ים תיכונית', 'תוכנית תזונה אסייתית',
  'תוכנית תזונה דלת נתרן', 'תוכנית תזונה עשירה בסיבים', 'תוכנית תזונה דלת סוכר',
  'תוכנית תזונה עשירה בנוגדי חמצון', 'תוכנית תזונה דלת כולסטרול', 'תוכנית תזונה עשירה בויטמינים',
  'תוכנית תזונה דלת שומן רווי', 'תוכנית תזונה עשירה באומגה 3'
];

// Subscription type names
const subscriptionTypeNames = [
  'מנוי חודשי', 'מנוי 3 חודשים', 'מנוי 6 חודשים', 'מנוי שנתי',
  'מנוי VIP', 'מנוי בסיסי', 'מנוי פרימיום', 'מנוי סטודנט',
  'מנוי משפחתי', 'מנוי זוגי', 'מנוי חד פעמי', 'מנוי ניסיון',
  'מנוי מתנה', 'מנוי עסקי', 'מנוי ארגוני', 'מנוי מיוחד'
];

// Collection statuses
const collectionStatuses = ['ממתין', 'חלקי', 'הושלם', 'בוטל'];

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
  console.log(`   (Target: At least 150 meetings to ensure >100 records)`);
  
  // Create meetings for 60% of leads (some leads have multiple meetings)
  // Ensure we get at least 150 meetings total
  const meetings = [];
  const leadsWithMeetings = new Set();
  const targetMeetings = Math.max(150, Math.ceil(leads.length * 0.75)); // At least 75% of leads get meetings
  
  // First pass: 75% of leads get at least one meeting
  for (const lead of leads) {
    if (!lead.id || !lead.customer_id) continue; // Skip leads without IDs
    
    if (meetings.length < targetMeetings || Math.random() < 0.75) {
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
  
  // Second pass: Add more meetings until we reach target
  const leadsArray = Array.from(leadsWithMeetings);
  while (meetings.length < targetMeetings && leadsArray.length > 0) {
    const leadId = leadsArray[Math.floor(Math.random() * leadsArray.length)];
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
  console.log(`   (Target: At least 150 payments to ensure >100 records)`);
  
  const payments = [];
  const targetPayments = Math.max(150, Math.ceil(customers.length * 1.0)); // At least 1 payment per customer on average
  
  // Create payments for customers
  // Some customers have multiple payments
  for (const customer of customers) {
    // Find a lead for this customer
    const customerLeads = leads.filter(l => l.customer_id === customer.id);
    const lead = customerLeads.length > 0 ? customerLeads[Math.floor(Math.random() * customerLeads.length)] : null;
    
    // Generate 1-3 payments per customer, but ensure we reach target
    const numPayments = payments.length < targetPayments 
      ? Math.floor(Math.random() * 3) + 1 
      : (Math.random() < 0.7 ? 1 : 0);
    
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
  
  // If we still don't have enough payments, add more
  while (payments.length < targetPayments && customers.length > 0) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const customerLeads = leads.filter(l => l.customer_id === customer.id);
    const lead = customerLeads.length > 0 ? customerLeads[Math.floor(Math.random() * customerLeads.length)] : null;
    
    const product = paymentProducts[Math.floor(Math.random() * paymentProducts.length)];
    const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    
    let amount = 500 + Math.random() * 2000;
    const paymentDate = randomDate(new Date(2023, 0, 1), new Date());
    
    payments.push({
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
    });
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

// Generate subscription types
async function generateSubscriptionTypes(count) {
  console.log(`\n💳 Creating ${count} subscription types...`);
  const subscriptionTypes = [];
  
  for (let i = 0; i < count; i++) {
    const name = subscriptionTypeNames[i % subscriptionTypeNames.length] + (i >= subscriptionTypeNames.length ? ` ${Math.floor(i / subscriptionTypeNames.length) + 1}` : '');
    const durations = [1, 2, 3, 4, 5, 6, 12];
    const duration = durations[Math.floor(Math.random() * durations.length)];
    const basePrice = [299, 399, 499, 599, 699, 799, 899, 999, 1199, 1499, 1999];
    const price = basePrice[Math.floor(Math.random() * basePrice.length)] * duration;
    
    subscriptionTypes.push({
      name: name,
      duration: duration,
      price: price,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < subscriptionTypes.length; i += batchSize) {
    const batch = subscriptionTypes.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('subscription_types')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const subType of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('subscription_types')
          .insert(subType)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert ${subType.name}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} subscription types (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} subscription types\n`);
  return subscriptionTypes;
}

// Generate exercises
async function generateExercises(count) {
  console.log(`\n🏋️ Creating ${count} exercises...`);
  const exercises = [];
  
  for (let i = 0; i < count; i++) {
    const name = exerciseNames[i % exerciseNames.length] + (i >= exerciseNames.length ? ` ${Math.floor(i / exerciseNames.length) + 1}` : '');
    const repetitions = [8, 10, 12, 15, 20, 25, 30][Math.floor(Math.random() * 7)];
    const weight = Math.random() < 0.5 ? null : parseFloat((5 + Math.random() * 95).toFixed(2)); // 5-100 kg
    const hasVideo = Math.random() < 0.3; // 30% have videos
    const videoLink = hasVideo ? `https://www.youtube.com/watch?v=${Math.random().toString(36).substr(2, 11)}` : null;
    
    exercises.push({
      name: name,
      repetitions: repetitions,
      weight: weight,
      video_link: videoLink,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const exercise of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('exercises')
          .insert(exercise)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert ${exercise.name}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} exercises (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} exercises\n`);
  return exercises;
}

// Generate workout templates
async function generateWorkoutTemplates(count) {
  console.log(`\n💪 Creating ${count} workout templates...`);
  const templates = [];
  const goalTagsOptions = [['חיטוב'], ['כוח'], ['סיבולת'], ['גמישות'], ['חיטוב', 'כוח'], ['סיבולת', 'כוח'], ['חיטוב', 'סיבולת']];
  
  for (let i = 0; i < count; i++) {
    const name = workoutTemplateNames[i % workoutTemplateNames.length] + (i >= workoutTemplateNames.length ? ` ${Math.floor(i / workoutTemplateNames.length) + 1}` : '');
    const description = `תוכנית אימונים ${name.toLowerCase()} - ${['מתחילה', 'בינונית', 'מתקדמת'][Math.floor(Math.random() * 3)]}`;
    const goalTags = goalTagsOptions[Math.floor(Math.random() * goalTagsOptions.length)];
    const isPublic = Math.random() < 0.3; // 30% are public
    
    // Generate simple routine_data structure
    const routineData = {
      weeklyWorkout: {
        sunday: { exercises: [], rest: Math.random() < 0.5 },
        monday: { exercises: [], rest: Math.random() < 0.3 },
        tuesday: { exercises: [], rest: Math.random() < 0.3 },
        wednesday: { exercises: [], rest: Math.random() < 0.3 },
        thursday: { exercises: [], rest: Math.random() < 0.3 },
        friday: { exercises: [], rest: Math.random() < 0.5 },
        saturday: { exercises: [], rest: Math.random() < 0.4 }
      }
    };
    
    templates.push({
      name: name,
      description: description,
      goal_tags: goalTags,
      routine_data: routineData,
      is_public: isPublic,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('workout_templates')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const template of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('workout_templates')
          .insert(template)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert ${template.name}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} workout templates (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} workout templates\n`);
  return templates;
}

// Generate nutrition templates
async function generateNutritionTemplates(count) {
  console.log(`\n🥗 Creating ${count} nutrition templates...`);
  const templates = [];
  
  for (let i = 0; i < count; i++) {
    const name = nutritionTemplateNames[i % nutritionTemplateNames.length] + (i >= nutritionTemplateNames.length ? ` ${Math.floor(i / nutritionTemplateNames.length) + 1}` : '');
    const description = `תוכנית תזונה ${name.toLowerCase()} - ${['מתחילה', 'בינונית', 'מתקדמת'][Math.floor(Math.random() * 3)]}`;
    const isPublic = Math.random() < 0.3; // 30% are public
    
    // Generate nutrition targets
    const calories = 1200 + Math.random() * 1000; // 1200-2200 calories
    const protein = 80 + Math.random() * 100; // 80-180g
    const carbs = 100 + Math.random() * 200; // 100-300g
    const fat = 40 + Math.random() * 60; // 40-100g
    const fiber = 20 + Math.random() * 15; // 20-35g
    
    const targets = {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber)
    };
    
    templates.push({
      name: name,
      description: description,
      targets: targets,
      is_public: isPublic,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('nutrition_templates')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const template of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('nutrition_templates')
          .insert(template)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert ${template.name}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} nutrition templates (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} nutrition templates\n`);
  return templates;
}

// Generate budgets
async function generateBudgets(count, nutritionTemplates, workoutTemplates) {
  console.log(`\n📊 Creating ${count} budgets...`);
  const budgets = [];
  
  for (let i = 0; i < count; i++) {
    const name = `תקציב ${i + 1}`;
    const description = `תוכנית תקציב ${name.toLowerCase()} - ${['מתחילה', 'בינונית', 'מתקדמת'][Math.floor(Math.random() * 3)]}`;
    const isPublic = Math.random() < 0.3; // 30% are public
    
    // Link to nutrition template (50% chance)
    const nutritionTemplateId = nutritionTemplates && nutritionTemplates.length > 0 && Math.random() < 0.5
      ? nutritionTemplates[Math.floor(Math.random() * nutritionTemplates.length)].id
      : null;
    
    // Generate custom nutrition targets if no template
    const nutritionTargets = nutritionTemplateId ? {} : {
      calories: Math.round(1200 + Math.random() * 1000),
      protein: Math.round(80 + Math.random() * 100),
      carbs: Math.round(100 + Math.random() * 200),
      fat: Math.round(40 + Math.random() * 60),
      fiber_min: Math.round(20 + Math.random() * 15),
      water_min: Math.round(1500 + Math.random() * 1000)
    };
    
    // Steps goal
    const stepsGoal = [5000, 6000, 7000, 8000, 10000, 12000][Math.floor(Math.random() * 6)];
    const stepsInstructions = `הליכה של ${stepsGoal} צעדים ביום`;
    
    // Link to workout template (50% chance)
    const workoutTemplateId = workoutTemplates && workoutTemplates.length > 0 && Math.random() < 0.5
      ? workoutTemplates[Math.floor(Math.random() * workoutTemplates.length)].id
      : null;
    
    // Supplements
    const supplementNames = ['אומגה 3', 'מגנזיום', 'ויטמין D', 'ברזל', 'ויטמין B12', 'קולגן', 'פרוביוטיקה'];
    const numSupplements = Math.floor(Math.random() * 4); // 0-3 supplements
    const supplements = [];
    for (let j = 0; j < numSupplements; j++) {
      const supplementName = supplementNames[Math.floor(Math.random() * supplementNames.length)];
      if (!supplements.find(s => s.name === supplementName)) {
        supplements.push({
          name: supplementName,
          dosage: `${Math.floor(1 + Math.random() * 3)} כמוסות`,
          timing: ['בוקר', 'צהריים', 'ערב', 'לפני שינה'][Math.floor(Math.random() * 4)]
        });
      }
    }
    
    const eatingOrder = ['ירקות -> חלבון -> פחמימות', 'חלבון -> ירקות -> פחמימות', 'ירקות -> פחמימות -> חלבון'][Math.floor(Math.random() * 3)];
    const eatingRules = ['אל תאכל פחמימות לבד', 'שתה מים לפני הארוחה', 'אכול לאט'][Math.floor(Math.random() * 3)];
    
    budgets.push({
      name: name,
      description: description,
      nutrition_template_id: nutritionTemplateId,
      nutrition_targets: nutritionTargets,
      steps_goal: stepsGoal,
      steps_instructions: stepsInstructions,
      workout_template_id: workoutTemplateId,
      supplements: supplements,
      eating_order: eatingOrder,
      eating_rules: eatingRules,
      is_public: isPublic,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < budgets.length; i += batchSize) {
    const batch = budgets.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('budgets')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const budget of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('budgets')
          .insert(budget)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert ${budget.name}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} budgets (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} budgets\n`);
  return budgets;
}

// Generate collections
async function generateCollections(count, leads, customers) {
  console.log(`\n💰 Creating ${count} collections...`);
  const collections = [];
  
  // Create collections for leads (some leads have multiple collections)
  const leadsWithCollections = new Set();
  
  for (let i = 0; i < count; i++) {
    // Find a random lead that hasn't been used too much
    let lead = leads[Math.floor(Math.random() * leads.length)];
    let attempts = 0;
    while (leadsWithCollections.has(lead.id) && attempts < 10) {
      lead = leads[Math.floor(Math.random() * leads.length)];
      attempts++;
    }
    leadsWithCollections.add(lead.id);
    
    const customer = customers.find(c => c.id === lead.customer_id);
    if (!customer) continue;
    
    const totalAmount = 500 + Math.random() * 5000; // 500-5500 NIS
    const dueDate = randomDate(new Date(2023, 0, 1), new Date(2025, 11, 31));
    const status = collectionStatuses[Math.floor(Math.random() * collectionStatuses.length)];
    const description = `גבייה עבור ${lead.fitness_goal || 'שירותים'}`;
    const notes = Math.random() < 0.3 ? ['תשלום ראשון', 'תשלום חודשי', 'תשלום חד פעמי'][Math.floor(Math.random() * 3)] : null;
    
    collections.push({
      lead_id: lead.id,
      customer_id: customer.id,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      due_date: dueDate.toISOString().split('T')[0],
      status: status,
      description: description,
      notes: notes,
      created_at: randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < collections.length; i += batchSize) {
    const batch = collections.slice(i, i + batchSize);
    const { data, error } = await supabaseAdmin
      .from('collections')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      for (const collection of batch) {
        const { error: singleError } = await supabaseAdmin
          .from('collections')
          .insert(collection)
          .select('id')
          .single();
        
        if (singleError) {
          console.error(`  ⚠️  Failed to insert collection for lead ${collection.lead_id}:`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data.length;
      console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} collections (Total: ${inserted}/${count})`);
    }
  }
  
  console.log(`✅ Created ${inserted} collections\n`);
  return collections;
}

// Main function
// Note: System logic - When creating a lead:
//   1. Check if customer exists by phone number
//   2. If exists: use existing customer_id (update customer info if needed)
//   3. If doesn't exist: create new customer first, then create lead
// For mock data, we create customers first, then leads that link to them.
async function generateRandomData() {
  console.log('🚀 Starting random data generation...');
  console.log('📊 Target: At least 100 records for all tables displayed to users\n');
  console.log('💡 Note: In production, customers are created/upserted when leads are created (by phone number)\n');
  
  try {
    // Step 1: Generate customers (150 to ensure enough for other tables)
    const customers = await generateCustomers(150);
    
    if (customers.length === 0) {
      console.error('❌ Failed to create any customers. Aborting.');
      return;
    }
    
    // Step 2: Generate leads (200 to ensure enough for meetings/collections)
    const leads = await generateLeads(200, customers);
    
    if (leads.length === 0) {
      console.error('❌ Failed to create any leads. Aborting.');
      return;
    }
    
    // Step 3: Generate meetings (150+ to ensure >100)
    const meetings = await generateMeetings(leads, customers);
    
    // Step 4: Generate payments (150+ to ensure >100)
    const payments = await generatePayments(customers, leads);
    
    // Step 5: Generate subscription types (100+)
    const subscriptionTypes = await generateSubscriptionTypes(100);
    
    // Step 6: Generate exercises (100+)
    const exercises = await generateExercises(100);
    
    // Step 7: Generate workout templates (100+)
    const workoutTemplates = await generateWorkoutTemplates(100);
    
    // Step 8: Generate nutrition templates (100+)
    const nutritionTemplates = await generateNutritionTemplates(100);
    
    // Step 9: Generate budgets (100+)
    const budgets = await generateBudgets(100, nutritionTemplates, workoutTemplates);
    
    // Step 10: Generate collections (100+)
    const collections = await generateCollections(100, leads, customers);
    
    console.log('========================================');
    console.log('✅ DATA GENERATION COMPLETE');
    console.log('========================================\n');
    console.log(`📦 Customers created: ${customers.length}`);
    console.log(`📋 Leads created: ${leads.length}`);
    console.log(`📅 Meetings created: ${meetings.length}`);
    console.log(`💳 Payments created: ${payments.length}`);
    console.log(`💳 Subscription Types created: ${subscriptionTypes.length}`);
    console.log(`🏋️ Exercises created: ${exercises.length}`);
    console.log(`💪 Workout Templates created: ${workoutTemplates.length}`);
    console.log(`🥗 Nutrition Templates created: ${nutritionTemplates.length}`);
    console.log(`📊 Budgets created: ${budgets.length}`);
    console.log(`💰 Collections created: ${collections.length}\n`);
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
