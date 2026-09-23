import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

interface AIFeaturesSectionProps {
  personName: string;
  personRole: string;
}

export function AIFeaturesSection({ personName, personRole }: AIFeaturesSectionProps) {
  const [aiTab, setAiTab] = useState<'insights' | 'coaching' | 'recommendations' | 'conversation' | 'scoring'>('insights');

  return (
    <Card className="border-2 border-[#013E37] bg-gradient-to-r from-[#EEF7F5] to-white">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 text-[#013E37]">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 7H7v6h6V7z" />
            <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
          </svg>
          AI-Powered Analytics & Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* AI Tabs Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-[#013E37]/20 pb-4">
          <button
            onClick={() => setAiTab('insights')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              aiTab === 'insights'
                ? 'bg-[#013E37] text-white shadow-lg'
                : 'bg-white text-[#013E37] border-2 border-[#013E37]/30 hover:border-[#013E37] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Customer Insights
            </div>
          </button>
          <button
            onClick={() => setAiTab('coaching')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              aiTab === 'coaching'
                ? 'bg-[#013E37] text-white shadow-lg'
                : 'bg-white text-[#013E37] border-2 border-[#013E37]/30 hover:border-[#013E37] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              Sales Coaching
            </div>
          </button>
          <button
            onClick={() => setAiTab('recommendations')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              aiTab === 'recommendations'
                ? 'bg-[#013E37] text-white shadow-lg'
                : 'bg-white text-[#013E37] border-2 border-[#013E37]/30 hover:border-[#013E37] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              Recommendations
            </div>
          </button>
          <button
            onClick={() => setAiTab('conversation')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              aiTab === 'conversation'
                ? 'bg-[#013E37] text-white shadow-lg'
                : 'bg-white text-[#013E37] border-2 border-[#013E37]/30 hover:border-[#013E37] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Conversation Intel
            </div>
          </button>
          <button
            onClick={() => setAiTab('scoring')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              aiTab === 'scoring'
                ? 'bg-[#013E37] text-white shadow-lg'
                : 'bg-white text-[#013E37] border-2 border-[#013E37]/30 hover:border-[#013E37] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
              Lead Scoring
            </div>
          </button>
        </div>

        {/* AI Tab Content */}
        {aiTab === 'insights' && (
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-[#013E37] flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              AI Customer Insights & Analytics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:border-[#013E37] transition-all">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Customer Segmentation</p>
                    <p className="text-sm text-gray-600 mt-1">3 high-value segments identified with 78% conversion potential</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Enterprise: 45%</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">SMB: 33%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:border-[#013E37] transition-all">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Buying Patterns</p>
                    <p className="text-sm text-gray-600 mt-1">Q1 shows 23% increase in deals via jalur Distributor, peak time: Tue-Thu 10AM-2PM</p>
                    <div className="mt-2">
                      <span className="text-xs bg-[#DFF0EC] text-[#013E37] px-2 py-1 rounded-full font-semibold">Avg Deal: Rp 28.8M</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:border-[#013E37] transition-all">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Churn Risk Analysis</p>
                    <p className="text-sm text-gray-600 mt-1">12 accounts at risk (Rp 450M), recommended immediate action</p>
                    <div className="mt-2">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">High Risk: 12</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:border-[#013E37] transition-all">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Revenue Forecast</p>
                    <p className="text-sm text-gray-600 mt-1">Projected to reach 95% of annual target by Q3 with current velocity</p>
                    <div className="mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">Confidence: 87%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {aiTab === 'coaching' && (
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-[#013E37] flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              </svg>
              AI Sales Coaching Recommendations
            </h4>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-green-50 to-white rounded-lg border-2 border-green-300">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Improve Discovery Calls</p>
                    <p className="text-sm text-gray-600 mt-1">Team averages 4.2 questions per call vs benchmark of 6.5. Focus on needs analysis training for junior executives.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Priority: High</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Impact: +15% win rate</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border-2 border-blue-300">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Objection Handling Workshop</p>
                    <p className="text-sm text-gray-600 mt-1">Price objections up 18% this quarter. Schedule role-play sessions focusing on value demonstration.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Priority: Medium</span>
                      <span className="text-xs bg-[#DFF0EC] text-[#013E37] px-2 py-1 rounded-full">Timeline: 2 weeks</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-[#EEF7F5] to-white rounded-lg border-2 border-[#5BB5AB]">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#EEF7F5]0 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Cross-Sell Training</p>
                    <p className="text-sm text-gray-600 mt-1">Only 23% of clients via jalur Distributor also order Paket Aksesoris & Talang. Recommend product bundling workshop.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-[#DFF0EC] text-[#013E37] px-2 py-1 rounded-full">Potential: Rp 380M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {aiTab === 'recommendations' && (
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-[#013E37] flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI Smart Recommendations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-[#013E37] text-white px-2 py-1 rounded-full font-bold">URGENT</span>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="font-semibold text-gray-900">Follow up Toko Bangunan Sinar Jaya</p>
                <p className="text-sm text-gray-600 mt-2">Last contact 14 days ago. Deal value Rp 450M at 65% probability. Recommend immediate call.</p>
                <button className="mt-3 w-full bg-[#013E37] text-white px-4 py-2 rounded-lg hover:bg-[#025C52] transition-colors text-sm font-semibold">
                  Schedule Call Now
                </button>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-bold">OPPORTUNITY</span>
                  <span className="text-xs text-gray-500">5 hours ago</span>
                </div>
                <p className="font-semibold text-gray-900">Upsell to Existing Clients</p>
                <p className="text-sm text-gray-600 mt-2">8 clients via jalur Distributor eligible for Onduvilla upgrade. Estimated value: Rp 320M.</p>
                <button className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                  View Accounts
                </button>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold">OPTIMIZE</span>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                <p className="font-semibold text-gray-900">Territory Rebalancing</p>
                <p className="text-sm text-gray-600 mt-2">Jakarta territory at 142% capacity. Recommend redistributing 6 accounts to Bogor team.</p>
                <button className="mt-3 w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                  Review Plan
                </button>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-[#EEF7F5]0 text-white px-2 py-1 rounded-full font-bold">INSIGHT</span>
                  <span className="text-xs text-gray-500">2 days ago</span>
                </div>
                <p className="font-semibold text-gray-900">Best Time to Call</p>
                <p className="text-sm text-gray-600 mt-2">Kontraktor decision makers most responsive Wed-Thu 2-4 PM. Conversion rate: 34% vs 18% avg.</p>
                <button className="mt-3 w-full bg-[#EEF7F5]0 text-white px-4 py-2 rounded-lg hover:bg-[#013E37] transition-colors text-sm font-semibold">
                  Update Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        {aiTab === 'conversation' && (
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-[#013E37] flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              AI Conversation Intelligence
            </h4>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900">Talk-to-Listen Ratio Analysis</p>
                  <span className="text-sm font-bold text-[#013E37]">Last 30 Days</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-600">42%</p>
                    <p className="text-xs text-gray-600 mt-1">Talk Time</p>
                    <span className="text-xs text-green-600">✓ Optimal</span>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">58%</p>
                    <p className="text-xs text-gray-600 mt-1">Listen Time</p>
                    <span className="text-xs text-blue-600">✓ Good</span>
                  </div>
                  <div className="text-center p-3 bg-[#EEF7F5] rounded-lg border border-[#C3DDD9]">
                    <p className="text-2xl font-bold text-[#013E37]">5.8</p>
                    <p className="text-xs text-gray-600 mt-1">Avg Questions</p>
                    <span className="text-xs text-[#013E37]">Near Target</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20">
                <p className="font-semibold text-gray-900 mb-3">Sentiment Analysis</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Positive</span>
                      <span className="font-bold text-green-600">68%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Neutral</span>
                      <span className="font-bold text-gray-600">24%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-400 h-2 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Negative</span>
                      <span className="font-bold text-red-600">8%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-[#013E37]/20">
                <p className="font-semibold text-gray-900 mb-3">Key Topics Discussed</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#013E37] text-white rounded-full text-sm">Pricing (42%)</span>
                  <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm">Implementation (38%)</span>
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm">Support (28%)</span>
                  <span className="px-3 py-1 bg-[#EEF7F5]0 text-white rounded-full text-sm">Integration (23%)</span>
                  <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm">Training (19%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {aiTab === 'scoring' && (
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-[#013E37] flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
              AI Lead Scoring & Prediction
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border-2 border-green-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Hot Leads</p>
                    <p className="text-2xl font-bold text-green-600">23</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">Score: 80-100 | Est: Rp 1.2B</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-yellow-50 to-white rounded-lg border-2 border-yellow-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Warm Leads</p>
                    <p className="text-2xl font-bold text-yellow-600">47</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-yellow-600 mt-2">Score: 50-79 | Est: Rp 890M</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 border-blue-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cold Leads</p>
                    <p className="text-2xl font-bold text-blue-600">68</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">Score: 0-49 | Est: Rp 420M</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-gray-900">Top Scored Leads This Week</p>
              
              <div className="p-4 bg-white rounded-lg border-2 border-green-300 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">95</span>
                      <div>
                        <p className="font-bold text-gray-900">CV Karya Konstruksi Mandiri</p>
                        <p className="text-xs text-gray-600">Onduline Classic (Proyek)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Budget Confirmed</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Decision Maker Engaged</span>
                      <span className="text-xs bg-[#DFF0EC] text-[#013E37] px-2 py-1 rounded-full">Proposal Sent</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">Rp 520M</p>
                    <p className="text-xs text-gray-600">Close: 7 days</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-green-300 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">92</span>
                      <div>
                        <p className="font-bold text-gray-900">Toko Bangunan Berkah Jaya</p>
                        <p className="text-xs text-gray-600">Onduvilla + Aksesoris Bundle</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Demo Completed</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Price Negotiation</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">Rp 380M</p>
                    <p className="text-xs text-gray-600">Close: 14 days</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-yellow-300 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-8 w-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-sm">76</span>
                      <div>
                        <p className="font-bold text-gray-900">Apotek K-24 Network</p>
                        <p className="text-xs text-gray-600">Retail POS System</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Follow-up Scheduled</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Need Info</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600">Rp 280M</p>
                    <p className="text-xs text-gray-600">Close: 21 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}