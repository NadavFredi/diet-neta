/**
 * Analytics Logic
 * 
 * Business logic for the analytics dashboard page.
 * Fetches statistics from Supabase for leads, customers, payments, and meetings.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { startOfDay, endOfDay } from 'date-fns';

export interface AnalyticsData {
  // Leads statistics
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  leadsOverTime: { date: string; count: number }[];
  totalLeads: number;
  
  // Customers statistics
  customersOverTime: { date: string; count: number }[];
  totalCustomers: number;
  
  // Payments/Revenue statistics
  paymentsOverTime: { date: string; amount: number; count: number }[];
  paymentsByStatus: { status: string; amount: number; count: number }[];
  paymentsByType: { product_name: string; amount: number; count: number }[];
  totalRevenue: number;
  totalPayments: number;
  
  // Collections statistics
  collectionsOverTime: { date: string; amount: number; count: number }[];
  collectionsByStatus: { status: string; amount: number; count: number }[];
  totalCollections: number;
  totalCollectionsAmount: number;
  
  // Meetings statistics
  meetingsOverTime: { date: string; count: number }[];
  meetingsByStatus: { status: string; count: number }[];
  totalMeetings: number;
  completedMeetings: number;
  scheduledMeetings: number;
}

export const useAnalytics = (dateRange?: { from?: Date; to?: Date }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build date filter for queries
  const dateFilter = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      // Default to last 30 days if no range provided
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return {
        from: startOfDay(from).toISOString(),
        to: endOfDay(to).toISOString(),
      };
    }
    return {
      from: startOfDay(dateRange.from).toISOString(),
      to: endOfDay(dateRange.to).toISOString(),
    };
  }, [dateRange]);

  // Fetch all analytics data
  const { data: analyticsData, isLoading: isLoadingData, error: dataError } = useQuery({
    queryKey: ['analytics', dateFilter],
    queryFn: async (): Promise<AnalyticsData> => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch Leads
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, created_at, status_main, source, customer:customers(id)')
          .gte('created_at', dateFilter.from)
          .lte('created_at', dateFilter.to);

        if (leadsError) throw leadsError;

        // Fetch Customers
        const { data: customers, error: customersError } = await supabase
          .from('customers')
          .select('id, created_at')
          .gte('created_at', dateFilter.from)
          .lte('created_at', dateFilter.to);

        if (customersError) throw customersError;

        // Fetch Payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id, created_at, amount, status, product_name')
          .gte('created_at', dateFilter.from)
          .lte('created_at', dateFilter.to);

        if (paymentsError) throw paymentsError;

        // Fetch Collections
        const { data: collections, error: collectionsError } = await supabase
          .from('collections')
          .select('id, created_at, total_amount, status')
          .gte('created_at', dateFilter.from)
          .lte('created_at', dateFilter.to);

        if (collectionsError) throw collectionsError;

        // Fetch Meetings
        const { data: meetings, error: meetingsError } = await supabase
          .from('meetings')
          .select('id, created_at, meeting_data')
          .gte('created_at', dateFilter.from)
          .lte('created_at', dateFilter.to);

        if (meetingsError) throw meetingsError;

        // Process Leads data
        const leadsByStatus = (leads || []).reduce((acc: Record<string, number>, lead) => {
          const status = lead.status_main || 'ללא סטטוס';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const leadsBySource = (leads || []).reduce((acc: Record<string, number>, lead) => {
          const source = lead.source || 'ללא מקור';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {});

        // Group leads by date (keep as ISO string for parsing)
        const leadsByDate = (leads || []).reduce((acc: Record<string, number>, lead) => {
          const date = lead.created_at.split('T')[0]; // Get YYYY-MM-DD part
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const leadsOverTime = Object.entries(leadsByDate)
          .map(([date, count]) => ({ date: `${date}T00:00:00.000Z`, count })) // Convert to ISO format
          .sort((a, b) => a.date.localeCompare(b.date));

        // Process Customers data
        const customersByDate = (customers || []).reduce((acc: Record<string, number>, customer) => {
          const date = customer.created_at.split('T')[0]; // Get YYYY-MM-DD part
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const customersOverTime = Object.entries(customersByDate)
          .map(([date, count]) => ({ date: `${date}T00:00:00.000Z`, count })) // Convert to ISO format
          .sort((a, b) => a.date.localeCompare(b.date));

        // Process Payments data
        const paymentsByDate = (payments || []).reduce((acc: Record<string, { amount: number; count: number }>, payment) => {
          const date = payment.created_at.split('T')[0]; // Get YYYY-MM-DD part
          if (!acc[date]) {
            acc[date] = { amount: 0, count: 0 };
          }
          acc[date].amount += Number(payment.amount) || 0;
          acc[date].count += 1;
          return acc;
        }, {});

        const paymentsOverTime = Object.entries(paymentsByDate)
          .map(([date, data]) => ({ date: `${date}T00:00:00.000Z`, ...data })) // Convert to ISO format
          .sort((a, b) => a.date.localeCompare(b.date));

        const paymentsByStatus = (payments || []).reduce((acc: Record<string, { amount: number; count: number }>, payment) => {
          const status = payment.status || 'ללא סטטוס';
          if (!acc[status]) {
            acc[status] = { amount: 0, count: 0 };
          }
          acc[status].amount += Number(payment.amount) || 0;
          acc[status].count += 1;
          return acc;
        }, {});

        const paymentsByType = (payments || []).reduce((acc: Record<string, { amount: number; count: number }>, payment) => {
          const product = payment.product_name || 'ללא שם מוצר';
          if (!acc[product]) {
            acc[product] = { amount: 0, count: 0 };
          }
          acc[product].amount += Number(payment.amount) || 0;
          acc[product].count += 1;
          return acc;
        }, {});

        const totalRevenue = (payments || [])
          .filter(p => p.status === 'שולם')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Process Collections data
        const collectionsByDate = (collections || []).reduce((acc: Record<string, { amount: number; count: number }>, collection) => {
          const date = collection.created_at.split('T')[0]; // Get YYYY-MM-DD part
          if (!acc[date]) {
            acc[date] = { amount: 0, count: 0 };
          }
          acc[date].amount += Number(collection.total_amount) || 0;
          acc[date].count += 1;
          return acc;
        }, {});

        const collectionsOverTime = Object.entries(collectionsByDate)
          .map(([date, data]) => ({ date: `${date}T00:00:00.000Z`, ...data })) // Convert to ISO format
          .sort((a, b) => a.date.localeCompare(b.date));

        const collectionsByStatus = (collections || []).reduce((acc: Record<string, { amount: number; count: number }>, collection) => {
          const status = collection.status || 'ללא סטטוס';
          if (!acc[status]) {
            acc[status] = { amount: 0, count: 0 };
          }
          acc[status].amount += Number(collection.total_amount) || 0;
          acc[status].count += 1;
          return acc;
        }, {});

        const totalCollectionsAmount = (collections || [])
          .reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);

        // Process Meetings data
        const meetingsByDate = (meetings || []).reduce((acc: Record<string, number>, meeting) => {
          const date = meeting.created_at.split('T')[0]; // Get YYYY-MM-DD part
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const meetingsOverTime = Object.entries(meetingsByDate)
          .map(([date, count]) => ({ date: `${date}T00:00:00.000Z`, count })) // Convert to ISO format
          .sort((a, b) => a.date.localeCompare(b.date));

        // Extract meeting status from meeting_data JSONB
        const meetingsByStatus = (meetings || []).reduce((acc: Record<string, number>, meeting) => {
          const status = meeting.meeting_data?.status || 
                        meeting.meeting_data?.['סטטוס'] || 
                        'ללא סטטוס';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const completedMeetings = (meetings || []).filter(m => {
          const status = m.meeting_data?.status || m.meeting_data?.['סטטוס'] || '';
          return status === 'הושלם' || status === 'completed' || status === 'בוצע';
        }).length;

        const scheduledMeetings = (meetings || []).filter(m => {
          const status = m.meeting_data?.status || m.meeting_data?.['סטטוס'] || '';
          return status === 'מתוכנן' || status === 'scheduled' || status === 'נקבע';
        }).length;

        return {
          // Leads
          leadsByStatus: Object.entries(leadsByStatus).map(([status, count]) => ({ status, count })),
          leadsBySource: Object.entries(leadsBySource).map(([source, count]) => ({ source, count })),
          leadsOverTime,
          totalLeads: leads?.length || 0,
          
          // Customers
          customersOverTime,
          totalCustomers: customers?.length || 0,
          
          // Payments
          paymentsOverTime,
          paymentsByStatus: Object.entries(paymentsByStatus).map(([status, data]) => ({ status, ...data })),
          paymentsByType: Object.entries(paymentsByType)
            .map(([product_name, data]) => ({ product_name, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10), // Top 10 products
          totalRevenue,
          totalPayments: payments?.length || 0,
          
          // Collections
          collectionsOverTime,
          collectionsByStatus: Object.entries(collectionsByStatus).map(([status, data]) => ({ status, ...data })),
          totalCollections: collections?.length || 0,
          totalCollectionsAmount,
          
          // Meetings
          meetingsOverTime,
          meetingsByStatus: Object.entries(meetingsByStatus).map(([status, count]) => ({ status, count })),
          totalMeetings: meetings?.length || 0,
          completedMeetings,
          scheduledMeetings,
        };
      } catch (err: any) {
        setError(err?.message || 'שגיאה בטעינת הנתונים');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    enabled: true,
  });

  return {
    analyticsData: analyticsData || null,
    isLoading: isLoading || isLoadingData,
    error: error || (dataError as Error)?.message || null,
  };
};
