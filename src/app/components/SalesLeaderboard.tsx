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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="h-10 w-10 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Sales Leaderboard
          </h1>
          <Trophy className="h-10 w-10 text-yellow-400" />
        </div>
        <p className="text-blue-200 text-lg">IntraMedika Sales Excellence Program - {selectedPeriod}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-800 to-blue-900 border-blue-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-600/50 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-200" />
              </div>
              <div>
                <p className="text-blue-200 text-sm">Total Sales Team</p>
                <p className="text-2xl font-bold text-white">{kpiSummary.total_sales_team}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-800 to-green-900 border-green-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-600/50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-200" />
              </div>
              <div>
                <p className="text-green-200 text-sm">Total Revenue</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(kpiSummary.total_revenue_achieved).replace('Rp', 'Rp ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#012D29] to-[#012D29] border-[#013E37]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#013E37]/50 flex items-center justify-center">
                <Target className="h-6 w-6 text-[#C3DDD9]" />
              </div>
              <div>
                <p className="text-[#C3DDD9] text-sm">Avg Achievement</p>
                <p className="text-2xl font-bold text-white">{kpiSummary.average_achievement.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-700 to-yellow-800 border-yellow-600">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-600/50 flex items-center justify-center">
                <Crown className="h-6 w-6 text-yellow-200" />
              </div>
              <div>
                <p className="text-yellow-200 text-sm">Elite Circle</p>
                <p className="text-2xl font-bold text-white">{kpiSummary.elite_circle_members} Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Podium - Top 3 */}
      <Card className="bg-slate-800/50 border-slate-700 mb-8 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-center flex items-center justify-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Hall of Champions
            <Star className="h-5 w-5 text-yellow-400" />
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
                      className="h-full w-full rounded-full border-4 border-slate-700"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center border-2 border-slate-700">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {topThree[1].employee_name}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{formatCurrency(topThree[1].actual_revenue)}</p>
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
                    <Crown className="h-12 w-12 text-yellow-400 drop-shadow-lg" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-2 border-yellow-300 shadow-lg">
                    <span className="text-white font-bold text-xl">1</span>
                  </div>
                </div>
                <h3 className="text-yellow-400 font-bold text-xl mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {topThree[0].employee_name}
                </h3>
                <p className="text-yellow-200 text-base font-semibold mb-2">{formatCurrency(topThree[0].actual_revenue)}</p>
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
                      className="h-full w-full rounded-full border-4 border-slate-700"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-slate-700">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {topThree[2].employee_name}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{formatCurrency(topThree[2].actual_revenue)}</p>
                <Badge className="bg-orange-400 text-white">{topThree[2].target_achieved_percent}% Target</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Leaderboard Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Complete Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Sales Representative</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Target Achieved</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Top Module</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Achievements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {leaderboardData.map((entry) => (
                  <tr 
                    key={entry.employee_id} 
                    className={`hover:bg-slate-700/30 transition-colors ${entry.rank <= 3 ? 'bg-slate-700/20' : ''}`}
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
                          <div className="text-white font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {entry.employee_name}
                          </div>
                          <div className="text-gray-400 text-xs">{entry.total_closings} Closings</div>
                        </div>
                      </div>
                    </td>

                    {/* Target Achieved */}
                    <td className="px-6 py-4">
                      <div className="w-48">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-semibold ${entry.is_elite ? 'text-yellow-400' : 'text-white'}`}>
                            {entry.target_achieved_percent}%
                          </span>
                          {entry.is_elite && <Crown className="h-4 w-4 text-yellow-400" />}
                        </div>
                        <Progress 
                          value={Math.min(entry.target_achieved_percent, 100)} 
                          className="h-2"
                        />
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white font-semibold">
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
                          <Badge key={idx} variant="outline" className="text-xs bg-slate-700 text-blue-200 border-blue-500">
                            <Award className="h-3 w-3 mr-1" />
                            {badge}
                          </Badge>
                        ))}
                        {entry.badges.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-slate-700 text-gray-300">
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
