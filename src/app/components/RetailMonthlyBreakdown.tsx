import React, { useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Calendar, User, Building2, TrendingUp, Clock } from 'lucide-react';

interface RetailMonthlyBreakdownProps {
  achievement: number;
  target: number;
}

// Data dummy client & PIC per hari
const getDailyData = (month: string, monthNum: number) => {
  const daysInMonth = new Date(2025, monthNum, 0).getDate();
  const dailyData = [];
  
  const clients = [
    'Toko Bangunan Sinar Jaya',
    'Distributor Atap Nusantara',
    'CV Karya Konstruksi Mandiri',
    'Toko Bangunan Berkah Jaya',
    'PT Graha Bangun Persada',
    'Toko Bangunan Makmur Abadi',
    'CV Mitra Atap Sejahtera',
    'Distributor Bahan Bangunan Prima',
  ];

  const doctors = [
    'Bpk. Ahmad Hidayat, Pemilik Toko',
    'Ibu Siti Nurhaliza, Purchasing Manager',
    'Bpk. Budi Santoso, Kepala Proyek',
    'Ibu Rina Wijaya, Owner',
    'Bpk. Hendra Kusuma, General Manager',
    'Ibu Maya Sari, Kepala Gudang',
    'Bpk. Rudi Hartono, Procurement Lead',
    'Ibu Lisa Amelia, Owner',
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    const hasVisit = Math.random() > 0.3; // 70% chance ada visit
    if (hasVisit) {
      const numVisits = Math.floor(Math.random() * 3) + 1; // 1-3 visits per day
      for (let v = 0; v < numVisits; v++) {
        const clientIndex = Math.floor(Math.random() * clients.length);
        const doctorIndex = Math.floor(Math.random() * doctors.length);
        const revenue = (Math.random() * 50 + 10) * 1000; // 10K-60K
        
        dailyData.push({
          day,
          date: `${day.toString().padStart(2, '0')} ${month.slice(0, 3)} 2025`,
          client: clients[clientIndex],
          doctor: doctors[doctorIndex],
          revenue,
          time: `${8 + Math.floor(Math.random() * 8)}:${['00', '15', '30', '45'][Math.floor(Math.random() * 4)]}`,
          status: Math.random() > 0.2 ? 'Completed' : 'Scheduled',
        });
      }
    }
  }
  
  return dailyData.sort((a, b) => a.day - b.day);
};

export function RetailMonthlyBreakdown({ achievement, target }: RetailMonthlyBreakdownProps) {
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Calculate retail segment (33.3% of total)
  const retailAchievement = achievement * 0.333;
  const retailTarget = target * 0.333;

  // Monthly distribution percentages and statuses
  const monthlyData = [
    { month: 'Jan', fullMonth: 'January', monthNum: 1, percentage: 0.095, performance: 100, status: 'On Track', color: 'green', actual: 38, target: 35, short: 3 },
    { month: 'Feb', fullMonth: 'February', monthNum: 2, percentage: 0.088, performance: 97, status: 'On Track', color: 'green', actual: 32, target: 33, short: 1 },
    { month: 'Mar', fullMonth: 'March', monthNum: 3, percentage: 0.090, performance: 97, status: 'On Track', color: 'green', actual: 36, target: 37, short: 1 },
    { month: 'Apr', fullMonth: 'April', monthNum: 4, percentage: 0.075, performance: 90, status: 'At Risk', color: 'yellow', actual: 43, target: 40, short: -3 },
    { month: 'May', fullMonth: 'May', monthNum: 5, percentage: 0.087, performance: 97, status: 'On Track', color: 'green', actual: 37, target: 38, short: 1 },
    { month: 'Jun', fullMonth: 'June', monthNum: 6, percentage: 0.068, performance: 98, status: 'On Track', color: 'green', actual: 40, target: 41, short: 1 },
    { month: 'Jul', fullMonth: 'July', monthNum: 7, percentage: 0.089, performance: 87, status: 'On Track', color: 'green', actual: 34, target: 39, short: 5 },
    { month: 'Aug', fullMonth: 'August', monthNum: 8, percentage: 0.078, performance: 90, status: 'At Risk', color: 'yellow', actual: 38, target: 42, short: 4 },
    { month: 'Sep', fullMonth: 'September', monthNum: 9, percentage: 0.092, performance: 90, status: 'On Track', color: 'green', actual: 36, target: 40, short: 4 },
    { month: 'Oct', fullMonth: 'October', monthNum: 10, percentage: 0.089, performance: 74, status: 'Behind', color: 'red', actual: 32, target: 43, short: 11 },
    { month: 'Nov', fullMonth: 'November', monthNum: 11, percentage: 0.085, performance: 68, status: 'Behind', color: 'red', actual: 28, target: 41, short: 13 },
    { month: 'Dec', fullMonth: 'December', monthNum: 12, percentage: 0.094, performance: 51, status: 'Behind', color: 'red', actual: 23, target: 45, short: 22 },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          border: 'border-green-300',
          badge: 'bg-green-500',
          text: 'text-green-600',
          gradient: 'from-green-500 to-emerald-500',
          bg: 'bg-green-50',
        };
      case 'yellow':
        return {
          border: 'border-yellow-300',
          badge: 'bg-yellow-500',
          text: 'text-yellow-600',
          gradient: 'from-yellow-500 to-orange-500',
          bg: 'bg-yellow-50',
        };
      case 'red':
        return {
          border: 'border-red-300',
          badge: 'bg-red-500',
          text: 'text-red-600',
          gradient: 'from-red-500 to-pink-500',
          bg: 'bg-red-50',
        };
      case 'gray':
        return {
          border: 'border-gray-300',
          badge: 'bg-gray-400',
          text: 'text-gray-600',
          gradient: 'from-gray-400 to-gray-500',
          bg: 'bg-gray-50',
        };
      default:
        return {
          border: 'border-gray-300',
          badge: 'bg-gray-400',
          text: 'text-gray-600',
          gradient: 'from-gray-400 to-gray-500',
          bg: 'bg-gray-50',
        };
    }
  };

  const handleMonthClick = (data: any) => {
    setSelectedMonth(data);
    setShowDialog(true);
  };

  const formatNumber = (num: number) => {
    return parseInt(num.toFixed(0)).toLocaleString('id-ID');
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {monthlyData.map((data) => {
          const colors = getColorClasses(data.color);
          const actualValue = data.actual;
          const targetValue = data.target;
          const shortValue = data.short;

          return (
            <Card 
              key={data.month} 
              className={`border-2 ${colors.border} ${colors.bg} hover:shadow-lg transition-all cursor-pointer group`}
              onClick={() => handleMonthClick(data)}
            >
              <CardContent className="pt-3 pb-3">
                <div className="mb-2">
                  <h3 className="font-bold text-[#013E37] text-sm">{data.month}</h3>
                  <p className="text-2xl font-bold text-[#013E37] mt-1">
                    {actualValue}M
                  </p>
                  <p className="text-xs text-gray-500">of {targetValue}M</p>
                  <p className={`text-xs font-semibold ${shortValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {shortValue > 0 ? `Short: ${shortValue}M` : `Surplus: ${Math.abs(shortValue)}M`}
                  </p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`bg-gradient-to-r ${colors.gradient} h-2 rounded-full transition-all`} 
                    style={{ width: `${data.performance}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${colors.text}`}>{data.performance}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Calendar Dialog */}
      {selectedMonth && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-6xl max-h-[calc(100%-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl text-[#013E37]">
                <Calendar className="h-7 w-7" />
                Daily Breakdown - {selectedMonth.fullMonth} 2025
              </DialogTitle>
              <DialogDescription>
                Detailed view of daily visits and performance for {selectedMonth.fullMonth}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-r from-[#013E37] to-[#025C52] rounded-lg text-white">
                <div>
                  <p className="text-xs opacity-80">Total Actual</p>
                  <p className="text-2xl font-bold">{selectedMonth.actual}M</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">Target</p>
                  <p className="text-2xl font-bold">{selectedMonth.target}M</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">Achievement</p>
                  <p className="text-2xl font-bold">{selectedMonth.performance}%</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">{selectedMonth.short > 0 ? 'Short' : 'Surplus'}</p>
                  <p className={`text-2xl font-bold ${selectedMonth.short > 0 ? 'text-red-200' : 'text-green-200'}`}>
                    {Math.abs(selectedMonth.short)}M
                  </p>
                </div>
              </div>

              {/* Daily Data */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-[#013E37]">
                  <Calendar className="h-5 w-5" />
                  Visit Details per Day
                </h3>

                {getDailyData(selectedMonth.fullMonth, selectedMonth.monthNum).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    <p>No visits scheduled for this month</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {getDailyData(selectedMonth.fullMonth, selectedMonth.monthNum).map((visit, idx) => (
                      <Card 
                        key={idx} 
                        className="hover:shadow-md transition-shadow border-l-4 border-l-[#013E37]"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-[#013E37] text-white font-semibold">
                                  {visit.date}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`${
                                    visit.status === 'Completed' 
                                      ? 'border-green-500 text-green-700 bg-green-50' 
                                      : 'border-blue-500 text-blue-700 bg-blue-50'
                                  }`}
                                >
                                  {visit.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Clock className="h-4 w-4" />
                                  {visit.time}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                  <Building2 className="h-5 w-5 text-[#013E37] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-gray-500">Client</p>
                                    <p className="font-semibold text-gray-900">{visit.client}</p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2">
                                  <User className="h-5 w-5 text-[#013E37] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-gray-500">Doctor</p>
                                    <p className="font-semibold text-gray-900">{visit.doctor}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right ml-4">
                              <div className="flex items-center gap-1 text-[#013E37]">
                                <TrendingUp className="h-5 w-5" />
                                <p className="text-xl font-bold">
                                  Rp {formatNumber(visit.revenue / 1000)}K
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Revenue</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary Stats at bottom */}
              <div className="border-t pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Visits</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getDailyData(selectedMonth.fullMonth, selectedMonth.monthNum).length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getDailyData(selectedMonth.fullMonth, selectedMonth.monthNum).filter(v => v.status === 'Completed').length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#EEF7F5] rounded-lg">
                    <p className="text-sm text-gray-600">Scheduled</p>
                    <p className="text-2xl font-bold text-[#013E37]">
                      {getDailyData(selectedMonth.fullMonth, selectedMonth.monthNum).filter(v => v.status === 'Scheduled').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
