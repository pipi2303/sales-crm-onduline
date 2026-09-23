import React from 'react';
import { 
  X, Zap, Target, Users, TrendingUp, DollarSign, 
  Calendar, CheckCircle, ArrowRight, Lightbulb,
  Award, Clock, BarChart3, Activity, Sparkles,
  AlertTriangle, Brain, Rocket
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { toast } from 'sonner';

interface Recommendation {
  category: string;
  title: string;
  impact: string;
  priority: 'critical' | 'high' | 'medium';
}

interface RecommendationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  recommendation: Recommendation | null;
}

export function RecommendationDetailDialog({ open, onClose, recommendation }: RecommendationDetailDialogProps) {
  if (!recommendation) return null;

  // Generate detailed data based on recommendation type
  const getDetailedData = () => {
    if (recommendation.category === 'Pipeline Acceleration') {
      return {
        overview: {
          priority: 'Critical',
          expectedImpact: 410000000,
          successProbability: 85,
          timeframe: '7 days',
          effortLevel: 'High'
        },
        targetDeals: [
          {
            name: 'RS Permata Bunda',
            value: 285000000,
            probability: 87,
            stage: 'Proposal',
            daysInPipeline: 12,
            nextAction: 'Send final proposal with ROI analysis',
            expectedClose: '28 Jan 2026'
          },
          {
            name: 'Klinik Sehat Prima',
            value: 125000000,
            probability: 78,
            stage: 'Demo',
            daysInPipeline: 8,
            nextAction: 'Schedule contract negotiation meeting',
            expectedClose: '30 Jan 2026'
          }
        ],
        actionPlan: [
          {
            step: 'Prioritize daily check-ins with both decision makers',
            owner: 'Account Manager',
            deadline: '25 Jan 2026',
            status: 'pending'
          },
          {
            step: 'Prepare customized ROI analysis and case studies',
            owner: 'Sales Engineer',
            deadline: '26 Jan 2026',
            status: 'pending'
          },
          {
            step: 'Arrange executive sponsor call if needed',
            owner: 'Sales Director',
            deadline: '27 Jan 2026',
            status: 'pending'
          },
          {
            step: 'Fast-track contract review and approval process',
            owner: 'Sales Operations',
            deadline: '29 Jan 2026',
            status: 'pending'
          }
        ],
        metrics: {
          currentMonthRevenue: 847000000,
          targetRevenue: 1300000000,
          gapClosure: 32,
          confidenceLevel: 85
        },
        successFactors: [
          'Both deals have confirmed budgets',
          'Decision makers are actively engaged',
          'Strong competitive positioning',
          'Urgent business need identified'
        ],
        risks: [
          'Compressed timeline may cause delays',
          'Both deals closing simultaneously may strain implementation team'
        ]
      };
    } else if (recommendation.category === 'Risk Mitigation') {
      return {
        overview: {
          priority: 'High',
          expectedImpact: 348000000,
          successProbability: 60,
          timeframe: '14 days',
          effortLevel: 'Medium'
        },
        targetDeals: [
          {
            name: 'RS Mitra Sejahtera',
            value: 380000000,
            probability: 55,
            stage: 'Proposal',
            daysInPipeline: 45,
            nextAction: 'Schedule executive-level meeting with Board',
            expectedClose: '10 Feb 2026'
          },
          {
            name: 'RS Sentosa',
            value: 125000000,
            probability: 48,
            stage: 'Negotiation',
            daysInPipeline: 52,
            nextAction: 'Address pricing concerns with discount offer',
            expectedClose: '15 Feb 2026'
          },
          {
            name: 'Klinik Prima',
            value: 75000000,
            probability: 42,
            stage: 'Demo',
            daysInPipeline: 44,
            nextAction: 'Re-engage with new decision maker',
            expectedClose: '12 Feb 2026'
          }
        ],
        actionPlan: [
          {
            step: 'Schedule C-level meetings for all stalled deals',
            owner: 'Sales Manager',
            deadline: '28 Jan 2026',
            status: 'pending'
          },
          {
            step: 'Prepare executive summary and business case documents',
            owner: 'Sales Engineer',
            deadline: '27 Jan 2026',
            status: 'pending'
          },
          {
            step: 'Get approval for limited-time pricing incentives',
            owner: 'Sales Director',
            deadline: '26 Jan 2026',
            status: 'pending'
          },
          {
            step: 'Conduct competitive analysis and positioning',
            owner: 'Product Marketing',
            deadline: '29 Jan 2026',
            status: 'pending'
          }
        ],
        metrics: {
          stalledDeals: 3,
          totalValue: 580000000,
          avgDaysStalled: 47,
          recoveryRate: 60
        },
        successFactors: [
          'Strong initial interest from all prospects',
          'No major technical objections',
          'Clear pain points identified',
          'Existing relationships with key stakeholders'
        ],
        risks: [
          'Budget cycles may force delay to Q2',
          'Competitive pressure intensifying',
          'Decision maker changes causing re-qualification'
        ]
      };
    } else if (recommendation.category === 'Upsell Strategy') {
      return {
        overview: {
          priority: 'High',
          expectedImpact: 340000000,
          successProbability: 70,
          timeframe: '30 days',
          effortLevel: 'Medium'
        },
        targetClients: [
          {
            name: 'Toko Bangunan Makmur Jaya',
            currentARR: 95000000,
            upsellValue: 48000000,
            healthScore: 87,
            tenure: '18 months',
            modules: ['Program Loyalitas Distributor', 'Analitik Penjualan Lanjutan'],
            reason: 'Volume order tinggi, masih proses manual'
          },
          {
            name: 'Klinik Bunda Care',
            currentARR: 72000000,
            upsellValue: 38000000,
            healthScore: 82,
            tenure: '24 months',
            modules: ['LIS Integration', 'Telemedicine'],
            reason: 'Expanding services, needs automation'
          },
          {
            name: 'RS Mitra Medika',
            currentARR: 120000000,
            upsellValue: 65000000,
            healthScore: 90,
            tenure: '12 months',
            modules: ['LIS Integration', 'Radiology PACS'],
            reason: 'New radiology department opening'
          }
        ],
        actionPlan: [
          {
            step: 'Conduct business review meetings with all 8 target clients',
            owner: 'Customer Success',
            deadline: '5 Feb 2026',
            status: 'pending'
          },
          {
            step: 'Create personalized LIS module demonstrations',
            owner: 'Sales Engineer',
            deadline: '8 Feb 2026',
            status: 'pending'
          },
          {
            step: 'Prepare bundled pricing proposals with discount',
            owner: 'Sales Operations',
            deadline: '10 Feb 2026',
            status: 'pending'
          },
          {
            step: 'Share success stories from similar upsell clients',
            owner: 'Account Manager',
            deadline: '12 Feb 2026',
            status: 'pending'
          }
        ],
        metrics: {
          targetClients: 8,
          avgHealthScore: 85,
          avgTenure: 18,
          conversionRate: 65
        },
        successFactors: [
          'High satisfaction with current product',
          'Clear use cases for LIS module identified',
          'Strong relationships with decision makers',
          'Budget available for expansion'
        ],
        risks: [
          'Some clients may delay due to implementation bandwidth',
          'Competitive offers may emerge during sales cycle'
        ]
      };
    } else {
      return {
        overview: {
          priority: 'Medium',
          expectedImpact: 15,
          successProbability: 75,
          timeframe: '60 days',
          effortLevel: 'Low'
        },
        analysis: {
          currentCoverage: 'Uneven distribution across territories',
          topTerritory: '85% quota achievement',
          bottomTerritory: '42% quota achievement',
          opportunityGap: 'Jakarta Selatan underserved'
        },
        actionPlan: [
          {
            step: 'Analyze territory performance and account distribution',
            owner: 'Sales Operations',
            deadline: '1 Feb 2026',
            status: 'pending'
          },
          {
            step: 'Identify high-potential accounts in underserved areas',
            owner: 'Sales Manager',
            deadline: '5 Feb 2026',
            status: 'pending'
          },
          {
            step: 'Propose territory reallocation plan to leadership',
            owner: 'Sales Director',
            deadline: '10 Feb 2026',
            status: 'pending'
          },
          {
            step: 'Implement changes and monitor early results',
            owner: 'Sales Operations',
            deadline: '20 Feb 2026',
            status: 'pending'
          }
        ],
        metrics: {
          territories: 5,
          avgCoverage: 68,
          expectedIncrease: 15,
          timeToImpact: '60 days'
        },
        successFactors: [
          'Clear performance disparity identified',
          'Untapped opportunities in key markets',
          'Team willing to adapt to changes'
        ],
        risks: [
          'Transition period may temporarily affect performance',
          'Resistance to territory changes from team members'
        ]
      };
    }
  };

  const detailedData = getDetailedData();

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[calc(100%-2rem)] overflow-y-auto p-0">
        <DialogDescription className="sr-only">
          Detailed strategic recommendation including overview, action plan, metrics, and success factors for {recommendation.title}
        </DialogDescription>
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#013E37] to-[#025C52] text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-12 w-12 rounded-lg ${getPriorityColor(recommendation.priority)} flex items-center justify-center`}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">
                    {recommendation.title}
                  </DialogTitle>
                  <p className="text-white/80 text-sm">Strategic Recommendation Details</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <Badge className="bg-white/20 text-white border-0">
                  {recommendation.category}
                </Badge>
                <Badge className={`${getPriorityColor(recommendation.priority)} text-white border-0`}>
                  {recommendation.priority.toUpperCase()} PRIORITY
                </Badge>
                <Badge className="bg-white/20 text-white border-0">
                  <Brain className="h-3 w-3 mr-1" />
                  AI-Generated
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
          {/* Overview Summary */}
          <Card className="border-2 border-[#013E37] bg-[#EEF7F5]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-[#013E37]" />
                Recommendation Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Expected Impact</p>
                  {typeof detailedData.overview.expectedImpact === 'number' && detailedData.overview.expectedImpact > 1000000 ? (
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(detailedData.overview.expectedImpact)}
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-green-700">+{detailedData.overview.expectedImpact}%</p>
                  )}
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Success Probability</p>
                  <p className="text-2xl font-bold text-blue-700">{detailedData.overview.successProbability}%</p>
                  <Progress value={detailedData.overview.successProbability} className="h-2 mt-1" />
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Timeframe</p>
                  <p className="text-2xl font-bold text-[#013E37]">{detailedData.overview.timeframe}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Effort Level</p>
                  <Badge className={
                    detailedData.overview.effortLevel === 'High' ? 'bg-red-600' :
                    detailedData.overview.effortLevel === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'
                  }>
                    {detailedData.overview.effortLevel}
                  </Badge>
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg">
                <p className="text-sm font-semibold text-gray-900 mb-1">Impact Summary:</p>
                <p className="text-sm text-gray-700">{recommendation.impact}</p>
              </div>
            </CardContent>
          </Card>

          {/* Target Deals/Clients */}
          {detailedData.targetDeals && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-[#EEF7F5] pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-blue-600" />
                  Target Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {detailedData.targetDeals.map((deal, idx) => (
                  <div key={idx} className="border-l-4 border-[#013E37] bg-gray-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{deal.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{deal.stage}</Badge>
                          <Badge className="bg-green-600 text-white text-xs">
                            {deal.probability}% probability
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(deal.value)}</p>
                        <p className="text-xs text-gray-600">{deal.daysInPipeline} days in pipeline</p>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-xs font-semibold text-blue-900">🎯 Next Action:</p>
                      <p className="text-sm text-gray-700">{deal.nextAction}</p>
                      <p className="text-xs text-gray-600 mt-1">Expected close: {deal.expectedClose}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Target Clients (for Upsell) */}
          {detailedData.targetClients && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-green-600" />
                  Target Clients for Upsell
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {detailedData.targetClients.slice(0, 3).map((client, idx) => (
                  <div key={idx} className="border-l-4 border-green-600 bg-gray-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{client.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-green-600 text-white text-xs">
                            Health: {client.healthScore}/100
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {client.tenure} tenure
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Current ARR</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(client.currentARR)}</p>
                        <p className="text-sm text-green-700 font-semibold">+{formatCurrency(client.upsellValue)} potential</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs font-semibold text-blue-900">📦 Suggested Modules:</p>
                        <div className="flex gap-1 mt-1">
                          {client.modules.map((module, midx) => (
                            <Badge key={midx} variant="outline" className="text-xs">{module}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="p-2 bg-yellow-50 rounded">
                        <p className="text-xs font-semibold text-yellow-900">💡 Reason:</p>
                        <p className="text-sm text-gray-700">{client.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {detailedData.targetClients.length > 3 && (
                  <p className="text-sm text-gray-600 text-center pt-2">
                    + {detailedData.targetClients.length - 3} more clients identified
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          {detailedData.metrics && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-[#EEF7F5] to-pink-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-[#013E37]" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(detailedData.metrics).map(([key, value], idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {typeof value === 'number' && value > 1000000 
                          ? formatCurrency(value)
                          : typeof value === 'number' && key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage') || key.toLowerCase().includes('score')
                          ? `${value}%`
                          : value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Plan */}
          <Card className="border-2 border-[#013E37] bg-[#EEF7F5]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="h-5 w-5 text-[#013E37]" />
                Detailed Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailedData.actionPlan.map((action, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-[#013E37]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded-full bg-[#013E37] text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="font-bold text-gray-900">{action.step}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm ml-8">
                        <div>
                          <p className="text-xs text-gray-600">Owner</p>
                          <p className="font-semibold text-gray-900">{action.owner}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Deadline</p>
                          <p className="font-semibold text-orange-700">{action.deadline}</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => toast.success(`Task assigned to ${action.owner}`)}
                      className="ml-4 bg-[#013E37] hover:bg-[#025C52]"
                    >
                      Assign
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            {/* Success Factors */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-green-900">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Success Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detailedData.successFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{factor}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Risks */}
            <Card className="border-2 border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-yellow-900">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Potential Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detailedData.risks.map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{risk}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-gray-600">AI confidence: <span className="font-bold">{detailedData.overview.successProbability}%</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                toast.success('Action plan created and team members notified!');
                onClose();
              }}
              className="bg-[#013E37] hover:bg-[#025C52]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Execute Action Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
