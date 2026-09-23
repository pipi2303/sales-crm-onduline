import React, { useState } from 'react';
import { X, Bell, Mail, Volume2, RefreshCw, Clock, Settings as SettingsIcon, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettingsType;
  onSave: (settings: NotificationSettingsType) => void;
}

export interface NotificationSettingsType {
  realTimeEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in minutes
  email: string;
  urgentSoundEnabled: boolean;
  desktopNotifications: boolean;
}

export function NotificationSettings({ isOpen, onClose, settings, onSave }: NotificationSettingsProps) {
  const [localSettings, setLocalSettings] = useState<NotificationSettingsType>(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Settings Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pengaturan Notifikasi</h2>
                <p className="text-xs text-slate-300">Kelola preferensi notifikasi Anda</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Real-time Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-[#013E37] flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Real-time Notifications</h3>
                <p className="text-sm text-gray-600">Terima notifikasi secara real-time melalui WebSocket</p>
              </div>
              <Switch
                checked={localSettings.realTimeEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, realTimeEnabled: checked })
                }
              />
            </div>
          </div>

          <div className="border-t pt-4"></div>

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Push Notifications (PWA)</h3>
                <p className="text-sm text-gray-600">Izinkan notifikasi push di browser Anda</p>
              </div>
              <Switch
                checked={localSettings.pushEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, pushEnabled: checked })
                }
              />
            </div>

            {localSettings.pushEnabled && (
              <div className="ml-13 pl-4 border-l-2 border-[#5BB5AB] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Desktop Notifications</label>
                  <Switch
                    checked={localSettings.desktopNotifications}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, desktopNotifications: checked })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4"></div>

          {/* Auto Refresh */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Auto-Refresh</h3>
                <p className="text-sm text-gray-600">Refresh otomatis untuk notifikasi baru</p>
              </div>
              <Switch
                checked={localSettings.autoRefresh}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, autoRefresh: checked })
                }
              />
            </div>

            {localSettings.autoRefresh && (
              <div className="ml-13 pl-4 border-l-2 border-green-300 space-y-3">
                <div>
                  <label className="text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Interval Refresh (menit)
                  </label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 5, 10, 15].map((min) => (
                      <button
                        key={min}
                        onClick={() =>
                          setLocalSettings({ ...localSettings, refreshInterval: min })
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          localSettings.refreshInterval === min
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4"></div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Terima notifikasi penting via email</p>
              </div>
              <Switch
                checked={localSettings.emailEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, emailEnabled: checked })
                }
              />
            </div>

            {localSettings.emailEnabled && (
              <div className="ml-13 pl-4 border-l-2 border-orange-300 space-y-3">
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">Alamat Email</label>
                  <Input
                    type="email"
                    placeholder="email@gmail.com"
                    value={localSettings.email}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, email: e.target.value })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email akan dikirim untuk notifikasi urgent dan contract expiration
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4"></div>

          {/* Sound Alerts */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Sound Alerts</h3>
                <p className="text-sm text-gray-600">Bunyi notifikasi untuk alert baru</p>
              </div>
              <Switch
                checked={localSettings.soundEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, soundEnabled: checked })
                }
              />
            </div>

            {localSettings.soundEnabled && (
              <div className="ml-13 pl-4 border-l-2 border-yellow-300 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Urgent Sound Alerts</label>
                  <Switch
                    checked={localSettings.urgentSoundEnabled}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, urgentSoundEnabled: checked })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Suara khusus untuk notifikasi urgent (kontrak expired, deal mendesak)
                </p>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Test sound
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgs7y2Ik3CBlouu3nn00QDFC');
                    audio.play();
                  }}
                  className="w-full"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Test Sound
                </Button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br bg-[#EEF7F5] rounded-xl p-4 border border-blue-200">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Tentang Notifikasi</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Real-time: Update langsung tanpa refresh manual</li>
                  <li>• Push: Notifikasi browser bahkan saat tab tidak aktif</li>
                  <li>• Email: Untuk urgent contracts & critical updates</li>
                  <li>• Sound: Alert audio untuk notifikasi penting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Pengaturan akan disimpan otomatis
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-[#013E37] to-[#025C52] hover:bg-[#025C52]"
            >
              <Check className="w-4 h-4 mr-2" />
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
