
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
      {
        id: 'customer_name',
        label: 'שם מלא',
        type: 'text',
        sortable: true,
        visible: true
      },
      {
        id: 'customer_phone',
        label: 'טלפון',
        type: 'text',
        sortable: true,
        visible: true
      },
      {
        id: 'status_main',
        label: 'סטטוס',
        type: 'badge',
        sortable: true,
        visible: true
      },
      {
        id: 'status_sub',
        label: 'תת-סטטוס',
        type: 'text',
        sortable: true,
        visible: false
      },
      {
        id: 'created_at',
        label: 'תאריך הצטרפות',
        type: 'date',
        sortable: true,
        visible: true
      },
      {
        id: 'source',
        label: 'מקור',
        type: 'text',
        sortable: true,
        visible: true
      },
      {
        id: 'fitness_goal',
        label: 'מטרה',
        type: 'text',
        sortable: true,
        visible: false
      },
      {
        id: 'activity_level',
        label: 'רמת פעילות',
        type: 'text',
        sortable: true,
        visible: false
      },
       {
        id: 'preferred_time',
        label: 'זמן מועדף',
        type: 'text',
        sortable: true,
        visible: false
      },
       {
        id: 'age',
        label: 'גיל',
        type: 'number',
        sortable: true,
        visible: false
      }
    ],
    filters: [
      {
        id: 'status_main',
        label: 'סטטוס',
        type: 'select',
        operators: ['eq', 'in', 'neq'],
        options: getOptions('statuses')
      },
      {
        id: 'customer_name',
        label: 'שם',
        type: 'text',
        operators: ['ilike', 'eq']
      },
      {
        id: 'customer_phone',
        label: 'טלפון',
        type: 'text',
        operators: ['ilike', 'eq']
      },
      {
        id: 'created_at',
        label: 'תאריך',
        type: 'date_range',
        operators: ['gte', 'lte']
      },
      {
        id: 'source',
        label: 'מקור',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('sources')
      },
      {
        id: 'fitness_goal',
        label: 'מטרה',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('fitness_goals')
      },
      {
        id: 'activity_level',
        label: 'רמת פעילות',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('activity_levels')
      },
       {
        id: 'preferred_time',
        label: 'זמן מועדף',
        type: 'select',
        operators: ['eq', 'in'],
        options: getOptions('preferred_times')
      },
      {
        id: 'age',
        label: 'גיל',
        type: 'number',
        operators: ['eq', 'gte', 'lte'],
        // For age we might not want to list every single age as an option unless it's a small set
        // but since get_lead_filter_options returns it, we can include it
        options: getOptions('ages')
      }
    ],
    grouping: [
      {
        id: 'status_main',
        label: 'לפי סטטוס'
      },
      {
        id: 'source',
        label: 'לפי מקור'
      },
      {
        id: 'fitness_goal',
        label: 'לפי מטרה'
      },
      {
        id: 'activity_level',
        label: 'לפי רמת פעילות'
      },
      {
        id: 'preferred_time',
        label: 'לפי זמן מועדף'
      }
    ]
  }
}
