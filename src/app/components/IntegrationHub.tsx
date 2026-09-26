import React, { useState } from 'react';
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  Plus, 
  Zap, 
  Mail, 
  MessageSquare, 
  DollarSign, 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCcw, 
  Search,
  Cloud,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Save,
  Trash2,
  Globe,
  Info
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  lastFired: string;
}

export function IntegrationHub() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [searchQuery, setSearchQuery] = useState('');

  // Webhooks State (CRUD)
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: '1', name: 'New Lead Notification', url: 'https://api.company.com/webhooks/leads', events: ['lead.created'], status: 'active', lastFired: '2 minutes ago' },
    { id: '2', name: 'Deal Won Alert', url: 'https://api.company.com/webhooks/deals', events: ['deal.won'], status: 'active', lastFired: '1 hour ago' },
    { id: '3', name: 'Invoice Payment Sync', url: 'https://api.company.com/webhooks/invoices', events: ['invoice.paid'], status: 'inactive', lastFired: 'Never' },
  ]);

  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookForm, setWebhookForm] = useState<Partial<Webhook>>({
    name: '',
    url: '',
    events: ['lead.created'],
    status: 'active'
  });

  const integrations = [
    { id: '1', name: 'Gmail', category: 'Email', status: 'connected', icon: Mail, color: 'text-rose-500', bgColor: 'bg-rose-50', users: 12, description: 'Sinkronisasi email dan kalender secara real-time.' },
    { id: '2', name: 'Outlook', category: 'Email', status: 'available', icon: Mail, color: 'text-blue-500', bgColor: 'bg-blue-50', users: 0, description: 'Integrasi lengkap dengan Microsoft 365.' },
    { id: '3', name: 'Slack', category: 'Communication', status: 'connected', icon: MessageSquare, color: 'text-[#EEF7F5]0', bgColor: 'bg-[#EEF7F5]', users: 15, description: 'Notifikasi deal dan kolaborasi tim.' },
    { id: '4', name: 'Microsoft Teams', category: 'Communication', status: 'available', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50', users: 0, description: 'Rapat virtual dan berbagi dokumen.' },
    { id: '5', name: 'QuickBooks', category: 'Accounting', status: 'connected', icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-50', users: 3, description: 'Automasi faktur dan pelacakan pembayaran.' },
    { id: '6', name: 'Xero', category: 'Accounting', status: 'available', icon: DollarSign, color: 'text-sky-400', bgColor: 'bg-sky-50', users: 0, description: 'Solusi akuntansi awan untuk bisnis kecil.' },
    { id: '7', name: 'Google Drive', category: 'Storage', status: 'connected', icon: FileText, color: 'text-amber-500', bgColor: 'bg-amber-50', users: 18, description: 'Penyimpanan terpusat untuk dokumen proposal.' },
    { id: '8', name: 'Dropbox', category: 'Storage', status: 'available', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50', users: 0, description: 'Berbagi file besar dengan klien dengan aman.' },
    { id: '9', name: 'Salesforce', category: 'CRM Sync', status: 'available', icon: Cloud, color: 'text-sky-500', bgColor: 'bg-sky-50', users: 0, description: 'Sinkronisasi data pelanggan dua arah.' },
    { id: '10', name: 'HubSpot', category: 'CRM Sync', status: 'available', icon: Cpu, color: 'text-orange-500', bgColor: 'bg-orange-50', users: 0, description: 'Integrasi marketing automation dan sales.' },
  ];

  const handleOpenWebhookCreate = () => {
    setEditingWebhook(null);
    setWebhookForm({ name: '', url: '', events: ['lead.created'], status: 'active' });
    setIsWebhookDialogOpen(true);
  };

  const handleOpenWebhookEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({ ...webhook });
    setIsWebhookDialogOpen(true);
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast.success('Webhook berhasil dihapus');
  };

  const handleSaveWebhook = () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast.error('Nama dan URL harus diisi');
      return;
    }

    if (editingWebhook) {
      setWebhooks(prev => prev.map(w => w.id === editingWebhook.id ? { ...w, ...webhookForm } as Webhook : w));
      toast.success('Webhook berhasil diperbarui');
    } else {
      const newWebhook: Webhook = {
        id: Math.random().toString(36).substr(2, 9),
        name: webhookForm.name || 'New Webhook',
        url: webhookForm.url || '',
        events: webhookForm.events || ['lead.created'],
        status: webhookForm.status || 'active',
        lastFired: 'Never',
      };
      setWebhooks(prev => [newWebhook, ...prev]);
      toast.success('Webhook baru berhasil didaftarkan');
    }
    setIsWebhookDialogOpen(false);
  };

  const filteredIntegrations = integrations.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'connected').length,
    activeWebhooks: webhooks.filter(w => w.status === 'active').length,
    totalUsers: integrations.reduce((sum, i) => sum + i.users, 0)
  };

  const categories = Array.from(new Set(integrations.map(i => i.category)));

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Integration Hub
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-2">
            <Layers className="h-4 w-4 text-[#013E37]" />
            Kelola ekosistem aplikasi, webhook, dan akses API dalam satu platform terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Cari integrasi..." 
              className="pl-9 w-64 bg-white border-gray-200 focus:ring-[#013E37]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleOpenWebhookCreate} className="bg-[#013E37] hover:bg-[#028076] text-white">
            <Plus className="h-4 w-4 mr-2" /> Baru
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: 'Total App', value: stats.total, sub: 'Tersedia di library', icon: Link2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Terhubung', value: stats.connected, sub: 'Koneksi aktif', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Webhooks', value: stats.activeWebhooks, sub: 'Titik akhir aktif', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pengguna', value: stats.totalUsers, sub: 'Integrasi terpakai', icon: Settings2, color: 'text-[#013E37]', bg: 'bg-[#EEF7F5]' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-all bg-white group overflow-hidden relative">
              <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform ${stat.color}`}>
                <stat.icon size={64} />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-tighter">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-3">
          <TabsTrigger 
            value="integrations" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Katalog Aplikasi</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Konektivitas 3rd Party</span>
          </TabsTrigger>
          <TabsTrigger 
            value="webhooks" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Webhooks</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Otomasi Event Real-time</span>
          </TabsTrigger>
          <TabsTrigger 
            value="api" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">API Management</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Keamanan & Akses Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {categories.map((category, catIdx) => {
            const items = filteredIntegrations.filter(i => i.category === category);
            if (items.length === 0) return null;
            
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 flex-shrink-0">
                    {category}
                  </h3>
                  <div className="h-px bg-gray-200 w-full" />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (catIdx * 0.1) + (idx * 0.05) }}
                    >
                      <Card className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border-gray-100">
                        <CardContent className="p-0">
                          <div className="p-5 flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className={`h-12 w-12 rounded-2xl ${item.bgColor} ${item.color} flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm border border-white`}>
                                <item.icon className="h-6 w-6" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="font-bold text-gray-900 group-hover:text-[#013E37] transition-colors">{item.name}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            {item.status === 'connected' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Aktif</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-50 text-gray-400 border-gray-100 px-2 py-0.5 rounded-full">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Tersedia</span>
                              </Badge>
                            )}
                          </div>
                          
                          <div className="px-5 pb-5 flex items-center justify-between border-t border-gray-50 pt-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {item.status === 'connected' ? (
                                <>
                                  <RefreshCcw className="h-3 w-3" />
                                  Synced {item.users} Users
                                </>
                              ) : (
                                <>
                                  <Database className="h-3 w-3" />
                                  Ready to link
                                </>
                              )}
                            </div>
                            
                            <Button 
                              size="sm" 
                              variant={item.status === 'connected' ? "ghost" : "default"}
                              className={item.status === 'connected' 
                                ? "text-[#013E37] hover:bg-[#EEF7F5] font-bold text-xs" 
                                : "bg-[#013E37] hover:bg-[#028076] text-white font-bold text-xs shadow-sm"
                              }
                              onClick={() => {
                                if (item.status === 'connected') {
                                  toast.success(`Mengelola integrasi ${item.name}`);
                                } else {
                                  toast.info(`Menghubungkan ke ${item.name}...`);
                                }
                              }}
                            >
                              {item.status === 'connected' ? (
                                <><Settings2 className="h-3.5 w-3.5 mr-1.5" /> Manage</>
                              ) : (
                                <><Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect</>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#EEF7F5] flex items-center justify-center text-[#013E37] border border-[#DFF0EC]">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Webhook Endpoints</h3>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">Automasi transmisi data event aplikasi secara real-time.</p>
              </div>
            </div>
            <Button onClick={handleOpenWebhookCreate} className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-widest text-[10px] px-6 h-11">
              <Plus className="h-4 w-4 mr-2" /> Add Webhook
            </Button>
          </div>

          <div className="grid gap-4">
            <AnimatePresence>
              {webhooks.map((webhook, idx) => (
                <motion.div
                  key={webhook.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all border-gray-100 overflow-hidden group bg-white relative">
                    <div className={`w-1.5 h-full absolute left-0 top-0 ${webhook.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between lg:justify-start lg:gap-4">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{webhook.name}</h3>
                            {webhook.status === 'active' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="px-3 py-0.5 rounded-full border-gray-200 text-gray-400">
                                <span className="text-[10px] font-black uppercase tracking-widest">Inactive</span>
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 group/url cursor-pointer">
                            <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl flex-1 flex items-center justify-between">
                              <code className="text-xs font-mono text-gray-600 truncate">{webhook.url}</code>
                              <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover/url:text-[#013E37] transition-colors" />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-2">Subscribed Events:</span>
                            {webhook.events.map(event => (
                              <Badge key={event} variant="secondary" className="bg-[#EEF7F5] text-[#013E37] border-[#DFF0EC] text-[10px] font-bold uppercase tracking-tight">
                                {event}
                              </Badge>
                            ))}
                            <div className="h-4 w-px bg-gray-200 mx-2 hidden lg:block" />
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <RefreshCcw className="h-3 w-3 text-emerald-500" />
                              Last: {webhook.lastFired}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex lg:flex-col gap-2 pt-4 lg:pt-0 lg:border-l lg:pl-6 border-gray-100">
                          <Button onClick={() => handleOpenWebhookEdit(webhook)} variant="outline" size="sm" className="flex-1 lg:w-32 font-bold text-[10px] uppercase tracking-widest border-gray-200 hover:bg-gray-50 h-9">
                            <Settings2 className="h-3.5 w-3.5 mr-2" /> Configure
                          </Button>
                          <Button onClick={() => handleDeleteWebhook(webhook.id)} variant="ghost" size="sm" className="flex-1 lg:w-32 font-bold text-[10px] uppercase tracking-widest text-rose-600 hover:bg-rose-50 h-9">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {webhooks.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl space-y-4">
                <Globe className="h-12 w-12 text-gray-200 mx-auto" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No webhooks configured</p>
                <Button onClick={handleOpenWebhookCreate} variant="outline" className="text-[#013E37] border-[#013E37] hover:bg-[#EEF7F5]">
                  Add your first endpoint
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="api" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-none shadow-xl bg-[#013E37] text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full -ml-32 -mb-32 blur-3xl" />
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-2xl font-black uppercase tracking-tighter">
                  <ShieldCheck className="h-6 w-6" />
                  API Security Access
                </CardTitle>
                <CardDescription className="text-white/70 font-medium uppercase tracking-widest text-[10px]">
                  Gunakan kredensial ini untuk mengautentikasi permintaan dari server Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Base Endpoint URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        value="https://api.salesmonitoring.pro/v1" 
                        readOnly 
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 font-mono text-sm"
                      />
                      <Button variant="secondary" className="bg-white hover:bg-white/90 text-[#013E37] font-black uppercase text-[10px] px-6 shadow-lg shadow-black/20">Copy</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Production API Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password" 
                        value="sk_prod_xxxxxxxxxxxxxxxxx" 
                        readOnly 
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 font-mono text-sm"
                      />
                      <Button variant="secondary" className="bg-white hover:bg-white/90 text-[#013E37] font-black uppercase text-[10px] px-6 shadow-lg shadow-black/20">Reveal</Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <Switch id="api-status" defaultChecked className="data-[state=checked]:bg-emerald-400" />
                    <div className="space-y-0.5">
                      <Label htmlFor="api-status" className="text-sm font-black uppercase tracking-tight">API Access Status</Label>
                      <p className="text-[9px] text-white/60 font-medium uppercase tracking-[0.2em]">Currently active & accepting requests</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-400 text-[#013E37] font-black uppercase tracking-widest text-[10px] py-1 px-3">ACTIVE</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#EEF7F5] text-[#013E37]">
                      <Cpu className="h-4 w-4" />
                    </div>
                    System Rate Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Requests per minute', value: '60', progress: 12 },
                    { label: 'Requests per hour', value: '1,000', progress: 45 },
                    { label: 'Daily maximum', value: '10,000', progress: 8 },
                  ].map((limit) => (
                    <div key={limit.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-400">{limit.label}</span>
                        <span className="text-[#013E37]">{limit.value}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                        <div 
                          className="h-full bg-gradient-to-r from-[#013E37] to-[#028076] rounded-full transition-all duration-1000" 
                          style={{ width: `${limit.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm flex flex-col justify-center p-8 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                  <FileText size={80} />
                </div>
                <div className="space-y-2 text-center relative z-10">
                  <h4 className="text-lg font-black uppercase tracking-tight text-gray-900">Developer Docs</h4>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Baca dokumentasi lengkap integrasi API kami untuk membangun ekstensi kustom.</p>
                </div>
                <div className="space-y-3 relative z-10">
                  <Button variant="outline" className="w-full border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5] font-black uppercase tracking-widest text-[10px] h-11">
                    View Documentation
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Button>
                  <Button variant="ghost" className="w-full text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px] h-11">
                    Regenerate Key
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Webhook CRUD Dialog */}
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent className="max-w-lg border-none shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#013E37]">
              {editingWebhook ? 'Configure Webhook' : 'New Webhook'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Set up real-time event notifications to your server
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Endpoint Name</Label>
              <Input 
                value={webhookForm.name}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Production CRM Sync" 
                className="h-12 border-gray-200 focus:ring-[#013E37] font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Target URL</Label>
              <Input 
                value={webhookForm.url}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.yourdomain.com/webhooks" 
                className="h-12 border-gray-200 focus:ring-[#013E37] font-mono text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Events to Subscribe</Label>
              <div className="grid grid-cols-2 gap-3">
                {['lead.created', 'opportunity.won', 'deal.lost', 'contract.signed', 'invoice.paid', 'task.overdue'].map(event => (
                  <div key={event} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-transparent hover:border-[#DFF0EC] transition-all cursor-pointer group">
                    <Switch 
                      id={event}
                      checked={webhookForm.events?.includes(event)}
                      onCheckedChange={(checked) => {
                        setWebhookForm(prev => ({
                          ...prev,
                          events: checked 
                            ? [...(prev.events || []), event]
                            : prev.events?.filter(e => e !== event)
                        }));
                      }}
                    />
                    <Label htmlFor={event} className="text-[10px] font-bold uppercase tracking-tight text-gray-600 group-hover:text-[#013E37] transition-colors cursor-pointer">
                      {event.replace('.', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#013E37]/5 rounded-2xl border border-[#013E37]/10">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border border-[#013E37]/10 shadow-sm">
                  <Info className="h-4 w-4 text-[#013E37]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-tight text-[#013E37]">Webhook Status</p>
                  <p className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">Toggle endpoint availability</p>
                </div>
              </div>
              <Switch 
                checked={webhookForm.status === 'active'}
                onCheckedChange={(checked) => setWebhookForm(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button variant="outline" onClick={() => setIsWebhookDialogOpen(false)} className="font-bold uppercase tracking-widest text-[10px] h-11 px-6">
              Cancel
            </Button>
            <Button onClick={handleSaveWebhook} className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-widest text-[10px] px-10 h-11 shadow-lg shadow-[#013E37]/20">
              <Save className="h-3.5 w-3.5 mr-2" /> {editingWebhook ? 'Update Webhook' : 'Activate Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
