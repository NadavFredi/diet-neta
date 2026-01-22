import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map abstract entities to actual tables/views
const ENTITY_MAP: Record<string, string> = {
  'leads': 'v_leads_with_customer'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entity, select = '*', filters = [], sort, page = 1, pageSize = 20 } = await req.json()

    if (!entity || !ENTITY_MAP[entity]) {
      throw new Error(`Invalid or missing entity: ${entity}`)
    }

    const tableName = ENTITY_MAP[entity]

    // Create Supabase client with the user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Build the query
    let query = supabaseClient.from(tableName).select(Array.isArray(select) ? select.join(',') : select, { count: 'exact' })

    // Apply filters
    // Expected format: { field: 'status', operator: 'eq', value: 'new' }
    filters.forEach((filter: any) => {
      if (filter.field && filter.operator) {
        switch (filter.operator) {
          case 'eq': query = query.eq(filter.field, filter.value); break;
          case 'neq': query = query.neq(filter.field, filter.value); break;
          case 'gt': query = query.gt(filter.field, filter.value); break;
          case 'gte': query = query.gte(filter.field, filter.value); break;
          case 'lt': query = query.lt(filter.field, filter.value); break;
          case 'lte': query = query.lte(filter.field, filter.value); break;
          case 'like': query = query.like(filter.field, filter.value); break;
          case 'ilike': query = query.ilike(filter.field, filter.value); break;
          case 'is': query = query.is(filter.field, filter.value); break;
          case 'in': query = query.in(filter.field, filter.value); break;
          // Add more as needed
          default: 
            console.warn(`Unsupported operator: ${filter.operator}`)
        }
      }
    })

    // Apply sorting
    if (sort && sort.field) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' })
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    // Execute
    const { data, error, count } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ data, count, page, pageSize }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
