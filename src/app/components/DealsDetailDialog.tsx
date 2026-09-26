import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import {
  TrendingUp,
  X,
  Building2,
  Stethoscope,
  CheckCircle2,
  BarChart3,
  TrendingDown,
  Package
} from 'lucide-react';

interface MonthlyDealsData {
  month: string;
  target: number;
  actual: number;
  progress: number;
}

interface DealsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  year?: number;
}

export function DealsDetailDialog({ 
  open, 
  onOpenChange, 
  employeeName,
  year = 2025 
}: DealsDetailDialogProps) {
  
  // Mock Data - Segmen Proyek (Monthly)
  const projekDeals: MonthlyDealsData[] = [
    { month: 'Jan', target: 3, actual: 3, progress: 100 },
    { month: 'Feb', target: 3, actual: 2, progress: 67 },
    { month: 'Mar', target: 4, actual: 4, progress: 100 },
    { month: 'Apr', target: 4, actual: 5, progress: 125 },
    { month: 'May', target: 3, actual: 3, progress: 100 },
    { month: 'Jun', target: 4, actual: 3, progress: 75 },
    { month: 'Jul', target: 3, actual: 2, progress: 67 },
    { month: 'Aug', target: 4, actual: 3, progress: 75 },
    { month: 'Sep', target: 3, actual: 2, progress: 67 },
    { month: 'Oct', target: 4, actual: 2, progress: 50 },
    { month: 'Nov', target: 3, actual: 1, progress: 33 },
    { month: 'Dec', target: 4, actual: 1, progress: 25 }
  ];

  // Mock Data - Retail Segment (Monthly)
  const retailDeals: MonthlyDealsData[] = [
    { month: 'Jan', target: 5, actual: 6, progress: 120 },
    { month: 'Feb', target: 4, actual: 4, progress: 100 },
    { month: 'Mar', target: 5, actual: 5, progress: 100 },
    { month: 'Apr', target: 6, actual: 7, progress: 117 },
    { month: 'May', target: 5, actual: 5, progress: 100 },
    { month: 'Jun', target: 6, actual: 5, progress: 83 },
    { month: 'Jul', target: 5, actual: 4, progress: 80 },
    { month: 'Aug', target: 6, actual: 5, progress: 83 },
    { month: 'Sep', target: 5, actual: 4, progress: 80 },
    { month: 'Oct', target: 6, actual: 3, progress: 50 },
    { month: 'Nov', target: 5, actual: 2, progress: 40 },
    { month: 'Dec', target: 6, actual: 2, progress: 33 }
  ];

  // Mock Data - Distributor Segment (Monthly)
  const distributorDeals: MonthlyDealsData[] = [
    { month: 'Jan', target: 4, actual: 5, progress: 125 },
    { month: 'Feb', target: 3, actual: 3, progress: 100 },
    { month: 'Mar', target: 4, actual: 4, progress: 100 },
    { month: 'Apr', target: 5, actual: 6, progress: 120 },
    { month: 'May', target: 4, actual: 4, progress: 100 },
    { month: 'Jun', target: 5, actual: 4, progress: 80 },
    { month: 'Jul', target: 4, actual: 3, progress: 75 },
    { month: 'Aug', target: 5, actual: 4, progress: 80 },
    { month: 'Sep', target: 4, actual: 3, progress: 75 },
    { month: 'Oct', target: 5, actual: 2, progress: 40 },
    { month: 'Nov', target: 4, actual: 2, progress: 50 },
    { month: 'Dec', target: 5, actual: 1, progress: 20 }
  ];

  // Calculate totals
  const projekTotal = {
    target: projekDeals.reduce((sum, m) => sum + m.target, 0),
    actual: projekDeals.reduce((sum, m) => sum + m.actual, 0)
  };
  projekTotal.progress = (projekTotal.actual / projekTotal.target) * 100;

  const retailTotal = {
    target: retailDeals.reduce((sum, m) => sum + m.target, 0),
    actual: retailDeals.reduce((sum, m) => sum + m.actual, 0)
  };
  retailTotal.progress = (retailTotal.actual / retailTotal.target) * 100;

  const distributorTotal = {
    target: distributorDeals.reduce((sum, m) => sum + m.target, 0),
    actual: distributorDeals.reduce((sum, m) => sum + m.actual, 0)
  };
  distributorTotal.progress = (distributorTotal.actual / distributorTotal.target) * 100;

  const grandTotal = {
    target: projekTotal.target + retailTotal.target + distributorTotal.target,
    actual: projekTotal.actual + retailTotal.actual + distributorTotal.actual
  };
  grandTotal.progress = (grandTotal.actual / grandTotal.target) * 100;

  // Helper function to calculate gap between actual and target
  const calculateGap = (actual: number, target: number): number => {
    return actual - target;
  };

  // Helper function to format deals gap display (Short/Surplus)
  const formatDealsGap = (gap: number): { label: string; value: string; isPositive: boolean } => {
    const absGap = Math.abs(gap);
    const formattedValue = `${absGap} deals`;
    
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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'border-green-500 bg-green-50';
    if (progress >= 90) return 'border-blue-500 bg-blue-50';
    if (progress >= 70) return 'border-yellow-500 bg-yellow-50';
    return 'border-red-500 bg-red-50';
  };

  const getProgressBadge = (progress: number) => {
    if (progress >= 100) return <Badge className="bg-green-600 text-white">Achieved</Badge>;
    if (progress >= 90) return <Badge className="bg-blue-600 text-white">On Track</Badge>;
    if (progress >= 70) return <Badge className="bg-yellow-600 text-white">Behind</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[800px] max-h-[calc(100%-2rem)] overflow-y-auto p-0 border-none shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Deals Breakdown - {employeeName}</DialogTitle>
          <DialogDescription>
            Year to Date (YTD) {year} - Target vs Actual Deals Performance for {employeeName}
          </DialogDescription>
        </VisuallyHidden>

        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 pt-6 px-6 border-b border-gray-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-xl font-bold flex items-center gap-2 text-gray-900">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Deals Breakdown - {employeeName}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Year to Date (YTD) {year} - Target vs Actual Deals Performance
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="ml-4 rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Grand Total Summary - Compact 3 cards */}
          <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
            {/* Total Deals */}
            <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-[#EEF7F5]">
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-gray-600 mb-1">Total Deals YTD</div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {grandTotal.actual} deals
                </div>
                <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                  <div>Target: {grandTotal.target} deals</div>
                  {(() => {
                    const gap = calculateGap(grandTotal.actual, grandTotal.target);
                    const { label, value, isPositive } = formatDealsGap(gap);
                    return (
                      <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {label}: {value}
                      </div>
                    );
                  })()}
                </div>
                <Progress value={grandTotal.progress} className="h-1.5 mb-1" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{grandTotal.progress.toFixed(1)}%</span>
                  {getProgressBadge(grandTotal.progress)}
                </div>
              </CardContent>
            </Card>

            {/* Segmen Proyek */}
            <Card className="border-2 border-[#038E7D] bg-gradient-to-br bg-[#EEF7F5]">
              <CardContent className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-[#013E37]" />
                  <div className="text-xs font-semibold text-gray-600">Segmen Proyek</div>
                </div>
                <div className="text-xl font-bold text-[#013E37] mb-1">
                  {projekTotal.actual} deals
                </div>
                <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                  <div>Target: {projekTotal.target} deals</div>
                  {(() => {
                    const gap = calculateGap(projekTotal.actual, projekTotal.target);
                    const { label, value, isPositive } = formatDealsGap(gap);
                    return (
                      <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {label}: {value}
                      </div>
                    );
                  })()}
                </div>
                <Progress value={projekTotal.progress} className="h-1.5 mb-1" />
                <div className="text-xs font-semibold">{projekTotal.progress.toFixed(1)}%</div>
              </CardContent>
            </Card>

            {/* Retail Segment */}
            <Card className="border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  <div className="text-xs font-semibold text-gray-600">Retail Segment</div>
                </div>
                <div className="text-xl font-bold text-emerald-600 mb-1">
                  {retailTotal.actual} deals
                </div>
                <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                  <div>Target: {retailTotal.target} deals</div>
                  {(() => {
                    const gap = calculateGap(retailTotal.actual, retailTotal.target);
                    const { label, value, isPositive } = formatDealsGap(gap);
                    return (
                      <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {label}: {value}
                      </div>
                    );
                  })()}
                </div>
                <Progress value={retailTotal.progress} className="h-1.5 mb-1" />
                <div className="text-xs font-semibold">{retailTotal.progress.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Segment Breakdown Tabs */}
          <Tabs defaultValue="projek" className="w-full">
            <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start w-full">
              <TabsTrigger value="projek" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-xs">Proyek</span>
                <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">QUARTERLY</span>
              </TabsTrigger>
              <TabsTrigger value="retail" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-xs">IntraClinic</span>
                <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">MONTHLY</span>
              </TabsTrigger>
              <TabsTrigger value="distributor" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white flex-1">
                <span className="font-bold text-xs">Distributor</span>
                <span className="text-[8px] uppercase tracking-wider font-semibold opacity-60">MONTHLY</span>
              </TabsTrigger>
            </TabsList>

            {/* Projek Monthly View */}
            <TabsContent value="projek" className="space-y-4">
              <div className="p-4 bg-gradient-to-r bg-[#EEF7F5] rounded-lg border border-[#C3DDD9]">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-[#013E37]" />
                  Segmen Proyek - Monthly Deals {year}
                </h3>
                
                {/* Monthly Cards - 4 columns */}
                <div className="grid grid-cols-4 gap-2">
                  {projekDeals.map((month, index) => {
                    const gap = month.actual - month.target;
                    const isPositive = gap >= 0;
                    
                    return (
                      <Card key={index} className={`border ${getProgressColor(month.progress)}`}>
                        <CardContent className="p-3">
                          <div className="text-xs font-semibold text-gray-600 mb-2">{month.month}</div>
                          
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-[#013E37]">
                              {month.actual} deals
                            </div>
                            <div className="text-xs text-gray-600">
                              of {month.target} deals
                            </div>
                            <div className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {isPositive ? 'Surplus' : 'Short'}: {Math.abs(gap)}
                            </div>
                            <Progress value={month.progress} className="h-1.5" />
                            <div className="text-xs font-semibold text-center">{month.progress.toFixed(0)}%</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Retail Monthly View */}
            <TabsContent value="retail" className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-50 rounded-lg border border-emerald-200">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  IntraClinic - Monthly Deals {year}
                </h3>
                
                {/* Monthly Cards - 4 columns */}
                <div className="grid grid-cols-4 gap-2">
                  {retailDeals.map((month, index) => {
                    const gap = month.actual - month.target;
                    const isPositive = gap >= 0;
                    
                    return (
                      <Card key={index} className={`border ${getProgressColor(month.progress)}`}>
                        <CardContent className="p-3">
                          <div className="text-xs font-semibold text-gray-600 mb-2">{month.month}</div>
                          
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-emerald-600">
                              {month.actual} deals
                            </div>
                            <div className="text-xs text-gray-600">
                              of {month.target} deals
                            </div>
                            <div className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {isPositive ? 'Surplus' : 'Short'}: {Math.abs(gap)}
                            </div>
                            <Progress value={month.progress} className="h-1.5" />
                            <div className="text-xs font-semibold text-center">{month.progress.toFixed(0)}%</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Distributor Monthly View */}
            <TabsContent value="distributor" className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-600" />
                  Distributor - Monthly Deals {year}
                </h3>
                
                {/* Monthly Cards - 4 columns */}
                <div className="grid grid-cols-4 gap-2">
                  {distributorDeals.map((month, index) => {
                    const gap = month.actual - month.target;
                    const isPositive = gap >= 0;
                    
                    return (
                      <Card key={index} className={`border ${getProgressColor(month.progress)}`}>
                        <CardContent className="p-3">
                          <div className="text-xs font-semibold text-gray-600 mb-2">{month.month}</div>
                          
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-gray-600">
                              {month.actual} deals
                            </div>
                            <div className="text-xs text-gray-600">
                              of {month.target} deals
                            </div>
                            <div className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {isPositive ? 'Surplus' : 'Short'}: {Math.abs(gap)}
                            </div>
                            <Progress value={month.progress} className="h-1.5" />
                            <div className="text-xs font-semibold text-center">{month.progress.toFixed(0)}%</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
