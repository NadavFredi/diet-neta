/**
 * NotificationBell Component
 * 
 * Displays a bell icon with unread count badge and dropdown menu
 */

import { Bell, Filter, Trash2, RefreshCw, Calendar, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';

// Notification type configuration
const NOTIFICATION_TYPES: Record<string, { label: string; color: string; bgColor: string }> = {
  new_lead: { label: 'ליד חדש', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
  check_in_completed: { label: 'ציון יומי', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  image_uploaded: { label: 'תמונה הועלתה', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
  video_uploaded: { label: 'וידאו הועלה', color: 'text-pink-700', bgColor: 'bg-pink-100 border-pink-200' },
  weight_updated: { label: 'עדכון משקל', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200' },
  meal_logged: { label: 'ארוחה נרשמה', color: 'text-cyan-700', bgColor: 'bg-cyan-100 border-cyan-200' },
  appointment_created: { label: 'תור נוצר', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-200' },
  default: { label: 'התראה', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-200' },
};

// Helper function to get notification type config
const getNotificationType = (type: string) => {
  return NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.default;
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string | null>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    isMarkingAsRead,
    handleMarkAllAsRead,
    handleMarkAsRead,
    handleDeleteNotification,
    formatRelativeTime,
    refreshNotifications,
  } = useNotifications();

  // Filter notifications based on selected type
  const filteredNotifications = useMemo(() => {
    if (!filterType) return notifications;
    return notifications.filter(n => n.type === filterType);
  }, [notifications, filterType]);

  // Get available notification types for filter
  const availableTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type));
    return Array.from(types);
  }, [notifications]);

  // Enhanced click handler that navigates to lead/customer
  const handleNotificationClick = (notification: any) => {
    // Mark as read first if not already read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to lead or customer page - prioritize lead_id, then customer_id, then action_url
    if (notification.lead_id) {
      navigate(`/leads/${notification.lead_id}`);
    } else if (notification.customer_id) {
      navigate(`/customers/${notification.customer_id}`);
    } else if (notification.action_url) {
      // Handle both relative and absolute URLs
      const url = notification.action_url.startsWith('/') 
        ? notification.action_url 
        : `/${notification.action_url}`;
      navigate(url);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-gray-100"
          dir="rtl"
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
      <PopoverContent className="w-[480px] p-0" align="end" side="bottom" dir="rtl">
        <div className="flex flex-col h-[600px]" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10" dir="rtl">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-right mb-1">התראות</h3>
              <p className="text-xs text-gray-500 text-right">ההתראות האחרונות מופיעות ראשונות</p>
              {filteredNotifications.length > 0 && (
                <p className="text-xs text-gray-600 text-right mt-1">
                  {filteredNotifications.length} מתוך {notifications.length} התראות
                  {filterType && ` • מסונן לפי: ${getNotificationType(filterType).label}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mr-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                      filterType && "text-[#5B6FB9] bg-blue-50"
                    )}
                    title="סינון"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" dir="rtl" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterType(null);
                    }}
                    className={cn(
                      "cursor-pointer",
                      !filterType && "bg-blue-50 text-[#5B6FB9]"
                    )}
                  >
                    כל ההתראות
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {availableTypes.map((type) => {
                    const typeConfig = getNotificationType(type);
                    return (
                      <DropdownMenuItem
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterType(type);
                        }}
                        className={cn(
                          "cursor-pointer",
                          filterType === type && "bg-blue-50 text-[#5B6FB9]"
                        )}
                      >
                        {typeConfig.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllAsRead();
                  }}
                  disabled={isMarkingAsRead}
                  title="נקה הכל"
                >
                  <Trash2 className="h-3 w-3 ml-1" />
                  נקה הכל
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  refreshNotifications();
                }}
                disabled={isLoading}
                title="רענון"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1" dir="rtl">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8" dir="rtl">
                <p className="text-sm text-gray-500 text-right">טוען התראות...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center" dir="rtl">
                <Bell className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 text-right">אין התראות חדשות</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100" dir="rtl">
                {filteredNotifications.length === 0 && filterType ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center" dir="rtl">
                    <Filter className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-right mb-2">אין התראות מסוג זה</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#5B6FB9]"
                      onClick={() => setFilterType(null)}
                    >
                      הסר סינון
                    </Button>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => {
                  const typeConfig = getNotificationType(notification.type);
                  const createdDate = new Date(notification.created_at);
                  const formattedDate = format(createdDate, 'dd/MM/yyyy', { locale: he });
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full text-right p-4 cursor-pointer transition-all duration-200 border-r-4',
                        !notification.is_read 
                          ? 'bg-blue-50/50 border-blue-400 hover:bg-blue-50' 
                          : 'bg-white border-transparent hover:bg-gray-50'
                      )}
                      dir="rtl"
                    >
                      {/* Header Row with Type Badge and Dismiss */}
                      <div className="flex items-start justify-between mb-2" dir="rtl">
                        <div className="flex items-center gap-2 flex-row-reverse" dir="rtl">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs font-medium px-2 py-0.5',
                              typeConfig.color,
                              typeConfig.bgColor,
                              'border'
                            )}
                          >
                            {typeConfig.label}
                          </Badge>
                          {notification.is_read && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>נקרא</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-[#5B6FB9] flex-shrink-0 mt-1" />
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="מחק התראה"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold text-gray-900 text-right mb-1.5">
                        {notification.title}
                      </p>

                      {/* Message */}
                      <p className="text-sm text-gray-700 text-right mb-3 line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Metadata and Actions */}
                      <div className="flex items-center justify-between text-xs text-gray-500" dir="rtl">
                        <div className="flex items-center gap-3" dir="rtl">
                          {notification.metadata?.appointment_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>תאריך התור: {format(new Date(notification.metadata.appointment_date), 'dd/MM/yyyy', { locale: he })}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span>נוצר ב: {formattedDate}</span>
                            <span className="text-gray-400">•</span>
                            <span>{formatRelativeTime(notification.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
