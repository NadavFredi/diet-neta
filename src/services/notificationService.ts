/**
 * Notification Service
 * 
 * Handles all notification-related API calls and data operations
 */

import { supabase } from '@/lib/supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  customer_id: string | null;
  lead_id: string | null;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, any>;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

/**
 * Fetch subscription alerts (virtual notifications)
 * Checks for subscriptions ending within 7 days or expired
 */
const fetchSubscriptionAlerts = async (userId: string): Promise<Notification[]> => {
  try {
    // Get read alerts from local storage to filter them out if needed
    let readAlerts: string[] = [];
    if (typeof window !== 'undefined') {
      readAlerts = JSON.parse(localStorage.getItem('read_subscription_alerts') || '[]');
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('id, subscription_data, customer_id, customers(full_name)')
      .not('subscription_data', 'is', null);

    if (!leads) return [];

    const alerts: Notification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    leads.forEach((lead: any) => {
      const subData = lead.subscription_data;
      // Check if subscription exists, has expiration date, and is marked as active
      if (!subData || !subData.expirationDate || subData.status !== 'פעיל') return;

      const expirationDate = new Date(subData.expirationDate);
      expirationDate.setHours(0, 0, 0, 0);
      
      // Check if expiring soon (within 7 days) or already expired
      if (expirationDate <= sevenDaysFromNow) {
        const isExpired = expirationDate < today;
        const daysLeft = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const customerName = lead.customers?.full_name || 'לקוח';
        
        const alertId = `sub-alert-${lead.id}-${subData.expirationDate}`;
        
        // Skip if locally marked as read
        if (readAlerts.includes(alertId)) return;

        alerts.push({
          id: alertId,
          user_id: userId,
          customer_id: lead.customer_id,
          lead_id: lead.id,
          type: 'subscription_ending',
          title: isExpired ? 'מנוי פג תוקף' : 'מנוי מסתיים בקרוב',
          message: isExpired 
            ? `המנוי של ${customerName} הסתיים ב-${subData.expirationDate}`
            : `המנוי של ${customerName} מסתיים בעוד ${daysLeft} ימים (${subData.expirationDate})`,
          action_url: `/leads/${lead.id}`,
          is_read: false, // Always show as unread/active until resolved
          created_at: new Date().toISOString(), // Show as new
          read_at: null,
          metadata: { 
            expirationDate: subData.expirationDate,
            daysLeft,
            isVirtual: true 
          }
        });
      }
    });

    // Sort alerts by expiration date (most urgent first)
    return alerts.sort((a, b) => {
      const dateA = new Date(a.metadata.expirationDate).getTime();
      const dateB = new Date(b.metadata.expirationDate).getTime();
      return dateA - dateB;
    });
  } catch (error) {
    return [];
  }
};

/**
 * Fetch notifications for the current user
 */
export const fetchNotifications = async (limit: number = 50): Promise<NotificationResponse> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch real notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (notificationsError) {
      throw notificationsError;
    }

    // Fetch subscription alerts
    const alerts = await fetchSubscriptionAlerts(user.id);

    // Combine notifications (alerts on top)
    const allNotifications = [...alerts, ...(notifications || [])];
    
    // Get unread count from DB
    const { data: unreadData, error: countError } = await supabase
      .rpc('get_unread_notification_count');

    let dbUnreadCount = 0;
    if (!countError) {
      dbUnreadCount = unreadData || 0;
    } else {
      // Fallback
      dbUnreadCount = notifications?.filter(n => !n.is_read).length || 0;
    }

    // Total unread count = DB unread + Alerts count (since alerts are always unread)
    const totalUnreadCount = dbUnreadCount + alerts.length;

    return {
      notifications: allNotifications,
      unreadCount: totalUnreadCount,
    };
  } catch (error: any) {
    throw error;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    // Check if it's a virtual notification
    if (notificationId.startsWith('sub-alert-')) {
      // Store in local storage
      if (typeof window !== 'undefined') {
        const readAlerts = JSON.parse(localStorage.getItem('read_subscription_alerts') || '[]');
        if (!readAlerts.includes(notificationId)) {
          readAlerts.push(notificationId);
          localStorage.setItem('read_subscription_alerts', JSON.stringify(readAlerts));
        }
      }
      return;
    }

    const { error } = await supabase.rpc('mark_notification_read', {
      notification_id: notificationId,
    });

    if (error) {
      throw error;
    }
  } catch (error: any) {
    throw error;
  }
};

/**
 * Mark all notifications as read for the current user
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    // Mark real notifications as read
    const { error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      throw error;
    }
    
    // For virtual notifications, we could mark them all as read in local storage
    // But typically "Mark All Read" might not apply to persistent system alerts
    // For now, we'll leave them as is, or we could fetch them and mark them.
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count');
    
    let dbCount = 0;
    if (!error) {
      dbCount = data || 0;
    }

    // We also need to add alert count, but this function is often called independently
    // Ideally we should cache the alert count or fetch it here too
    // For performance, we might just return DB count here and let the full fetch update the total
    // OR we fetch alerts here too (lightweight query)
    
    // Get current user for alerts
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const alerts = await fetchSubscriptionAlerts(user.id);
      return dbCount + alerts.length;
    }

    return dbCount;
  } catch (error: any) {
    return 0;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    // Check if it's a virtual notification
    if (notificationId.startsWith('sub-alert-')) {
      // "Delete" for virtual means mark as read/hide locally
      if (typeof window !== 'undefined') {
        const readAlerts = JSON.parse(localStorage.getItem('read_subscription_alerts') || '[]');
        if (!readAlerts.includes(notificationId)) {
          readAlerts.push(notificationId);
          localStorage.setItem('read_subscription_alerts', JSON.stringify(readAlerts));
        }
      }
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    throw error;
  }
};
