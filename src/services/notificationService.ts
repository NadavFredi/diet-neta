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
 * Fetch notifications for the current user
 */
export const fetchNotifications = async (limit: number = 50): Promise<NotificationResponse> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (notificationsError) {
      throw notificationsError;
    }

    // Get unread count
    const { data: unreadData, error: countError } = await supabase
      .rpc('get_unread_notification_count');

    if (countError) {
      // Fallback: count manually
      const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
      return {
        notifications: notifications || [],
        unreadCount,
      };
    }

    return {
      notifications: notifications || [],
      unreadCount: unreadData || 0,
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
    const { error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      throw error;
    }
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

    if (error) {
      return 0;
    }

    return data || 0;
  } catch (error: any) {
    return 0;
  }
};
