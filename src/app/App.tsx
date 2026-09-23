import React, { useState, useEffect, Suspense } from 'react';
import { Home } from '@/app/components/Home';
import { AIAssistant } from '@/app/components/AIAssistant';
import { AIChatAssistant } from '@/app/components/ai/AIChatAssistant';
import { LoadingScreen } from '@/app/components/LoadingScreen';
import { ComponentLoader } from '@/app/components/ComponentLoader';
import { Login } from '@/app/components/Login';
import { Sidebar } from '@/app/components/layout/Sidebar';
import { Header } from '@/app/components/layout/Header';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { ModalPortalProvider } from '@/app/contexts/ModalPortalContext';
import { ConfirmDialogProvider } from '@/app/components/ui/confirm-dialog';
import '@/utils/demoDebug'; // Load debug utilities
import { toast } from 'sonner';
import { contracts as dummyContracts, Contract as ContractType } from '@/app/data/dummyData';
import { menuItems, getVisibleMenuGroups, isMenuItemVisibleToRole } from '@/app/config/menuConfig';

function AppContent() {
  const { user, logout, loginWithCredentials, isAuthenticated } = useAuth();
  const [activeMenu, setActiveMenu] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]); // All menus collapsed by default
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    ['dashboard', 'sales-pipeline', 'produk-wilayah', 'tim-penjualan', 'kinerja-laporan', 'komunikasi', 'sistem']
  ); // All groups expanded by default
  const [contracts, setContracts] = useState<ContractType[]>(dummyContracts);
  const [selectedContract, setSelectedContract] = useState<ContractType | null>(null);
  // FIX: ref ke #modal-portal-root di dalam .content-area, dipakai ModalPortalProvider
  // supaya Dialog (lihat ui/dialog.tsx) render di dalam area content, bukan document.body.
  const [modalPortalRoot, setModalPortalRoot] = useState<HTMLElement | null>(null);

  // Reset to Home menu whenever authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      setActiveMenu('home');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Fase 1 (23 Sep 2026): this useEffect used to call initializeAllData()
    // unconditionally on every mount, which auto-seeded
    // employees/clients/partners/contracts with dummy data into
    // localStorage for any browser that didn't have it yet (new user,
    // new device, cleared cache) -- with no explicit action from anyone.
    // The dummy content itself has been fixed to match Onduline's business
    // (see populateCRMData.ts), but auto-injecting sample records into a
    // production dashboard without the user asking is still the wrong
    // default. SalesTeam.tsx and SalesRepresentative.tsx keep an explicit
    // "Load Dummy Data" button for reps who want sample records to explore
    // the UI with; nothing auto-populates on load anymore.

    // Optimized loading - reduced from 1500ms to 500ms
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register Service Worker (async, non-blocking)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // FIX: gap mobile responsiveness - sidebar auto-collapse ke mode icon-only
  // (bukan disembunyikan total, supaya tetap sesuai requirement "Sidebar harus
  // selalu tetap terlihat") saat lebar layar < 768px, supaya .content-area
  // (tempat modal/dialog center) tidak terlalu sempit di HP. User tetap bisa
  // toggle manual seperti biasa - effect ini cuma auto-collapse saat resize
  // KE mobile, tidak memaksa buka lagi saat kembali ke desktop.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    toast.success('Berhasil logout!');
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={async (email, password) => {
          const result = await loginWithCredentials(email, password);
          if (result.success) {
            toast.success('Login berhasil! Selamat datang.');
          }
          return result;
        }} 
      />
    );
  }

  // Find active component from menu items or submenus. Sub-menus have no
  // `roles` of their own (see types/menu.ts) -- only their parent item can
  // be role-gated, so this only needs to check `isMenuItemVisibleToRole`
  // on the top-level item, not on subItem.
  const findActiveComponent = (): React.ComponentType => {
    for (const item of menuItems) {
      if (!isMenuItemVisibleToRole(item, user?.role)) continue;
      if (item.id === activeMenu && item.component) {
        return item.component;
      }
      if (item.subMenus) {
        const subItem = item.subMenus.find(sub => sub.id === activeMenu);
        if (subItem) {
          return subItem.component;
        }
      }
    }
    return Home;
  };

  // Find active menu name
  const findActiveMenuName = (): string => {
    for (const item of menuItems) {
      if (!isMenuItemVisibleToRole(item, user?.role)) continue;
      if (item.id === activeMenu) {
        return item.name;
      }
      if (item.subMenus) {
        const subItem = item.subMenus.find(sub => sub.id === activeMenu);
        if (subItem) {
          return subItem.name;
        }
      }
    }
    return 'Home';
  };

  // Fase 1 item 4 (UI half, insight doc Bab 2/10): menu items the current
  // role isn't allowed to see are filtered out before Sidebar ever renders
  // them -- previously every role saw every menu regardless of what the
  // backend would actually let them do once clicked.
  const visibleMenuGroups = getVisibleMenuGroups(user?.role);

  const ActiveComponent = findActiveComponent();
  const activeMenuName = findActiveMenuName();

  return (
    <ModalPortalProvider container={modalPortalRoot}>
    <ConfirmDialogProvider>
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Full-width top bar - spans edge to edge above the sidebar, so the
          brand + active page title never narrow down or disappear when the
          sidebar collapses (that only affects the row below). */}
      <Header
        activeMenuName={activeMenuName}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
        contracts={contracts}
        setSelectedContract={setSelectedContract}
        setActiveMenu={setActiveMenu}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        user={user}
        onLogout={handleLogout}
      />

      {/* Sidebar + main content, side by side, below the full-width header */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          menuGroups={visibleMenuGroups}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
          expandedMenus={expandedMenus}
          setExpandedMenus={setExpandedMenus}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content Area — containing block untuk modal/dialog (lihat ui/dialog.tsx & ModalPortalContext) */}
          <div className="content-area flex-1 relative overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto">
                <Suspense fallback={<ComponentLoader />}>
                  <ActiveComponent />
                </Suspense>
              </div>
            </div>
            {/* Portal target untuk modal/dialog: sibling dari div yang di-scroll di atas,
                supaya modal "lock" (tidak ikut bergerak saat konten discroll) dan tetap
                terbatas di area content (tidak menutupi sidebar/header).
                style transform: bikin elemen ini jadi "containing block" utk descendant
                position:fixed (dipakai Select/Popover/DropdownMenu/Tooltip via Radix
                Popper) - tanpa ini, portal container saja tidak cukup karena fixed selalu
                relatif ke viewport kecuali ada ancestor dgn transform/filter/perspective. */}
            <div
              id="modal-portal-root"
              ref={setModalPortalRoot}
              className="absolute inset-0 pointer-events-none z-40"
              style={{ transform: 'translateZ(0)' }}
            />
          </div>
        </main>
      </div>

      {/* AI Assistant */}
      <AIAssistant />
      <AIChatAssistant />

      {/* Toast Notifications */}
      {/* <Toaster position="top-right" richColors /> dihapus atas permintaan user - popup notifikasi kanan atas */}
    </div>
    </ConfirmDialogProvider>
    </ModalPortalProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
