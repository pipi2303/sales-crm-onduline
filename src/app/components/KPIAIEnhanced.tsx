import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';
import { Textarea } from '@/app/components/ui/textarea';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Separator } from '@/app/components/ui/separator';
import { AchievementBadge } from '@/app/components/AchievementBadge';
import { RevenueDetailDialog } from '@/app/components/RevenueDetailDialog';
import { DealsDetailDialog } from '@/app/components/DealsDetailDialog';
import { ConversionDetailDialog } from '@/app/components/ConversionDetailDialog';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity, 
  Edit, 
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Zap,
  Brain,
  Sparkles,
  TrendingDown,
  Lightbulb,
  Bell,
  MessageSquare,
  LineChart,
  AlertTriangle,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  BookOpen,
  Target as TargetIcon,
  Rocket,
  Star,
  ThumbsUp,
  Eye,
  Download,
  Filter,
  Search,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  FileText as FilePdf,
  Share2,
  Mail,
  MessageCircle,
  CalendarDays
} from 'lucide-react';
import { 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { CHART_PRIMARY, CHART_COLORS, CHART_GRID, CHART_MUTED_TEXT, AREA_GRADIENT_STOPS, CHART_TOOLTIP_STYLE } from '@/styles/chartTheme';
import { toast } from 'sonner';
import { employeesRepository } from '@/services/employeesRepository';
import { KPITargetData, AIInsight, AIRecommendation, AIPrediction, AIAlert, Manager } from '@/types/kpi-enhanced';
import { getKPITargets, updateKPITarget, saveKPITargets } from '@/utils/kpiPersistence';
import { KPI_MANAGERS } from '@/data/kpi-managers';
import { exportKPIToExcel, exportKPIToPDF, exportSingleKPIToPDF } from '@/utils/exportUtils';

export function KPIAIEnhanced() {
  const [targets, setTargets] = useState<KPITargetData[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<KPITargetData | null>(null);
  const [selectedPeriodType, setSelectedPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-01');
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', message: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('analytics');
  
  // Detail Dialog states
  const [revenueDetailOpen, setRevenueDetailOpen] = useState(false);
  const [selectedEmployeeForRevenue, setSelectedEmployeeForRevenue] = useState<string>('');
  const [dealsDetailOpen, setDealsDetailOpen] = useState(false);
  const [selectedEmployeeForDeals, setSelectedEmployeeForDeals] = useState<string>('');
  const [conversionDetailOpen, setConversionDetailOpen] = useState(false);
  const [selectedEmployeeForConversion, setSelectedEmployeeForConversion] = useState<string>('');
  
  // Summary Modal state
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedTargetForSummary, setSelectedTargetForSummary] = useState<KPITargetData | null>(null);
  const [exportDateRange, setExportDateRange] = useState<{from: string, to: string}>({
    from: '2026-01',
    to: '2026-12'
  });

  const getTrendData = (target: KPITargetData) => {
    if (!target) return [];
    
    // Filter targets for the same employee to get real historical data
    const employeeHistory = targets
      .filter(t => t.employeeId === target.employeeId && t.periodType === 'monthly')
      .sort((a, b) => a.period.localeCompare(b.period));

    if (employeeHistory.length > 0) {
      return employeeHistory.map(t => {
        const monthName = new Date(t.period + '-01').toLocaleString('default', { month: 'short' });
        return {
          name: monthName,
          revenue: t.revenueActual,
          deals: t.dealsActual,
          target: t.revenueTarget,
          period: t.period
        };
      });
    }

    // Fallback mock if no history found
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    const baseValue = target.revenueActual;
    const baseDeals = target.dealsActual;
    
    return months.map((month, i) => {
      const multiplier = 0.8 + (Math.random() * 0.4);
      return {
        name: month,
        revenue: Math.round(baseValue * (0.6 + (i * 0.1)) * multiplier),
        deals: Math.round(baseDeals * (0.5 + (i * 0.1)) * multiplier),
        target: target.revenueTarget,
      };
    });
  };

  const handleShareReport = (target: KPITargetData, method: 'whatsapp' | 'email') => {
    const reportTitle = `Performance Report - ${target.employeeName} (${target.period})`;
    const message = `Halo, berikut adalah ringkasan performa KPI untuk ${target.employeeName} periode ${target.period}. \n\nRevenue: ${formatCurrency(target.revenueActual)} (${calculateProgress(target.revenueActual, target.revenueTarget).toFixed(1)}%)\nDeals: ${target.dealsActual}/${target.dealsTarget}\n\nLaporan lengkap telah diekspor ke format PDF.`;
    
    if (method === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      const url = `mailto:?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
    toast.success(`Membuka ${method === 'whatsapp' ? 'WhatsApp' : 'Email'} untuk berbagi laporan.`);
  };

  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string | null>(null);
  const [managers, setManagers] = useState<Manager[]>(KPI_MANAGERS);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    period: '2025-01',
    periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    revenueTarget: 0,
    dealsTarget: 0,
    activitiesTarget: 0,
    conversionRateTarget: 0,
    meetingsTarget: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employeesResult] = await Promise.all([
        employeesRepository.getAll(),
      ]);

      if (employeesResult.success && employeesResult.data) {
        const salesEmployees = employeesResult.data.filter((emp: any) => 
          emp.divisi === 'Sales & Marketing' || emp.jabatan?.toLowerCase().includes('sales')
        );
        setEmployees(salesEmployees);
      }

      // Load from persistence instead of generating mock data
      const loadedTargets = getKPITargets();
      setTargets(loadedTargets);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // AI Functions
  const generateAIInsights = (target: KPITargetData): AIInsight[] => {
    const insights: AIInsight[] = [];
    const revenueProgress = calculateProgress(target.revenueActual, target.revenueTarget);
    const dealsProgress = calculateProgress(target.dealsActual, target.dealsTarget);
    const conversionProgress = calculateProgress(target.conversionRateActual, target.conversionRateTarget);

    // Revenue insight
    if (revenueProgress < 70) {
      insights.push({
        id: '1',
        type: 'warning',
        title: 'Revenue Below Target',
        message: `Revenue is at ${revenueProgress.toFixed(0)}%, which is ${(100 - revenueProgress).toFixed(0)}% below target. This requires immediate attention.`,
        impact: 'high',
        confidence: 85,
        suggestions: [
          'Focus on high-value opportunities (Rp 500M+)',
          'Accelerate deals in negotiation stage',
          'Consider upselling to existing clients'
        ],
        timestamp: new Date().toISOString()
      });
    } else if (revenueProgress > 100) {
      insights.push({
        id: '1',
        type: 'success',
        title: 'Exceeding Revenue Target',
        message: `Outstanding performance! You've achieved ${revenueProgress.toFixed(0)}% of revenue target.`,
        impact: 'high',
        confidence: 95,
        suggestions: [
          'Maintain current momentum',
          'Share best practices with team',
          'Consider stretch goals for next period'
        ],
        timestamp: new Date().toISOString()
      });
    }

    // Conversion rate insight
    if (conversionProgress < 80) {
      insights.push({
        id: '2',
        type: 'warning',
        title: 'Conversion Rate Needs Improvement',
        message: `Your conversion rate is at ${target.conversionRateActual.toFixed(1)}%, below the ${target.conversionRateTarget}% target.`,
        impact: 'medium',
        confidence: 78,
        suggestions: [
          'Review and improve proposal quality',
          'Follow up within 24-48 hours',
          'Address common objections proactively'
        ],
        timestamp: new Date().toISOString()
      });
    }

    // Deals insight
    if (dealsProgress > 90) {
      insights.push({
        id: '3',
        type: 'success',
        title: 'Strong Deal Performance',
        message: `You're at ${dealsProgress.toFixed(0)}% of your deals target with ${target.dealsActual} deals closed.`,
        impact: 'high',
        confidence: 92,
        suggestions: [
          'Continue current approach',
          'Focus on deal size optimization',
          'Mentor team members on your techniques'
        ],
        timestamp: new Date().toISOString()
      });
    }

    return insights;
  };

  const generateAIRecommendations = (target: KPITargetData): AIRecommendation[] => {
    const recommendations: AIRecommendation[] = [];
    const overallProgress = calculateOverallProgress(target);

    if (overallProgress < 80) {
      recommendations.push({
        id: '1',
        priority: 1,
        title: 'Close High-Value Opportunities',
        description: 'Focus on your top 3 pipeline opportunities with the highest probability of closing this month.',
        expectedImpact: '+Rp 450M revenue, +25% towards target',
        successProbability: 78,
        actionItems: [
          'Schedule demo calls with decision makers',
          'Send personalized proposals by end of week',
          'Offer limited-time incentives (5-7% discount)',
          'Follow up every 2-3 days'
        ],
        estimatedTime: '2-3 weeks'
      });

      recommendations.push({
        id: '2',
        priority: 2,
        title: 'Optimize Follow-up Strategy',
        description: 'Improve response times and follow-up frequency to increase conversion rate.',
        expectedImpact: '+12% conversion rate',
        successProbability: 85,
        actionItems: [
          'Set up automated follow-up reminders',
          'Create email templates for common scenarios',
          'Follow up within 24 hours of initial contact',
          'Use multi-channel approach (email, phone, LinkedIn)'
        ],
        estimatedTime: '1 week'
      });
    }

    recommendations.push({
      id: '3',
      priority: 3,
      title: 'Leverage Peak Performance Hours',
      description: 'AI analysis shows you perform 35% better during 10AM-12PM and 2PM-4PM.',
      expectedImpact: '+15% productivity',
      successProbability: 92,
      actionItems: [
        'Schedule important calls during peak hours',
        'Block calendar for strategic work',
        'Delegate admin tasks to off-peak times',
        'Take short breaks to maintain energy'
      ],
      estimatedTime: 'Ongoing'
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  };

  const generateAIPredictions = (target: KPITargetData): AIPrediction[] => {
    const daysInMonth = 30;
    const daysElapsed = 18; // Mock: day 18 of month
    
    const predictions: AIPrediction[] = [
      {
        metric: 'Revenue',
        currentValue: target.revenueActual,
        targetValue: target.revenueTarget,
        predictedValue: target.revenueActual * (daysInMonth / daysElapsed) * 0.95,
        confidence: 72,
        trend: target.revenueActual > target.revenueTarget * 0.7 ? 'up' : 'down',
        risk: target.revenueActual < target.revenueTarget * 0.6 ? 'high' : target.revenueActual < target.revenueTarget * 0.8 ? 'medium' : 'low'
      },
      {
        metric: 'Deals',
        currentValue: target.dealsActual,
        targetValue: target.dealsTarget,
        predictedValue: Math.round(target.dealsActual * (daysInMonth / daysElapsed) * 0.92),
        confidence: 68,
        trend: target.dealsActual >= target.dealsTarget * 0.6 ? 'up' : 'stable',
        risk: target.dealsActual < target.dealsTarget * 0.5 ? 'high' : target.dealsActual < target.dealsTarget * 0.7 ? 'medium' : 'low'
      },
      {
        metric: 'Conversion Rate',
        currentValue: target.conversionRateActual,
        targetValue: target.conversionRateTarget,
        predictedValue: target.conversionRateActual * 1.05,
        confidence: 75,
        trend: 'up',
        risk: target.conversionRateActual < target.conversionRateTarget * 0.7 ? 'high' : 'low'
      }
    ];

    return predictions;
  };

  const generateAIAlerts = (target: KPITargetData): AIAlert[] => {
    const alerts: AIAlert[] = [];
    const revenueProgress = calculateProgress(target.revenueActual, target.revenueTarget);
    const dealsProgress = calculateProgress(target.dealsActual, target.dealsTarget);

    if (revenueProgress < 50) {
      alerts.push({
        id: '1',
        severity: 'critical',
        title: 'Critical: Revenue Significantly Below Target',
        message: `Only ${revenueProgress.toFixed(0)}% of revenue target achieved with limited time remaining.`,
        metric: 'Revenue',
        timestamp: new Date().toISOString(),
        actionRequired: true
      });
    }

    if (dealsProgress < 40) {
      alerts.push({
        id: '2',
        severity: 'warning',
        title: 'Warning: Deal Count Below Expected Pace',
        message: `Deals closed: ${target.dealsActual}/${target.dealsTarget}. Acceleration needed.`,
        metric: 'Deals',
        timestamp: new Date().toISOString(),
        actionRequired: true
      });
    }

    return alerts;
  };

  const handleAIChat = (message: string) => {
    setChatMessages([...chatMessages, { role: 'user', message }]);
    
    // Simulate AI response
    setTimeout(() => {
      let aiResponse = '';
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('revenue') || lowerMessage.includes('pendapatan')) {
        aiResponse = `📊 Analyzing revenue performance...\n\nYour current revenue is ${formatCurrency(selectedEmployee ? targets.find(t => t.employeeId === selectedEmployee)?.revenueActual || 0 : 0)}. To reach your target, you need to:\n\n1. Close 2-3 high-value deals (Rp 180M+)\n2. Accelerate conversion rate by 15%\n3. Focus on enterprise clients\n\nWould you like specific recommendations?`;
      } else if (lowerMessage.includes('target') || lowerMessage.includes('goal')) {
        aiResponse = `🎯 Let me analyze your targets...\n\nYour overall progress is strong in some areas but needs improvement in:\n\n• Revenue: Behind schedule\n• Conversion Rate: Needs optimization\n• Deals: On track\n\nI recommend focusing on the Revenue gap first as it has the highest impact. Shall I create an action plan?`;
      } else if (lowerMessage.includes('help') || lowerMessage.includes('bantuan')) {
        aiResponse = `👋 I'm your AI KPI Assistant! I can help you with:\n\n📊 Performance Analysis\n🎯 Goal Recommendations\n💡 Actionable Insights\n📈 Predictive Forecasting\n🚀 Optimization Strategies\n\nJust ask me anything about your KPIs!`;
      } else {
        aiResponse = `🤖 I understand you're asking about "${message}".\n\nBased on your current performance data, I suggest:\n\n1. Review your top opportunities\n2. Optimize your follow-up timing\n3. Focus on high-impact activities\n\nWould you like me to dive deeper into any of these areas?`;
      }

      setChatMessages(prev => [...prev, { role: 'ai', message: aiResponse }]);
    }, 1000);

    setChatInput('');
  };

  const calculateProgress = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((actual / target) * 100, 150);
  };

  // FR-08: simple run-rate projection for the AchievementBadge's "Forecast" value.
  // Reuses the same day-18-of-30 mock month-progress assumption already used elsewhere in this
  // file (see generateAIPredictions below) rather than inventing a different formula — this is a
  // simplified placeholder, not a real calendar-aware projection; wiring it to the actual current
  // date is a reasonable follow-up once real historical data exists to validate against.
  const calculateForecast = (actual: number) => {
    const daysInMonth = 30;
    const daysElapsed = 18;
    return actual * (daysInMonth / daysElapsed);
  };

  const calculateOverallProgress = (target: KPITargetData) => {
    const revenueProgress = calculateProgress(target.revenueActual, target.revenueTarget);
    const dealsProgress = calculateProgress(target.dealsActual, target.dealsTarget);
    const activitiesProgress = calculateProgress(target.activitiesActual, target.activitiesTarget);
    const conversionProgress = calculateProgress(target.conversionRateActual, target.conversionRateTarget);
    const meetingsProgress = calculateProgress(target.meetingsActual, target.meetingsTarget);

    return (revenueProgress + dealsProgress + activitiesProgress + conversionProgress + meetingsProgress) / 5;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'text-green-600 bg-green-50';
    if (progress >= 70) return 'text-blue-600 bg-blue-50';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateGap = (actual: number, target: number): number => {
    return actual - target;
  };

  const formatGap = (gap: number): { label: string; value: string; isPositive: boolean } => {
    const absGap = Math.abs(gap);
    const formattedValue = formatCurrency(absGap);
    
    if (gap < 0) {
      return {
        label: 'Short',
        value: formattedValue,
        isPositive: false
      };
    } else {
      return {
        label: 'Surplus',
        value: formattedValue,
        isPositive: true
      };
    }
  };

  const formatDealsGap = (gap: number): { label: string; value: string; isPositive: boolean } => {
    const absGap = Math.abs(gap);
    
    if (gap < 0) {
      return {
        label: 'Short',
        value: `${absGap} deals`,
        isPositive: false
      };
    } else {
      return {
        label: 'Surplus',
        value: `${absGap} deals`,
        isPositive: true
      };
    }
  };

  const getMonthlyPeriods = () => {
    const currentYear = 2026;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      label: `${month} - ${currentYear.toString().slice(-2)}`,
      value: `${currentYear}-${String(index + 1).padStart(2, '0')}`,
      display: `${month} ${currentYear}`
    }));
  };

  const getQuarterlyPeriods = () => {
    const currentYear = 2026;
    return [
      { label: `Q1 - ${currentYear}`, value: `${currentYear}-Q1`, display: 'Jan-Mar 2026' },
      { label: `Q2 - ${currentYear}`, value: `${currentYear}-Q2`, display: 'Apr-Jun 2026' },
      { label: `Q3 - ${currentYear}`, value: `${currentYear}-Q3`, display: 'Jul-Sep 2026' },
      { label: `Q4 - ${currentYear}`, value: `${currentYear}-Q4`, display: 'Oct-Dec 2026' }
    ];
  };

  const getYearlyPeriods = () => {
    const years = [2024, 2025, 2026, 2027];
    return years.map(year => ({
      label: year.toString(),
      value: year.toString(),
      display: year.toString()
    }));
  };

  const getCurrentPeriodOptions = () => {
    if (selectedPeriodType === 'monthly') return getMonthlyPeriods();
    if (selectedPeriodType === 'quarterly') return getQuarterlyPeriods();
    return getYearlyPeriods();
  };

  const handleOpenModal = (target?: KPITargetData) => {
    if (target) {
      setEditingTarget(target);
      setFormData({
        employeeId: target.employeeId,
        employeeName: target.employeeName,
        period: target.period,
        periodType: target.periodType,
        revenueTarget: target.revenueTarget,
        dealsTarget: target.dealsTarget,
        activitiesTarget: target.activitiesTarget,
        conversionRateTarget: target.conversionRateTarget,
        meetingsTarget: target.meetingsTarget,
      });
    } else {
      setEditingTarget(null);
      setFormData({
        employeeId: '',
        employeeName: '',
        period: '2026-01',
        periodType: 'monthly',
        revenueTarget: 0,
        dealsTarget: 0,
        activitiesTarget: 0,
        conversionRateTarget: 0,
        meetingsTarget: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenSummary = (target: KPITargetData) => {
    setSelectedTargetForSummary(target);
    setIsSummaryModalOpen(true);
  };

  const handleSaveTarget = () => {
    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    const targetData: KPITargetData = {
      id: editingTarget?.id || `TARGET-${formData.employeeId}-${formData.period}`,
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      period: formData.period,
      periodType: formData.periodType,
      revenueTarget: formData.revenueTarget,
      revenueActual: editingTarget?.revenueActual || 0,
      dealsTarget: formData.dealsTarget,
      dealsActual: editingTarget?.dealsActual || 0,
      activitiesTarget: formData.activitiesTarget,
      activitiesActual: editingTarget?.activitiesActual || 0,
      conversionRateTarget: formData.conversionRateTarget,
      conversionRateActual: editingTarget?.conversionRateActual || 0,
      meetingsTarget: formData.meetingsTarget,
      meetingsActual: editingTarget?.meetingsActual || 0,
      createdAt: editingTarget?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use persistence utility
    const updatedTargets = updateKPITarget(targetData);
    setTargets(updatedTargets);

    if (editingTarget) {
      toast.success('Target updated successfully');
    } else {
      toast.success('Target created successfully');
    }

    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37] mx-auto"></div>
          <p className="text-gray-600">Loading AI-powered insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37] flex items-center gap-3">
            <Brain className="w-8 h-8 text-[#013E37]" />
            AI-Powered KPI Management
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Intelligent insights, predictions, and recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border rounded-md shadow-sm p-1 gap-1">
            <div className="flex items-center gap-1 px-2 border-r">
              <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
              <select 
                className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
                value={exportDateRange.from}
                onChange={(e) => setExportDateRange({...exportDateRange, from: e.target.value})}
              >
                {getMonthlyPeriods().map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span className="text-xs text-gray-400">to</span>
              <select 
                className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
                value={exportDateRange.to}
                onChange={(e) => setExportDateRange({...exportDateRange, to: e.target.value})}
              >
                {getMonthlyPeriods().map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                const filtered = targets.filter(t => t.period >= exportDateRange.from && t.period <= exportDateRange.to);
                if (filtered.length === 0) {
                  toast.error('Tidak ada data dalam rentang waktu tersebut');
                  return;
                }
                exportKPIToExcel(filtered, `KPI_Summary_${exportDateRange.from}_to_${exportDateRange.to}.xlsx`);
              }}
              className="text-[#013E37] h-8 px-2"
              title="Export filtered Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                const filtered = targets.filter(t => t.period >= exportDateRange.from && t.period <= exportDateRange.to);
                if (filtered.length === 0) {
                  toast.error('Tidak ada data dalam rentang waktu tersebut');
                  return;
                }
                exportKPIToPDF(filtered, `KPI_Summary_${exportDateRange.from}_to_${exportDateRange.to}.pdf`);
              }}
              className="text-[#013E37] h-8 px-2"
              title="Export filtered PDF"
            >
              <FilePdf className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            onClick={() => setAiChatOpen(true)}
            variant="outline"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
          <Button 
            onClick={() => handleOpenModal()}
            className="bg-[#013E37] hover:bg-[#025C52]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set New Target
          </Button>
        </div>
      </div>

      {/* Manager & Team Member Filters */}
      <Card className="border-2 border-[#013E37]/20 bg-[#EEF7F5]">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Users className="w-5 h-5 text-[#013E37]" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Manager Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Select Manager</Label>
                <Select 
                  value={selectedManager || ''} 
                  onValueChange={(value) => {
                    setSelectedManager(value);
                    setSelectedTeamMember(null);
                  }}
                >
                  <SelectTrigger className="border-[#013E37]/30">
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} - {manager.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Member Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Select Team Member</Label>
                <Select 
                  value={selectedTeamMember || ''} 
                  onValueChange={setSelectedTeamMember}
                  disabled={!selectedManager || selectedManager === 'all'}
                >
                  <SelectTrigger className="border-[#013E37]/30">
                    <SelectValue placeholder={selectedManager && selectedManager !== 'all' ? 'All Team Members' : 'Select Manager First'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team Members</SelectItem>
                    {selectedManager && selectedManager !== 'all' && 
                      managers.find(m => m.id === selectedManager)?.teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.position}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Info */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Viewing</Label>
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-[#013E37]/20">
                  <div className="flex items-center gap-2">
                    {selectedManager && selectedManager !== 'all' ? (
                      selectedTeamMember && selectedTeamMember !== 'all' ? (
                        <>
                          <Badge className="bg-green-600">Team Member</Badge>
                          <span className="text-sm font-medium">
                            {managers.find(m => m.id === selectedManager)?.teamMembers.find(tm => tm.id === selectedTeamMember)?.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <Badge className="bg-blue-600">Manager</Badge>
                          <span className="text-sm font-medium">
                            {managers.find(m => m.id === selectedManager)?.name}
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <Badge className="bg-[#013E37]">All</Badge>
                        <span className="text-sm font-medium">All Sales Team</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Team Overview */}
          {selectedManager && selectedManager !== 'all' && (
            <div className="mt-4 pt-4 border-t border-[#013E37]/20">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#013E37]" />
                <h3 className="font-semibold text-gray-800">
                  {managers.find(m => m.id === selectedManager)?.department}
                </h3>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {managers.find(m => m.id === selectedManager)?.teamMembers.map(member => (
                  <Button
                    key={member.id}
                    variant={selectedTeamMember === member.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTeamMember(member.id)}
                    className={`text-xs ${selectedTeamMember === member.id ? 'bg-[#013E37]' : ''}`}
                  >
                    {member.name.split(' ')[0]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Filter */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-[#EEF7F5]">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Period Type Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Period Type</Label>
                <Select 
                  value={selectedPeriodType} 
                  onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') => {
                    setSelectedPeriodType(value);
                    if (value === 'monthly') setSelectedPeriod('2026-01');
                    else if (value === 'quarterly') setSelectedPeriod('2026-Q1');
                    else setSelectedPeriod('2026');
                  }}
                >
                  <SelectTrigger className="border-blue-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">📅 Monthly</SelectItem>
                    <SelectItem value="quarterly">📊 Quarterly</SelectItem>
                    <SelectItem value="yearly">📆 Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Select Period</Label>
                <Select 
                  value={selectedPeriod} 
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="border-blue-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentPeriodOptions().map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period Display */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Current Period</Label>
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                  <Badge className="bg-blue-600">
                    {selectedPeriodType === 'monthly' ? '📅' : selectedPeriodType === 'quarterly' ? '📊' : '📆'}
                  </Badge>
                  <span className="text-sm font-medium">
                    {getCurrentPeriodOptions().find(p => p.value === selectedPeriod)?.display || selectedPeriod}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Period Navigation */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">Quick Select</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {getCurrentPeriodOptions().slice(0, selectedPeriodType === 'monthly' ? 6 : 4).map((period) => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`text-xs ${selectedPeriod === period.value ? 'bg-blue-600' : ''}`}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter targets based on selection */}
      {(() => {
        let filteredTargets = targets;
        
        // Filter by Manager/Team Member
        if (selectedManager && selectedManager !== 'all') {
          if (selectedTeamMember && selectedTeamMember !== 'all') {
            // Show specific team member
            filteredTargets = targets.filter(t => t.employeeId === selectedTeamMember);
          } else {
            // Show manager and their team members
            const manager = managers.find(m => m.id === selectedManager);
            if (manager) {
              const teamMemberIds = manager.teamMembers.map(tm => tm.id);
              filteredTargets = targets.filter(t => 
                t.employeeId === selectedManager || teamMemberIds.includes(t.employeeId)
              );
            }
          }
        }

        // Filter by Period
        filteredTargets = filteredTargets.filter(t => 
          t.period === selectedPeriod && t.periodType === selectedPeriodType
        );

      return (
        <>
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
            <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start max-w-xl">
              <TabsTrigger value="analytics" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[120px]">
                <div className="flex items-center gap-1.5 justify-center">
                  <LineChart className="w-4 h-4" />
                  <span className="font-bold text-sm">Analytics</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">GRAFIK & TREN</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[120px]">
                <div className="flex items-center gap-1.5 justify-center">
                  <Target className="w-4 h-4" />
                  <span className="font-bold text-sm">List View</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">TABEL DATA</span>
              </TabsTrigger>
            </TabsList>

            {/* Analytics View */}
            <TabsContent value="analytics" className="space-y-6">
              {filteredTargets.length === 0 ? (
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h3>
                    <p className="text-gray-500 mb-4">
                      No KPI targets found for the selected period and filters.
                    </p>
                    <Button onClick={() => handleOpenModal()} className="bg-[#013E37]">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Target
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredTargets.map((target) => {
            const insights = generateAIInsights(target);
            const recommendations = generateAIRecommendations(target);
            const predictions = generateAIPredictions(target);
            const alerts = generateAIAlerts(target);
            const overallProgress = calculateOverallProgress(target);

            return (
              <Card key={target.id} className="border-2 border-[#013E37]/20 overflow-hidden">
                {/* Header */}
                <CardHeader className="bg-[#013E37] text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30">
                        {target.employeeName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-white">{target.employeeName}</CardTitle>
                        <p className="text-white/90 flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          Period: {target.period} ({target.periodType})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{overallProgress.toFixed(0)}%</div>
                      <p className="text-white/90 text-sm">Overall Progress</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start w-full">
                      <TabsTrigger value="overview" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[100px] flex-1">
                        <span className="font-bold text-xs">Overview</span>
                        <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">RINGKASAN</span>
                      </TabsTrigger>
                      <TabsTrigger value="insights" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[100px] flex-1">
                        <div className="flex items-center gap-1 justify-center">
                          <Brain className="w-3 h-3" />
                          <span className="font-bold text-xs">AI Insights</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">WAWASAN AI</span>
                      </TabsTrigger>
                      <TabsTrigger value="recommendations" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[100px] flex-1">
                        <div className="flex items-center gap-1 justify-center">
                          <Lightbulb className="w-3 h-3" />
                          <span className="font-bold text-xs">Saran</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">REKOMENDASI</span>
                      </TabsTrigger>
                      <TabsTrigger value="predictions" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[100px] flex-1">
                        <div className="flex items-center gap-1 justify-center">
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-bold text-xs">Predictions</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">PREDIKSI</span>
                      </TabsTrigger>
                      <TabsTrigger value="alerts" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 min-w-[100px] flex-1">
                        <div className="flex items-center gap-1 justify-center">
                          <Bell className="w-3 h-3" />
                          <span className="font-bold text-xs">Alerts ({alerts.length})</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">NOTIFIKASI</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Revenue - Clickable */}
                        <Card 
                          className="border-2 border-[#013E37]/10 cursor-pointer hover:border-[#013E37]/40 hover:shadow-lg transition-all group"
                          onClick={() => {
                            setSelectedEmployeeForRevenue(target.employeeName);
                            setRevenueDetailOpen(true);
                          }}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-[#013E37] group-hover:scale-110 transition-transform" />
                                <span className="font-semibold">Revenue</span>
                              </div>
                              <span className={`text-sm font-bold px-2 py-1 rounded ${getProgressColor(calculateProgress(target.revenueActual, target.revenueTarget))}`}>
                                {calculateProgress(target.revenueActual, target.revenueTarget).toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={calculateProgress(target.revenueActual, target.revenueTarget)} className="h-2 mb-2" />
                            <div className="text-xs text-gray-600">
                              <div>Target: {formatCurrency(target.revenueTarget)}</div>
                              <div className="font-semibold text-[#013E37]">Actual: {formatCurrency(target.revenueActual)}</div>
                              {(() => {
                                const gap = calculateGap(target.revenueActual, target.revenueTarget);
                                const { label, value, isPositive } = formatGap(gap);
                                return (
                                  <div className={`font-semibold mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {label}: {value}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <AchievementBadge
                                label="Target vs Actual vs Forecast"
                                targetValue={target.revenueTarget}
                                actualValue={target.revenueActual}
                                forecastValue={calculateForecast(target.revenueActual)}
                                formatValue={formatCurrency}
                              />
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#013E37]/10">
                              <p className="text-xs text-[#013E37] font-semibold group-hover:text-[#025C52]">
                                🔍 Click for detailed breakdown
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Deals */}
                        <Card 
                          className="border-2 border-blue-100 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group"
                          onClick={() => {
                            setSelectedEmployeeForDeals(target.employeeName);
                            setDealsDetailOpen(true);
                          }}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold">Deals</span>
                              </div>
                              <span className={`text-sm font-bold px-2 py-1 rounded ${getProgressColor(calculateProgress(target.dealsActual, target.dealsTarget))}`}>
                                {calculateProgress(target.dealsActual, target.dealsTarget).toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={calculateProgress(target.dealsActual, target.dealsTarget)} className="h-2 mb-2" />
                            <div className="text-xs text-gray-600">
                              <div>Target: {target.dealsTarget} deals</div>
                              <div className="font-semibold text-blue-600">Actual: {target.dealsActual} deals</div>
                              {(() => {
                                const gap = calculateGap(target.dealsActual, target.dealsTarget);
                                const { label, value, isPositive } = formatDealsGap(gap);
                                return (
                                  <div className={`font-semibold mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {label}: {value}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <AchievementBadge
                                label="Target vs Actual vs Forecast"
                                targetValue={target.dealsTarget}
                                actualValue={target.dealsActual}
                                forecastValue={calculateForecast(target.dealsActual)}
                                formatValue={(v) => `${Math.round(v)} deals`}
                              />
                            </div>
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <p className="text-xs text-blue-600 font-semibold group-hover:text-blue-800">
                                🔍 Click for detailed breakdown
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Conversion Rate */}
                        <Card 
                          className="border-2 border-green-100 cursor-pointer hover:border-green-400 hover:shadow-lg transition-all group"
                          onClick={() => {
                            setSelectedEmployeeForConversion(target.employeeName);
                            setConversionDetailOpen(true);
                          }}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold">Conversion</span>
                              </div>
                              <span className={`text-sm font-bold px-2 py-1 rounded ${getProgressColor(calculateProgress(target.conversionRateActual, target.conversionRateTarget))}`}>
                                {calculateProgress(target.conversionRateActual, target.conversionRateTarget).toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={calculateProgress(target.conversionRateActual, target.conversionRateTarget)} className="h-2 mb-2" />
                            <div className="text-xs text-gray-600">
                              <div>Target: {target.conversionRateTarget}%</div>
                              <div className="font-semibold text-green-600">Actual: {target.conversionRateActual.toFixed(1)}%</div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <p className="text-xs text-green-600 font-semibold group-hover:text-green-800">
                                🔍 Click for detailed breakdown
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* AI Insights Tab */}
                    <TabsContent value="insights" className="space-y-4">
                      <div className="bg-[#EEF7F5] p-4 rounded-lg border-2 border-[#013E37]/20">
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                          <Brain className="w-5 h-5 text-[#013E37]" />
                          AI-Generated Insights
                        </h3>
                        <p className="text-sm text-gray-600">Based on real-time analysis of your performance data</p>
                      </div>

                      {insights.length === 0 ? (
                        <Card className="border-2 border-green-200 bg-green-50">
                          <CardContent className="pt-6 text-center">
                            <Trophy className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <p className="font-semibold text-green-800">Excellent Performance!</p>
                            <p className="text-sm text-green-700">All metrics are on track. Keep up the great work!</p>
                          </CardContent>
                        </Card>
                      ) : (
                        insights.map((insight) => (
                          <Card key={insight.id} className={`border-2 ${
                            insight.type === 'critical' ? 'border-red-300 bg-red-50' :
                            insight.type === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                            insight.type === 'success' ? 'border-green-300 bg-green-50' :
                            'border-blue-300 bg-blue-50'
                          }`}>
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  insight.type === 'critical' ? 'bg-red-100' :
                                  insight.type === 'warning' ? 'bg-yellow-100' :
                                  insight.type === 'success' ? 'bg-green-100' :
                                  'bg-blue-100'
                                }`}>
                                  {insight.type === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                                  {insight.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                                  {insight.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                                  {insight.type === 'info' && <Lightbulb className="w-5 h-5 text-blue-600" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className={`font-semibold ${
                                      insight.type === 'critical' ? 'text-red-900' :
                                      insight.type === 'warning' ? 'text-yellow-900' :
                                      insight.type === 'success' ? 'text-green-900' :
                                      'text-blue-900'
                                    }`}>{insight.title}</h4>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(insight.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-3">{insight.message}</p>
                                  
                                  <div className="bg-white/50 rounded p-3">
                                    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-[#013E37]" />
                                      AI Suggestions:
                                    </p>
                                    <ul className="text-xs space-y-1">
                                      {insight.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <div className="min-w-1 min-h-1 w-1 h-1 rounded-full bg-gray-400 mt-1.5" />
                                          <span className="text-gray-600">{suggestion}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>

                    {/* Recommendations Tab */}
                    <TabsContent value="recommendations" className="space-y-4">
                      {recommendations.map((rec) => (
                        <Card key={rec.id} className="border-2 border-[#DFF0EC]">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-[#DFF0EC] rounded-lg">
                                <Rocket className="w-6 h-6 text-[#013E37]" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-lg text-[#012D29]">{rec.title}</h4>
                                  <Badge className="bg-[#DFF0EC] text-[#013E37] hover:bg-[#C3DDD9]">
                                    Priority {rec.priority}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 mb-4">{rec.description}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="bg-green-50 p-3 rounded border border-green-100">
                                    <p className="text-xs text-green-600 font-semibold mb-1">Expected Impact</p>
                                    <p className="text-sm font-bold text-green-800">{rec.expectedImpact}</p>
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                    <p className="text-xs text-blue-600 font-semibold mb-1">Success Probability</p>
                                    <div className="flex items-center gap-2">
                                      <Progress value={rec.successProbability} className="h-2 flex-1" />
                                      <span className="text-sm font-bold text-blue-800">{rec.successProbability}%</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-semibold mb-2">Action Items:</p>
                                  <div className="space-y-2">
                                    {rec.actionItems.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    {/* Predictions Tab */}
                    <TabsContent value="predictions" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {predictions.map((pred, idx) => (
                          <Card key={idx} className="border-2 border-[#DFF0EC]">
                            <CardContent className="pt-6">
                              <h4 className="font-semibold text-gray-600 mb-4">{pred.metric} Forecast</h4>
                              <div className="flex items-end gap-2 mb-2">
                                <span className="text-2xl font-bold text-[#012D29]">
                                  {pred.metric === 'Revenue' 
                                    ? formatCurrency(pred.predictedValue)
                                    : pred.metric === 'Conversion Rate'
                                    ? `${pred.predictedValue.toFixed(1)}%`
                                    : pred.predictedValue
                                  }
                                </span>
                                <span className={`text-xs mb-1 px-2 py-0.5 rounded-full flex items-center ${
                                  pred.trend === 'up' ? 'bg-green-100 text-green-700' :
                                  pred.trend === 'down' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {pred.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> :
                                   pred.trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> :
                                   <Activity className="w-3 h-3 mr-1" />
                                  }
                                  {pred.trend === 'up' ? 'Trending Up' : pred.trend === 'down' ? 'Trending Down' : 'Stable'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mb-4">
                                vs Target: {pred.metric === 'Revenue' 
                                  ? formatCurrency(pred.targetValue)
                                  : pred.metric === 'Conversion Rate'
                                  ? `${pred.targetValue}%`
                                  : pred.targetValue
                                }
                              </p>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Confidence</span>
                                  <span className="font-semibold text-[#013E37]">{pred.confidence}%</span>
                                </div>
                                <Progress value={pred.confidence} className="h-1.5" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      
                      <Card className="bg-[#EEF7F5] border-[#C3DDD9]">
                        <CardContent className="p-4 flex items-center gap-4">
                          <Brain className="w-8 h-8 text-[#013E37]" />
                          <div>
                            <p className="font-semibold text-[#012D29]">AI Forecasting Analysis</p>
                            <p className="text-sm text-[#012D29]">
                               Based on historical trends and current velocity, you are likely to end the month at 
                              <span className="font-bold"> {calculateOverallProgress(target).toFixed(1)}% </span> 
                              of your overall target.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Alerts Tab */}
                    <TabsContent value="alerts" className="space-y-4">
                       {alerts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                          <p>No active alerts. Everything looks good!</p>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-lg border ${
                            alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            {alert.severity === 'critical' ? (
                              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                            )}
                            <div>
                              <h4 className={`font-semibold ${
                                alert.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'
                              }`}>{alert.title}</h4>
                              <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</span>
                                {alert.actionRequired && (
                                  <Badge variant="outline" className="bg-white">Action Required</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                  </Tabs>
                </CardContent>
              </Card>
            );
          })
              )}
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deals</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTargets.map((target) => (
                          <tr 
                            key={target.id} 
                            className="hover:bg-[#EEF7F5] cursor-pointer transition-colors group"
                            onClick={() => handleOpenSummary(target)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900 group-hover:text-[#013E37]">{target.employeeName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {target.period}
                            </td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap hover:bg-white/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeForRevenue(target.employeeName);
                                setRevenueDetailOpen(true);
                              }}
                            >
                              <div className="text-sm text-gray-900 font-semibold">{formatCurrency(target.revenueActual)}</div>
                              <div className="text-xs text-gray-500">Target: {formatCurrency(target.revenueTarget)}</div>
                              <div className="text-[10px] text-[#013E37] opacity-0 group-hover:opacity-100 font-medium">Click for breakdown</div>
                            </td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap hover:bg-white/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeForDeals(target.employeeName);
                                setDealsDetailOpen(true);
                              }}
                            >
                              <div className="text-sm text-gray-900 font-semibold">{target.dealsActual}</div>
                              <div className="text-xs text-gray-500">Target: {target.dealsTarget}</div>
                              <div className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 font-medium">Click for breakdown</div>
                            </td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap hover:bg-white/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeForConversion(target.employeeName);
                                setConversionDetailOpen(true);
                              }}
                            >
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                target.conversionRateActual >= target.conversionRateTarget 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {target.conversionRateActual.toFixed(1)}%
                              </span>
                              <div className="text-[10px] text-green-600 opacity-0 group-hover:opacity-100 font-medium ml-1">Click for breakdown</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(target);
                                }}
                                className="text-[#013E37] hover:text-[#025C52] hover:bg-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      );
    })()}
    
    {/* Edit/Create Modal */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTarget ? 'Edit Target' : 'Set New Target'}</DialogTitle>
            <DialogDescription>
              Adjust KPI targets for {formData.employeeName || 'sales team members'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select 
                value={formData.employeeId} 
                onValueChange={(value) => {
                  const emp = employees.find((e: any) => e.id === value) || 
                             managers.find(m => m.id === value) ||
                             managers.flatMap(m => m.teamMembers).find(tm => tm.id === value);
                             
                  if (emp) {
                    setFormData({
                      ...formData,
                      employeeId: value,
                      employeeName: emp.name || emp.nama // Handle both formats
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {/* Managers */}
                  {managers.map(manager => (
                     <SelectItem key={manager.id} value={manager.id}>{manager.name} (Manager)</SelectItem>
                  ))}
                  {/* Team Members */}
                  {managers.flatMap(m => m.teamMembers).map(tm => (
                    <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                  ))}
                  {/* Fallback to employees list if no managers structure found */}
                  {managers.length === 0 && employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Period</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.periodType} 
                  onValueChange={(value: any) => setFormData({...formData, periodType: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  value={formData.period} 
                  onChange={(e) => setFormData({...formData, period: e.target.value})}
                  placeholder="2026-01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Revenue Target (IDR)</Label>
              <Input 
                type="number" 
                value={formData.revenueTarget} 
                onChange={(e) => setFormData({...formData, revenueTarget: Number(e.target.value)})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Deals Target (Count)</Label>
              <Input 
                type="number" 
                value={formData.dealsTarget} 
                onChange={(e) => setFormData({...formData, dealsTarget: Number(e.target.value)})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Conversion Rate Target (%)</Label>
              <Input 
                type="number" 
                value={formData.conversionRateTarget} 
                onChange={(e) => setFormData({...formData, conversionRateTarget: Number(e.target.value)})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Meetings Target (Count)</Label>
              <Input 
                type="number" 
                value={formData.meetingsTarget} 
                onChange={(e) => setFormData({...formData, meetingsTarget: Number(e.target.value)})} 
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTarget} className="bg-[#013E37] text-white">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Quick View Dialog */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[calc(100%-2rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <DialogTitle className="flex items-center gap-3 text-2xl text-[#013E37]">
                <div className="w-10 h-10 rounded-full bg-[#013E37] text-white flex items-center justify-center font-bold">
                  {selectedTargetForSummary?.employeeName.charAt(0)}
                </div>
                <div>
                  {selectedTargetForSummary?.employeeName}
                  <p className="text-sm font-normal text-gray-500">Performance Summary - {selectedTargetForSummary?.period}</p>
                </div>
              </DialogTitle>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-[#013E37] border-[#013E37]/20 hover:bg-[#013E37]/5">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => selectedTargetForSummary && handleShareReport(selectedTargetForSummary, 'whatsapp')} className="gap-2">
                      <MessageCircle className="w-4 h-4 text-green-500" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedTargetForSummary && handleShareReport(selectedTargetForSummary, 'email')} className="gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectedTargetForSummary && exportSingleKPIToPDF(selectedTargetForSummary)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <FilePdf className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
            <DialogDescription>
              Quick overview of key performance indicators and monthly trends.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTargetForSummary && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue Card */}
                <Card 
                  className="border-2 border-[#013E37]/10 cursor-pointer hover:border-[#013E37]/40 hover:shadow-lg transition-all group bg-gradient-to-br from-white to-[#f0f9f8]"
                  onClick={() => {
                    setSelectedEmployeeForRevenue(selectedTargetForSummary.employeeName);
                    setRevenueDetailOpen(true);
                    setIsSummaryModalOpen(false);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-[#013E37]">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-semibold">Revenue</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#013E37] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xl font-bold mb-1">{formatCurrency(selectedTargetForSummary.revenueActual)}</div>
                    <Progress value={calculateProgress(selectedTargetForSummary.revenueActual, selectedTargetForSummary.revenueTarget)} className="h-1.5 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{calculateProgress(selectedTargetForSummary.revenueActual, selectedTargetForSummary.revenueTarget).toFixed(0)}% of target</span>
                      <span className="font-medium text-[#013E37]">{formatCurrency(selectedTargetForSummary.revenueTarget)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Deals Card */}
                <Card 
                  className="border-2 border-blue-100 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group bg-gradient-to-br from-white to-blue-50"
                  onClick={() => {
                    setSelectedEmployeeForDeals(selectedTargetForSummary.employeeName);
                    setDealsDetailOpen(true);
                    setIsSummaryModalOpen(false);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-semibold">Deals</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xl font-bold mb-1">{selectedTargetForSummary.dealsActual} Deals</div>
                    <Progress value={calculateProgress(selectedTargetForSummary.dealsActual, selectedTargetForSummary.dealsTarget)} className="h-1.5 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{calculateProgress(selectedTargetForSummary.dealsActual, selectedTargetForSummary.dealsTarget).toFixed(0)}% of target</span>
                      <span className="font-medium text-blue-600">{selectedTargetForSummary.dealsTarget}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversion Card */}
                <Card 
                  className="border-2 border-green-100 cursor-pointer hover:border-green-400 hover:shadow-lg transition-all group bg-gradient-to-br from-white to-green-50"
                  onClick={() => {
                    setSelectedEmployeeForConversion(selectedTargetForSummary.employeeName);
                    setConversionDetailOpen(true);
                    setIsSummaryModalOpen(false);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <Zap className="w-5 h-5" />
                        <span className="font-semibold">Conversion</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xl font-bold mb-1">{selectedTargetForSummary.conversionRateActual.toFixed(1)}%</div>
                    <Progress value={calculateProgress(selectedTargetForSummary.conversionRateActual, selectedTargetForSummary.conversionRateTarget)} className="h-1.5 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{calculateProgress(selectedTargetForSummary.conversionRateActual, selectedTargetForSummary.conversionRateTarget).toFixed(0)}% of target</span>
                      <span className="font-medium text-green-600">{selectedTargetForSummary.conversionRateTarget}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Chart Section */}
              <Card className="border-2 border-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                      <LineChart className="w-5 h-5 text-[#013E37]" />
                      Revenue & Deals Trend (Last 7 Months)
                    </div>
                    <Badge variant="outline" className="bg-white text-xs font-normal">
                      Historical Performance
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getTrendData(selectedTargetForSummary)}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.from}/>
                            <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.to}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: CHART_MUTED_TEXT }}
                          tickFormatter={(val) => `Rp${val / 1000000}M`}
                        />
                        <ReTooltip 
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value: any, name: string) => [
                            name === 'revenue' ? formatCurrency(value) : value,
                            name.charAt(0).toUpperCase() + name.slice(1)
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke={CHART_PRIMARY} 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorRev)" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="deals" 
                          stroke={CHART_COLORS[1]} 
                          strokeWidth={2}
                          dot={{ r: 4, fill: CHART_COLORS[1] }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#013E37]" />
                      <span className="text-xs text-gray-600 font-medium">Monthly Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-xs text-gray-600 font-medium">Deals Closed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Forecast & Actions */}
              <div className="bg-[#EEF7F5] rounded-xl p-5 border-2 border-[#013E37]/10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <Brain className="w-8 h-8 text-[#013E37]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-[#013E37] flex items-center gap-2">
                        AI Executive Prediction
                        <Badge className="bg-[#013E37] text-[10px] h-4">Confidence 92%</Badge>
                      </h4>
                      <div className="text-xs text-[#013E37] font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +12% projected growth
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      Based on current velocity and historical {selectedTargetForSummary.period} data, {selectedTargetForSummary.employeeName} is projected to achieve 
                      <span className="font-bold text-[#013E37]"> {formatCurrency(selectedTargetForSummary.revenueActual * 1.15)} </span> 
                      by the end of the period, representing a <span className="font-bold text-green-600">stretch goal achievement</span>.
                    </p>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white border-[#013E37]/20 text-[#013E37] hover:bg-[#013E37]/5"
                        onClick={() => {
                          setAiChatOpen(true);
                          setIsSummaryModalOpen(false);
                          setChatMessages([...chatMessages, { role: 'user', message: `How can ${selectedTargetForSummary.employeeName} reach their stretch goal?` }]);
                        }}
                      >
                        <Sparkles className="w-3 h-3 mr-2" />
                        Ask Strategy
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-[#013E37]"
                        onClick={() => {
                          handleOpenModal(selectedTargetForSummary);
                          setIsSummaryModalOpen(false);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-2" />
                        Update Target
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialogs */}
      <RevenueDetailDialog 
        open={revenueDetailOpen} 
        onOpenChange={setRevenueDetailOpen} 
        employeeName={selectedEmployeeForRevenue}
        year={2026}
      />
      <DealsDetailDialog 
        open={dealsDetailOpen} 
        onOpenChange={setDealsDetailOpen} 
        employeeName={selectedEmployeeForDeals}
        year={2026}
      />
      <ConversionDetailDialog 
        open={conversionDetailOpen} 
        onOpenChange={setConversionDetailOpen} 
        employeeName={selectedEmployeeForConversion}
        year={2026}
      />

      {/* AI Chat Dialog */}
      <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#013E37]" />
              AI KPI Assistant
            </DialogTitle>
            <DialogDescription>
              Tanyakan apapun mengenai performa KPI dan strategi penjualan Anda kepada asisten AI.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[400px] flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <p>Ask me anything about your KPIs!</p>
                    <p className="text-xs mt-2">Try: "How can I improve my revenue?"</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' ? 'bg-[#013E37] text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Input 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIChat(chatInput)}
                placeholder="Type your question..."
              />
              <Button size="icon" onClick={() => handleAIChat(chatInput)} className="bg-[#013E37]">
                <Rocket className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
