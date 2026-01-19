/**
 * Notification Helper
 * 
 * Utility functions to create notifications when trainees perform actions
 */

import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

export interface CreateNotificationParams {
  customerId: string;
  leadId?: string | null;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Get all admin/manager user IDs who should receive notifications
 */
async function getAdminUserIds(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'manager'])
      .eq('is_active', true);

    if (error) {
      console.error('[NotificationHelper] Error fetching admin users:', error);
      return [];
    }

    return data?.map((p) => p.id) || [];
  } catch (error) {
    console.error('[NotificationHelper] Unexpected error:', error);
    return [];
  }
}

/**
 * Create notifications for all admin users when a trainee performs an action
 */
export async function createNotificationForAdmins(params: CreateNotificationParams): Promise<void> {
  try {
    const adminUserIds = await getAdminUserIds();

    if (adminUserIds.length === 0) {
      console.warn('[NotificationHelper] No admin users found to notify');
      return;
    }

    // Create notifications for all admin users
    const notifications = adminUserIds.map((userId) => ({
      user_id: userId,
      customer_id: params.customerId,
      lead_id: params.leadId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl || null,
      metadata: params.metadata || {},
      is_read: false,
    }));

    if (!supabaseAdmin) {
      console.warn('[NotificationHelper] supabaseAdmin not available, skipping notification creation');
      return;
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('[NotificationHelper] Error creating notifications:', error);
      throw error;
    }

    console.log(`[NotificationHelper] Created ${notifications.length} notifications for admins`);
  } catch (error) {
    console.error('[NotificationHelper] Failed to create notifications:', error);
    // Don't throw - we don't want to break the main flow if notifications fail
  }
}

/**
 * Create notification for check-in completion
 */
export async function notifyCheckInCompleted(
  customerId: string,
  leadId: string | null,
  customerName: string,
  checkInDate: string
): Promise<void> {
  await createNotificationForAdmins({
    customerId,
    leadId,
    type: 'check_in_completed',
    title: 'דיווח יומי הושלם',
    message: `${customerName} השלים דיווח יומי ל-${checkInDate}`,
    actionUrl: `/customers/${customerId}`,
    metadata: {
      check_in_date: checkInDate,
    },
  });
}

/**
 * Create notification for weight update
 */
export async function notifyWeightUpdated(
  customerId: string,
  leadId: string | null,
  customerName: string,
  weight: number
): Promise<void> {
  await createNotificationForAdmins({
    customerId,
    leadId,
    type: 'weight_updated',
    title: 'עדכון משקל',
    message: `${customerName} עדכן את המשקל ל-${weight} ק״ג`,
    actionUrl: `/customers/${customerId}`,
    metadata: {
      weight,
    },
  });
}

/**
 * Create notification for profile update
 */
export async function notifyProfileUpdated(
  customerId: string,
  leadId: string | null,
  customerName: string,
  fieldName: string
): Promise<void> {
  await createNotificationForAdmins({
    customerId,
    leadId,
    type: 'profile_updated',
    title: 'עדכון פרופיל',
    message: `${customerName} עדכן את ${fieldName}`,
    actionUrl: `/customers/${customerId}`,
    metadata: {
      field: fieldName,
    },
  });
}
