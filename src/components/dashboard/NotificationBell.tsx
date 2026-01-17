/**
 * NotificationBell Component
 * 
 * Displays a bell icon with unread count badge and dropdown menu
 */

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    isMarkingAsRead,
    handleMarkAllAsRead,
    handleNotificationClick,
    formatRelativeTime,
  } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-gray-100"
        >
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-semibold border-2 border-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" side="bottom" dir="rtl">
        <div className="flex flex-col h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">התראות</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAsRead}
                className="text-xs text-[#5B6FB9] hover:text-[#5B6FB9]/80"
              >
                {isMarkingAsRead ? 'מסמן...' : 'סמן הכל כנקרא'}
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-sm text-gray-500">טוען התראות...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">אין התראות חדשות</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'w-full text-right p-4 hover:bg-gray-50 transition-colors',
                      !notification.is_read && 'bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-[#5B6FB9] flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer - Show count if there are many notifications */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <p className="text-xs text-center text-gray-500">
                {notifications.length} התראות
                {unreadCount > 0 && ` • ${unreadCount} לא נקראו`}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
