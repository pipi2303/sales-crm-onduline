import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, DollarSign, Clock, Zap, AlertTriangle,
  CheckCircle, XCircle, Sparkles, Brain, BarChart3, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { getClientSegmentProfile, hasExistingVendorSignal } from '@/utils/clientSegmentTier';

interface LeadScoringFactors {
  segmentSize: number;
  budgetConfirmed: number;
  decisionMakerAccess: number;
  engagementLevel: number;
  competitionLevel: number;
  timeline: number;
  painPointSeverity: number;
}

interface AILeadScore {
  totalScore: number;
  closingProbability: number;
  predictedDealSize: number;
  estimatedClosingDays: number;
  scoreBreakdown: LeadScoringFactors;
  riskFactors: string[];
  strengths: string[];
  recommendations: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface AILeadScoringProps {
  leadData: {
    name: string;
    organization: string;
    kategoriClient: string;
    vendorSebelumnya?: string;
    budgetStatus?: string;
    lastContactDate?: string;
    interactionCount?: number;
    hasMetDecisionMaker?: boolean;
  };
}

export function AILeadScoring({ leadData }: AILeadScoringProps) {
  const [aiScore, setAiScore] = useState<AILeadScore | null>(null);
  const [calculating, setCalculating] = useState(true);

  useEffect(() => {
    calculateLeadScore();
  }, [leadData]);

  const calculateLeadScore = () => {
    setCalculating(true);
    
    // Simulate AI scoring algorithm
    setTimeout(() => {
      const segment = getClientSegmentProfile(leadData.kategoriClient);
      const hasVendorSignal = hasExistingVendorSignal(leadData.vendorSebelumnya);
      const isBudgetConfirmed = leadData.budgetStatus?.toLowerCase().includes('confirmed') || false;
      const hasMetDM = leadData.hasMetDecisionMaker || false;
      const interactions = leadData.interactionCount || 0;
      
      // Calculate scoring factors
      const factors: LeadScoringFactors = {
        segmentSize: segment.tierScore, // Max 25 points -- Onduline kategori_client tier (see clientSegmentTier.ts)
        budgetConfirmed: isBudgetConfirmed ? 25 : 8, // 25 or 8 points
        decisionMakerAccess: hasMetDM ? 20 : 5, // 20 or 5 points
        engagementLevel: Math.min(interactions * 3, 15), // Max 15 points
        // 10-15 if vendor_sebelumnya signals an existing competitor/vendor
        // relationship, 5-10 otherwise -- still randomized within the band
        // (demo-grade estimate), but no longer pure noise.
        competitionLevel: hasVendorSignal ? Math.floor(Math.random() * 5) + 10 : Math.floor(Math.random() * 5) + 5,
        timeline: Math.floor(Math.random() * 10) + 5, // 5-15 points
        painPointSeverity: Math.floor(Math.random() * 10) + 5 // 5-15 points
      };

      const totalScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
      const closingProbability = Math.min((totalScore / 100) * 100, 95);
      
      // Predict deal size based on Onduline business segment (kategori_client)
      const predictedDealSize = segment.baseDealSize * (1 + (totalScore / 500));
      
      // Estimate closing time
      const baseClosingDays = 45;
      const closingDaysReduction = (totalScore / 100) * 20;
      const estimatedClosingDays = Math.max(baseClosingDays - closingDaysReduction, 15);

      // Identify risks and strengths
      const riskFactors: string[] = [];
      const strengths: string[] = [];
      
      if (!isBudgetConfirmed) riskFactors.push('Budget not yet confirmed');
      if (!hasMetDM) riskFactors.push('Decision maker not yet met');
      if (interactions < 3) riskFactors.push('Low engagement level');
      if (factors.competitionLevel > 10) riskFactors.push('High competition detected');
      
      if (isBudgetConfirmed) strengths.push('Budget confirmed and allocated');
      if (hasMetDM) strengths.push('Direct access to decision maker');
      if (interactions >= 5) strengths.push('High engagement and interest');
      if (segment.tierScore >= 18) strengths.push(`${leadData.kategoriClient} segment -- high deal-size potential`);

      // Generate recommendations
      const recommendations: string[] = [];
      if (!hasMetDM) recommendations.push('Schedule meeting with decision maker ASAP');
      if (!isBudgetConfirmed) recommendations.push('Discuss budget and get confirmation in writing');
      if (interactions < 3) recommendations.push('Increase touchpoints - schedule demo or site visit');
      if (closingProbability > 70) recommendations.push('Fast-track to proposal stage');
      if (factors.competitionLevel > 10) recommendations.push('Emphasize competitive advantages and unique features');

      // Determine priority
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (totalScore >= 80) priority = 'critical';
      else if (totalScore >= 65) priority = 'high';
      else if (totalScore >= 45) priority = 'medium';

      setAiScore({
        totalScore,
        closingProbability,
        predictedDealSize,
        estimatedClosingDays,
        scoreBreakdown: factors,
        riskFactors,
        strengths,
        recommendations,
        priority
      });
      
      setCalculating(false);
    }, 1500);
  };

  if (calculating) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-[#EEF7F5]">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <Brain className="h-12 w-12 text-[#013E37] mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🤖 AI Analyzing Lead...
            </h3>
            <p className="text-sm text-gray-600">
              Calculating closing probability and deal predictions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!aiScore) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* AI Score Header */}
      <Card className="bg-gradient-to-br from-[#013E37] to-[#025C52] text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">AI Lead Score</h3>
                <Badge className={`${getPriorityColor(aiScore.priority)} text-white`}>
                  {aiScore.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <p className="text-white/80 text-sm">
                Powered by machine learning predictive analytics
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">{aiScore.totalScore}/100</div>
              <div className="text-white/70 text-xs">Overall Score</div>
            </div>
            <div className="text-center border-l border-r border-white/20">
              <div className="text-4xl font-bold mb-1">{aiScore.closingProbability.toFixed(0)}%</div>
              <div className="text-white/70 text-xs">Close Probability</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{aiScore.estimatedClosingDays}d</div>
              <div className="text-white/70 text-xs">Est. Close Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predicted Deal Value */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Predicted Deal Size</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(aiScore.predictedDealSize)}
                </p>
              </div>
            </div>
            <Badge className="bg-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              High Value
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-[#013E37]" />
            Scoring Factors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(aiScore.scoreBreakdown).map(([key, value]) => {
            const maxPoints = key === 'segmentSize' || key === 'budgetConfirmed' ? 25 : key === 'decisionMakerAccess' ? 20 : 15;
            const percentage = (value / maxPoints) * 100;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
            
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className={`text-sm font-semibold ${getScoreColor(percentage)}`}>
                    {value.toFixed(0)}/{maxPoints} pts
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Strengths */}
      {aiScore.strengths.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-green-900">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiScore.strengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{strength}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {aiScore.riskFactors.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiScore.riskFactors.map((risk, index) => (
              <div key={index} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{risk}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="border-2 border-[#013E37] bg-[#EEF7F5]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-[#013E37]" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiScore.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#013E37]/20">
              <div className="h-6 w-6 rounded-full bg-[#013E37] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {index + 1}
              </div>
              <span className="text-sm text-gray-700 flex-1">{rec}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Urgency Indicator */}
      {aiScore.priority === 'critical' && (
        <Card className="bg-gradient-to-r from-red-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 animate-pulse" />
              <div>
                <p className="font-bold">🚨 URGENT ACTION REQUIRED</p>
                <p className="text-sm text-white/90">
                  This is a hot lead with {aiScore.closingProbability.toFixed(0)}% closing probability. 
                  Take immediate action to secure this deal!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
