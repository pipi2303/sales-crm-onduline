import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Bell, X, AlertTriangle, AlertCircle, Clock, CheckCircle, Check, 
  Calendar, FileText, Building2, User, ChevronRight, Trash2, Eye, 
  TrendingUp, DollarSign, Users, Package, Target,
  Award, Pin, Archive, History, Settings, RefreshCw, Volume2, Mail
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { NotificationSettings, NotificationSettingsType } from '@/app/components/NotificationSettings';
import { toast } from 'sonner';

interface AppNotification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'contract' | 'lead' | 'deal' | 'task' | 'product' | 'kpi' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  metadata?: {
    icon?: string;
    actionUrl?: string;
    details?: Array<{ icon: React.ReactNode; label: string; value: string }>;
    contractData?: any;
  };
}

interface AppNotificationsProps {
  className?: string;
  contracts?: any[];
  onViewContract?: (contract: any) => void;
}

export const AppNotifications = React.memo(function AppNotifications({ className, contracts = [], onViewContract }: AppNotificationsProps) {
  const confirm = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | 'pinned' | 'archived'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Default settings
  const [settings, setSettings] = useState<NotificationSettingsType>({
    realTimeEnabled: true,
    pushEnabled: false,
    emailEnabled: false,
    soundEnabled: false,
    autoRefresh: true,
    refreshInterval: 5, // 5 minutes
    email: '',
    urgentSoundEnabled: false,
    desktopNotifications: false,
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Force disable sound settings for all users
        setSettings({
          ...parsed,
          soundEnabled: false,
          urgentSoundEnabled: false,
        });
      } catch (error) {
        console.error('Failed to parse notificationSettings from localStorage:', error);
      }
    }

    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      } catch (error) {
        console.error('Failed to parse notifications from localStorage:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const handleSaveSettings = (newSettings: NotificationSettingsType) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    toast.success('Pengaturan notifikasi berhasil disimpan');

    // Request push notification permission if enabled
    if (newSettings.pushEnabled && newSettings.desktopNotifications) {
      requestNotificationPermission();
    }

    // Setup auto-refresh
    if (newSettings.autoRefresh) {
      setupAutoRefresh(newSettings.refreshInterval);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
      } else if (permission === 'denied') {
        toast.error('Push notifications blocked. Please enable in browser settings.');
      }
    }
  };

  // Show desktop notification
  const showDesktopNotification = (notification: AppNotification) => {
    if (settings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id,
        requireInteraction: notification.type === 'urgent',
      });

      notif.onclick = () => {
        window.focus();
        setIsOpen(true);
        handleViewNotification(notification, new MouseEvent('click'));
      };
    }
  };

  // Play sound for notification
  const playNotificationSound = (type: string) => {
    if (!settings.soundEnabled) return;
    if (type === 'urgent' && !settings.urgentSoundEnabled) return;

    // Create audio element
    const audio = new Audio();
    
    // Different sounds for different types
    if (type === 'urgent') {
      // Urgent sound - higher pitch, more alarming
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgs7y2Ik3CBlouu3nn00QDFC';
    } else {
      // Normal sound - softer
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA';
    }
    
    audio.volume = type === 'urgent' ? 0.8 : 0.5;
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  // Setup auto-refresh
  const setupAutoRefresh = (intervalMinutes: number) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      handleRefresh(true); // silent refresh
    }, intervalMinutes * 60 * 1000);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    if (settings.autoRefresh) {
      setupAutoRefresh(settings.refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [settings.autoRefresh, settings.refreshInterval]);

  // Generate notifications
  useEffect(() => {
    generateNotifications();
  }, [contracts]);

  const generateNotifications = () => {
    const allNotifications: AppNotification[] = [];

    // Generate contract notifications
    if (contracts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      contracts.forEach(contract => {
        // Skip jika terminated
        if (contract.status === 'terminated') return;

        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Timeline notifikasi
        const notificationPoints = [
          { days: 30, message: '1 bulan lagi', type: 'info' as const, priority: 1, hours: 1 },
          { days: 14, message: '2 minggu lagi', type: 'info' as const, priority: 2, hours: 9 },
          { days: 7, message: '1 minggu lagi', type: 'warning' as const, priority: 3, hours: 4 },
          { days: 3, message: '3 hari lagi', type: 'warning' as const, priority: 4, hours: 5 },
          { days: 2, message: '2 hari lagi', type: 'urgent' as const, priority: 5, hours: 2 },
          { days: 1, message: '1 hari lagi', type: 'urgent' as const, priority: 6, hours: 1 },
        ];

        // Check notifikasi sebelum expire
        notificationPoints.forEach(point => {
          if (daysRemaining <= point.days && daysRemaining > point.days - 30) {
            const newNotif: AppNotification = {
              id: `contract-${contract.id}-${point.days}`,
              type: point.type,
              category: 'contract',
              title: daysRemaining <= 3 ? '🔥 Kontrak Segera Berakhir' : '⚡ Peringatan Kontrak',
              message: `Kontrak ${contract.contractNumber} akan berakhir ${point.message}`,
              timestamp: new Date(Date.now() - point.hours * 60 * 60 * 1000),
              isRead: false,
              isPinned: false,
              isArchived: false,
              metadata: {
                icon: daysRemaining <= 3 ? '⚠️' : '📄',
                contractData: contract,
                details: [
                  { icon: <FileText className="w-3.5 h-3.5" />, label: 'Nomor Kontrak', value: contract.contractNumber },
                  { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Perusahaan', value: contract.company },
                  { icon: <User className="w-3.5 h-3.5" />, label: 'Client', value: contract.clientName },
                  { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Berakhir', value: endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ],
              },
            };
            
            allNotifications.push(newNotif);

            // Send email if enabled and urgent
            if (settings.emailEnabled && point.type === 'urgent' && settings.email) {
              sendEmailNotification(newNotif);
            }
          }
        });

        // Notifikasi sudah expired
        if (daysRemaining < 0 && daysRemaining >= -30) {
          const expiredNotif: AppNotification = {
            id: `contract-${contract.id}-expired`,
            type: 'urgent',
            category: 'contract',
            title: '🚨 Kontrak Sudah Berakhir',
            message: `Kontrak ${contract.contractNumber} sudah berakhir ${Math.abs(daysRemaining)} hari yang lalu`,
            timestamp: new Date(Date.now() - Math.abs(daysRemaining) * 24 * 60 * 60 * 1000),
            isRead: false,
            isPinned: true, // Auto-pin expired contracts
            isArchived: false,
            metadata: {
              icon: '🚨',
              contractData: contract,
              details: [
                { icon: <FileText className="w-3.5 h-3.5" />, label: 'Nomor Kontrak', value: contract.contractNumber },
                { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Perusahaan', value: contract.company },
                { icon: <User className="w-3.5 h-3.5" />, label: 'Client', value: contract.clientName },
                { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Status', value: `Expired ${Math.abs(daysRemaining)} hari` },
              ],
            },
          };
          
          allNotifications.push(expiredNotif);

          // Send email for expired contracts
          if (settings.emailEnabled && settings.email) {
            sendEmailNotification(expiredNotif);
          }
        }
      });
    }

    // Dummy notifications lainnya
    const dummyNotifications: AppNotification[] = [
      {
        id: 'deal-1',
        type: 'success',
        category: 'deal',
        title: 'Deal Berhasil Ditutup',
        message: 'Deal dengan PT Digital Solutions senilai Rp 500 juta berhasil closed!',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isRead: false,
        isPinned: false,
        isArchived: false,
        metadata: {
          icon: '💰',
          details: [
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Nilai', value: 'Rp 500.000.000' },
            { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Perusahaan', value: 'PT Digital Solutions' },
            { icon: <User className="w-3.5 h-3.5" />, label: 'Sales', value: 'Ahmad Fauzi' },
            { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Tanggal', value: '22 Jan 2026' },
          ],
        },
      },
      {
        id: 'lead-1',
        type: 'warning',
        category: 'lead',
        title: 'Lead Baru Memerlukan Follow-up',
        message: '3 lead baru dari kampanye digital marketing perlu ditindaklanjuti',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isRead: false,
        isPinned: false,
        isArchived: false,
        metadata: {
          icon: '🎯',
          details: [
            { icon: <Users className="w-3.5 h-3.5" />, label: 'Total Lead', value: '3 Lead' },
            { icon: <Target className="w-3.5 h-3.5" />, label: 'Sumber', value: 'Digital Marketing' },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Prioritas', value: 'High' },
            { icon: <Clock className="w-3.5 h-3.5" />, label: 'Deadline', value: '24 Jan 2026' },
          ],
        },
      },
      {
        id: 'kpi-1',
        type: 'info',
        category: 'kpi',
        title: 'Target KPI Tercapai',
        message: 'Selamat! Anda telah mencapai 95% dari target penjualan bulan ini',
        timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000),
        isRead: false,
        isPinned: false,
        isArchived: false,
        metadata: {
          icon: '🏆',
          details: [
            { icon: <Award className="w-3.5 h-3.5" />, label: 'Pencapaian', value: '95%' },
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Revenue', value: 'Rp 2.9 M' },
            { icon: <Target className="w-3.5 h-3.5" />, label: 'Target', value: 'Rp 3.0 M' },
            { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Periode', value: 'Januari 2026' },
          ],
        },
      },
      {
        id: 'product-1',
        type: 'info',
        category: 'product',
        title: 'Produk Baru Tersedia',
        message: 'Medical Scanner X-Ray Pro telah ditambahkan ke katalog produk',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isRead: true,
        isPinned: false,
        isArchived: false,
        metadata: {
          icon: '📦',
          details: [
            { icon: <Package className="w-3.5 h-3.5" />, label: 'Produk', value: 'X-Ray Pro' },
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Harga', value: 'Rp 450 Juta' },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Kategori', value: 'Medical Equipment' },
            { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Ditambahkan', value: '21 Jan 2026' },
          ],
        },
      },
    ];

    // Check for new notifications
    const existingIds = notifications.map(n => n.id);
    const newNotifications = [...allNotifications, ...dummyNotifications].filter(
      n => !existingIds.includes(n.id)
    );

    // Merge and preserve pinned/archived status
    const merged = [...allNotifications, ...dummyNotifications].map(newNotif => {
      const existing = notifications.find(n => n.id === newNotif.id);
      if (existing) {
        return {
          ...newNotif,
          isPinned: existing.isPinned,
          isArchived: existing.isArchived,
          isRead: existing.isRead,
        };
      }
      return newNotif;
    });

    // Show notifications for new items
    newNotifications.forEach(notif => {
      // Play sound
      playNotificationSound(notif.type);
      
      // Show desktop notification
      if (settings.pushEnabled) {
        showDesktopNotification(notif);
      }
      
      // Show toast
      if (notif.type === 'urgent') {
        toast.error(notif.title, { description: notif.message });
      } else if (notif.type === 'warning') {
        toast.warning(notif.title, { description: notif.message });
      } else if (notif.type === 'success') {
        toast.success(notif.title, { description: notif.message });
      } else {
        toast.info(notif.title, { description: notif.message });
      }
    });
    
    // Sort by pinned first, then timestamp
    merged.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    setNotifications(merged);
    
    // Save to localStorage
    localStorage.setItem('notifications', JSON.stringify(merged));
  };

  // Send email notification (backend call)
  const sendEmailNotification = async (notification: AppNotification) => {
    try {
      // This would call your backend API
      console.log('Sending email notification:', notification);
      // await fetch('/api/send-email', { ... });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  // Manual refresh
  const handleRefresh = async (silent = false) => {
    setIsRefreshing(true);
    
    if (!silent) {
      toast.info('Memperbarui notifikasi...');
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    generateNotifications();
    setLastRefresh(new Date());
    setIsRefreshing(false);
    
    if (!silent) {
      toast.success('Notifikasi berhasil diperbarui');
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Baru saja';
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    return `${diffDays} hari yang lalu`;
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'urgent':
        return {
          bgGradient: 'bg-gradient-to-br from-red-50 to-pink-50',
          borderColor: 'border-l-4 border-red-500',
          iconBg: 'bg-gradient-to-br from-red-500 to-pink-500',
          icon: <AlertTriangle className="w-5 h-5 text-white" />,
          badge: 'bg-red-500',
          textColor: 'text-red-900',
          dotColor: 'bg-red-500',
        };
      case 'warning':
        return {
          bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50',
          borderColor: 'border-l-4 border-amber-500',
          iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
          icon: <AlertCircle className="w-5 h-5 text-white" />,
          badge: 'bg-amber-500',
          textColor: 'text-amber-900',
          dotColor: 'bg-amber-500',
        };
      case 'success':
        return {
          bgGradient: 'bg-gradient-to-br from-green-50 to-emerald-50',
          borderColor: 'border-l-4 border-green-500',
          iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
          icon: <CheckCircle className="w-5 h-5 text-white" />,
          badge: 'bg-green-500',
          textColor: 'text-green-900',
          dotColor: 'bg-green-500',
        };
      default:
        return {
          bgGradient: 'bg-gradient-to-br bg-[#EEF7F5]',
          borderColor: 'border-l-4 border-blue-500',
          iconBg: 'bg-gradient-to-br from-[#013E37] to-[#025C52]',
          icon: <Bell className="w-5 h-5 text-white" />,
          badge: 'bg-blue-500',
          textColor: 'text-blue-900',
          dotColor: 'bg-blue-500',
        };
    }
  };

  const getCategoryBadge = (category: string) => {
    const badges = {
      contract: { label: 'Contract', color: 'bg-[#DFF0EC] text-[#013E37]' },
      lead: { label: 'Lead', color: 'bg-blue-100 text-blue-700' },
      deal: { label: 'Deal', color: 'bg-green-100 text-green-700' },
      task: { label: 'Task', color: 'bg-orange-100 text-orange-700' },
      product: { label: 'Product', color: 'bg-pink-100 text-pink-700' },
      kpi: { label: 'KPI', color: 'bg-[#DFF0EC] text-[#013E37]' },
      system: { label: 'System', color: 'bg-gray-100 text-gray-700' },
    };
    return badges[category as keyof typeof badges] || badges.system;
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('Semua notifikasi ditandai sudah dibaca');
  };

  const handleClearAll = async () => {
    if (await confirm('Hapus semua notifikasi?', { variant: 'destructive', confirmText: 'Hapus' })) {
      setNotifications([]);
      localStorage.removeItem('notifications');
      toast.success('Semua notifikasi dihapus');
    }
  };

  const handleMarkAsRead = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, isRead: true } : n))
    );
  };

  const handlePinNotification = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, isPinned: !n.isPinned } : n))
    );
    toast.success('Notifikasi di-pin');
  };

  const handleArchiveNotification = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, isArchived: true, isRead: true } : n))
    );
    toast.success('Notifikasi diarsipkan');
  };

  const handleDismissNotification = (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    toast.success('Notifikasi dihapus');
  };

  const handleViewNotification = (notification: AppNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Mark as read
    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    
    // Handle contract notifications
    if (notification.category === 'contract' && notification.metadata?.contractData && onViewContract) {
      onViewContract(notification.metadata.contractData);
      setIsOpen(false);
      return;
    }
    
    // Handle navigation based on category
    console.log('View notification:', notification);
    setIsOpen(false);
  };

  const filteredNotifications = notifications.filter(n => {
    // Filter archived
    if (filter === 'archived') return n.isArchived;
    if (!showHistory && n.isArchived) return false;
    
    // Other filters
    if (filter === 'unread') return !n.isRead;
    if (filter === 'urgent') return n.type === 'urgent';
    if (filter === 'pinned') return n.isPinned;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;
  const urgentCount = notifications.filter(n => n.type === 'urgent' && !n.isArchived).length;
  const pinnedCount = notifications.filter(n => n.isPinned && !n.isArchived).length;
  const archivedCount = notifications.filter(n => n.isArchived).length;

  return (
    <>
      {/* Notification Bell Button */}
      <div className={`relative ${className}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="relative hover:bg-white/10 transition-all"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse shadow-lg">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Notifications Sidebar Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar Panel */}
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header - Brand Color Background */}
            <div className="bg-[#013E37] text-white px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Notification Center</h2>
                    <p className="text-xs text-white/70">
                      {unreadCount} belum dibaca • {pinnedCount} di-pin
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons - Moved to right side */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleRefresh()}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-[#013E37] text-white">
                      Refresh
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleMarkAllRead}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-[#013E37] text-white">
                      Tandai Semua
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-[#013E37] text-white">
                      Settings
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-lg transition-colors ${
                          showHistory ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        <History className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-[#013E37] text-white">
                      Archive ({archivedCount})
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/10 rounded-lg ml-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Last Refresh Info */}
              {settings.autoRefresh && (
                <div className="mt-3 text-xs text-white/60 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last refresh: {getTimeAgo(lastRefresh)} • Auto: {settings.refreshInterval}min
                  </span>
                  {settings.soundEnabled && <Volume2 className="w-3 h-3" />}
                  {settings.emailEnabled && <Mail className="w-3 h-3" />}
                </div>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="bg-gray-50 border-b px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semua ({notifications.filter(n => !n.isArchived).length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filter === 'unread'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Belum Dibaca ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('urgent')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filter === 'urgent'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Urgent ({urgentCount})
                </button>
                <button
                  onClick={() => setFilter('pinned')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                    filter === 'pinned'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Pin className="w-3 h-3 inline mr-0.5" />
                  Pinned ({pinnedCount})
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white scrollbar-custom">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4 shadow-inner">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {filter === 'all' ? 'Tidak Ada Notification' : 
                     filter === 'unread' ? 'Semua Sudah Dibaca' :
                     filter === 'pinned' ? 'Tidak Ada Pinned' :
                     filter === 'archived' ? 'Tidak Ada Archive' :
                     'Tidak Ada Urgent'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {filter === 'all' ? 'Tidak ada notifikasi saat ini' :
                     filter === 'unread' ? 'Anda sudah membaca semua notifikasi' :
                     filter === 'pinned' ? 'Tidak ada notifikasi yang di-pin' :
                     filter === 'archived' ? 'Tidak ada notifikasi yang diarsipkan' :
                     'Tidak ada notifikasi urgent saat ini'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredNotifications.map((notification) => {
                    const style = getNotificationStyle(notification.type);
                    const categoryBadge = getCategoryBadge(notification.category);
                    return (
                      <div
                        key={notification.id}
                        className={`relative rounded-xl ${style.bgGradient} ${style.borderColor} shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group ${
                          !notification.isRead ? 'ring-2 ring-offset-1 ring-blue-400/30' : ''
                        } ${notification.isPinned ? 'ring-2 ring-offset-1 ring-yellow-400/50' : ''}`}
                        onClick={(e) => handleViewNotification(notification, e)}
                      >
                        {/* Pinned Indicator */}
                        {notification.isPinned && (
                          <div className="absolute top-2 right-2">
                            <Pin className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                          </div>
                        )}

                        {/* Unread Indicator */}
                        {!notification.isRead && !notification.isPinned && (
                          <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${style.dotColor} animate-pulse`} />
                        )}

                        <div className="p-4">
                          <div className="flex gap-3">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg flex-shrink-0 text-2xl`}>
                              {notification.metadata?.icon || style.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold text-sm ${style.textColor}`}>
                                      {notification.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${categoryBadge.color} text-xs font-semibold`}>
                                      {categoryBadge.label}
                                    </Badge>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {getTimeAgo(notification.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Message */}
                              <p className="text-sm text-gray-700 mb-3 font-medium">
                                {notification.message}
                              </p>

                              {/* Details */}
                              {notification.metadata?.details && notification.metadata.details.length > 0 && (
                                <div className="space-y-2 bg-white/60 backdrop-blur-sm rounded-lg p-3 mb-3">
                                  {notification.metadata.details.map((detail, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500">{detail.icon}</span>
                                      <span className="text-gray-500 font-medium">{detail.label}:</span>
                                      <span className="text-gray-700 font-semibold">{detail.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleViewNotification(notification, e)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all shadow-sm`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {notification.category === 'contract' ? 'Lihat Kontrak' : 'Lihat Detail'}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                {!notification.isArchived && (
                                  <>
                                    <button
                                      onClick={(e) => handlePinNotification(notification.id, e)}
                                      className={`px-3 py-2 rounded-lg transition-all shadow-sm ${
                                        notification.isPinned
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-white hover:bg-gray-50 text-gray-700'
                                      }`}
                                      title="Pin notifikasi"
                                    >
                                      <Pin className="w-3.5 h-3.5" />
                                    </button>
                                    {!notification.isRead && (
                                      <button
                                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                                        className="px-3 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-all shadow-sm"
                                        title="Tandai sudah dibaca"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => handleArchiveNotification(notification.id, e)}
                                      className="px-3 py-2 rounded-lg bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all shadow-sm"
                                      title="Arsipkan"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={(e) => handleDismissNotification(notification.id, e)}
                                  className="px-3 py-2 rounded-lg bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 transition-all shadow-sm"
                                  title="Hapus notifikasi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect Border */}
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/50 rounded-xl transition-all pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-t px-6 py-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-gray-600 font-medium">
                      Urgent ({urgentCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-600 font-medium">
                      Pinned ({pinnedCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600 font-medium">
                      Archive ({archivedCount})
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClearAll}
                  className="text-gray-500 hover:text-red-600 font-medium"
                >
                  Hapus Semua
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <NotificationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </>
  );
});