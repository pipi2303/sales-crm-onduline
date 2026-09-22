// Sidebar menu configuration - moved out of App.tsx so the menu structure
// (and the lazy-loaded page components it points to) isn't tangled up with
// the app shell's own state/layout code. Pure static data: nothing here
// depends on component state, so it's safe to live at module scope.
import { lazy } from 'react';
import {
  Home as HomeIcon, Users, Package, FileText, BarChart3, Settings,
  Target, TrendingUp, Percent, CheckSquare, Book, Clipboard, UserPlus,
  MapPin, Mail, Plug, DollarSign, Navigation,
} from 'lucide-react';
import { Home } from '@/app/components/Home';
import type { MenuGroup } from '@/types/menu';

// Lazy load heavy components
const OpportunityManagement = lazy(() => import('@/app/components/OpportunityManagement').then(m => ({ default: m.OpportunityManagement })));
const SalesTeam = lazy(() => import('@/app/components/SalesTeam').then(m => ({ default: m.SalesTeam })));
const SalesRepresentative = lazy(() => import('@/app/components/SalesRepresentative').then(m => ({ default: m.default })));
const ProductCatalog = lazy(() => import('@/app/components/ProductCatalog'));
const Contract = lazy(() => import('@/app/components/Contract').then(m => ({ default: m.Contract })));
const SalesReports = lazy(() => import('@/app/components/SalesReports').then(m => ({ default: m.SalesReports })));
const AdminSystem = lazy(() => import('@/app/components/AdminSystem').then(m => ({ default: m.AdminSystem })));
const AdvancedAnalytics = lazy(() => import('@/app/components/AdvancedAnalytics').then(m => ({ default: m.AdvancedAnalytics })));
const SalesLeaderboard = lazy(() => import('@/app/components/SalesLeaderboard').then(m => ({ default: m.SalesLeaderboard })));
const PerformanceHub = lazy(() => import('@/app/components/PerformanceHub').then(m => ({ default: m.PerformanceHub })));
const KPIAIEnhanced = lazy(() => import('@/app/components/KPIAIEnhanced').then(m => ({ default: m.KPIAIEnhanced })));
// New feature components
const DiscountApprovalSystem = lazy(() => import('@/app/components/DiscountApprovalSystem').then(m => ({ default: m.DiscountApprovalSystem })));
const QuotationManagement = lazy(() => import('@/app/components/QuotationManagement').then(m => ({ default: m.QuotationManagement })));
const TaskManagement = lazy(() => import('@/app/components/TaskManagement').then(m => ({ default: m.TaskManagement })));
const KnowledgeBase = lazy(() => import('@/app/components/KnowledgeBase').then(m => ({ default: m.KnowledgeBase })));
const ConfigurePriceQuote = lazy(() => import('@/app/components/ConfigurePriceQuote').then(m => ({ default: m.ConfigurePriceQuote })));
const LeadManagement = lazy(() => import('@/app/components/LeadManagement').then(m => ({ default: m.LeadManagement })));
const TerritoryManagement = lazy(() => import('@/app/components/TerritoryManagement').then(m => ({ default: m.TerritoryManagement })));
const DistributorStoreMap = lazy(() => import('@/app/components/DistributorStoreMap').then(m => ({ default: m.DistributorStoreMap })));
const EmailCommunicationHub = lazy(() => import('@/app/components/EmailCommunicationHub').then(m => ({ default: m.EmailCommunicationHub })));
const IntegrationHub = lazy(() => import('@/app/components/IntegrationHub').then(m => ({ default: m.IntegrationHub })));
const CommissionCalculator = lazy(() => import('@/app/components/CommissionCalculator').then(m => ({ default: m.CommissionCalculator })));
const CustomReportBuilder = lazy(() => import('@/app/components/CustomReportBuilder').then(m => ({ default: m.CustomReportBuilder })));

// Sidebar menu, grouped into sections (see Sidebar.tsx's render). Each group
// can be collapsed/expanded independently via the expandedGroups state that
// App.tsx owns and passes down.
export const menuGroups: MenuGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      { id: 'home', name: 'Home', icon: HomeIcon, component: Home },
    ],
  },
  {
    id: 'sales-pipeline',
    label: 'Sales Pipeline',
    items: [
      { id: 'leads', name: 'Lead Management', icon: UserPlus, component: LeadManagement },
      { id: 'opportunities', name: 'Opportunity Management', icon: TrendingUp, component: OpportunityManagement },
      { id: 'cpq', name: 'Configure, Propose & Quote', icon: Clipboard, component: ConfigurePriceQuote },
      { id: 'quotations', name: 'Quotation Management', icon: FileText, component: QuotationManagement },
      { id: 'discount-approval', name: 'Discount Approval', icon: Percent, component: DiscountApprovalSystem },
      { id: 'contracts', name: 'Contract', icon: FileText, component: Contract },
    ],
  },
  {
    id: 'produk-wilayah',
    label: 'Produk & Wilayah',
    items: [
      { id: 'products', name: 'Product Catalog', icon: Package, component: ProductCatalog },
      { id: 'territory', name: 'Territory Management', icon: MapPin, component: TerritoryManagement },
      { id: 'distributor-store-map', name: 'Peta Distributor & Toko', icon: Navigation, component: DistributorStoreMap },
    ],
  },
  {
    id: 'tim-penjualan',
    label: 'Tim Penjualan',
    items: [
      { id: 'team', name: 'CRM', icon: Users, component: SalesTeam },
      { id: 'sales-representative', name: 'Sales Representative', icon: Users, component: SalesRepresentative },
      { id: 'commission', name: 'Commission Calculator', icon: DollarSign, component: CommissionCalculator },
    ],
  },
  {
    id: 'kinerja-laporan',
    label: 'Kinerja & Laporan',
    items: [
      {
        id: 'kpi',
        name: 'KPI',
        icon: Target,
        subMenus: [
          { id: 'kpi-tracker', name: 'KPI Tracker', component: PerformanceHub },
          { id: 'leaderboard', name: 'Leaderboard', component: SalesLeaderboard },
          { id: 'kpi-ai-enhanced', name: 'KPI Target', component: KPIAIEnhanced },
        ],
      },
      { id: 'tasks', name: 'Task Management', icon: CheckSquare, component: TaskManagement },
      { id: 'reports', name: 'Sales Reports', icon: BarChart3, component: SalesReports },
      { id: 'custom-reports', name: 'Custom Report Builder', icon: BarChart3, component: CustomReportBuilder },
      { id: 'analytics', name: 'Analytics', icon: BarChart3, component: AdvancedAnalytics },
    ],
  },
  {
    id: 'komunikasi',
    label: 'Komunikasi',
    items: [
      { id: 'email-hub', name: 'Email Communication Hub', icon: Mail, component: EmailCommunicationHub },
    ],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    items: [
      { id: 'integration-hub', name: 'Integration Hub', icon: Plug, component: IntegrationHub },
      { id: 'knowledge-base', name: 'Knowledge Base', icon: Book, component: KnowledgeBase },
      // Fase 1 item 4 / insight doc Bab 10: user management (role
      // assignment) shouldn't be self-service for non-admins. This is
      // the one menu item this pass restricts -- the clearest, least
      // ambiguous case. Other modules (Commission Calculator, Discount
      // Approval, Integration Hub's connection settings, ...) may also
      // warrant restricting later, but that needs an actual per-module
      // policy decision, not a guess made here.
      { id: 'admin', name: 'Admin System', icon: Settings, component: AdminSystem, roles: ['Super Admin'] },
    ],
  },
];

// Flat view of every menu item across all groups - used by App.tsx's
// findActiveComponent/findActiveMenuName so they don't need their own
// group-traversal logic.
export const menuItems = menuGroups.flatMap(group => group.items);

// Fase 1 item 4 (UI half): true if `role` (the display label from
// AuthUser.role, e.g. 'Super Admin') is allowed to see/navigate to this
// item. An item with no `roles` list is visible to every authenticated
// role -- restricting a menu is opt-in per item, not the default.
export function isMenuItemVisibleToRole(item: { roles?: string[] }, role: string | undefined): boolean {
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

// Sidebar-ready menu tree with items the current role can't see removed,
// and any group left with zero items dropped entirely (an empty group
// header with nothing under it would be confusing, not just redundant).
export function getVisibleMenuGroups(role: string | undefined): MenuGroup[] {
  return menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => isMenuItemVisibleToRole(item, role)),
    }))
    .filter(group => group.items.length > 0);
}
