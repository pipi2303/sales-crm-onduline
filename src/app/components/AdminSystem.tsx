import React, { useState, useEffect } from 'react';
import { Shield, Users as UsersIcon, Key, FileText, Plus, Search, Edit2, Trash2, Eye, UserPlus, Settings, Activity, Lock, Unlock, RefreshCw, Palette, Globe, Server, Database, BellRing, Smartphone, Cloud, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import type { AppUser, UserRole } from '@/types/user';
import type { AuditLogEntry as RawAuditLogEntry } from '@/types/auditLog';
import { usersRepository } from '@/services/usersRepository';
import { auditLogRepository } from '@/services/auditLogRepository';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'sonner';

// Bab 10 gap #4 (23 Sep 2026): the real login Role enum
// (prisma/schema.prisma), paired with the human-readable label
// AuthContext.tsx's ROLE_LABELS already uses elsewhere in this app.
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  { value: 'SALES_REPRESENTATIVE', label: 'Sales Representative' },
  { value: 'MASTER_DATA_ADMIN', label: 'Master Data Admin' },
];
function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  color: string;
}

// Bab 10 #3 (23 Sep 2026): this used to have an `ipAddress` field and a
// `status` fabricated from nothing (the dummy array below just typed one
// in per row) -- neither is data this app actually captures (no
// per-request IP logging, and every real entry logAudit() writes IS a
// completed action, there's no in-between "warning" state). `status`
// here is instead DERIVED from the action label (reject -> warning,
// login.failed -> failed, everything else -> success), and `ipAddress`
// is dropped entirely rather than showing a fake one.
interface AuditLog {
  id: string;
  user: string;
  action: string;
  resource: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'warning';
  details?: string;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'login': 'Login berhasil',
  'login.failed': 'Login gagal',
  'logout': 'Logout',
  'distributor.approve': 'Approve distributor',
  'distributor.reject': 'Reject distributor',
  'store.approve': 'Approve toko',
  'store.reject': 'Reject toko',
  'client.approve': 'Approve client',
  'client.reject': 'Reject client',
  'discount.approve': 'Approve diskon',
  'discount.reject': 'Reject diskon',
  'discount.counter-offer': 'Counter-offer diskon',
  'user.create': 'Buat pengguna baru',
  'user.deactivate': 'Nonaktifkan pengguna',
  'user.activate': 'Aktifkan pengguna',
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  User: 'Auth & Pengguna',
  Distributor: 'Distributor',
  Store: 'Toko',
  Client: 'Client',
  DiscountApprovalRequest: 'Discount Approval',
};

function auditStatusForAction(action: string): 'success' | 'failed' | 'warning' {
  if (action.endsWith('.failed')) return 'failed';
  if (action.endsWith('.reject')) return 'warning';
  return 'success';
}

function auditDetails(entry: RawAuditLogEntry): string | undefined {
  const after = entry.afterJson as Record<string, unknown> | null;
  const note = after?.rejectionNote ?? after?.comment;
  return typeof note === 'string' && note.trim() ? note : undefined;
}

function toAuditLog(entry: RawAuditLogEntry): AuditLog {
  return {
    id: entry.id,
    user:
      entry.actor?.name ||
      entry.actor?.email ||
      (entry.action === 'login.failed' ? entry.entityId : 'Sistem'),
    action: AUDIT_ACTION_LABELS[entry.action] ?? entry.action,
    resource: AUDIT_ENTITY_LABELS[entry.entityType] ?? entry.entityType,
    timestamp: new Date(entry.createdAt),
    status: auditStatusForAction(entry.action),
    details: auditDetails(entry),
  };
}

const emptyUserForm = { name: '', email: '', role: '' as UserRole | '', password: '', isActive: true };

type PermissionRoles = UserRole[] | 'all';

interface ModulePermission {
  module: string;
  actions: { label: string; roles: PermissionRoles }[];
}

// Bab 10 #3 (23 Sep 2026): this replaces a 24-switch grid of made-up
// permission labels (Math.random() decided which were "on") with the
// REAL authorization rules this app enforces, read by hand off every
// requireRole()/requireAuth() call in api/handler.ts. There is no
// generic Permission model here -- authorization is hardcoded per
// endpoint -- so this table is a manually-kept mirror of that code, not
// a live query against it; if a future PR changes a requireRole() call,
// this table needs a matching edit (flagged in MEMORY.md).
const MODULE_PERMISSIONS: ModulePermission[] = [
  { module: 'Distributor', actions: [
    { label: 'Ajukan baru & edit data', roles: 'all' },
    { label: 'Approve / reject pengajuan', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'MASTER_DATA_ADMIN'] },
  ] },
  { module: 'Toko', actions: [
    { label: 'Ajukan baru & edit data', roles: 'all' },
    { label: 'Approve / reject pengajuan', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'MASTER_DATA_ADMIN'] },
  ] },
  { module: 'Client', actions: [
    { label: 'Ajukan baru & edit data', roles: 'all' },
    { label: 'Approve / reject pengajuan', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
  ] },
  { module: 'Lead', actions: [
    { label: 'Buat & edit data', roles: 'all' },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
  ] },
  { module: 'Opportunity', actions: [
    { label: 'Buat data', roles: 'all' },
    { label: 'Edit & hapus data', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
  ] },
  { module: 'Produk', actions: [
    { label: 'Buat & edit data', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'MASTER_DATA_ADMIN'] },
  ] },
  { module: 'Sales Rep', actions: [
    { label: 'Buat, edit & hapus data', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
  ] },
  { module: 'Target Kinerja (KPI)', actions: [
    { label: 'Buat data', roles: 'all' },
    { label: 'Edit & hapus data', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
  ] },
  { module: 'Komisi', actions: [
    { label: 'Buat data', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
  ] },
  { module: 'Tugas (Task)', actions: [
    { label: 'Buat & edit data', roles: 'all' },
    { label: 'Hapus', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
  ] },
  { module: 'Wilayah (Territory)', actions: [
    { label: 'Buat, edit & hapus data', roles: ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'] },
  ] },
  { module: 'Discount Approval', actions: [
    { label: 'Ajukan diskon', roles: 'all' },
    { label: 'Putuskan diskon > 10% s/d 25%', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
    { label: 'Putuskan diskon > 25%', roles: ['SUPER_ADMIN'] },
    { label: 'Hapus pengajuan', roles: ['SUPER_ADMIN', 'SALES_MANAGER'] },
  ] },
  { module: 'Manajemen Pengguna', actions: [
    { label: 'Lihat, buat, edit & nonaktifkan user', roles: ['SUPER_ADMIN'] },
  ] },
  { module: 'Audit Log', actions: [
    { label: 'Lihat audit log', roles: ['SUPER_ADMIN'] },
  ] },
];

function roleCan(roles: PermissionRoles, role: UserRole): boolean {
  return roles === 'all' || roles.includes(role);
}

export function AdminSystem() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userFormData, setUserFormData] = useState(emptyUserForm);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Bab 10 #3 (23 Sep 2026): both users and audit logs now come from
  // real endpoints -- /api/users (Bab 10 #4, done earlier) and
  // /api/audit-logs (this round's targeted instrumentation: login/
  // logout, every approve/reject decision, and user create/deactivate/
  // activate -- see logAudit() in api/handler.ts). This is NOT full
  // instrumentation of every mutation in the app, by deliberate scope
  // decision -- see MEMORY.md.
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersResult, auditResult] = await Promise.all([
        usersRepository.getAll(),
        auditLogRepository.getRecent(),
      ]);
      if (usersResult.success) {
        setUsers(usersResult.data || []);
      } else {
        toast.error(usersResult.error || 'Gagal memuat daftar pengguna');
      }

      if (auditResult.success) {
        setAuditLogs((auditResult.data || []).map(toAuditLog));
      } else {
        toast.error(auditResult.error || 'Gagal memuat audit log');
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Gagal memuat data administrasi');
    } finally {
      setLoading(false);
    }
  };

  const openCreateUser = () => {
    setSelectedUser(null);
    setUserFormData(emptyUserForm);
    setIsUserDialogOpen(true);
  };

  const openEditUser = (u: AppUser) => {
    setSelectedUser(u);
    setUserFormData({ name: u.name, email: u.email, role: u.role, password: '', isActive: u.isActive });
    setIsUserDialogOpen(true);
  };

  const handleSubmitUser = async () => {
    if (!userFormData.name.trim() || !userFormData.email.trim() || !userFormData.role) {
      toast.error('Nama, email, dan role wajib diisi');
      return;
    }
    if (!selectedUser && userFormData.password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    setSaving(true);
    try {
      const result = selectedUser
        ? await usersRepository.update(selectedUser.id, {
            name: userFormData.name,
            role: userFormData.role as UserRole,
            ...(userFormData.password ? { password: userFormData.password } : {}),
          })
        : await usersRepository.create({
            name: userFormData.name,
            email: userFormData.email,
            role: userFormData.role as UserRole,
            password: userFormData.password,
          });
      if (result.success) {
        toast.success(selectedUser ? 'Pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan');
        setIsUserDialogOpen(false);
        setSelectedUser(null);
        setUserFormData(emptyUserForm);
        fetchAdminData();
      } else {
        toast.error(result.error || 'Gagal menyimpan pengguna');
      }
    } finally {
      setSaving(false);
    }
  };

  // No DELETE on /api/users by design (see api/handler.ts's handleUsers
  // header) -- toggling isActive is how an account gets disabled/
  // re-enabled without destroying its audit trail.
  const handleToggleActive = async (u: AppUser) => {
    const action = u.isActive ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!(await confirm(`Apakah Anda yakin ingin ${action} akun "${u.name}"?`, { variant: u.isActive ? 'destructive' : 'default', confirmText: u.isActive ? 'Nonaktifkan' : 'Aktifkan' }))) return;
    const result = await usersRepository.update(u.id, { isActive: !u.isActive });
    if (result.success) {
      toast.success(u.isActive ? 'Akun dinonaktifkan' : 'Akun diaktifkan kembali');
      fetchAdminData();
    } else {
      toast.error(result.error || 'Gagal mengubah status akun');
    }
  };

  // Roles & Permissions tab: role list is illustrative (this app has no
  // generic Permission model -- authorization is enforced per-endpoint via
  // requireRole() in api/handler.ts, not a configurable matrix), but the
  // 5 roles and their user counts are the real login Role enum + real
  // counts from the users just fetched above.
  const roles: Role[] = [
    { id: 'SUPER_ADMIN', name: 'Super Admin', description: 'Akses penuh ke seluruh sistem dan konfigurasi global.', permissions: ['all'], userCount: users.filter(u => u.role === 'SUPER_ADMIN').length, color: 'bg-red-500' },
    { id: 'SALES_MANAGER', name: 'Sales Manager', description: 'Kelola tim, lihat semua laporan, dan setujui diskon/approval data.', permissions: ['view_reports', 'manage_team', 'approve_discounts'], userCount: users.filter(u => u.role === 'SALES_MANAGER').length, color: 'bg-[#013E37]' },
    { id: 'SALES_EXECUTIVE', name: 'Sales Executive', description: 'Kelola lead dan opportunity pribadi, buat penawaran harga.', permissions: ['manage_leads', 'create_quotes'], userCount: users.filter(u => u.role === 'SALES_EXECUTIVE').length, color: 'bg-blue-500' },
    { id: 'SALES_REPRESENTATIVE', name: 'Sales Representative', description: 'Kunjungan lapangan, check-in toko/distributor, input lead retail.', permissions: ['manage_leads', 'field_visits'], userCount: users.filter(u => u.role === 'SALES_REPRESENTATIVE').length, color: 'bg-sky-500' },
    { id: 'MASTER_DATA_ADMIN', name: 'Master Data Admin', description: 'Kelola data master (produk, wilayah, distributor/toko) dan approval terkait.', permissions: ['manage_master_data', 'approve_records'], userCount: users.filter(u => u.role === 'MASTER_DATA_ADMIN').length, color: 'bg-amber-500' },
  ];

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Activity className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-[#013E37] animate-spin"></div>
          <Shield className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-[#013E37]" />
        </div>
        <p className="text-gray-500 font-medium animate-pulse">Menyiapkan Sistem Administrasi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Admin Control Center
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
            <Server className="h-4 w-4" /> Management & Security Monitoring
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-gray-200" onClick={fetchAdminData}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button className="bg-[#013E37] hover:bg-[#025C52] text-white shadow-lg shadow-emerald-900/20 gap-2" onClick={openCreateUser}>
            <UserPlus className="h-4 w-4" /> Tambah User Baru
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pengguna', value: users.length, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'User Aktif', value: users.filter(u => u.isActive).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Audit Log 24h', value: auditLogs.filter((l) => Date.now() - l.timestamp.getTime() < 86400000).length, icon: FileText, color: 'text-[#013E37]', bg: 'bg-[#EEF7F5]' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-800">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs System */}
      <Tabs defaultValue="users" className="w-full space-y-6" onValueChange={setActiveTab}>
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-2 lg:grid-cols-4 gap-1">
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[72px]"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight leading-[1.1] mb-1 whitespace-normal">
                User Management
              </div>
              <div className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none opacity-80">
                Kelola Akses Pengguna
              </div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="roles" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[72px]"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight leading-[1.1] mb-1 whitespace-normal">
                Roles & Permissions
              </div>
              <div className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none opacity-80">
                Atur Otorisasi Sistem
              </div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[72px]"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight leading-[1.1] mb-1 whitespace-normal">
                Audit & Security
              </div>
              <div className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none opacity-80">
                Monitoring Aktivitas
              </div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[72px]"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight leading-[1.1] mb-1 whitespace-normal">
                System Settings
              </div>
              <div className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none opacity-80">
                Konfigurasi Global
              </div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* User Management Content */}
        <TabsContent value="users" className="space-y-4 outline-none">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Cari berdasarkan nama atau email..." 
                className="pl-10 h-11 border-gray-200 focus:ring-[#013E37]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 border-gray-200">Export CSV</Button>
              <Button variant="outline" className="h-11 border-gray-200">Filter Status</Button>
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pengguna</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Login Terakhir</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#013E37] to-[#02847c] flex items-center justify-center text-white font-bold text-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="border-gray-200 font-medium text-gray-700 bg-white">
                          {roleLabel(u.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium ${u.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {u.isActive ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Belum pernah login'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#013E37]" onClick={() => openEditUser(u)} title="Edit pengguna">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 text-gray-400 ${u.isActive ? 'hover:text-red-500' : 'hover:text-emerald-600'}`}
                            onClick={() => handleToggleActive(u)}
                            disabled={u.id === user?.id}
                            title={u.id === user?.id ? 'Tidak bisa menonaktifkan akun sendiri' : (u.isActive ? 'Nonaktifkan' : 'Aktifkan')}
                          >
                            {u.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="py-20 text-center">
                <Search className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Tidak ada pengguna ditemukan</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Roles Content */}
        <TabsContent value="roles" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Role List</h3>
              {roles.map((role) => (
                <Card 
                  key={role.id} 
                  className={`cursor-pointer transition-all border-l-4 ${selectedRole?.id === role.id ? 'border-[#013E37] shadow-md ring-1 ring-emerald-100' : 'border-transparent hover:border-gray-200 shadow-sm'}`}
                  onClick={() => setSelectedRole(role)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{role.name}</h4>
                      <Badge className={`${role.color} text-white border-none text-[10px]`}>{role.userCount} Users</Badge>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{role.description}</p>
                  </CardContent>
                </Card>
              ))}
              <p className="text-[11px] text-gray-400 px-2 leading-relaxed">
                5 role di atas adalah seluruh role login yang ada (bukan model yang bisa ditambah bebas) --
                lihat Role enum di skema database.
              </p>
            </div>

            <div className="lg:col-span-8">
              <Card className="border-none shadow-sm h-full">
                <CardHeader className="border-b border-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl text-[#013E37]">{selectedRole ? `Izin Akses: ${selectedRole.name}` : 'Pilih Role'}</CardTitle>
                      <CardDescription>
                        Tampilan read-only -- mencerminkan aturan otorisasi yang benar-benar berlaku di backend
                        (requireRole() di api/handler.ts), bukan pengaturan yang bisa diubah dari sini.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedRole ? (
                    <div className="space-y-3">
                      {MODULE_PERMISSIONS.map((mod) => (
                        <div key={mod.module} className="p-4 bg-gray-50 rounded-xl">
                          <h5 className="text-[11px] font-black text-[#013E37] uppercase tracking-[0.2em] mb-3">{mod.module}</h5>
                          <div className="space-y-2">
                            {mod.actions.map((act) => {
                              const allowed = roleCan(act.roles, selectedRole.id as UserRole);
                              return (
                                <div key={act.label} className="flex items-center justify-between gap-4 py-1.5 border-b border-gray-100 last:border-b-0">
                                  <span className="text-sm text-gray-700">{act.label}</span>
                                  {allowed ? (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                      <CheckCircle2 className="h-4 w-4" /> Diizinkan
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-300">Tidak diizinkan</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                        <Shield className="h-10 w-10 text-gray-200" />
                      </div>
                      <p className="text-gray-400 font-medium">Pilih role dari daftar di samping untuk melihat atau mengubah izin akses</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Audit Content */}
        <TabsContent value="security" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm bg-[#013E37] text-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-none">Secure</Badge>
                </div>
                <h4 className="text-xl font-bold">Keamanan Sistem</h4>
                <p className="text-xs text-white/60 mt-1">Status enkripsi TLS 1.3 Aktif</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Web Traffic</span>
                </div>
                <h4 className="text-xl font-bold text-gray-800">Global API</h4>
                <p className="text-xs text-gray-500 mt-1">Rata-rata respons 120ms</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#EEF7F5] flex items-center justify-center">
                    <Database className="h-5 w-5 text-[#EEF7F5]0" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Backups</span>
                </div>
                <h4 className="text-xl font-bold text-gray-800">Auto Backup</h4>
                <p className="text-xs text-gray-500 mt-1">Terakhir: Hari ini, 03:00 AM</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-gray-800">System Activity Logs</CardTitle>
                <CardDescription>Riwayat lengkap aktivitas pengguna dan perubahan sistem</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Download Logs
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50/50 transition-all group flex items-start gap-4">
                    <div className="mt-1">{getStatusIcon(log.status)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-gray-800">{log.action}</p>
                        <span className="text-[10px] font-medium text-gray-400">
                          {log.timestamp.toLocaleDateString('id-ID')} • {log.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Oleh <span className="font-semibold text-[#013E37]">{log.user}</span> di modul <span className="font-semibold">{log.resource}</span>
                      </p>
                      {log.details && (
                        <p className="text-[11px] text-gray-500 mt-2 p-2 bg-gray-50 rounded border border-gray-100 italic">
                          "{log.details}"
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[9px] border-gray-100 bg-white text-gray-400">
                        {log.resource}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-50/50 flex justify-center">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-gray-500 hover:text-[#013E37] gap-1">
                  Lihat Log Lainnya <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Content */}
        <TabsContent value="settings" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              {[
                { label: 'General Settings', icon: Globe },
                { label: 'Theme & Branding', icon: Palette },
                { label: 'Notifications', icon: BellRing },
                { label: 'Integrations', icon: Cloud },
                { label: 'System Preferences', icon: Smartphone },
              ].map((item, i) => (
                <Button 
                  key={i} 
                  variant="ghost" 
                  className={`w-full justify-start gap-3 h-11 px-4 font-medium transition-all ${i === 1 ? 'bg-[#013E37] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </Button>
              ))}
            </div>
            
            <div className="md:col-span-3">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Branding & Estetika Aplikasi</CardTitle>
                  <CardDescription>Ubah tampilan visual dashboard untuk kebutuhan korporasi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <h5 className="text-[11px] font-black text-[#013E37] uppercase tracking-[0.2em]">Warna Identitas</h5>
                    <div className="flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-full bg-[#013E37] ring-2 ring-offset-2 ring-[#013E37]"></div>
                      <div className="flex-1">
                        <Label className="text-sm">Primary Brand Color</Label>
                        <div className="flex gap-2 mt-2">
                          <Input value="#013E37" className="max-w-[120px]" readOnly />
                          <Button variant="outline">Ubah Warna</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[11px] font-black text-[#013E37] uppercase tracking-[0.2em]">Logo Perusahaan</h5>
                    <div className="flex gap-6 items-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="h-20 w-48 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm">
                        <p className="text-xs font-black text-[#013E37]">SALES MONITORING LOGO</p>
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold">Upload Logo Baru</p>
                        <p className="text-xs text-gray-500">Gunakan format PNG atau SVG dengan latar belakang transparan. Ukuran maksimal 2MB.</p>
                        <Button className="bg-[#013E37] hover:bg-[#025C52] mt-2">Pilih File</Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-800">Dark Mode Otomatis</p>
                        <p className="text-xs text-gray-500">Sesuaikan tema dengan sistem operasi</p>
                      </div>
                      <Switch className="data-[state=checked]:bg-[#013E37]" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-800">Compact View</p>
                        <p className="text-xs text-gray-500">Tampilkan lebih banyak data di tabel</p>
                      </div>
                      <Switch className="data-[state=checked]:bg-[#013E37]" defaultChecked />
                    </div>
                  </div>
                </CardContent>
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                  <Button variant="outline">Reset Default</Button>
                  <Button className="bg-[#013E37] hover:bg-[#025C52]">Simpan Semua Pengaturan</Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Dialog -- Bab 10 gap #4: now a real create/edit form wired to
          /api/users via usersRepository, not a decorative form that just
          closed itself and showed a fake toast. */}
      <Dialog open={isUserDialogOpen} onOpenChange={(open) => { setIsUserDialogOpen(open); if (!open) { setSelectedUser(null); setUserFormData(emptyUserForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#013E37]">{selectedUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Perbarui data pengguna ini.' : 'Daftarkan anggota tim baru ke dalam sistem monitoring ini.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                placeholder="Contoh: John Doe"
                className="h-11 border-gray-200"
                value={userFormData.name}
                onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Institusi</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@onduline.co.id"
                className="h-11 border-gray-200"
                value={userFormData.email}
                onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!!selectedUser}
              />
              {selectedUser && <p className="text-[11px] text-gray-400">Email tidak dapat diubah setelah akun dibuat.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role Sistem</Label>
              <Select value={userFormData.role} onValueChange={(val) => setUserFormData(prev => ({ ...prev, role: val as UserRole }))}>
                <SelectTrigger className="h-11 border-gray-200">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{selectedUser ? 'Reset Password (opsional)' : 'Password Awal'}</Label>
              <Input
                id="password"
                type="password"
                placeholder={selectedUser ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
                className="h-11 border-gray-200"
                value={userFormData.password}
                onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>Batalkan</Button>
            <Button className="bg-[#013E37] hover:bg-[#025C52]" onClick={handleSubmitUser} disabled={saving}>
              {selectedUser ? 'Simpan Perubahan' : 'Konfirmasi & Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
