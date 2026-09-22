import type { ComponentType } from 'react';

// Sidebar menu shape. Moved here from src/app/App.tsx as part of splitting the
// app shell into Sidebar/Header components (see src/app/config/menuConfig.ts
// for the actual menuGroups data, and src/app/components/layout/Sidebar.tsx
// for the component that renders these).

export type SubMenuItem = {
  id: string;
  name: string;
  component: ComponentType;
};

export type MenuItem = {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  component?: ComponentType;
  subMenus?: SubMenuItem[];
  // Fase 1 item 4 (UI half): which AuthUser.role display labels ('Super
  // Admin', 'Sales Manager', ...) may see this item in the sidebar and
  // navigate to it. Omitted/undefined = visible to every authenticated
  // role. This is a UX nicety only, same as lib/rbac.ts's own comment
  // says about UI-level checks -- the backend's requireRole() in
  // api/handler.ts is the actual security boundary regardless of what
  // this hides or shows.
  roles?: string[];
};

export type MenuGroup = {
  id: string;
  label: string;
  items: MenuItem[];
};
