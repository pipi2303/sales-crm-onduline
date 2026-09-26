import React, { useState, useEffect } from 'react';
import { Settings, Palette, Building2, Bell, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';

interface AppSettings {
  companyName: string;
  companyLogo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkMode: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  collaboration: {
    enabled: boolean;
    autoSave: boolean;
    showOnlineUsers: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Sales Monitoring Pro',
  companyLogo: '',
  primaryColor: '#4F46E5',
  secondaryColor: '#10B981',
  accentColor: '#F59E0B',
  darkMode: false,
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  collaboration: {
    enabled: true,
    autoSave: true,
    showOnlineUsers: true,
  },
};

const STORAGE_KEY = 'app_settings';

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Apply theme colors
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
  }, [settings.primaryColor, settings.secondaryColor, settings.accentColor]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setHasChanges(false);
    toast.success('✅ Pengaturan berhasil disimpan!');
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    setHasChanges(false);
    toast.success('✅ Pengaturan direset ke default!');
  };

  const updateSetting = (path: string, value: any) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      setHasChanges(true);
      return newSettings;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37] flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Pengaturan Aplikasi
          </h1>
          <p className="text-gray-500 mt-1">Kelola branding, tema, dan preferensi aplikasi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            <Save className="h-4 w-4" />
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start w-full lg:w-[600px]">
          <TabsTrigger value="branding" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
            <div className="flex items-center gap-1.5 justify-center">
              <Palette className="h-4 w-4" />
              <span className="font-bold text-sm">Branding</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">IDENTITAS VISUAL</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
            <div className="flex items-center gap-1.5 justify-center">
              <Bell className="h-4 w-4" />
              <span className="font-bold text-sm">Notifikasi</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">PENGATURAN ALERTA</span>
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
            <div className="flex items-center gap-1.5 justify-center">
              <Building2 className="h-4 w-4" />
              <span className="font-bold text-sm">Kolaborasi</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">KERJA SAMA TIM</span>
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identitas Perusahaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nama Perusahaan</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => updateSetting('companyName', e.target.value)}
                  placeholder="Sales Monitoring Pro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyLogo">URL Logo Perusahaan</Label>
                <Input
                  id="companyLogo"
                  value={settings.companyLogo}
                  onChange={(e) => updateSetting('companyLogo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-gray-500">
                  Masukkan URL logo perusahaan Anda (format: PNG, JPG, SVG)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warna Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Warna Utama</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      placeholder="#4F46E5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Warna Sekunder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      placeholder="#10B981"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Warna Aksen</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      placeholder="#F59E0B"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-gray-500">Aktifkan tema gelap</p>
                </div>
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => updateSetting('darkMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferensi Notifikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Terima notifikasi via email</p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => updateSetting('notifications.email', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-gray-500">Terima notifikasi push browser</p>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => updateSetting('notifications.push', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Terima notifikasi via SMS</p>
                </div>
                <Switch
                  checked={settings.notifications.sms}
                  onCheckedChange={(checked) => updateSetting('notifications.sms', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collaboration Tab */}
        <TabsContent value="collaboration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fitur Kolaborasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Multi-User Collaboration</Label>
                  <p className="text-sm text-gray-500">Aktifkan kolaborasi tim real-time</p>
                </div>
                <Switch
                  checked={settings.collaboration.enabled}
                  onCheckedChange={(checked) => updateSetting('collaboration.enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Auto Save</Label>
                  <p className="text-sm text-gray-500">Simpan perubahan secara otomatis</p>
                </div>
                <Switch
                  checked={settings.collaboration.autoSave}
                  onCheckedChange={(checked) => updateSetting('collaboration.autoSave', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Show Online Users</Label>
                  <p className="text-sm text-gray-500">Tampilkan pengguna yang sedang online</p>
                </div>
                <Switch
                  checked={settings.collaboration.showOnlineUsers}
                  onCheckedChange={(checked) =>
                    updateSetting('collaboration.showOnlineUsers', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}