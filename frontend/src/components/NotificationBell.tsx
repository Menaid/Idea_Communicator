import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { notificationsService } from '../services/notifications.service';
import { Notification } from '../types/notification';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface NotificationBellProps {
  unreadCount: number;
  onCountChange: (count: number) => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onCountChange,
  onNotificationClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getUnread();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationsService.markAsRead(notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      onCountChange(Math.max(0, unreadCount - 1));

      if (onNotificationClick) {
        onNotificationClick(notification);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications([]);
      onCountChange(0);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return '👥';
      case 'new_message':
        return '💬';
      case 'member_joined':
        return '👋';
      case 'member_left':
        return '👋';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleMarkAsRead(notification)}
                      className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          )}
                          {notification.actor && (
                            <p className="text-xs text-gray-500 mt-1">
                              By {notification.actor.firstName} {notification.actor.lastName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: sv,
                            })}
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
