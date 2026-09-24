import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, TrendingUp, AlertTriangle, Clock, Zap, 
  Mail, Phone, Calendar, FileText, Award, Target, Users,
  CheckCircle, ArrowRight, Sparkles, Brain, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { getClientSegmentProfile } from '@/utils/clientSegmentTier';

interface Recommendation {
  id: string;
  type: 'urgent' | 'opportunity' | 'risk' | 'optimization';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  impact: string;
  suggestedActions: {
    label: string;
    action: string;
    icon: any;
  }[];
  daysInactive?: number;
  potentialValue?: number;
  riskLevel?: number;
}

interface AISmartRecommendationsProps {
  leadData: {
    name: string;
    organization: string;
    kategoriClient: string;
    lastContactDate?: string;
    interactionCount?: number;
    statusHubungan?: string;
    paketAktif?: string;
  };
  onActionClick?: (action: string, leadId: string) => void;
}

export function AISmartRecommendations({ leadData, onActionClick }: AISmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateRecommendations();
  }, [leadData]);

  const generateRecommendations = () => {
    setLoading(true);
    
    // Simulate AI recommendation engine
    setTimeout(() => {
      const recs: Recommendation[] = [];
      const lastContact = leadData.lastContactDate ? new Date(leadData.lastContactDate) : null;
      const daysSinceContact = lastContact 
        ? Math.floor((new Date().getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const interactions = leadData.interactionCount || 0;
      const isActiveClient = leadData.paketAktif && leadData.paketAktif !== '-';
      const segment = getClientSegmentProfile(leadData.kategoriClient);

      // 1. URGENT: Follow-up needed
      if (daysSinceContact > 3 && daysSinceContact < 30 && !isActiveClient) {
        recs.push({
          id: 'urgent-followup',
          type: 'urgent',
          priority: 'critical',
          title: '🔥 Urgent Follow-up Required',
          description: `No contact with ${leadData.organization} in ${daysSinceContact} days`,
          reasoning: `Statistical analysis shows leads not contacted within 72 hours have 47% lower closing rate. This lead is at risk of going cold.`,
          impact: `Acting now could increase closing probability by 35%`,
          suggestedActions: [
            { label: 'Call Now', action: 'call', icon: Phone },
            { label: 'Send Follow-up Email', action: 'email', icon: Mail },
            { label: 'Schedule Meeting', action: 'meeting', icon: Calendar }
          ],
          daysInactive: daysSinceContact
        });
      }

      // 2. OPPORTUNITY: Upsell potential
      if (isActiveClient && leadData.paketAktif?.toLowerCase().includes('basic')) {
        const upsellValue = segment.upsellValue;
        recs.push({
          id: 'opportunity-upsell',
          type: 'opportunity',
          priority: 'high',
          title: '💰 High-Value Upsell Opportunity',
          description: `${leadData.organization} is on basic package - upsell potential detected`,
          reasoning: `AI analysis shows similar ${leadData.kategoriClient} clients often add complementary Onduline product lines (Waterproofing, Solar, Green Roof) within 3-6 months. Current satisfaction indicators are positive.`,
          impact: `Expected additional revenue: Rp ${(upsellValue / 1000000).toFixed(0)} juta`,
          suggestedActions: [
            { label: 'Send Cross-sell Proposal', action: 'proposal-cross-sell', icon: FileText },
            { label: 'Schedule Upsell Demo', action: 'demo-upsell', icon: Target },
            { label: 'Share Success Story', action: 'case-study', icon: Award }
          ],
          potentialValue: upsellValue
        });
      }

      // 3. RISK: Cold lead warning
      if (daysSinceContact > 14 && !isActiveClient) {
        recs.push({
          id: 'risk-cold-lead',
          type: 'risk',
          priority: 'high',
          title: '⚠️ Lead Going Cold - Re-engagement Needed',
          description: `${daysSinceContact} days without activity. 68% risk of losing this opportunity`,
          reasoning: `Pattern recognition indicates leads inactive for 14+ days have 68% chance of going to competitors. Immediate re-engagement campaign recommended.`,
          impact: `Could lose potential deal worth Rp ${(segment.baseDealSize / 1000000).toFixed(0)} juta`,
          suggestedActions: [
            { label: 'Re-engagement Campaign', action: 'campaign', icon: Mail },
            { label: 'Special Offer Email', action: 'offer', icon: Award },
            { label: 'Request Feedback Call', action: 'feedback', icon: Phone }
          ],
          riskLevel: 68,
          daysInactive: daysSinceContact
        });
      }

      // 4. OPPORTUNITY: Demo conversion
      if (interactions >= 3 && interactions < 5 && !isActiveClient) {
        recs.push({
          id: 'opportunity-demo',
          type: 'opportunity',
          priority: 'high',
          title: '🎯 High Engagement - Push to Demo',
          description: `${leadData.name} shows strong interest (${interactions} interactions)`,
          reasoning: `Engagement pattern matches successful conversions. Leads with 3+ touchpoints have 73% higher demo-to-close rate when scheduled within 1 week.`,
          impact: `Optimal timing for demo - conversion probability: 73%`,
          suggestedActions: [
            { label: 'Schedule Demo ASAP', action: 'demo', icon: Calendar },
            { label: 'Send Product Video', action: 'video', icon: Target },
            { label: 'Invite to Webinar', action: 'webinar', icon: Users }
          ]
        });
      }

      // 5. OPTIMIZATION: Best time to contact
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 11) {
        recs.push({
          id: 'optimization-timing',
          type: 'optimization',
          priority: 'medium',
          title: '⏰ Optimal Contact Window - NOW',
          description: 'AI detected best time to reach decision makers in healthcare',
          reasoning: `Historical data shows ${leadData.kategoriClient} decision makers have 2.3x higher answer rate between 9-11 AM. Current time is optimal.`,
          impact: `43% higher chance of reaching decision maker right now`,
          suggestedActions: [
            { label: 'Call Immediately', action: 'call-now', icon: Phone },
            { label: 'Send Quick Email', action: 'email-now', icon: Mail }
          ]
        });
      }

      // 6. OPPORTUNITY: Territory insights
      recs.push({
        id: 'opportunity-territory',
        type: 'opportunity',
        priority: 'medium',
        title: '🗺️ Territory Intelligence',
        description: 'Competitive advantage detected in this area',
        reasoning: `Market analysis shows 3 similar ${leadData.kategoriClient} in the area recently switched to Onduline products. Low competitor presence detected.`,
        impact: `Hot market - 85% success rate in similar territories`,
        suggestedActions: [
          { label: 'Emphasize Local Success', action: 'local-case', icon: Award },
          { label: 'Offer Site Visit', action: 'site-visit', icon: Users }
        ]
      });

      // 7. RISK: Competition detected
      if (Math.random() > 0.5) {
        recs.push({
          id: 'risk-competition',
          type: 'risk',
          priority: 'medium',
          title: '🎯 Competitor Activity Detected',
          description: 'Similar vendor active in same territory',
          reasoning: `Intelligence system detected competitor mentions in nearby facilities. Proactive differentiation strategy recommended.`,
          impact: `Need to emphasize unique value propositions`,
          suggestedActions: [
            { label: 'Send Battle Card', action: 'battlecard', icon: FileText },
            { label: 'Competitive Demo', action: 'comp-demo', icon: Target },
            { label: 'Share Advantage Brief', action: 'advantage', icon: Award }
          ],
          riskLevel: 45
        });
      }

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setRecommendations(recs);
      setLoading(false);
    }, 1200);
  };

  const handleActionClick = (action: string) => {
    if (onActionClick) {
      onActionClick(action, leadData.name);
    }
    toast.success(`Action initiated: ${action}`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'from-red-500 to-orange-600';
      case 'opportunity': return 'from-green-500 to-emerald-600';
      case 'risk': return 'from-yellow-500 to-orange-500';
      case 'optimization': return 'from-blue-500 to-[#013E37]';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return Zap;
      case 'opportunity': return Lightbulb;
      case 'risk': return AlertTriangle;
      case 'optimization': return TrendingUp;
      default: return Target;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-red-600">CRITICAL</Badge>;
      case 'high': return <Badge className="bg-orange-600">HIGH</Badge>;
      case 'medium': return <Badge className="bg-yellow-600">MEDIUM</Badge>;
      default: return <Badge className="bg-gray-600">LOW</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-[#EEF7F5] to-blue-50">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <Brain className="h-12 w-12 text-[#013E37] mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🤖 AI Analyzing Opportunities...
            </h3>
            <p className="text-sm text-gray-600">
              Generating personalized recommendations based on lead behavior
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#013E37] to-[#025C52] text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">AI Smart Recommendations</h3>
              <p className="text-white/80 text-sm">
                {recommendations.length} personalized action items for {leadData.organization}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={generateRecommendations}
              className="text-white hover:bg-white/20"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      {recommendations.map((rec, index) => {
        const TypeIcon = getTypeIcon(rec.type);
        
        return (
          <Card key={rec.id} className={`border-l-4 ${
            rec.priority === 'critical' ? 'border-l-red-600 bg-red-50' :
            rec.priority === 'high' ? 'border-l-orange-600 bg-orange-50' :
            rec.priority === 'medium' ? 'border-l-yellow-600 bg-yellow-50' :
            'border-l-gray-600 bg-gray-50'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${getTypeColor(rec.type)} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{rec.title}</h4>
                      {getPriorityBadge(rec.priority)}
                    </div>
                    <p className="text-sm text-gray-700">{rec.description}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Reasoning */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-[#013E37] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">AI Reasoning:</p>
                    <p className="text-xs text-gray-600">{rec.reasoning}</p>
                  </div>
                </div>
              </div>

              {/* Impact */}
              <div className="bg-white p-3 rounded-lg border-2 border-[#013E37]/20">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Expected Impact:</p>
                    <p className="text-xs text-gray-600">{rec.impact}</p>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex gap-2 flex-wrap">
                {rec.daysInactive !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {rec.daysInactive} days inactive
                  </Badge>
                )}
                {rec.potentialValue !== undefined && (
                  <Badge variant="outline" className="text-xs bg-green-50">
                    <Award className="h-3 w-3 mr-1 text-green-600" />
                    {formatCurrency(rec.potentialValue)}
                  </Badge>
                )}
                {rec.riskLevel !== undefined && (
                  <Badge variant="outline" className="text-xs bg-yellow-50">
                    <AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
                    {rec.riskLevel}% risk
                  </Badge>
                )}
              </div>

              {/* Suggested Actions */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Suggested Actions:</p>
                <div className="flex flex-wrap gap-2">
                  {rec.suggestedActions.map((action, idx) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={idx}
                        size="sm"
                        onClick={() => handleActionClick(action.action)}
                        className="bg-[#013E37] hover:bg-[#025C52] text-xs"
                      >
                        <ActionIcon className="h-3 w-3 mr-1.5" />
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Empty State */}
      {recommendations.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All Good! 👍
            </h3>
            <p className="text-sm text-gray-600">
              No urgent actions needed. Keep up the great work!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-[#EEF7F5] border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">
                {recommendations.filter(r => r.priority === 'critical').length}
              </div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {recommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-xs text-gray-600">High Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {recommendations.filter(r => r.type === 'opportunity').length}
              </div>
              <div className="text-xs text-gray-600">Opportunities</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
