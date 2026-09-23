import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, Users, 
  AlertTriangle, CheckCircle, Zap, Brain, Calendar,
  Award, ArrowUpRight, ArrowDownRight, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { OpportunityDetailDialog } from '@/app/components/ai/OpportunityDetailDialog';
import { RiskDetailDialog } from '@/app/components/ai/RiskDetailDialog';
import { RecommendationDetailDialog } from '@/app/components/ai/RecommendationDetailDialog';

interface InsightData {
  revenueForecast: {
    thisMonth: number;
    nextMonth: number;
    confidence: number;
    trend: 'up' | 'down';
    change: number;
  };
  pipelineHealth: {
    score: number;
    totalDeals: number;
    totalValue: number;
    avgDealSize: number;
    conversionRate: number;
  };
  topOpportunities: {
    name: string;
    value: number;
    probability: number;
    daysInPipeline: number;
    stage: string;
  }[];
  risks: {
    type: 'critical' | 'high' | 'medium';
    title: string;
    description: string;
    impact: string;
  }[];
  recommendations: {
    category: string;
    title: string;
    impact: string;
    priority: 'critical' | 'high' | 'medium';
  }[];
  teamPerformance: {
    topPerformer: string;
    avgScore: number;
    dealsClosedThisMonth: number;
    targetAchievement: number;
  };
}

export function AIInsightsDashboard() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<{
    name: string;
    value: number;
    probability: number;
    daysInPipeline: number;
    stage: string;
  } | null>(null);
  const [showOpportunityDetail, setShowOpportunityDetail] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<{
    type: 'critical' | 'high' | 'medium';
    title: string;
    description: string;
    impact: string;
  } | null>(null);
  const [showRiskDetail, setShowRiskDetail] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<{
    category: string;
    title: string;
    impact: string;
    priority: 'critical' | 'high' | 'medium';
  } | null>(null);
  const [showRecommendationDetail, setShowRecommendationDetail] = useState(false);

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = () => {
    setLoading(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const data: InsightData = {
        revenueForecast: {
          thisMonth: 847000000,
          nextMonth: 1125000000,
          confidence: 85,
          trend: 'up',
          change: 32.8
        },
        pipelineHealth: {
          score: 78,
          totalDeals: 24,
          totalValue: 2850000000,
          avgDealSize: 118750000,
          conversionRate: 23.5
        },
        topOpportunities: [
          { name: 'Toko Bangunan Sinar Jaya', value: 285000000, probability: 87, daysInPipeline: 12, stage: 'Proposal' },
          { name: 'PT Graha Bangun Persada', value: 450000000, probability: 65, daysInPipeline: 28, stage: 'Negotiation' },
          { name: 'CV Karya Konstruksi Mandiri', value: 125000000, probability: 78, daysInPipeline: 8, stage: 'Demo' },
          { name: 'Distributor Atap Nusantara', value: 380000000, probability: 55, daysInPipeline: 45, stage: 'Proposal' },
          { name: 'Toko Bangunan Berkah Jaya', value: 95000000, probability: 82, daysInPipeline: 5, stage: 'Qualification' }
        ],
        risks: [
          {
            type: 'critical',
            title: '3 High-Value Deals Stalled',
            description: 'Distributor Atap Nusantara, CV Mitra Atap Sejahtera, and Toko Bangunan Makmur Abadi have been in pipeline for 45+ days without progress',
            impact: 'Potential loss: Rp 580 juta'
          },
          {
            type: 'high',
            title: 'Q4 Target Achievement at Risk',
            description: 'Current pace shows 78% target achievement. Need to accelerate closing rate by 28%',
            impact: 'Target gap: Rp 450 juta'
          },
          {
            type: 'medium',
            title: '5 Clients Showing Churn Signals',
            description: 'Low product usage and increased support tickets detected',
            impact: 'At-risk ARR: Rp 285 juta'
          }
        ],
        recommendations: [
          {
            category: 'Pipeline Acceleration',
            title: 'Focus on Toko Bangunan Sinar Jaya and CV Karya Konstruksi Mandiri',
            impact: 'High probability closes worth Rp 410 juta this week',
            priority: 'critical'
          },
          {
            category: 'Risk Mitigation',
            title: 'Schedule executive meetings for stalled deals',
            impact: 'Can recover 60% of at-risk pipeline (Rp 348 juta)',
            priority: 'high'
          },
          {
            category: 'Upsell Strategy',
            title: 'Target 8 existing clients for LIS module',
            impact: 'Potential expansion revenue: Rp 340 juta',
            priority: 'high'
          },
          {
            category: 'Team Optimization',
            title: 'Redistribute territory for even coverage',
            impact: 'Expected 15% increase in overall conversion rate',
            priority: 'medium'
          }
        ],
        teamPerformance: {
          topPerformer: 'Andi Wijaya',
          avgScore: 72,
          dealsClosedThisMonth: 8,
          targetAchievement: 112
        }
      };

      setInsights(data);
      setLoading(false);
    }, 1500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      default: return 'border-yellow-500 bg-yellow-50';
    }
  };

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      default: return 'text-yellow-600';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#EEF7F5] to-blue-50">
        <CardContent className="p-12 text-center">
          <div className="animate-pulse">
            <Brain className="h-16 w-16 text-[#013E37] mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              🤖 AI Analyzing Your Sales Data...
            </h3>
            <p className="text-sm text-gray-600">
              Processing pipeline, forecasting revenue, and identifying opportunities
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Opportunity Detail Dialog */}
      {selectedOpportunity && (
        <OpportunityDetailDialog
          open={showOpportunityDetail}
          onClose={() => {
            setShowOpportunityDetail(false);
            setSelectedOpportunity(null);
          }}
          opportunity={selectedOpportunity}
        />
      )}
      
      {/* Risk Detail Dialog */}
      {selectedRisk && (
        <RiskDetailDialog
          open={showRiskDetail}
          onClose={() => {
            setShowRiskDetail(false);
            setSelectedRisk(null);
          }}
          risk={selectedRisk}
        />
      )}
      
      {/* Recommendation Detail Dialog */}
      {selectedRecommendation && (
        <RecommendationDetailDialog
          open={showRecommendationDetail}
          onClose={() => {
            setShowRecommendationDetail(false);
            setSelectedRecommendation(null);
          }}
          recommendation={selectedRecommendation}
        />
      )}
      
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#013E37] to-[#025C52] text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <Brain className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">AI Insights Dashboard</h2>
              <p className="text-white/80">Powered by Predictive Analytics & Machine Learning</p>
            </div>
            <button
              onClick={generateInsights}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/70 text-xs mb-1">Pipeline Health</p>
              <p className="text-2xl font-bold">{insights.pipelineHealth.score}/100</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/70 text-xs mb-1">Active Deals</p>
              <p className="text-2xl font-bold">{insights.pipelineHealth.totalDeals}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/70 text-xs mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold">{insights.pipelineHealth.conversionRate}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white/70 text-xs mb-1">Target Achievement</p>
              <p className="text-2xl font-bold">{insights.teamPerformance.targetAchievement}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Forecast */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <TrendingUp className="h-6 w-6 text-green-600" />
            Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <p className="text-sm text-gray-600">This Month (Projected)</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">
                {formatCurrency(insights.revenueForecast.thisMonth)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-600">
                  {insights.revenueForecast.confidence}% confidence
                </Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <p className="text-sm text-gray-600">Next Month (Forecast)</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">
                {formatCurrency(insights.revenueForecast.nextMonth)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-600">
                  +{insights.revenueForecast.change}% growth
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">AI Insight:</p>
                <p className="text-sm text-gray-700">
                  You're on track for a strong month! Focus on closing Toko Bangunan Sinar Jaya (87% probability) 
                  and CV Karya Konstruksi Mandiri (78% probability) to exceed target by 15%.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-[#013E37]" />
            Top 5 Opportunities to Close This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.topOpportunities.map((opp, index) => (
              <div 
                key={index} 
                onClick={() => {
                  setSelectedOpportunity(opp);
                  setShowOpportunityDetail(true);
                }}
                className="bg-gradient-to-r from-[#EEF7F5] to-white p-4 rounded-lg border-2 border-[#013E37]/20 cursor-pointer hover:shadow-xl hover:border-[#013E37] hover:scale-[1.02] hover:bg-gradient-to-r hover:from-[#d4e9e7] hover:to-[#EEF7F5] transition-all duration-300 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-gray-900">{index + 1}. {opp.name}</span>
                      <Badge className="bg-[#013E37]">{opp.stage}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>💰 {formatCurrency(opp.value)}</span>
                      <span>📊 {opp.probability}% probability</span>
                      <span>⏱️ {opp.daysInPipeline} days in pipeline</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Close Probability</span>
                    <span className="font-semibold text-[#013E37]">{opp.probability}%</span>
                  </div>
                  <Progress value={opp.probability} className="h-2" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 <strong>AI Recommendation:</strong> Prioritize opportunities #1, #3, and #5 
              (combined 83% avg probability). Expected close value: Rp 505 juta.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Risks & Alerts */}
      <Card className="border-2 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            Risks & Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.risks.map((risk, index) => (
            <div 
              key={index} 
              onClick={() => {
                setSelectedRisk(risk);
                setShowRiskDetail(true);
              }}
              className={`p-4 rounded-lg border-2 ${getRiskColor(risk.type)} cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${getRiskIcon(risk.type)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900">{risk.title}</h4>
                    <Badge className={risk.type === 'critical' ? 'bg-red-600' : risk.type === 'high' ? 'bg-orange-600' : 'bg-yellow-600'}>
                      {risk.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{risk.description}</p>
                  <p className="text-xs font-semibold text-gray-900">
                    💥 Impact: {risk.impact}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card className="border-2 border-[#013E37] bg-[#EEF7F5]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-[#013E37]" />
            AI Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.recommendations.map((rec, index) => (
            <div 
              key={index} 
              onClick={() => {
                setSelectedRecommendation(rec);
                setShowRecommendationDetail(true);
              }}
              className="bg-white p-4 rounded-lg border-2 border-[#013E37]/20 cursor-pointer hover:shadow-xl hover:border-[#013E37] hover:scale-[1.02] hover:bg-[#f0f9f8] transition-all duration-300 active:scale-[0.98]"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-[#013E37] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                    <Badge className={
                      rec.priority === 'critical' ? 'bg-red-600' :
                      rec.priority === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                    }>
                      {rec.priority}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{rec.title}</h4>
                  <p className="text-sm text-gray-700">
                    📈 <strong>Impact:</strong> {rec.impact}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card className="bg-gradient-to-br from-[#EEF7F5] to-pink-50 border-[#C3DDD9]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#012D29]">
            <Award className="h-6 w-6 text-[#013E37]" />
            Team Performance Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#C3DDD9]">
              <p className="text-sm text-gray-600 mb-1">🏆 Top Performer</p>
              <p className="text-2xl font-bold text-gray-900">{insights.teamPerformance.topPerformer}</p>
              <p className="text-xs text-gray-500 mt-1">Leads the team in conversions</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#C3DDD9]">
              <p className="text-sm text-gray-600 mb-1">📊 Team Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">{insights.teamPerformance.avgScore}/100</p>
              <p className="text-xs text-gray-500 mt-1">Across all performance metrics</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#C3DDD9]">
              <p className="text-sm text-gray-600 mb-1">✅ Deals Closed</p>
              <p className="text-2xl font-bold text-gray-900">{insights.teamPerformance.dealsClosedThisMonth}</p>
              <p className="text-xs text-gray-500 mt-1">This month so far</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}