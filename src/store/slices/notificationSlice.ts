/**
 * Notification Slice
 * 
 * Redux slice for managing notification state:
 * - List of notifications
 * - Unread count
 * - Loading states
 * - Real-time updates
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '@/services/notificationService';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from '@/services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isMarkingAsRead: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isMarkingAsRead: false,
  error: null,
  lastFetched: null,
};

// Async thunks
export const loadNotifications = createAsyncThunk(
  'notifications/load',
  async (limit: number = 50) => {
    return await fetchNotifications(limit);
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    return notificationId;
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    await markAllNotificationsAsRead();
  }
);

export const refreshUnreadCount = createAsyncThunk(
  'notifications/refreshUnreadCount',
  async () => {
    return await getUnreadCount();
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add notification to the beginning of the list
      state.notifications.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    updateNotification: (state, action: PayloadAction<Notification>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].is_read;
        const isNowRead = action.payload.is_read;
        
        state.notifications[index] = action.payload;
        
        // Update unread count
        if (wasUnread && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (!wasUnread && !isNowRead) {
          state.unreadCount += 1;
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load notifications
    builder
      .addCase(loadNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.lastFetched = Date.now();
      })
      .addCase(loadNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load notifications';
      });

    // Mark as read
    builder
      .addCase(markAsRead.pending, (state) => {
        state.isMarkingAsRead = true;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.isMarkingAsRead = false;
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.is_read) {
          notification.is_read = true;
          notification.read_at = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.isMarkingAsRead = false;
        state.error = action.error.message || 'Failed to mark notification as read';
      });

    // Mark all as read
    builder
      .addCase(markAllAsRead.pending, (state) => {
        state.isMarkingAsRead = true;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.isMarkingAsRead = false;
        state.notifications.forEach(n => {
          if (!n.is_read) {
            n.is_read = true;
            n.read_at = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.isMarkingAsRead = false;
        state.error = action.error.message || 'Failed to mark all notifications as read';
      });

    // Refresh unread count
    builder
      .addCase(refreshUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const { addNotification, updateNotification, clearError } = notificationSlice.actions;
export default notificationSlice.reducer;
