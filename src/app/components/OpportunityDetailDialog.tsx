import React from 'react';
import { 
  X, Building2, DollarSign, Calendar, User, Target, 
  CheckCircle, AlertTriangle, TrendingUp, Award, 
  Clock, Phone, Mail, MapPin, Package, Activity,
  FileText, ArrowRight, Sparkles, BarChart3, Users
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { toast } from 'sonner';
import type { Opportunity } from '@/types/opportunity';

interface OpportunityDetailDialogProps {
  open: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
}

export function OpportunityDetailDialog({ open, onClose, opportunity }: OpportunityDetailDialogProps) {
  if (!opportunity) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getStageInfo = (stage: string) => {
    const stages: Record<string, { label: string; color: string; salesStage: string }> = {
      'prospecting': { label: 'Prospecting', color: 'bg-blue-600', salesStage: 'Engage' },
      'proposal': { label: 'Proposal', color: 'bg-[#013E37]', salesStage: 'Solution' },
      'negotiation': { label: 'Negotiation', color: 'bg-orange-600', salesStage: 'Align' },
      'closed-won': { label: 'Closed Won', color: 'bg-green-600', salesStage: 'Execute' },
      'closed-lost': { label: 'Closed Lost', color: 'bg-red-600', salesStage: 'Close (Win/Loss)' }
    };
    return stages[stage] || stages['prospecting'];
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return 'text-green-600';
    if (prob >= 60) return 'text-blue-600';
    if (prob >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const stageInfo = getStageInfo(opportunity.stage);

  // Calculate days in pipeline
  const daysInPipeline = opportunity.createdDate 
    ? Math.floor((Date.now() - new Date(opportunity.createdDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Calculate days until close
  const daysUntilClose = Math.floor((new Date(opportunity.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[calc(100%-2rem)] overflow-y-auto p-0">
        <DialogDescription className="sr-only">
          Complete opportunity details including client information, products, timeline, activities, and action items for {opportunity.name}
        </DialogDescription>
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#013E37] to-[#025C52] text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">
                    {opportunity.name}
                  </DialogTitle>
                  <p className="text-white/80 text-sm">{opportunity.clientName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <Badge className={`${stageInfo.color} text-white border-0`}>
                  {stageInfo.label}
                </Badge>
                <Badge className="bg-white/20 text-white border-0">
                  {stageInfo.salesStage}
                </Badge>
                {opportunity.forecastType && (
                  <Badge className="bg-white/20 text-white border-0">
                    {opportunity.forecastType}
                  </Badge>
                )}
                {opportunity.lowHangingFruit && (
                  <Badge className="bg-yellow-500 text-white border-0">
                    🍊 Low Hanging Fruit
                  </Badge>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <p className="text-xs text-gray-600">Deal Value</p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(opportunity.totalValue)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <p className="text-xs text-gray-600">Probability</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={`text-2xl font-bold ${getProbabilityColor(opportunity.probability)}`}>
                    {opportunity.probability}%
                  </p>
                </div>
                <Progress value={opportunity.probability} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-2 border-[#C3DDD9] bg-[#EEF7F5]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-[#013E37]" />
                  <p className="text-xs text-gray-600">In Pipeline</p>
                </div>
                <p className="text-2xl font-bold text-[#013E37]">
                  {daysInPipeline} days
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <p className="text-xs text-gray-600">Expected Close</p>
                </div>
                <p className="text-sm font-bold text-orange-700">
                  {formatDate(opportunity.closeDate)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {daysUntilClose > 0 ? `${daysUntilClose} days remaining` : 'Overdue'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Information */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-[#EEF7F5] pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-blue-600" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <User className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Contact Person</p>
                    <p className="font-semibold text-gray-900">{opportunity.contactPerson}</p>
                    <p className="text-sm text-gray-600">Decision Maker</p>
                  </div>
                </div>

                {opportunity.phone && (
                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Phone</p>
                      <p className="font-semibold text-gray-900">{opportunity.phone}</p>
                    </div>
                  </div>
                )}

                {opportunity.email && (
                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <Mail className="h-5 w-5 text-[#013E37] mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Email</p>
                      <p className="font-semibold text-gray-900 text-sm">{opportunity.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                  <User className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Account Owner</p>
                    <p className="font-semibold text-gray-900">{opportunity.ownerName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products & Solution */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5 text-green-600" />
                Products & Solution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {opportunity.products && opportunity.products.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {opportunity.products.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{product.productName}</p>
                          <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Unit Price</p>
                          <p className="font-bold text-gray-900">{formatCurrency(product.unitPrice)}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="font-bold text-green-700">{formatCurrency(product.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t-2 border-[#013E37]/20">
                    <p className="text-lg font-bold text-gray-900">Total Deal Value</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(opportunity.totalValue)}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">No products added yet</p>
              )}

              {opportunity.solution && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 mb-1">💡 Solution</p>
                  <p className="text-sm text-gray-700">{opportunity.solution}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Process Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* Timeline & Maturity */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-[#EEF7F5] to-pink-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-[#013E37]" />
                  Timeline & Maturity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {opportunity.createdDate && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Created Date</span>
                    <span className="text-sm font-semibold">{formatDate(opportunity.createdDate)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Expected Close</span>
                  <span className="text-sm font-semibold">{formatDate(opportunity.closeDate)}</span>
                </div>

                {opportunity.nextFollowUpDate && (
                  <div className="flex justify-between items-center py-2 border-b bg-blue-50 px-2 rounded">
                    <span className="text-sm font-semibold text-blue-900">Next Follow-up</span>
                    <span className="text-sm font-bold text-blue-600">{formatDate(opportunity.nextFollowUpDate)}</span>
                  </div>
                )}

                {opportunity.target && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Target Quarter</span>
                    <Badge variant="outline">{opportunity.target} {opportunity.targetYear}</Badge>
                  </div>
                )}

                {opportunity.opportunityMaturity && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs font-semibold text-green-900 mb-2">Opportunity Maturity (SFT)</p>
                    <div className="flex gap-2">
                      <Badge className={opportunity.opportunityMaturity.selected ? 'bg-green-600' : 'bg-gray-400'}>
                        S - {opportunity.opportunityMaturity.selected ? '✓' : '✗'}
                      </Badge>
                      <Badge className={opportunity.opportunityMaturity.funded ? 'bg-green-600' : 'bg-gray-400'}>
                        F - {opportunity.opportunityMaturity.funded ? '✓' : '✗'}
                      </Badge>
                      <Badge className={opportunity.opportunityMaturity.timeline ? 'bg-green-600' : 'bg-gray-400'}>
                        T - {opportunity.opportunityMaturity.timeline ? '✓' : '✗'}
                      </Badge>
                    </div>
                  </div>
                )}

                {opportunity.budgetStatus && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded">
                    <p className="text-xs font-semibold text-yellow-900">Budget Status</p>
                    <Badge className="mt-1 bg-yellow-600">{opportunity.budgetStatus}</Badge>
                  </div>
                )}

                {/* FR-04: Close Reason/Detail, shown once the opportunity is Closed Won/Lost */}
                {(opportunity.stage === 'closed-won' || opportunity.stage === 'closed-lost') && (
                  <div className={`mt-2 p-2 rounded ${opportunity.stage === 'closed-won' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`text-xs font-semibold ${opportunity.stage === 'closed-won' ? 'text-green-900' : 'text-red-900'}`}>
                      Close Reason
                    </p>
                    {opportunity.closeReason ? (
                      <>
                        <Badge className={`mt-1 ${opportunity.stage === 'closed-won' ? 'bg-green-600' : 'bg-red-600'}`}>
                          {opportunity.closeReason}
                        </Badge>
                        {opportunity.closeDetail && (
                          <p className="text-xs text-gray-700 mt-1">{opportunity.closeDetail}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Belum diisi (data lama sebelum FR-04 diaktifkan)
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competitive Intelligence */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  Competitive Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {opportunity.existingSystem && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Existing System</p>
                    <p className="font-semibold text-gray-900">{opportunity.existingSystem}</p>
                  </div>
                )}

                {opportunity.competitor && (
                  <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-600">
                    <p className="text-xs text-red-900 mb-1">⚠️ Competitor</p>
                    <p className="font-semibold text-gray-900">{opportunity.competitor}</p>
                    {opportunity.competitorWebsite && (
                      <a 
                        href={opportunity.competitorWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 block"
                      >
                        {opportunity.competitorWebsite}
                      </a>
                    )}
                  </div>
                )}

                {opportunity.partnerName && (
                  <div className="bg-[#EEF7F5] p-3 rounded-lg">
                    <p className="text-xs text-[#012D29] mb-1">🤝 Partner</p>
                    <p className="font-semibold text-gray-900">{opportunity.partnerName}</p>
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-900 mb-1">📊 Source</p>
                  <Badge variant="outline">{opportunity.source}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description & Notes */}
          {(opportunity.description || opportunity.notes) && (
            <Card className="border-2 border-[#013E37]/20 bg-[#EEF7F5]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-[#013E37]" />
                  Description & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {opportunity.description && (
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Description</p>
                    <p className="text-sm text-gray-700">{opportunity.description}</p>
                  </div>
                )}
                {opportunity.notes && (
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{opportunity.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Activities */}
          {opportunity.activities && opportunity.activities.length > 0 && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-[#EEF7F5] to-blue-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-[#013E37]" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {opportunity.activities.slice(0, 5).map((activity, idx) => (
                  <div key={activity.id || idx} className="border-l-2 border-[#013E37] pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-gray-900">{activity.type}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                      {activity.createdBy && (
                        <Badge variant="outline" className="text-xs">{activity.createdBy}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-700">{activity.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-[#013E37] to-[#025C52] text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Sparkles className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => toast.success('Email template opened')}
                  className="bg-white text-[#013E37] hover:bg-[#d1fae5] h-auto py-3 flex-col items-start text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="font-bold text-sm">Send Email</span>
                  </div>
                  <span className="text-xs text-gray-600">Follow-up</span>
                </Button>

                <Button
                  onClick={() => toast.success('Call initiated')}
                  className="bg-white text-[#013E37] hover:bg-[#d1fae5] border-2 border-[#013E37]/20 h-auto py-3 flex-col items-start text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4" />
                    <span className="font-bold text-sm">Call Now</span>
                  </div>
                  <span className="text-xs text-gray-600">{opportunity.phone || 'Client'}</span>
                </Button>

                <Button
                  onClick={() => toast.success('Meeting scheduled')}
                  className="bg-white text-[#013E37] hover:bg-[#d1fae5] border-2 border-[#013E37]/20 h-auto py-3 flex-col items-start text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="font-bold text-sm">Schedule</span>
                  </div>
                  <span className="text-xs text-gray-600">Meeting</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#013E37]" />
            <p className="text-sm text-gray-600">
              Weighted Value: <span className="font-bold text-[#013E37]">
                {formatCurrency(opportunity.totalValue * opportunity.probability / 100)}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                toast.success('Opportunity updated!');
                onClose();
              }}
              className="bg-[#013E37] hover:bg-[#025C52]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Priority
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
