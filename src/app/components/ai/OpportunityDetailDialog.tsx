import React, { useState } from 'react';
import { 
  X, TrendingUp, DollarSign, Calendar, Clock, Target, 
  CheckCircle, AlertTriangle, Mail, Phone, FileText, 
  User, Building2, MapPin, Award, Zap, Sparkles,
  ArrowRight, BarChart3, Activity
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { toast } from 'sonner';
import { AIEmailGenerator } from '@/app/components/ai/AIEmailGenerator';

interface OpportunityDetail {
  name: string;
  value: number;
  probability: number;
  daysInPipeline: number;
  stage: string;
  clientInfo?: {
    category: string;
    picName: string;
    picTitle: string;
    phone: string;
    email: string;
    location: string;
    projectArea: number;
  };
  dealInfo?: {
    package: string;
    modules: string[];
    competitors: string[];
    decisionMaker: string;
    budget: string;
  };
  timeline?: {
    firstContact: string;
    lastActivity: string;
    nextFollowUp: string;
    expectedClose: string;
  };
  activities?: {
    date: string;
    type: string;
    description: string;
    outcome: string;
  }[];
  nextSteps?: string[];
  risks?: string[];
  strengths?: string[];
}

interface OpportunityDetailDialogProps {
  open: boolean;
  onClose: () => void;
  opportunity: {
    name: string;
    value: number;
    probability: number;
    daysInPipeline: number;
    stage: string;
  };
}

export function OpportunityDetailDialog({ open, onClose, opportunity }: OpportunityDetailDialogProps) {
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  
  // Generate detailed data based on opportunity
  const getDetailedData = (): OpportunityDetail => {
    const isProject = !opportunity.name.includes('Toko');
    const projectArea = opportunity.value > 400000000 ? 2500 : opportunity.value > 250000000 ? 1500 : 800;
    
    return {
      ...opportunity,
      clientInfo: {
        category: isProject ? 'Kontraktor / Proyek' : 'Toko Bangunan',
        picName: isProject ? 'Bpk. Sarwono, S.T.' : 'Ibu Ratna Kusuma',
        picTitle: isProject ? 'Project Manager' : 'Pemilik & Direktur',
        phone: '+62 812-3456-7890',
        email: `pic@${opportunity.name.toLowerCase().replace(/\s+/g, '')}.com`,
        location: isProject ? 'Jakarta Selatan' : 'Tangerang',
        projectArea
      },
      dealInfo: {
        package: projectArea > 1500 ? 'Enterprise (2500 m²)' : projectArea > 800 ? 'Professional (1500 m²)' : 'Standard (800 m²)',
        modules: ['Onduline Classic', 'Waterproofing', 'Paket Aksesoris & Talang', isProject ? 'Panel Surya (Solar)' : 'Green Roof'].filter(Boolean),
        competitors: ['Aspal Shingle Bekasi', 'Bitumen Nusantara', 'None detected'].slice(0, Math.floor(Math.random() * 2) + 1),
        decisionMaker: isProject ? 'Board of Directors' : 'Owner',
        budget: opportunity.value > 300000000 ? 'Confirmed & Allocated' : 'In Discussion'
      },
      timeline: {
        firstContact: new Date(Date.now() - opportunity.daysInPipeline * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
        nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
        expectedClose: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')
      },
      activities: [
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
          type: 'Demo Presentation',
          description: 'Product demo completed for purchasing team and site supervisor',
          outcome: 'Positive - requested technical documentation'
        },
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
          type: 'Site Visit',
          description: 'Visited project site and met with decision makers',
          outcome: 'Very positive - budget discussion scheduled'
        },
        {
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
          type: 'Initial Meeting',
          description: 'First discovery call to understand requirements',
          outcome: 'Qualified - high interest level'
        }
      ],
      nextSteps: [
        'Send technical proposal with pricing breakdown',
        'Schedule meeting with Board of Directors',
        'Arrange reference site visit to similar project',
        'Prepare contract draft and SLA document'
      ],
      risks: opportunity.probability < 70 ? [
        'High competition from Averin with lower pricing',
        'Decision timeline may extend to next quarter',
        'Technical team requires additional training commitment'
      ] : [
        'Minor concerns about implementation timeline'
      ],
      strengths: [
        'Strong relationship with decision maker',
        'Budget confirmed and allocated',
        'Current system causing major pain points',
        opportunity.probability > 80 ? 'CEO personally interested in our solution' : 'Technical team impressed with demo'
      ]
    };
  };

  const detailedData = getDetailedData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'proposal': return 'bg-blue-600';
      case 'negotiation': return 'bg-orange-600';
      case 'demo': return 'bg-[#013E37]';
      case 'qualification': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return 'text-green-600';
    if (prob >= 60) return 'text-blue-600';
    if (prob >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <>
      <AIEmailGenerator 
        open={showEmailGenerator}
        onClose={() => setShowEmailGenerator(false)}
        recipientName={detailedData.clientInfo?.picName}
        recipientOrg={opportunity.name}
        context={`Stage: ${opportunity.stage}, Value: ${formatCurrency(opportunity.value)}, Probability: ${opportunity.probability}%`}
      />

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[calc(100%-2rem)] overflow-y-auto p-0">
          <DialogDescription className="sr-only">
            Complete opportunity details including client information, deal information, timeline, activities, strengths, risks, and action items for {opportunity.name}
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
                    <p className="text-white/80 text-sm">{detailedData.clientInfo?.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                  <Badge className={`${getStageColor(opportunity.stage)} text-white`}>
                    {opportunity.stage}
                  </Badge>
                  <Badge className="bg-white/20 text-white">
                    {detailedData.clientInfo?.projectArea} m²
                  </Badge>
                  <Badge className="bg-white/20 text-white">
                    {detailedData.clientInfo?.location}
                  </Badge>
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
                    {formatCurrency(opportunity.value)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <p className="text-xs text-gray-600">Close Probability</p>
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
                    {opportunity.daysInPipeline} days
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
                    {detailedData.timeline?.expectedClose}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Client Information */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-[#EEF7F5] pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-blue-600" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <User className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Decision Maker</p>
                      <p className="font-semibold text-gray-900">{detailedData.clientInfo?.picName}</p>
                      <p className="text-sm text-gray-600">{detailedData.clientInfo?.picTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Contact</p>
                      <p className="font-semibold text-gray-900">{detailedData.clientInfo?.phone}</p>
                      <p className="text-sm text-gray-600">{detailedData.clientInfo?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <MapPin className="h-5 w-5 text-[#013E37] mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Location</p>
                      <p className="font-semibold text-gray-900">{detailedData.clientInfo?.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <Building2 className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Project Size</p>
                      <p className="font-semibold text-gray-900">{detailedData.clientInfo?.projectArea} m²</p>
                      <p className="text-sm text-gray-600">{detailedData.clientInfo?.category}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal Information */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-green-600" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Package</p>
                    <Badge className="bg-[#013E37]">{detailedData.dealInfo?.package}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Budget Status</p>
                    <Badge className={detailedData.dealInfo?.budget.includes('Confirmed') ? 'bg-green-600' : 'bg-yellow-600'}>
                      {detailedData.dealInfo?.budget}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Included Modules</p>
                  <div className="flex flex-wrap gap-2">
                    {detailedData.dealInfo?.modules.map((module, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                        {module}
                      </Badge>
                    ))}
                  </div>
                </div>

                {detailedData.dealInfo?.competitors && detailedData.dealInfo.competitors.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Competitors</p>
                    <div className="flex flex-wrap gap-2">
                      {detailedData.dealInfo.competitors.map((comp, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-red-50">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              {/* Timeline */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-[#EEF7F5] to-pink-50 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-[#013E37]" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">First Contact</span>
                    <span className="text-sm font-semibold">{detailedData.timeline?.firstContact}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Last Activity</span>
                    <span className="text-sm font-semibold">{detailedData.timeline?.lastActivity}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b bg-blue-50 px-2 rounded">
                    <span className="text-sm font-semibold text-blue-900">Next Follow-up</span>
                    <span className="text-sm font-bold text-blue-600">{detailedData.timeline?.nextFollowUp}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-green-50 px-2 rounded">
                    <span className="text-sm font-semibold text-green-900">Expected Close</span>
                    <span className="text-sm font-bold text-green-600">{detailedData.timeline?.expectedClose}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-orange-600" />
                    Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {detailedData.activities?.map((activity, idx) => (
                    <div key={idx} className="border-l-2 border-[#013E37] pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-gray-900">{activity.type}</p>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{activity.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {activity.outcome}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Risks */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-green-900">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detailedData.strengths?.map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{strength}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-yellow-900">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Risks to Monitor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detailedData.risks?.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{risk}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Next Steps */}
            <Card className="border-2 border-[#013E37] bg-[#EEF7F5]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-[#013E37]" />
                  Next Steps & Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detailedData.nextSteps?.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-[#013E37] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{step}</span>
                    <ArrowRight className="h-4 w-4 text-[#013E37]" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-r from-[#013E37] to-[#025C52] text-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Sparkles className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      setShowEmailGenerator(true);
                    }}
                    className="bg-white text-[#059669] hover:bg-[#d1fae5] h-auto py-4 flex-col items-start text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-5 w-5" />
                      <span className="font-bold">Send Follow-up Email</span>
                    </div>
                    <span className="text-xs text-gray-600">AI-generated personalized email</span>
                  </Button>

                  <Button
                    onClick={() => toast.success('Call initiated (Demo mode)')}
                    className="bg-white text-[#013E37] hover:bg-[#d1fae5] border-2 border-[#013E37]/20 h-auto py-4 flex-col items-start text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-5 w-5" />
                      <span className="font-bold">Call Now</span>
                    </div>
                    <span className="text-xs text-gray-600">{detailedData.clientInfo?.phone}</span>
                  </Button>

                  <Button
                    onClick={() => toast.success('Proposal generated (Demo mode)')}
                    className="bg-white text-[#013E37] hover:bg-[#d1fae5] border-2 border-[#013E37]/20 h-auto py-4 flex-col items-start text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-5 w-5" />
                      <span className="font-bold">Generate Proposal</span>
                    </div>
                    <span className="text-xs text-gray-600">Custom pricing & features</span>
                  </Button>

                  <Button
                    onClick={() => toast.success('Meeting scheduled (Demo mode)')}
                    className="bg-white text-[#013E37] hover:bg-[#d1fae5] border-2 border-[#013E37]/20 h-auto py-4 flex-col items-start text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-5 w-5" />
                      <span className="font-bold">Schedule Meeting</span>
                    </div>
                    <span className="text-xs text-gray-600">With decision makers</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t bg-white p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                toast.success('Opportunity marked as priority!');
                onClose();
              }}
              className="bg-[#013E37] hover:bg-[#025C52]"
            >
              <Award className="h-4 w-4 mr-2" />
              Mark as Priority
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}