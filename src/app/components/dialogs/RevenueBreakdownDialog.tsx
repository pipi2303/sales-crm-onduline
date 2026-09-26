import React from 'react';
import { X, BarChart3, DollarSign, Building2, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { RetailMonthlyBreakdown } from '@/app/components/RetailMonthlyBreakdown';
import { formatCurrency } from '@/utils/formatters';
import { TeamMember } from './sales-dialog-types';

interface RevenueBreakdownDialogProps {
  selectedMember: TeamMember | null;
  onClose: () => void;
  tab: 'projek' | 'retail' | 'distributor';
  onTabChange: (tab: 'projek' | 'retail' | 'distributor') => void;
}

export function RevenueBreakdownDialog({
  selectedMember,
  onClose,
  tab,
  onTabChange
}: RevenueBreakdownDialogProps) {
  if (!selectedMember) return null;

  return (
    <Dialog open={!!selectedMember} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[850px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 border-none shadow-2xl flex flex-col bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Revenue Breakdown - {selectedMember.name}</DialogTitle>
          <DialogDescription>
            Detailed revenue performance analysis for {selectedMember.name} across Proyek, Retail, and Distributor segments.
          </DialogDescription>
        </DialogHeader>

        {/* Visual Header */}
        <div 
          className="sticky top-0 px-6 py-5 flex items-center justify-between z-10 shadow-md"
          style={{
            background: 'linear-gradient(to right, #013E37, #025C52, #013E37)',
          }}
        >
          <div className="flex items-center gap-3 text-white">
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm"
            >
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">
                Revenue Breakdown - {selectedMember.name}
              </h2>
              <p className="text-xs text-white/70 mt-0.5 uppercase tracking-widest font-bold">
                YTD 2025 • PERFORMANCE AUDIT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition-all text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-[#DFF0EC] bg-gradient-to-br from-[#EEF7F5] to-white shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#DFF0EC] text-[#013E37]">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue YTD</h3>
                  </div>
                  <div className="text-2xl font-black text-[#013E37]">
                    {formatCurrency(selectedMember.achievement)}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Achievement</h3>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {selectedMember.performance.toFixed(1)}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                      <Store className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Portfolio Status</h3>
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {selectedMember.totalDeals} Deals
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={(v: any) => onTabChange(v)} className="space-y-6">
            <TabsList className="h-auto bg-gray-100/80 p-1 grid grid-cols-3 gap-1 rounded-xl">
              <TabsTrigger value="projek" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg border-transparent">
                <span className="font-bold text-sm">Proyek</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">KONTRAKTOR & DEVELOPER</span>
              </TabsTrigger>
              <TabsTrigger value="retail" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg border-transparent">
                <span className="font-bold text-sm">Retail</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">PASAR RITEL</span>
              </TabsTrigger>
              <TabsTrigger value="distributor" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg border-transparent">
                <span className="font-bold text-sm">Distributor</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">JALUR DISTRIBUTOR</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projek" className="space-y-4 outline-none">
               <Card className="border border-blue-100">
                 <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                   <CardTitle className="flex items-center gap-2 text-blue-800 text-base">
                     <Building2 className="h-5 w-5" />
                     Proyek Segment Breakdown
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="pt-6">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Analisis performa pada segmen Proyek menunjukkan kontribusi yang stabil. Terdapat 12 klien aktif dengan rata-rata nilai kontrak di atas 150M.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Active Accounts</p>
                          <p className="text-xl font-black text-gray-900">12 Klien</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Segment Pipeline</p>
                          <p className="text-xl font-black text-gray-900">Rp 4.2B</p>
                        </div>
                      </div>
                    </div>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="retail" className="outline-none">
              <RetailMonthlyBreakdown 
                achievement={selectedMember.achievement}
                target={selectedMember.target}
              />
            </TabsContent>

            <TabsContent value="distributor" className="outline-none">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
                <p className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Menampilkan data performa khusus jalur Distributor untuk periode berjalan.
                </p>
              </div>
              <RetailMonthlyBreakdown 
                achievement={selectedMember.achievement}
                target={selectedMember.target}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
