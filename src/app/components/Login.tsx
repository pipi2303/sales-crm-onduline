import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { VoiceInput } from '@/app/components/VoiceInput';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fase 0 (22 Sep 2026): Quick Login and the hardcoded demoAccounts list
  // (including 5 personal accounts with plaintext passwords shipped to
  // the browser bundle -- the P0 finding in MEMORY.md) have been removed.
  // Those 5 people are now seeded as real, server-hashed accounts
  // (prisma/seed.ts) and log in through this same form like anyone else.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.error ?? 'Email atau password salah.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EEF7F5] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-6">
          <div className="space-y-4">
            <div className="inline-block p-3 bg-[#013E37] rounded-2xl shadow-xl">
              <BarChart className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-[#013E37]">
              Sales Monitoring Pro
            </h1>
            <p className="text-xl text-gray-600">
              Solusi monitoring penjualan terlengkap untuk meningkatkan performa tim sales Anda
            </p>
          </div>

          <div className="space-y-4 pt-8">
            {[
              { icon: '📊', text: 'Real-time Sales Dashboard' },
              { icon: '🎯', text: 'Lead Management System' },
              { icon: '📅', text: 'Demo Scheduler & Contract' }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-lg">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
            <div className="text-center mb-8">
              <div className="inline-block lg:hidden p-3 bg-[#013E37] rounded-2xl shadow-xl mb-4">
                <BarChart className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang</h2>
              <p className="text-gray-600">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#013E37] focus:ring-2 focus:ring-[#013E37]/10 transition-all outline-none"
                    placeholder="nama@gmail.com"
                    required
                  />
                  <VoiceInput
                    onTranscript={(text) => setEmail(text)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#013E37] focus:ring-2 focus:ring-[#013E37]/10 transition-all outline-none"
                    placeholder="Masukkan password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#013E37] hover:bg-[#025C52] text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-base"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="h-5 w-5" />
                    <span>Masuk</span>
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-gray-600">
            <p>© 2026 Sales Monitoring Pro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple BarChart icon component
function BarChart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}