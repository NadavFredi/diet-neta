
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const getLeadsConfig = async (supabase: SupabaseClient) => {
  // Fetch dynamic filter options from the existing RPC function
  const { data: filterOptions, error } = await supabase.rpc('get_lead_filter_options')
  
  if (error) {
    console.error('Error fetching lead filter options:', error)
  }

  // Helper to safely get options or return empty array
  const getOptions = (key: string) => filterOptions?.[key] || []

  return {
    entity: 'leads',
    tableName: 'v_leads_with_customer',
    defaultSort: { field: 'created_at', direction: 'desc' },
    columns: [
      // Customers Entity
      {
        id: 'customer_name',
        label: 'שם מלא',
        type: 'text',
        sortable: true,
        visible: true,
        category: 'לקוחות'
      },
      {
        id: 'customer_phone',
        label: 'טלפון',
        type: 'text',
        sortable: true,
        visible: true,
        category: 'לקוחות'
      },
      {
        id: 'customer_email',
        label: 'אימייל',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לקוחות'
      },

      // Leads Entity
      {
        id: 'city',
        label: 'עיר',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
      {
        id: 'age',
        label: 'גיל',
        type: 'number',
        sortable: true,
        visible: true,
        category: 'לידים'
      },
      {
        id: 'gender',
        label: 'מין',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
      {
        id: 'status_main',
        label: 'סטטוס',
        type: 'badge',
        sortable: true,
        visible: true,
        category: 'לידים'
      },
      {
        id: 'status_sub',
        label: 'תת-סטטוס',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
      {
        id: 'source',
        label: 'מקור',
        type: 'text',
        sortable: true,
        visible: true,
        category: 'לידים'
      },
      {
        id: 'created_at',
        label: 'תאריך הצטרפות',
        type: 'date',
        sortable: true,
        visible: true,
        category: 'לידים'
      },
      {
        id: 'fitness_goal',
        label: 'מטרה',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
      {
        id: 'activity_level',
        label: 'רמת פעילות',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
       {
        id: 'preferred_time',
        label: 'זמן מועדף',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
      {
        id: 'height',
        label: 'גובה',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'לידים'
      },
      {
        id: 'weight',
        label: 'משקל',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'לידים'
      },

      // Subscription
      {
        id: 'subscription_name',
        label: 'סוג מנוי',
        type: 'text',
        sortable: true,
        visible: false,
        category: 'מנוי'
      },
      {
        id: 'subscription_months',
        label: 'חודשי מנוי',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'מנוי'
      },

      // Budget
      {
        id: 'active_budget_name',
        label: 'תקציב פעיל',
        type: 'text',
        sortable: true,
        visible: true,
        category: 'תקציב'
      },

      // Collections & Payments
      {
        id: 'total_expected',
        label: 'צפי גבייה',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'גבייה'
      },
      {
        id: 'total_paid',
        label: 'שולם בפועל',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'גבייה'
      },
      {
        id: 'debt_amount',
        label: 'חוב',
        type: 'number',
        sortable: true,
        visible: true,
        category: 'גבייה'
      },
      {
        id: 'last_payment_date',
        label: 'תאריך תשלום אחרון',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'גבייה'
      },

      // Plans
      {
        id: 'workout_plans_count',
        label: 'מספר תוכניות אימון',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'תוכניות'
      },
      {
        id: 'nutrition_plans_count',
        label: 'מספר תוכניות תזונה',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'תוכניות'
      },
      {
        id: 'latest_workout_plan_date',
        label: 'תאריך תוכנית אימון אחרונה',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'תוכניות'
      },
      {
        id: 'latest_nutrition_plan_date',
        label: 'תאריך תוכנית תזונה אחרונה',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'תוכניות'
      },

      // Supplement Plans
      {
        id: 'supplement_plans_count',
        label: 'מספר תוכניות תוספים',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'תוספים'
      },
      {
        id: 'latest_supplement_plan_date',
        label: 'תאריך תוכנית תוספים אחרונה',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'תוספים'
      },

      // Steps Plans
      {
        id: 'steps_plans_count',
        label: 'מספר תוכניות צעדים',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'צעדים'
      },
      {
        id: 'latest_steps_plan_date',
        label: 'תאריך תוכנית צעדים אחרונה',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'צעדים'
      },

      // Meetings
      {
        id: 'meetings_count',
        label: 'מספר פגישות',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'פגישות'
      },
      {
        id: 'latest_meeting_date',
        label: 'פגישה אחרונה',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'פגישות'
      },
      {
        id: 'next_meeting_date',
        label: 'פגישה הבאה',
        type: 'date',
        sortable: true,
        visible: true,
        category: 'פגישות'
      },

      // Blood Tests
      {
        id: 'blood_tests_count',
        label: 'מספר בדיקות דם',
        type: 'number',
        sortable: true,
        visible: false,
        category: 'בדיקות דם'
      },
      {
        id: 'latest_test_date',
        label: 'בדיקת דם אחרונה',
        type: 'date',
        sortable: true,
        visible: false,
        category: 'בדיקות דם'
      }
    ],
    filters: [
      // Customers
      {
        id: 'customer_name',
        label: 'שם',
        type: 'text',
        operators: ['ilike', 'eq'],
        category: 'לקוחות'
      },
      {
        id: 'customer_phone',
        label: 'טלפון',
        type: 'text',
        operators: ['ilike', 'eq'],
        category: 'לקוחות'
      },
      {
        id: 'customer_email',
        label: 'אימייל',
        type: 'text',
        operators: ['ilike', 'eq'],
        category: 'לקוחות'
      },

      // Leads
      {
        id: 'status_main',
        label: 'סטטוס',
        type: 'select',
        operators: ['eq', 'in', 'neq'],
        options: getOptions('statuses'),
        category: 'לידים'
      },
      {
        id: 'source',
        label: 'מקור',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('sources'),
        category: 'לידים'
      },
      {
        id: 'created_at',
        label: 'תאריך הצטרפות',
        type: 'date_range',
        operators: ['gte', 'lte'],
        category: 'לידים'
      },
      {
        id: 'age',
        label: 'גיל',
        type: 'number',
        operators: ['eq', 'gte', 'lte'],
        options: getOptions('ages'),
        category: 'לידים'
      },
      {
        id: 'fitness_goal',
        label: 'מטרה',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('fitness_goals'),
        category: 'לידים'
      },
      {
        id: 'activity_level',
        label: 'רמת פעילות',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('activity_levels'),
        category: 'לידים'
      },
      {
        id: 'preferred_time',
        label: 'זמן מועדף',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('preferred_times'),
        category: 'לידים'
      },
      {
        id: 'height',
        label: 'גובה',
        type: 'number',
        operators: ['eq', 'gte', 'lte'],
        options: getOptions('heights'),
        category: 'לידים'
      },
      {
        id: 'weight',
        label: 'משקל',
        type: 'number',
        operators: ['eq', 'gte', 'lte'],
        options: getOptions('weights'),
        category: 'לידים'
      },

      // Subscription
      {
        id: 'subscription_name',
        label: 'סוג מנוי',
        type: 'text',
        operators: ['ilike', 'eq'],
        category: 'מנוי'
      },

      // Budget
      {
        id: 'active_budget_name',
        label: 'תקציב פעיל',
        type: 'text',
        operators: ['ilike', 'eq'],
        category: 'תקציב'
      },

      // Collections
      {
        id: 'debt_amount',
        label: 'חוב',
        type: 'number',
        operators: ['gt', 'lt', 'eq', 'gte', 'lte'],
        category: 'גבייה'
      },
      {
        id: 'total_paid',
        label: 'שולם בפועל',
        type: 'number',
        operators: ['gt', 'lt', 'eq', 'gte', 'lte'],
        category: 'גבייה'
      },
      {
        id: 'last_payment_date',
        label: 'תאריך תשלום אחרון',
        type: 'date_range',
        operators: ['gte', 'lte'],
        category: 'גבייה'
      },

      // Meetings
      {
        id: 'next_meeting_date',
        label: 'תאריך פגישה הבאה',
        type: 'date_range',
        operators: ['gte', 'lte'],
        category: 'פגישות'
      },
      {
        id: 'supplement_plans_count',
        label: 'מספר תוכניות תוספים',
        type: 'number',
        operators: ['gt', 'lt', 'eq', 'gte', 'lte'],
        category: 'תוספים'
      },
      {
        id: 'steps_plans_count',
        label: 'מספר תוכניות צעדים',
        type: 'number',
        operators: ['gt', 'lt', 'eq', 'gte', 'lte'],
        category: 'צעדים'
      },
      {
        id: 'blood_tests_count',
        label: 'מספר בדיקות דם',
        type: 'number',
        operators: ['gt', 'lt', 'eq', 'gte', 'lte'],
        category: 'בדיקות דם'
      }
    ],
    grouping: [
      {
        id: 'status_main',
        label: 'לפי סטטוס',
        category: 'לידים'
      },
      {
        id: 'source',
        label: 'לפי מקור',
        category: 'לידים'
      },
      {
        id: 'fitness_goal',
        label: 'לפי מטרה',
        category: 'לידים'
      },
      {
        id: 'activity_level',
        label: 'לפי רמת פעילות',
        category: 'לידים'
      },
      {
        id: 'preferred_time',
        label: 'לפי זמן מועדף',
        category: 'לידים'
      },
      {
        id: 'active_budget_name',
        label: 'לפי תקציב',
        category: 'תקציב'
      },
      {
        id: 'subscription_name',
        label: 'לפי מנוי',
        category: 'מנוי'
      },
      {
        id: 'debt_amount',
        label: 'לפי חוב',
        category: 'גבייה'
      },
      {
        id: 'meetings_count',
        label: 'לפי מספר פגישות',
        category: 'פגישות'
      },
      {
        id: 'blood_tests_count',
        label: 'לפי מספר בדיקות דם',
        category: 'בדיקות דם'
      }
    ]
  }
}
