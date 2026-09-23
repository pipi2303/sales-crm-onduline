import React from 'react';
import { 
  X, AlertTriangle, TrendingDown, Target, Calendar, 
  Users, DollarSign, Clock, CheckCircle, Lightbulb,
  ArrowRight, Zap, Shield, Activity
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { toast } from 'sonner';

interface RiskDetail {
  type: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  impact: string;
}

interface RiskDetailDialogProps {
  open: boolean;
  onClose: () => void;
  risk: RiskDetail | null;
}

export function RiskDetailDialog({ open, onClose, risk }: RiskDetailDialogProps) {
  if (!risk) return null;

  // Generate detailed data based on risk type
  const getDetailedData = () => {
    if (risk.title.includes('Stalled')) {
      return {
        overview: {
          totalDeals: 3,
          totalValue: 580000000,
          avgDaysStalled: 47,
          riskLevel: 'Critical - Immediate Action Required'
        },
        affectedDeals: [
          {
            name: 'RS Mitra Sejahtera',
            value: 380000000,
            daysInPipeline: 45,
            stage: 'Proposal',
            lastActivity: '18 Jan 2026',
            blocker: 'Waiting for budget approval from Board'
          },
          {
            name: 'RS Sentosa',
            value: 125000000,
            daysInPipeline: 52,
            stage: 'Negotiation',
            lastActivity: '12 Jan 2026',
            blocker: 'Price negotiation - competing with Averin'
          },
          {
            name: 'Klinik Prima',
            value: 75000000,
            daysInPipeline: 44,
            stage: 'Demo',
            lastActivity: '15 Jan 2026',
            blocker: 'Decision maker changed - need re-engagement'
          }
        ],
        rootCauses: [
          'Extended decision-making cycles due to budget constraints',
          'Competitive pressure leading to prolonged negotiations',
          'Changes in client organizational structure'
        ],
        recommendations: [
          {
            action: 'Schedule executive-level meetings with Board members',
            priority: 'Critical',
            impact: 'Can accelerate decision by 2-3 weeks',
            owner: 'Sales Manager'
          },
          {
            action: 'Offer limited-time pricing incentive (5% discount)',
            priority: 'High',
            impact: 'Expected to close 2 out of 3 deals',
            owner: 'Account Manager'
          },
          {
            action: 'Provide competitor comparison and ROI analysis',
            priority: 'High',
            impact: 'Strengthen value proposition',
            owner: 'Sales Engineer'
          },
          {
            action: 'Arrange reference site visits to similar hospitals',
            priority: 'Medium',
            impact: 'Build confidence and urgency',
            owner: 'Account Manager'
          }
        ],
        timeline: {
          detected: '20 Jan 2026',
          nextReview: '27 Jan 2026',
          criticalDate: '15 Feb 2026'
        }
      };
    } else if (risk.title.includes('Target')) {
      return {
        overview: {
          currentAchievement: 78,
          targetGap: 450000000,
          daysRemaining: 7,
          riskLevel: 'High - Aggressive Action Needed'
        },
        metrics: [
          {
            metric: 'Current Monthly Revenue',
            current: '847 juta',
            target: '1.3 miliar',
            gap: '453 juta',
            percentage: 65
          },
          {
            metric: 'Deals Closed',
            current: '8 deals',
            target: '12 deals',
            gap: '4 deals',
            percentage: 67
          },
          {
            metric: 'Average Deal Size',
            current: '105.8 juta',
            target: '108.3 juta',
            gap: '2.5 juta',
            percentage: 98
          }
        ],
        rootCauses: [
          'Slower than expected close rates in Q4',
          'Two major deals pushed to next month',
          'Lower conversion rate from demo to proposal stage (18% vs target 25%)'
        ],
        recommendations: [
          {
            action: 'Focus all efforts on 5 high-probability deals (>80%)',
            priority: 'Critical',
            impact: 'Can add Rp 410 juta to monthly revenue',
            owner: 'All Sales Team'
          },
          {
            action: 'Offer year-end promotion for deals closed by Jan 31',
            priority: 'Critical',
            impact: 'Create urgency, expected 3-4 additional closes',
            owner: 'Sales Director'
          },
          {
            action: 'Accelerate proposal delivery for qualified leads',
            priority: 'High',
            impact: 'Reduce sales cycle by 1 week',
            owner: 'Sales Operations'
          },
          {
            action: 'Daily pipeline review and deal coaching sessions',
            priority: 'High',
            impact: 'Improve close rate by 10-15%',
            owner: 'Sales Manager'
          }
        ],
        timeline: {
          detected: '22 Jan 2026',
          nextReview: 'Daily until month end',
          criticalDate: '31 Jan 2026'
        }
      };
    } else {
      return {
        overview: {
          affectedClients: 5,
          atRiskARR: 285000000,
          avgHealthScore: 42,
          riskLevel: 'Medium - Proactive Intervention Required'
        },
        affectedClients: [
          {
            name: 'Klinik Sinar Sehat',
            arr: 72000000,
            healthScore: 38,
            churnSignals: ['Low login frequency', '3 unresolved tickets'],
            lastEngagement: '15 days ago'
          },
          {
            name: 'RS Sentosa Medika',
            arr: 95000000,
            healthScore: 45,
            churnSignals: ['Feature adoption <30%', 'Support escalation'],
            lastEngagement: '22 days ago'
          },
          {
            name: 'Klinik Prima Care',
            arr: 48000000,
            healthScore: 40,
            churnSignals: ['Decreased usage', 'Budget review meeting scheduled'],
            lastEngagement: '10 days ago'
          },
          {
            name: 'RS Harapan Baru',
            arr: 38000000,
            healthScore: 44,
            churnSignals: ['Low NPS score (4)', 'Exploring competitors'],
            lastEngagement: '18 days ago'
          },
          {
            name: 'PT Kontraktor Bangun Persada',
            arr: 32000000,
            healthScore: 48,
            churnSignals: ['Keterlambatan pembayaran', 'Kontrak mendekati masa perpanjangan'],
            lastEngagement: '8 days ago'
          }
        ],
        rootCauses: [
          'Insufficient onboarding and training',
          'Low feature adoption and product engagement',
          'Slow response time to support tickets'
        ],
        recommendations: [
          {
            action: 'Schedule health check meetings with all 5 clients',
            priority: 'High',
            impact: 'Identify pain points and show commitment',
            owner: 'Customer Success'
          },
          {
            action: 'Provide personalized training on underutilized features',
            priority: 'High',
            impact: 'Increase product stickiness and value perception',
            owner: 'Customer Success'
          },
          {
            action: 'Fast-track resolution of outstanding support tickets',
            priority: 'Medium',
            impact: 'Improve satisfaction scores',
            owner: 'Support Team'
          },
          {
            action: 'Offer early renewal incentives (10% discount)',
            priority: 'Medium',
            impact: 'Lock in revenue and reduce churn risk',
            owner: 'Account Manager'
          }
        ],
        timeline: {
          detected: '18 Jan 2026',
          nextReview: '1 Feb 2026',
          criticalDate: 'Various renewal dates in Feb-Mar 2026'
        }
      };
    }
  };

  const detailedData = getDetailedData();

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[calc(100%-2rem)] overflow-y-auto p-0">
        <DialogDescription className="sr-only">
          Detailed risk analysis and action plan for {risk.title}
        </DialogDescription>
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#013E37] to-[#025C52] text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-12 w-12 rounded-lg ${getRiskColor(risk.type)} flex items-center justify-center`}>
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">
                    {risk.title}
                  </DialogTitle>
                  <p className="text-white/80 text-sm">Risk Analysis & Action Plan</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <Badge className={`${getRiskColor(risk.type)} text-white border-0`}>
                  {risk.type.toUpperCase()} PRIORITY
                </Badge>
                <Badge className="bg-white/20 text-white border-0">
                  AI-Generated Insights
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
          <Card className="border-2 border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-red-900">
                <Shield className="h-5 w-5 text-red-600" />
                Risk Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {risk.title.includes('Stalled') && (
                  <>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Affected Deals</p>
                      <p className="text-2xl font-bold text-red-700">{detailedData.overview.totalDeals}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Total Value at Risk</p>
                      <p className="text-xl font-bold text-red-700">Rp {(detailedData.overview.totalValue / 1000000).toFixed(0)}M</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Avg Days Stalled</p>
                      <p className="text-2xl font-bold text-red-700">{detailedData.overview.avgDaysStalled}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Risk Level</p>
                      <Badge className="bg-red-600 text-white mt-1">Critical</Badge>
                    </div>
                  </>
                )}
                {risk.title.includes('Target') && (
                  <>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Current Achievement</p>
                      <p className="text-2xl font-bold text-orange-700">{detailedData.overview.currentAchievement}%</p>
                      <Progress value={detailedData.overview.currentAchievement} className="h-2 mt-2" />
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Target Gap</p>
                      <p className="text-xl font-bold text-orange-700">Rp {(detailedData.overview.targetGap / 1000000).toFixed(0)}M</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Days Remaining</p>
                      <p className="text-2xl font-bold text-orange-700">{detailedData.overview.daysRemaining}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Risk Level</p>
                      <Badge className="bg-orange-600 text-white mt-1">High</Badge>
                    </div>
                  </>
                )}
                {risk.title.includes('Churn') && (
                  <>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Affected Clients</p>
                      <p className="text-2xl font-bold text-yellow-700">{detailedData.overview.affectedClients}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">At-Risk ARR</p>
                      <p className="text-xl font-bold text-yellow-700">Rp {(detailedData.overview.atRiskARR / 1000000).toFixed(0)}M</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Avg Health Score</p>
                      <p className="text-2xl font-bold text-yellow-700">{detailedData.overview.avgHealthScore}/100</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Risk Level</p>
                      <Badge className="bg-yellow-600 text-white mt-1">Medium</Badge>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-sm font-semibold text-gray-900 mb-1">Description:</p>
                <p className="text-sm text-gray-700">{risk.description}</p>
                <p className="text-sm font-semibold text-red-700 mt-2">
                  💥 {risk.impact}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Affected Items Details */}
          {detailedData.affectedDeals && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Affected Deals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {detailedData.affectedDeals.map((deal, idx) => (
                  <div key={idx} className="border-l-4 border-red-500 bg-gray-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{deal.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{deal.stage}</Badge>
                          <span className="text-xs text-gray-600">In pipeline: {deal.daysInPipeline} days</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">Rp {(deal.value / 1000000).toFixed(0)}M</p>
                        <p className="text-xs text-gray-600">Last activity: {deal.lastActivity}</p>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 rounded">
                      <p className="text-xs font-semibold text-yellow-900">🚧 Blocker:</p>
                      <p className="text-sm text-gray-700">{deal.blocker}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Metrics (for Target risk) */}
          {detailedData.metrics && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-[#EEF7F5] pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-blue-600" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {detailedData.metrics.map((metric, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{metric.metric}</p>
                      <Badge className={metric.percentage >= 90 ? 'bg-green-600' : metric.percentage >= 70 ? 'bg-yellow-600' : 'bg-red-600'}>
                        {metric.percentage}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-600">Current</p>
                        <p className="font-bold text-gray-900">{metric.current}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Target</p>
                        <p className="font-bold text-gray-900">{metric.target}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Gap</p>
                        <p className="font-bold text-red-700">{metric.gap}</p>
                      </div>
                    </div>
                    <Progress value={metric.percentage} className="h-2 mt-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Affected Clients (for Churn risk) */}
          {detailedData.affectedClients && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-yellow-600" />
                  Affected Clients
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {detailedData.affectedClients.map((client, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-500 bg-gray-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{client.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${client.healthScore < 40 ? 'bg-red-600' : 'bg-yellow-600'} text-white`}>
                            Health Score: {client.healthScore}/100
                          </Badge>
                          <span className="text-xs text-gray-600">Last engagement: {client.lastEngagement}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">Rp {(client.arr / 1000000).toFixed(0)}M ARR</p>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-red-50 rounded">
                      <p className="text-xs font-semibold text-red-900">⚠️ Churn Signals:</p>
                      <ul className="text-sm text-gray-700 mt-1 space-y-1">
                        {client.churnSignals.map((signal, sidx) => (
                          <li key={sidx} className="flex items-center gap-2">
                            <span className="text-red-500">•</span>
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Root Causes */}
          <Card className="border-2 border-[#C3DDD9] bg-[#EEF7F5]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[#012D29]">
                <TrendingDown className="h-5 w-5 text-[#013E37]" />
                Root Causes Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detailedData.rootCauses.map((cause, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg">
                  <div className="h-6 w-6 rounded-full bg-[#013E37] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-sm text-gray-700">{cause}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="border-2 border-[#013E37] bg-[#EEF7F5]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-[#013E37]" />
                AI-Recommended Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailedData.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-[#013E37]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <p className="font-bold text-gray-900">{rec.action}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-600">Expected Impact</p>
                          <p className="font-semibold text-green-700">{rec.impact}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Owner</p>
                          <p className="font-semibold text-gray-900">{rec.owner}</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => toast.success(`Action assigned to ${rec.owner}`)}
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

          {/* Timeline */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-gray-600" />
                Timeline & Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Risk Detected</p>
                  <p className="font-semibold text-gray-900">{detailedData.timeline.detected}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Next Review</p>
                  <p className="font-semibold text-gray-900">{detailedData.timeline.nextReview}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Critical Date</p>
                  <p className="font-semibold text-red-700">{detailedData.timeline.criticalDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-gray-600">AI confidence: <span className="font-bold">92%</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                toast.success('Action plan created and assigned to team!');
                onClose();
              }}
              className="bg-[#013E37] hover:bg-[#025C52]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Action Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
