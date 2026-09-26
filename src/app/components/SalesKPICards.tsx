import React from 'react';
import { DollarSign, Users, Target, BarChart3, TrendingUp } from 'lucide-react';
import { StatCard, type StatCardData } from '@/app/components/ui/stat-card';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface SalesKPICardsProps {
  stats: {
    totalRevenue: number;
    totalLeads: number;
    totalContracts: number;
    avgDealSize: number;
    pipelineValue: number;
    upside: number;
    strongUpside: number;
    forecast: number;
  };
}

export function SalesKPICards({ stats }: SalesKPICardsProps) {
  // Bab 55: diseragamkan ke desain StatCard bersama (badge icon + ghost icon +
  // angka besar), menggantikan icon bulat gradient yang lama.
  const items: StatCardData[] = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      sub: '+23.5% vs last month',
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats.pipelineValue),
      sub: 'Strong pipeline',
      icon: DollarSign,
      color: 'text-[#013E37]',
      bg: 'bg-[#EEF7F5]',
    },
    {
      label: 'Upside',
      value: formatCurrency(stats.upside),
      sub: 'Potential growth',
      icon: TrendingUp,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      label: 'Strong Upside',
      value: formatCurrency(stats.strongUpside),
      sub: 'High confidence',
      icon: TrendingUp,
      color: 'text-[#013E37]',
      bg: 'bg-[#EEF7F5]',
    },
    {
      label: 'Forecast',
      value: formatCurrency(stats.forecast),
      sub: 'Predicted revenue',
      icon: TrendingUp,
      color: 'text-[#013E37]',
      bg: 'bg-[#EEF7F5]',
    },
    {
      label: 'Total Leads',
      value: formatNumber(stats.totalLeads),
      sub: '+12 new this week',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Contracts',
      value: formatNumber(stats.totalContracts),
      sub: '68% conversion rate',
      icon: BarChart3,
      color: 'text-[#013E37]',
      bg: 'bg-[#EEF7F5]',
    },
    {
      label: 'Avg Deal Size',
      value: formatCurrency(stats.avgDealSize),
      sub: '+15% vs last month',
      icon: Target,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((stat, index) => (
        <StatCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
}
