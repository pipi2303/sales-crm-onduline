import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Simulated notification storage (in real app, use Supabase Realtime)
const STORAGE_KEY = 'sales_notifications';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })));
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }

    // Add demo notifications if empty
    const demoNotifications: Notification[] = [
      {
        id: '1',
        title: 'Lead Baru',
        message: 'Ada lead baru dari Toko Bangunan Sinar Jaya',
        type: 'info',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
      },
      {
        id: '2',
        title: 'Kontrak Berhasil',
        message: 'Kontrak dengan Distributor Atap Nusantara telah ditandatangani',
        type: 'success',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
      },
      {
        id: '3',
        title: 'Pembayaran Menunggu',
        message: 'Tagihan untuk CV Karya Konstruksi Mandiri jatuh tempo dalam 3 hari',
        type: 'warning',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: true,
      },
    ];

    if (!stored) {
      setNotifications(demoNotifications);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoNotifications));
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('Semua notifikasi ditandai sebagai sudah dibaca');
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notifikasi dihapus');
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Semua notifikasi dihapus');
    setOpen(false);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} detik yang lalu`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari yang lalu`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#EEF7F5]0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifikasi</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Tandai Semua
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus Semua
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Tidak ada notifikasi</p>
              <p className="text-sm text-gray-400 mt-1">Notifikasi baru akan muncul di sini</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-0 rounded-none ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {getTimeAgo(notification.timestamp)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}