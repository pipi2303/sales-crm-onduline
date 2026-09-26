import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { 
  BarChart3, TrendingUp, DollarSign, Calendar, FileText, 
  Users, Building2, Package, CheckCircle, Clock, XCircle,
  ArrowUpRight, ArrowDownRight, Activity, PieChart, Target,
  Zap, Award, Hash, Percent, GitBranch, Calculator, 
  FileSignature, Download, Send, Eye, Edit2
} from 'lucide-react';
import { Contract as ContractType } from '@/app/data/dummyData';
import { toast } from 'sonner';
import { getDaysUntilExpiry } from '@/app/components/ContractEnhancements';

interface ContractAnalyticsProps {
  contracts: ContractType[];
}

export function ContractAnalytics({ contracts }: ContractAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate metrics
  const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);
  const activeValue = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + c.value, 0);
  const avgContractValue = totalValue / contracts.length || 0;
  const avgDuration = contracts.reduce((sum, c) => {
    const days = Math.ceil((c.endDate.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0) / contracts.length || 0;

  // Revenue by product
  const revenueByProduct = Array.from(new Set(contracts.map(c => c.product)))
    .map(product => ({
      product,
      revenue: contracts.filter(c => c.product === product).reduce((sum, c) => sum + c.value, 0),
      count: contracts.filter(c => c.product === product).length
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Contracts by status
  const statusBreakdown = [
    { status: 'active', count: contracts.filter(c => c.status === 'active').length, color: 'from-green-500 to-emerald-600' },
    { status: 'pending', count: contracts.filter(c => c.status === 'pending').length, color: 'from-yellow-500 to-orange-600' },
    { status: 'expired', count: contracts.filter(c => c.status === 'expired').length, color: 'from-red-500 to-red-600' },
    { status: 'draft', count: contracts.filter(c => c.status === 'draft').length, color: 'from-gray-500 to-gray-600' }
  ];

  // Top clients by value
  const topClients = Array.from(new Set(contracts.map(c => c.company)))
    .map(company => ({
      company,
      value: contracts.filter(c => c.company === company).reduce((sum, c) => sum + c.value, 0),
      count: contracts.filter(c => c.company === company).length
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Revenue forecast (next 12 months from renewals)
  const forecastRevenue = contracts
    .filter(c => c.status === 'active' && getDaysUntilExpiry(c.endDate) <= 365)
    .reduce((sum, c) => sum + c.value, 0);

  // Win rate
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const winRate = (activeContracts / totalContracts) * 100 || 0;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Analytics Dashboard
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="!max-w-[1200px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0">
          <DialogHeader className="bg-[#013E37] text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Contract Analytics Dashboard</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">
                  Comprehensive insights and performance metrics
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <Tabs defaultValue="overview" className="p-6">
              <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start w-full">
                <TabsTrigger value="overview" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                  <span className="font-bold text-sm">Overview</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">RINGKASAN DATA</span>
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                  <span className="font-bold text-sm">Revenue</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">ANALISIS NILAI</span>
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                  <span className="font-bold text-sm">Performance</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">HASIL KONTRAK</span>
                </TabsTrigger>
                <TabsTrigger value="forecast" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                  <span className="font-bold text-sm">Forecast</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">PROYEKSI MASA DEPAN</span>
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-[#013E37] to-[#025C52] text-white">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <DollarSign className="h-8 w-8 text-blue-200" />
                        <ArrowUpRight className="h-5 w-5 text-blue-200" />
                      </div>
                      <p className="text-blue-100 text-sm">Total Contract Value</p>
                      <p className="text-2xl font-bold mt-1">Rp {(totalValue / 1000000000).toFixed(1)} M</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="h-8 w-8 text-green-200" />
                        <Percent className="h-5 w-5 text-green-200" />
                      </div>
                      <p className="text-green-100 text-sm">Win Rate</p>
                      <p className="text-2xl font-bold mt-1">{winRate.toFixed(0)}%</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#EEF7F5]0 to-pink-600 text-white">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="h-8 w-8 text-[#C3DDD9]" />
                        <Hash className="h-5 w-5 text-[#C3DDD9]" />
                      </div>
                      <p className="text-[#DFF0EC] text-sm">Total Contracts</p>
                      <p className="text-2xl font-bold mt-1">{contracts.length}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <Target className="h-8 w-8 text-orange-200" />
                        <TrendingUp className="h-5 w-5 text-orange-200" />
                      </div>
                      <p className="text-orange-100 text-sm">Avg Contract Value</p>
                      <p className="text-2xl font-bold mt-1">Rp {(avgContractValue / 1000000).toFixed(0)} Jt</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[#013E37]" />
                      Contract Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {statusBreakdown.map(status => {
                        const percentage = (status.count / contracts.length) * 100 || 0;
                        return (
                          <div key={status.status} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 capitalize">{status.status}</span>
                              <span className="text-sm text-gray-600">{status.count} contracts • {percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`bg-gradient-to-r ${status.color} h-2.5 rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Clients */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#013E37]" />
                      Top 5 Clients by Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topClients.map((client, idx) => (
                        <Card key={client.company} className="hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${idx === 0 ? 'from-yellow-500 to-orange-600' : 'from-[#EEF7F5]0 to-[#013E37]'} flex items-center justify-center text-white font-bold`}>
                                  #{idx + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{client.company}</p>
                                  <p className="text-sm text-gray-600">{client.count} contracts</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600 text-lg">
                                  Rp {(client.value / 1000000).toFixed(0)} Jt
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* REVENUE TAB */}
              <TabsContent value="revenue" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <CardContent className="p-5">
                      <DollarSign className="h-8 w-8 text-green-200 mb-2" />
                      <p className="text-green-100 text-sm">Active Contract Revenue</p>
                      <p className="text-2xl font-bold mt-1">Rp {(activeValue / 1000000000).toFixed(2)} M</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#013E37] to-[#025C52] text-white">
                    <CardContent className="p-5">
                      <TrendingUp className="h-8 w-8 text-blue-200 mb-2" />
                      <p className="text-blue-100 text-sm">Forecasted Revenue (12m)</p>
                      <p className="text-2xl font-bold mt-1">Rp {(forecastRevenue / 1000000000).toFixed(2)} M</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-[#EEF7F5]0 to-pink-600 text-white">
                    <CardContent className="p-5">
                      <Target className="h-8 w-8 text-[#C3DDD9] mb-2" />
                      <p className="text-[#DFF0EC] text-sm">Average Deal Size</p>
                      <p className="text-2xl font-bold mt-1">Rp {(avgContractValue / 1000000).toFixed(0)} Jt</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-[#013E37]" />
                      Revenue by Product
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {revenueByProduct.map((item, idx) => {
                        const percentage = (item.revenue / totalValue) * 100;
                        return (
                          <div key={item.product} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${idx === 0 ? 'from-green-500 to-emerald-600' : 'from-[#013E37] to-[#025C52]'} flex items-center justify-center text-white font-bold text-sm`}>
                                  {idx + 1}
                                </div>
                                <span className="font-medium text-gray-900">{item.product}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  Rp {(item.revenue / 1000000).toFixed(0)} Jt
                                </p>
                                <p className="text-xs text-gray-600">{item.count} contracts • {percentage.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PERFORMANCE TAB */}
              <TabsContent value="performance" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Avg Duration</p>
                          <p className="text-lg font-bold">{Math.round(avgDuration / 30)} months</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Active Rate</p>
                          <p className="text-lg font-bold">{((activeContracts / totalContracts) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#EEF7F5]0 to-pink-600 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Clients</p>
                          <p className="text-lg font-bold">{new Set(contracts.map(c => c.company)).size}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Products</p>
                          <p className="text-lg font-bold">{new Set(contracts.map(c => c.product)).size}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-gradient-to-r bg-[#EEF7F5] border-[#C3DDD9]">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Performance Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Strong Win Rate</p>
                          <p className="text-sm text-gray-600">Your {winRate.toFixed(0)}% win rate is above industry average of 55%</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">High Contract Value</p>
                          <p className="text-sm text-gray-600">Average deal size growing 15% quarter-over-quarter</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FORECAST TAB */}
              <TabsContent value="forecast" className="space-y-6 mt-6">
                <Card className="bg-gradient-to-br from-[#013E37] to-[#025C52] text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-blue-100 text-sm">12-Month Revenue Forecast</p>
                        <p className="text-2xl font-bold mt-1">Rp {(forecastRevenue / 1000000000).toFixed(2)} M</p>
                      </div>
                      <TrendingUp className="h-12 w-12 text-blue-200" />
                    </div>
                    <p className="text-sm text-blue-100">Based on {contracts.filter(c => getDaysUntilExpiry(c.endDate) <= 365).length} contracts expiring in next 12 months</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-5">
                      <Calendar className="h-8 w-8 text-[#013E37] mb-3" />
                      <p className="text-sm text-gray-600">Renewals Q1</p>
                      <p className="text-xl font-bold mt-1">
                        {contracts.filter(c => {
                          const days = getDaysUntilExpiry(c.endDate);
                          return days > 0 && days <= 90;
                        }).length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <Calendar className="h-8 w-8 text-[#013E37] mb-3" />
                      <p className="text-sm text-gray-600">Renewals Q2-Q3</p>
                      <p className="text-xl font-bold mt-1">
                        {contracts.filter(c => {
                          const days = getDaysUntilExpiry(c.endDate);
                          return days > 90 && days <= 270;
                        }).length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <Calendar className="h-8 w-8 text-pink-600 mb-3" />
                      <p className="text-sm text-gray-600">Renewals Q4</p>
                      <p className="text-xl font-bold mt-1">
                        {contracts.filter(c => {
                          const days = getDaysUntilExpiry(c.endDate);
                          return days > 270 && days <= 365;
                        }).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
            <Button 
              variant="outline"
              onClick={() => {
                toast.success('Analytics report exported to PDF');
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
