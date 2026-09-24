import React, { useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Target, Award, Star, Zap, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { leaderboardData, kpiSummary } from '@/app/data/kpiData';

export function SalesLeaderboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('Januari 2026');
  
  const topThree = leaderboardData.slice(0, 3);
  const restOfTeam = leaderboardData.slice(3);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const getAvatarUrl = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  };
  
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 via-yellow-500 to-yellow-600';
    if (rank === 2) return 'from-gray-300 via-gray-400 to-gray-500';
    if (rank === 3) return 'from-orange-400 via-orange-500 to-orange-600';
    return 'from-blue-400 to-blue-600';
  };
  
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-300" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-300" />;
    return <Trophy className="h-5 w-5 text-blue-300" />;
  };

  return (
    <div className="min-h-screen bg-transparent p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="h-10 w-10 text-yellow-500" />
          <h1 className="text-2xl font-bold text-[#013E37]">
            Sales Leaderboard
          </h1>
          <Trophy className="h-10 w-10 text-yellow-500" />
        </div>
        <p className="text-gray-500 text-lg">IntraMedika Sales Excellence Program - {selectedPeriod}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Sales Team</p>
                <p className="text-2xl font-bold text-gray-900">{kpiSummary.total_sales_team}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(kpiSummary.total_revenue_achieved).replace('Rp', 'Rp ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#013E37] to-emerald-500 flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Avg Achievement</p>
                <p className="text-2xl font-bold text-gray-900">{kpiSummary.average_achievement.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Elite Circle</p>
                <p className="text-2xl font-bold text-gray-900">{kpiSummary.elite_circle_members} Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Podium - Top 3 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-gray-900 text-center flex items-center justify-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Hall of Champions
            <Star className="h-5 w-5 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 items-end">
            {/* Rank 2 - Silver */}
            {topThree[1] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${getRankBadgeColor(2)} p-1`}>
                    <img
                      src={getAvatarUrl(topThree[1].employee_name)}
                      alt={topThree[1].employee_name}
                      className="h-full w-full rounded-full border-4 border-white shadow-md"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center border-2 border-white shadow-md">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {topThree[1].employee_name}
                </h3>
                <p className="text-gray-500 text-sm mb-2">{formatCurrency(topThree[1].actual_revenue)}</p>
                <Badge className="bg-gray-400 text-white">{topThree[1].target_achieved_percent}% Target</Badge>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {topThree[0] && (
              <div className="flex flex-col items-center transform scale-110">
                <div className="relative mb-4">
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 rounded-full blur opacity-75 animate-pulse"></div>
                  <div className={`relative h-32 w-32 rounded-full bg-gradient-to-br ${getRankBadgeColor(1)} p-1`}>
                    <img
                      src={getAvatarUrl(topThree[0].employee_name)}
                      alt={topThree[0].employee_name}
                      className="h-full w-full rounded-full border-4 border-yellow-300"
                    />
                  </div>
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Crown className="h-12 w-12 text-yellow-500 drop-shadow-lg" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-2 border-white shadow-lg">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                </div>
                <h3 className="text-yellow-600 font-bold text-xl mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {topThree[0].employee_name}
                </h3>
                <p className="text-yellow-700 text-base font-semibold mb-2">{formatCurrency(topThree[0].actual_revenue)}</p>
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-sm px-3 py-1">
                  🏆 {topThree[0].target_achieved_percent}% Target
                </Badge>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {topThree[2] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${getRankBadgeColor(3)} p-1`}>
                    <img
                      src={getAvatarUrl(topThree[2].employee_name)}
                      alt={topThree[2].employee_name}
                      className="h-full w-full rounded-full border-4 border-white shadow-md"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-white shadow-md">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {topThree[2].employee_name}
                </h3>
                <p className="text-gray-500 text-sm mb-2">{formatCurrency(topThree[2].actual_revenue)}</p>
                <Badge className="bg-orange-400 text-white">{topThree[2].target_achieved_percent}% Target</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Complete Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Representative</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Achieved</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Module</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Achievements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboardData.map((entry) => (
                  <tr 
                    key={entry.employee_id} 
                    className={`hover:bg-gray-50 transition-colors ${entry.rank <= 3 ? 'bg-yellow-50/60' : ''}`}
                  >
                    {/* Rank */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getRankBadgeColor(entry.rank)} flex items-center justify-center font-bold text-white`}>
                          {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
                        </div>
                      </div>
                    </td>

                    {/* Name & Avatar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(entry.employee_name)}
                          alt={entry.employee_name}
                          className="h-10 w-10 rounded-full border-2 border-blue-500"
                        />
                        <div>
                          <div className="text-gray-900 font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {entry.employee_name}
                          </div>
                          <div className="text-gray-500 text-xs">{entry.total_closings} Closings</div>
                        </div>
                      </div>
                    </td>

                    {/* Target Achieved */}
                    <td className="px-6 py-4">
                      <div className="w-48">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-semibold ${entry.is_elite ? 'text-yellow-600' : 'text-gray-900'}`}>
                            {entry.target_achieved_percent}%
                          </span>
                          {entry.is_elite && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <Progress 
                          value={Math.min(entry.target_achieved_percent, 100)} 
                          className="h-2"
                        />
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-semibold">
                        {formatCurrency(entry.actual_revenue)}
                      </div>
                    </td>

                    {/* Top Module */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        className={
                          entry.top_module === 'E-Catalog' ? 'bg-[#013E37] text-white' :
                          entry.top_module === 'Solar' ? 'bg-blue-600 text-white' :
                          'bg-green-600 text-white'
                        }
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {entry.top_module}
                      </Badge>
                    </td>

                    {/* Badges */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {entry.badges.slice(0, 2).map((badge, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Award className="h-3 w-3 mr-1" />
                            {badge}
                          </Badge>
                        ))}
                        {entry.badges.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                            +{entry.badges.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
