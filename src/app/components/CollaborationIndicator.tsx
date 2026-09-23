import React, { useState, useEffect } from 'react';
import { Users, Circle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  lastActivity: Date;
  currentPage?: string;
}

// Demo online users
const DEMO_USERS: OnlineUser[] = [
  {
    id: '1',
    name: 'Ahmad Hidayat',
    email: 'ahmad@gmail.com',
    status: 'online',
    lastActivity: new Date(),
    currentPage: 'Dashboard',
  },
  {
    id: '2',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    status: 'online',
    lastActivity: new Date(Date.now() - 2 * 60 * 1000),
    currentPage: 'CRM',
  },
  {
    id: '3',
    name: 'Citra Dewi',
    email: 'citra@gmail.com',
    status: 'away',
    lastActivity: new Date(Date.now() - 10 * 60 * 1000),
    currentPage: 'Reports',
  },
  {
    id: '4',
    name: 'Diana Putri',
    email: 'diana@gmail.com',
    status: 'busy',
    lastActivity: new Date(Date.now() - 5 * 60 * 1000),
    currentPage: 'Contracts',
  },
];

export function CollaborationIndicator() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>(DEMO_USERS);
  const [showAll, setShowAll] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) =>
        prev.map((user) => ({
          ...user,
          lastActivity: new Date(),
        }))
      );
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: OnlineUser['status']) => {
    switch (status) {
      case 'online':
        return 'text-[#013E37]'; // Changed from text-green-500
      case 'away':
        return 'text-yellow-500';
      case 'busy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: OnlineUser['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      default:
        return 'Offline';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const displayUsers = showAll ? onlineUsers : onlineUsers.slice(0, 5);
  const remainingCount = onlineUsers.length - 5;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex items-center -space-x-2">
          {displayUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <button className="relative focus:outline-none focus:ring-2 focus:ring-[#EEF7F5]0 rounded-full">
                  <Avatar className="border-2 border-white hover:z-10 transition-all cursor-pointer hover:scale-110">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-[#013E37] text-white text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Circle
                    className={`absolute bottom-0 right-0 h-3 w-3 ${getStatusColor(
                      user.status
                    )} fill-current`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-3 max-w-xs bg-[#013E37] border-[#013E37]">
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-white">{user.name}</p>
                  <p className="text-xs text-white/70">{user.email}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-xs border-white/30 text-white">
                      {getStatusText(user.status)}
                    </Badge>
                    {user.currentPage && (
                      <span className="text-xs text-white/70">
                        Viewing: {user.currentPage}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60">{getTimeAgo(user.lastActivity)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {!showAll && remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowAll(true)}
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 border-2 border-white hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#EEF7F5]0"
                >
                  <span className="text-xs font-semibold text-gray-600">+{remainingCount}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show {remainingCount} more users</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500">
              <Circle className="h-2 w-2 text-green-500 fill-current animate-pulse" />
              <span className="text-xs font-medium text-green-700">
                {onlineUsers.length} online
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{onlineUsers.length} users currently active</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}