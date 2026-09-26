import React, { useState } from 'react';
import { X, Edit2, FileText, User, Building2, Calendar, DollarSign, CheckCircle, Clock, Download, Share2, TrendingUp, Shield, Bell, FileSignature, GitBranch, Activity, Target, Award, AlertTriangle, Send, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Contract as ContractType } from '@/app/data/dummyData';
import { getEffectiveContractStatus } from '@/utils/formatters';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';
import { getDaysUntilExpiry, calculateRiskScore, getRiskLevelBadge, getRiskLevelColor } from '@/app/components/ContractEnhancements';

interface ContractDetailViewProps {
  contract: ContractType | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function ContractDetailView({ contract, isOpen, onClose, onEdit }: ContractDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentHealthiness, setPaymentHealthiness] = useState<'lancar' | 'macet'>('lancar');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    financial: true,
    timeline: true,
    documents: true,
  });

  if (!contract) return null;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 text-white';
      case 'pending':
        return 'bg-amber-500 text-white';
      case 'draft':
        return 'bg-gray-500 text-white';
      case 'expired':
        return 'bg-red-500 text-white';
      case 'terminated':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getDaysDifference = (start: Date, end: Date) => {
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysUntilExpiry(contract.endDate);
  const totalDays = getDaysDifference(contract.startDate, contract.endDate);
  const progressPercentage = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));
  // FIX: kontrak dgn status 'active' tapi endDate sudah lewat ditampilkan sebagai 'expired'
  const effectiveStatus = getEffectiveContractStatus(contract.status, contract.endDate);
  const riskScore = calculateRiskScore(contract);
  const riskLevel = getRiskLevelBadge(riskScore);
  const monthlyValue = contract.value / 12;

  // Mock data for timeline and activities
  const activities = [
    { date: contract.startDate, action: 'Contract Created', user: 'System', icon: FileText },
    { date: contract.startDate, action: 'Sent for Signature', user: contract.salesPerson, icon: Send },
    { date: contract.startDate, action: 'Signed by Client', user: contract.signedBy, icon: FileSignature },
    { date: contract.startDate, action: 'Contract Activated', user: 'System', icon: CheckCircle }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[1200px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Detail Kontrak {contract.contractNumber}</DialogTitle>
          <DialogDescription>
            Informasi lengkap kontrak {contract.contractNumber} untuk {contract.clientName} dari {contract.company}
          </DialogDescription>
        </VisuallyHidden>
        
        {/* HEADER */}
        <div className="relative bg-[#013E37] text-white px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{contract.contractNumber}</h2>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getStatusColor(effectiveStatus)}>
                  <span className="flex items-center gap-1.5">
                    {getStatusIcon(effectiveStatus)}
                    {effectiveStatus.toUpperCase()}
                  </span>
                </Badge>
                {contract.product && (
                  <Badge className="bg-blue-500 text-white">
                    {contract.product}
                  </Badge>
                )}
                <Badge className={`${riskLevel.color} ml-2`}>
                  Risk Score: {riskScore}
                </Badge>
              </div>
              <p className="text-white/80 text-sm">
                <Building2 className="inline-block w-4 h-4 mr-1" />
                {contract.company} • {contract.clientName}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => {
                  toast.success(`Contract ${contract.contractNumber} downloaded`);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={onEdit}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="bg-gradient-to-br from-[#EEF7F5] to-[#EEF7F5] px-6 py-5 grid grid-cols-4 gap-4 border-b border-[#013E37]/10">
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nilai Kontrak</p>
                  <p className="text-xl font-bold text-gray-900">
                    Rp {(contract.value / 1000000).toFixed(0)} Jt
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Durasi Kontrak</p>
                  <p className="text-xl font-bold text-gray-900">{Math.round(totalDays / 30)} bulan</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center ${
                  daysRemaining > 30 ? 'from-emerald-500 to-green-600' : daysRemaining > 0 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-red-600'
                }`}>
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Sisa Waktu</p>
                  <p className="text-xl font-bold text-gray-900">
                    {daysRemaining > 0 ? `${daysRemaining} hari` : 'Expired'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center ${getRiskLevelColor(riskScore)}`}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Risk Level</p>
                  <p className="text-xl font-bold text-gray-900">{riskLevel.text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PROGRESS BAR */}
        {contract.status === 'active' && (
          <div className="bg-gradient-to-br from-[#EEF7F5] to-[#EEF7F5] px-6 py-4 border-b border-[#013E37]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress Kontrak</span>
              <span className="text-sm font-bold text-[#013E37]">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#013E37] to-[#013E37] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>{contract.startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>{contract.endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}

        {/* TABS CONTENT */}
        <div className="overflow-y-auto max-h-[calc(90vh-380px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start w-full">
              <TabsTrigger value="overview" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-sm">Overview</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">RINGKASAN</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-sm">Financial</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">KEUANGAN</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-sm">Timeline</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">RIWAYAT JADWAL</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-sm">Documents</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">ARSIP DIGITAL</span>
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-sm">Actions</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">TINDAKAN</span>
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Information */}
                <Card className="bg-gradient-to-br from-blue-50 to-[#EEF7F5] border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Building2 className="w-5 h-5" />
                      Informasi Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Nama Client</p>
                        <p className="font-semibold text-gray-900">{contract.clientName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Nama Perusahaan</p>
                        <p className="font-semibold text-gray-900">{contract.company}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-600 mb-1">PIC Client</p>
                        <p className="font-semibold text-gray-900">{(contract as any).picClient || contract.signedBy}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contract Details */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <FileText className="w-5 h-5" />
                      Detail Kontrak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Nomor Kontrak</p>
                        <p className="font-semibold text-gray-900">{contract.contractNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Produk/Layanan</p>
                        <p className="font-semibold text-gray-900">{contract.product || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Signed By</p>
                        <p className="font-semibold text-gray-900">{contract.signedBy}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Sales Person</p>
                        <p className="font-semibold text-gray-900">{contract.salesPerson}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Dates */}
              <Card className="bg-gradient-to-br from-[#EEF7F5] to-pink-50 border-[#C3DDD9]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#012D29]">
                    <Calendar className="w-5 h-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Tanggal Mulai</p>
                      <p className="font-semibold text-gray-900">
                        {contract.startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Tanggal Berakhir</p>
                      <p className="font-semibold text-gray-900">
                        {contract.endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Durasi</p>
                      <p className="font-semibold text-gray-900">{totalDays} hari ({Math.round(totalDays / 30)} bulan)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Analysis */}
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-900">
                    <Shield className="w-5 h-5" />
                    Risk Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`h-16 w-16 rounded-xl bg-gradient-to-br ${getRiskLevelColor(riskScore)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-2xl">{riskScore}</span>
                    </div>
                    <div className="flex-1">
                      <Badge className={`${riskLevel.color} mb-2`}>{riskLevel.text}</Badge>
                      <p className="text-sm text-gray-600">
                        {riskScore >= 61 && 'High risk contract requires immediate attention and mitigation plan.'}
                        {riskScore >= 31 && riskScore < 61 && 'Medium risk level, monitor closely for any changes.'}
                        {riskScore < 31 && 'Low risk profile, contract is in good standing.'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-gray-700">Risk Factors:</p>
                    <ul className="space-y-1 ml-4">
                      {riskScore >= 61 && (
                        <>
                          <li className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            High value exposure detected
                          </li>
                          <li className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            Near expiry or contract expired
                          </li>
                        </>
                      )}
                      {contract.status === 'pending' && (
                        <li className="flex items-center gap-2 text-orange-600">
                          <Clock className="h-4 w-4" />
                          Awaiting signature completion
                        </li>
                      )}
                      {riskScore < 31 && (
                        <li className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          All parameters within acceptable range
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Rating & Review */}
              {(contract as any).rating > 0 && (
                <Card className={`border-2 ${
                  (contract as any).rating <= 2 
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' 
                    : (contract as any).rating === 3 
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200' 
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                }`}>
                  <CardHeader className={`border-b ${
                    (contract as any).rating <= 2 
                      ? 'bg-red-100/50 border-red-200' 
                      : (contract as any).rating === 3 
                      ? 'bg-yellow-100/50 border-yellow-200' 
                      : 'bg-green-100/50 border-green-200'
                  }`}>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Star className={`w-5 h-5 ${
                        (contract as any).rating <= 2 
                          ? 'text-red-600' 
                          : (contract as any).rating === 3 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`} />
                      Rating & Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {/* Rating Stars */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Rating</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-6 h-6 ${
                                star <= (contract as any).rating
                                  ? (contract as any).rating <= 2
                                    ? 'fill-red-500 text-red-500'
                                    : (contract as any).rating === 3
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-green-500 text-green-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-lg font-bold ${
                          (contract as any).rating <= 2 
                            ? 'text-red-600' 
                            : (contract as any).rating === 3 
                            ? 'text-yellow-600' 
                            : 'text-green-600'
                        }`}>
                          {(contract as any).rating} / 5
                        </span>
                      </div>
                    </div>

                    {/* Reviewer Info */}
                    {(contract as any).reviewerName && (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 mb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">Reviewer Name</p>
                          <p className="text-sm font-semibold text-gray-900">{(contract as any).reviewerName}</p>
                        </div>
                        {(contract as any).reviewDate && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">Review Date</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date((contract as any).reviewDate).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review Comments */}
                    {(contract as any).reviewText && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Review Comments</p>
                        <div className={`p-4 rounded-lg ${
                          (contract as any).rating <= 2 
                            ? 'bg-red-50 border border-red-100' 
                            : (contract as any).rating === 3 
                            ? 'bg-yellow-50 border border-yellow-100' 
                            : 'bg-green-50 border border-green-100'
                        }`}>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {(contract as any).reviewText}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* FINANCIAL TAB */}
            <TabsContent value="financial" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardContent className="p-3">
                    <DollarSign className="h-6 w-6 text-green-200 mb-2" />
                    <p className="text-green-100 text-[10px] mb-0.5">Total Contract Value</p>
                    <p className="text-xl font-bold">Rp {(contract.value / 1000000000).toFixed(2)} M</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#013E37] to-[#025C52] text-white">
                  <CardContent className="p-3">
                    <TrendingUp className="h-6 w-6 text-blue-200 mb-2" />
                    <p className="text-blue-100 text-[10px] mb-0.5">Monthly Recurring</p>
                    <p className="text-xl font-bold">Rp {(monthlyValue / 1000000).toFixed(1)} Jt</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#EEF7F5]0 to-pink-600 text-white">
                  <CardContent className="p-3">
                    <Target className="h-6 w-6 text-[#C3DDD9] mb-2" />
                    <p className="text-[#DFF0EC] text-[10px] mb-0.5">Payment Status</p>
                    <p className="text-xl font-bold">On Track</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Healthiness Card */}
              <Card className="bg-gradient-to-br from-[#EEF7F5] to-[#EEF7F5] border-2 border-[#013E37]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#012D29]">
                    <CheckCircle className="w-5 h-5" />
                    Payment Healthiness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">Status Kesehatan Pembayaran</p>
                      <Select
                        value={paymentHealthiness}
                        onValueChange={(value: 'lancar' | 'macet') => {
                          setPaymentHealthiness(value);
                          toast.success(`Payment status updated to: ${value === 'lancar' ? 'Lancar ✅' : 'Macet ⚠️'}`);
                        }}
                      >
                        <SelectTrigger className="w-full h-12 text-base font-semibold border-2 border-[#013E37]/30 hover:border-[#013E37] focus:ring-2 focus:ring-[#013E37]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lancar" className="text-base py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="font-semibold text-green-700">Lancar</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="macet" className="text-base py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="font-semibold text-red-700">Macet</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Visual Indicator */}
                    <div className={`h-24 w-24 rounded-2xl flex items-center justify-center ${
                      paymentHealthiness === 'lancar' 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                    }`}>
                      {paymentHealthiness === 'lancar' ? (
                        <CheckCircle className="h-12 w-12 text-white" />
                      ) : (
                        <AlertTriangle className="h-12 w-12 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Status Description */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    paymentHealthiness === 'lancar' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm font-medium ${
                      paymentHealthiness === 'lancar' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {paymentHealthiness === 'lancar' 
                        ? '✅ Pembayaran berjalan lancar tanpa tunggakan.' 
                        : '⚠️ Terdapat tunggakan pembayaran yang memerlukan tindak lanjut segera.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Annual Revenue (ARR)</span>
                      <span className="font-bold text-green-600">Rp {(contract.value / 1000000000).toFixed(2)} M</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Quarterly Revenue</span>
                      <span className="font-bold text-blue-600">Rp {(contract.value / 4 / 1000000).toFixed(0)} Jt</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Monthly Recurring (MRR)</span>
                      <span className="font-bold text-[#013E37]">Rp {(monthlyValue / 1000000).toFixed(1)} Jt</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TIMELINE TAB */}
            <TabsContent value="timeline" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Contract Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.map((activity, idx) => {
                      const IconComponent = activity.icon;
                      return (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${idx === 0 ? 'from-[#013E37] to-[#025C52]' : 'from-[#EEF7F5]0 to-pink-600'} flex items-center justify-center`}>
                              <IconComponent className="h-5 w-5 text-white" />
                            </div>
                            {idx < activities.length - 1 && (
                              <div className="w-0.5 h-8 bg-gradient-to-b from-[#5BB5AB] to-pink-300 my-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-semibold text-gray-900">{activity.action}</p>
                            <p className="text-sm text-gray-600">By {activity.user}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DOCUMENTS TAB */}
            <TabsContent value="documents" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Contract Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Main Contract Agreement.pdf', size: '2.4 MB', date: contract.startDate },
                      { name: 'Terms and Conditions.pdf', size: '1.1 MB', date: contract.startDate },
                      { name: 'Service Level Agreement.pdf', size: '890 KB', date: contract.startDate },
                      { name: 'Signed Contract.pdf', size: '2.8 MB', date: contract.startDate }
                    ].map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-600">{doc.size} • {doc.date.toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.success(`Downloading ${doc.name}`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIONS TAB */}
            <TabsContent value="actions" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  className="h-auto p-5 flex-col items-start bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  onClick={() => toast.success('Renewal process initiated')}
                >
                  <Bell className="h-6 w-6 mb-2" />
                  <span className="font-semibold text-lg">Initiate Renewal</span>
                  <span className="text-sm text-green-100">Start contract renewal process</span>
                </Button>

                <Button
                  className="h-auto p-5 flex-col items-start bg-gradient-to-r from-[#013E37] to-[#025C52] hover:bg-[#025C52] text-white"
                  onClick={() => toast.success('Amendment request created')}
                >
                  <GitBranch className="h-6 w-6 mb-2" />
                  <span className="font-semibold text-lg">Request Amendment</span>
                  <span className="text-sm text-blue-100">Modify contract terms</span>
                </Button>

                <Button
                  className="h-auto p-5 flex-col items-start bg-gradient-to-r from-[#013E37] to-[#025C52] hover:from-[#013E37] hover:to-pink-600 text-white"
                  onClick={() => toast.success('Notification sent to client')}
                >
                  <Send className="h-6 w-6 mb-2" />
                  <span className="font-semibold text-lg">Send to Client</span>
                  <span className="text-sm text-[#DFF0EC]">Email contract details</span>
                </Button>

                <Button
                  className="h-auto p-5 flex-col items-start bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  onClick={() => toast.success('Contract exported successfully')}
                >
                  <Download className="h-6 w-6 mb-2" />
                  <span className="font-semibold text-lg">Export Contract</span>
                  <span className="text-sm text-orange-100">Download PDF/Excel</span>
                </Button>
              </div>

              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Recommended Actions</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {daysRemaining <= 60 && daysRemaining > 0 && (
                          <li>• Contract expires in {daysRemaining} days - Start renewal discussions</li>
                        )}
                        {daysRemaining <= 0 && (
                          <li>• Contract has EXPIRED - Immediate renewal required</li>
                        )}
                        {contract.status === 'pending' && (
                          <li>• Contract pending signature - Send reminder to client</li>
                        )}
                        {riskScore >= 61 && (
                          <li>• High risk detected - Review risk mitigation strategies</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => toast.success('Contract shared successfully')}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success(`Contract ${contract.contractNumber} downloaded`)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              className="bg-gradient-to-r from-[#013E37] to-[#025C52] hover:from-[#013E37] hover:to-[#013E37]"
              onClick={onEdit}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Contract
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}