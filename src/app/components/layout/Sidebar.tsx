// App-shell sidebar (grouped/collapsible nav, logout footer) - moved out of
// App.tsx so it's a self-contained unit, separate from Header.tsx. The app's
// brand/logo lives in Header.tsx instead of here, because Header spans the
// full remaining width regardless of sidebar state - putting it there means
// the brand never disappears when the sidebar collapses to icon-only.
// Pure presentational component: all state (which group/menu is expanded,
// which item is active, whether the sidebar itself is collapsed to icon-only)
// lives in App.tsx and is passed down as props, so behavior is unchanged.
import React from 'react';
import { ChevronLeft, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import type { MenuGroup, MenuItem } from '@/types/menu';

interface SidebarProps {
  menuGroups: MenuGroup[];
  activeMenu: string;
  setActiveMenu: (id: string) => void;
  expandedGroups: string[];
  setExpandedGroups: React.Dispatch<React.SetStateAction<string[]>>;
  expandedMenus: string[];
  setExpandedMenus: React.Dispatch<React.SetStateAction<string[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout: () => void;
}

export function Sidebar({
  menuGroups,
  activeMenu,
  setActiveMenu,
  expandedGroups,
  setExpandedGroups,
  expandedMenus,
  setExpandedMenus,
  isSidebarOpen,
  setIsSidebarOpen,
  onLogout,
}: SidebarProps) {
  // Bab 42: saat sidebar di-collapse ke icon-only (isSidebarOpen === false),
  // label menu tidak lagi terlihat -- tambahkan tooltip per ikon supaya user
  // tetap tahu menu apa yang mereka tunjuk tanpa harus expand sidebar dulu.
  // Saat sidebar terbuka, label teks sudah terlihat langsung jadi tidak
  // perlu tooltip (dan render tombol yang sama, tanpa wrapper Tooltip).
  const renderMenuItemButton = (item: MenuItem) => {
    const button = (
      <button
        onClick={() => {
          if (item.subMenus) {
            setExpandedMenus(prev =>
              prev.includes(item.id)
                ? prev.filter(id => id !== item.id)
                : [...prev, item.id]
            );
          } else {
            setActiveMenu(item.id);
          }
        }}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
          activeMenu === item.id
            ? 'bg-[#013E37] text-white shadow-md'
            : 'text-gray-700 hover:bg-[#EEF7F5] hover:text-[#013E37]'
        }`}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {isSidebarOpen && (
          <>
            <span className="font-medium text-sm truncate flex-1 text-left">{item.name}</span>
            {item.subMenus && (
              expandedMenus.includes(item.id)
                ? <ChevronDown className="h-4 w-4 flex-shrink-0" />
                : <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </>
        )}
      </button>
    );

    if (isSidebarOpen) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="bg-[#013E37] text-white">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} relative bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-lg`}>
      {/* Floating collapse/expand toggle - sits astride the sidebar/content
          boundary (absolute to the <aside>, so it slides with the width
          transition instead of jumping when isSidebarOpen flips). */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute -right-2.5 top-4 z-30 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#013E37] text-white shadow-md transition-colors hover:bg-[#025C52]"
      >
        {isSidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {/* Menu Items - grouped into collapsible sections */}
      <nav className="flex-1 overflow-y-auto py-4 sidebar-nav-scroll">
        <div className="space-y-1 px-2">
          {menuGroups.map((group) => {
            const isGroupExpanded = expandedGroups.includes(group.id);
            return (
              <div key={group.id} className="mb-1">
                {isSidebarOpen && (
                  <button
                    onClick={() => {
                      setExpandedGroups(prev =>
                        prev.includes(group.id)
                          ? prev.filter(id => id !== group.id)
                          : [...prev, group.id]
                      );
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#013E37] transition-colors"
                  >
                    <span className="truncate">{group.label}</span>
                    {isGroupExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                  </button>
                )}
                {(!isSidebarOpen || isGroupExpanded) && (
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.id}>
                        {renderMenuItemButton(item)}
                        {isSidebarOpen && item.subMenus && expandedMenus.includes(item.id) && (
                          <div className="mt-1 space-y-1">
                            {item.subMenus.map(subItem => (
                              <button
                                key={subItem.id}
                                onClick={() => setActiveMenu(subItem.id)}
                                className={`w-full flex items-center gap-3 pl-11 pr-3 py-2 rounded-lg transition-all ${
                                  activeMenu === subItem.id
                                    ? 'bg-[#013E37] text-white shadow-md'
                                    : 'text-gray-600 hover:bg-[#EEF7F5] hover:text-[#013E37]'
                                }`}
                              >
                                <span className="text-sm truncate">{subItem.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {isSidebarOpen && (
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </aside>
  );
}
