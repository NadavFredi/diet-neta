/**
 * useNotifications Hook
 * 
 * Custom hook for managing notifications with polling support
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loadNotifications,
  markAsRead,
  markAllAsRead,
  refreshUnreadCount,
  addNotification,
  deleteNotificationById,
} from '@/store/slices/notificationSlice';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const POLLING_INTERVAL = 30000; // 30 seconds

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, isMarkingAsRead, error } = useAppSelector(
    (state) => state.notifications
  );

  // Load notifications on mount
  useEffect(() => {
    dispatch(loadNotifications(50));
  }, [dispatch]);

  // Set up polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh unread count more frequently
      dispatch(refreshUnreadCount());
      
      // Reload notifications less frequently (every 2 minutes)
      const shouldReload = Date.now() - (notifications[0]?.created_at ? new Date(notifications[0].created_at).getTime() : 0) > 120000;
      if (shouldReload) {
        dispatch(loadNotifications(50));
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [dispatch, notifications]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      await dispatch(markAsRead(notificationId));
    },
    [dispatch]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await dispatch(markAllAsRead());
  }, [dispatch]);

  const handleDeleteNotification = useCallback(
    async (notificationId: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent triggering the notification click
      await dispatch(deleteNotificationById(notificationId));
    },
    [dispatch]
  );

  const handleNotificationClick = useCallback(
    (notification: { action_url: string | null; id: string }) => {
      // Mark as read
      dispatch(markAsRead(notification.id));

      // Navigate if action_url is provided
      if (notification.action_url) {
        navigate(notification.action_url);
      }
    },
    [dispatch, navigate]
  );

  const formatRelativeTime = useCallback((dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: he,
      });
    } catch (error) {
      return 'לפני זמן מה';
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    dispatch(loadNotifications(50));
    dispatch(refreshUnreadCount());
  }, [dispatch]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isMarkingAsRead,
    error,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleNotificationClick,
    formatRelativeTime,
    refreshNotifications,
  };
};
