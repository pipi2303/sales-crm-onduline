// App-shell top header (page title, PWA install button, collaboration
// indicator, notifications, user menu) - moved out of App.tsx so it's a
// self-contained unit, separate from Sidebar.tsx. Pure presentational
// component: all state lives in App.tsx and is passed down as props.
import React, { useEffect, useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { AppNotifications } from '@/app/components/AppNotifications';
import { CollaborationIndicator } from '@/app/components/CollaborationIndicator';
import type { AuthUser } from '@/app/contexts/AuthContext';
import type { Contract as ContractType } from '@/app/data/dummyData';

// Bab 41: jam & tanggal sederhana di header, menggantikan judul menu
// aktif di sebelah kanan judul aplikasi. Update tiap menit (cukup untuk
// tampilan jam header, tidak perlu presisi detik) supaya re-render
// minimal.
function useSimpleClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

interface HeaderProps {
  activeMenuName: string;
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
  contracts: ContractType[];
  setSelectedContract: React.Dispatch<React.SetStateAction<ContractType | null>>;
  setActiveMenu: (id: string) => void;
  showUserMenu: boolean;
  setShowUserMenu: React.Dispatch<React.SetStateAction<boolean>>;
  user: AuthUser | null;
  onLogout: () => void;
}

export function Header({
  activeMenuName,
  deferredPrompt,
  setDeferredPrompt,
  contracts,
  setSelectedContract,
  setActiveMenu,
  showUserMenu,
  setShowUserMenu,
  user,
  onLogout,
}: HeaderProps) {
  const now = useSimpleClock();
  const dateTimeLabel = `${now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}  ${now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  // Get user initials for avatar
  const userInitials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="h-16 bg-[#013E37] border-b border-white/10 text-white flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        {/* Brand - lives here (not in Sidebar) so it's always visible no
            matter whether the sidebar is expanded or collapsed. */}
        <div className="flex items-center gap-1.5 pr-4 border-r border-white/20 flex-shrink-0">
          <img
            src="/logo-sales-crm.png"
            alt="Sales & CRM"
            className="h-8 w-8 rounded-lg bg-white object-contain p-0.5 shadow-sm flex-shrink-0"
          />
          <div className="leading-tight hidden sm:block">
            <p className="text-sm font-bold text-white tracking-[1.2px] whitespace-nowrap">Sales & CRM</p>
            <p className="text-[7px] font-medium tracking-[0.08em] text-white/60 whitespace-nowrap">PEOPLE . PIPELINE . GROWTH</p>
          </div>
        </div>
        <h2 className="text-[13px] font-medium text-white/80 truncate">
          {dateTimeLabel}
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        {/* PWA Install Button */}
        {deferredPrompt && (
          <Button
            onClick={() => {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                  console.log('PWA installed');
                }
                setDeferredPrompt(null);
              });
            }}
            variant="outline"
            size="sm"
            className="hidden md:flex"
          >
            Install App
          </Button>
        )}
        
        {/* Collaboration Indicator */}
        <div className="hidden lg:block">
          <CollaborationIndicator />
        </div>
        
        {/* Notification Center */}
        <AppNotifications 
          contracts={contracts}
          onViewContract={(contract) => {
            setSelectedContract(contract);
            setActiveMenu('contracts');
          }}
        />
        
        <div className="relative user-menu-container">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User className="h-5 w-5" />
          </Button>
          
          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center text-white font-semibold">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                  <p className="text-xs text-[#013E37] font-medium mt-1">{user?.role}</p>
                </div>
              </div>
              <Button
                onClick={onLogout}
                variant="ghost"
                className="w-full mt-3 text-red-600 hover:text-red-700 hover:bg-red-50 justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
