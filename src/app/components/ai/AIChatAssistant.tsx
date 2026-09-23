import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, X, Send, Sparkles, TrendingUp, Users, 
  Target, Mail, Calendar, FileText, Lightbulb, Zap,
  MinimizeIcon, Maximize2
} from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface QuickAction {
  icon: any;
  label: string;
  query: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: Target, label: 'Top Leads Today', query: 'Show me my top priority leads today' },
  { icon: TrendingUp, label: 'Revenue Forecast', query: 'What is my revenue forecast this month?' },
  { icon: Users, label: 'At-Risk Clients', query: 'Which clients are at risk of churning?' },
  { icon: Mail, label: 'Follow-ups Due', query: 'Who do I need to follow up with today?' },
  { icon: Calendar, label: 'Schedule Tips', query: 'When is the best time to contact leads?' },
  { icon: Lightbulb, label: 'Upsell Opportunities', query: 'Show me upsell opportunities' }
];

const AI_KNOWLEDGE_BASE = {
  greetings: [
    "Hello! I'm your AI Sales Assistant. How can I help you today?",
    "Hi there! Ready to crush your sales goals? What can I do for you?",
    "Hey! I'm here to help you close more deals. What do you need?"
  ],
  topLeads: {
    response: "Based on AI analysis, here are your top 3 priority leads today:",
    leads: [
      { name: "Toko Bangunan Sinar Jaya", score: 92, probability: 87, value: "Rp 285 juta", reason: "Budget confirmed, decision maker met" },
      { name: "CV Karya Konstruksi Mandiri", score: 78, probability: 73, value: "Rp 125 juta", reason: "High engagement, ready for demo" },
      { name: "PT Graha Bangun Persada", score: 65, probability: 58, value: "Rp 450 juta", reason: "Large project, competitive bid" }
    ],
    suggestions: ["View detailed scoring", "Send follow-up email", "Schedule demos"]
  },
  forecast: {
    response: "Here's your revenue forecast for this month:",
    data: {
      projected: "Rp 847 juta",
      confidence: "±15%",
      deals: 12,
      avgDealSize: "Rp 70.5 juta",
      topContributor: "Toko Bangunan Sinar Jaya (Rp 285 juta)"
    },
    suggestions: ["View detailed forecast", "See pipeline breakdown", "Adjust targets"]
  },
  atRisk: {
    response: "⚠️ These clients need immediate attention:",
    clients: [
      { name: "Distributor Atap Nusantara", risk: 68, reason: "No activity in 14 days", action: "Re-engagement campaign" },
      { name: "Toko Bangunan Berkah Jaya", risk: 45, reason: "Low order volume", action: "Check-in call" },
      { name: "CV Mitra Atap Sejahtera", risk: 52, reason: "Support tickets increasing", action: "Success manager meeting" }
    ],
    suggestions: ["Send re-engagement emails", "Schedule check-in calls", "Create action plan"]
  },
  followUps: {
    response: "📋 You have 5 follow-ups due today:",
    tasks: [
      { client: "Toko Bangunan Sinar Jaya", type: "Demo follow-up", priority: "High", daysOverdue: 0 },
      { client: "CV Karya Konstruksi Mandiri", type: "Proposal sent", priority: "High", daysOverdue: 2 },
      { client: "PT Graha Bangun Persada", type: "Budget discussion", priority: "Medium", daysOverdue: 0 },
      { client: "Toko Bangunan Berkah Jaya", type: "Contract negotiation", priority: "Critical", daysOverdue: 1 },
      { client: "Distributor Atap Nusantara", type: "Reference check", priority: "Low", daysOverdue: 0 }
    ],
    suggestions: ["Call now", "Send reminder emails", "Reschedule"]
  },
  bestTime: {
    response: "⏰ Based on historical data, here are the best times to contact kontraktor & toko decision makers:",
    schedule: {
      best: "Tuesday & Thursday, 9-11 AM",
      good: "Monday & Wednesday, 2-4 PM",
      avoid: "Friday afternoons, weekends",
      answerRate: "43% higher during optimal windows"
    },
    suggestions: ["Schedule calls now", "Set reminders", "View full calendar"]
  },
  upsell: {
    response: "💰 I found 4 high-value upsell opportunities:",
    opportunities: [
      { client: "Toko Bangunan Makmur Abadi", module: "Onduvilla", value: "Rp 85 juta", probability: 78, reason: "Currently using entry-level product, high order volume" },
      { client: "CV Mitra Atap Sejahtera", module: "Paket Aksesoris & Talang", value: "Rp 45 juta", probability: 65, reason: "Manual accessory ordering, ready to bundle" },
      { client: "Distributor Bahan Bangunan Prima", module: "Onduline Easyfix", value: "Rp 35 juta", probability: 82, reason: "Requested feature multiple times" },
      { client: "CV Karya Konstruksi Mandiri", module: "Garansi Extended", value: "Rp 25 juta", probability: 55, reason: "Growing project volume" }
    ],
    suggestions: ["Generate proposals", "Schedule demos", "Send ROI calculator"]
  }
};

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "👋 Hi! I'm your AI Sales Assistant. I can help you with lead prioritization, revenue forecasting, follow-up reminders, and more. What would you like to know?",
      timestamp: new Date(),
      suggestions: ['Top leads', 'Revenue forecast', 'Follow-ups due']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (userQuery: string): Message => {
    const query = userQuery.toLowerCase();
    
    // Greetings
    if (query.match(/^(hi|hello|hey|halo)/)) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: AI_KNOWLEDGE_BASE.greetings[Math.floor(Math.random() * AI_KNOWLEDGE_BASE.greetings.length)],
        timestamp: new Date(),
        suggestions: ['Top leads', 'Revenue forecast', 'At-risk clients']
      };
    }

    // Top Leads
    if (query.includes('top') && (query.includes('lead') || query.includes('priority'))) {
      const leads = AI_KNOWLEDGE_BASE.topLeads;
      let response = `${leads.response}\n\n`;
      leads.leads.forEach((lead, idx) => {
        response += `${idx + 1}. **${lead.name}**\n`;
        response += `   • AI Score: ${lead.score}/100 🔥\n`;
        response += `   • Close Probability: ${lead.probability}%\n`;
        response += `   • Deal Value: ${lead.value}\n`;
        response += `   • Why: ${lead.reason}\n\n`;
      });
      response += "💡 Focus on #1 and #2 today for maximum impact!";
      
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions: leads.suggestions
      };
    }

    // Revenue Forecast
    if (query.includes('forecast') || query.includes('revenue') || query.includes('prediction')) {
      const forecast = AI_KNOWLEDGE_BASE.forecast;
      let response = `${forecast.response}\n\n`;
      response += `📊 **Projected Revenue:** ${forecast.data.projected}\n`;
      response += `📈 **Confidence Level:** ${forecast.data.confidence}\n`;
      response += `🎯 **Expected Deals:** ${forecast.data.deals} deals\n`;
      response += `💰 **Avg Deal Size:** ${forecast.data.avgDealSize}\n`;
      response += `🏆 **Top Contributor:** ${forecast.data.topContributor}\n\n`;
      response += "You're on track to exceed your monthly target! 🚀";
      
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions: forecast.suggestions
      };
    }

    // At-Risk Clients
    if (query.includes('risk') || query.includes('churn') || query.includes('losing')) {
      const atRisk = AI_KNOWLEDGE_BASE.atRisk;
      let response = `${atRisk.response}\n\n`;
      atRisk.clients.forEach((client, idx) => {
        response += `${idx + 1}. **${client.name}** (${client.risk}% risk)\n`;
        response += `   • Issue: ${client.reason}\n`;
        response += `   • Action: ${client.action}\n\n`;
      });
      
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions: atRisk.suggestions
      };
    }

    // Follow-ups
    if (query.includes('follow') || query.includes('due') || query.includes('reminder')) {
      const followUps = AI_KNOWLEDGE_BASE.followUps;
      let response = `${followUps.response}\n\n`;
      followUps.tasks.forEach((task, idx) => {
        const overdueText = task.daysOverdue > 0 ? ` ⚠️ ${task.daysOverdue} days overdue!` : '';
        response += `${idx + 1}. **${task.client}**${overdueText}\n`;
        response += `   • Task: ${task.type}\n`;
        response += `   • Priority: ${task.priority}\n\n`;
      });
      
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions: followUps.suggestions
      };
    }

    // Best Time
    if (query.includes('time') || query.includes('when') || query.includes('schedule')) {
      const bestTime = AI_KNOWLEDGE_BASE.bestTime;
      let response = `${bestTime.response}\n\n`;
      response += `🟢 **Best Time:** ${bestTime.schedule.best}\n`;
      response += `🟡 **Good Time:** ${bestTime.schedule.good}\n`;
      response += `🔴 **Avoid:** ${bestTime.schedule.avoid}\n\n`;
      response += `📈 ${bestTime.schedule.answerRate}\n\n`;
      response += "Call your top leads between 9-11 AM for best results!";
      
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions: bestTime.suggestions
      };
    }

    // Upsell
    if (query.includes('upsell') || query.includes('cross-sell') || query.includes('expansion')) {
      const upsell = AI_KNOWLEDGE_BASE.upsell;
      let response = `${upsell.response}\n\n`;
      upsell.opportunities.forEach((opp, idx) => {
        response += `${idx + 1}. **${opp.client}** → ${opp.module}\n`;
        response += `   • Value: ${opp.value}\n`;
        response += `   • Success Probability: ${opp.probability}%\n`;
        response += `   • Why: ${opp.reason}\n\n`;
      });
      response += `💰 **Total Potential:** Rp 190 juta in upsells!`;
      
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: response,
        timestamp: new Date(),
        suggestions: upsell.suggestions
      };
    }

    // Default Response
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: "I can help you with:\n\n• 🎯 Lead prioritization & scoring\n• 📊 Revenue forecasting\n• ⚠️ At-risk client detection\n• 📋 Follow-up reminders\n• ⏰ Best contact times\n• 💰 Upsell opportunities\n• ✉️ Email generation\n• 📈 Performance analytics\n\nWhat would you like to explore?",
      timestamp: new Date(),
      suggestions: ['Show top leads', 'Revenue forecast', 'Upsell opportunities']
    };
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-[#013E37] to-[#025C52] text-white shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center z-50 group hover:scale-110"
      >
        <MessageCircle className="h-6 w-6" />
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-white animate-pulse" />
        </div>
        <div className="absolute -top-12 right-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          AI Sales Assistant
        </div>
      </button>
    );
  }

  return (
    <Card className={`fixed ${isMinimized ? 'bottom-6 right-6 w-80' : 'bottom-6 right-6 w-96'} shadow-2xl z-50 transition-all duration-300 border-2 border-[#013E37]`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#013E37] to-[#025C52] text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI Sales Assistant</h3>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                <p className="text-xs text-white/80">Online • Ready to help</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <MinimizeIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <CardContent className="p-4 h-96 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      message.type === 'user' 
                        ? 'bg-[#013E37] text-white' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs px-3 py-1 rounded-full border border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5] transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Quick Actions */}
          <div className="p-3 bg-white border-t">
            <p className="text-xs font-semibold text-gray-700 mb-2">Quick Actions:</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.slice(0, 4).map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.query)}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:border-[#013E37] hover:bg-[#EEF7F5] transition-colors text-left"
                  >
                    <Icon className="h-3 w-3 text-[#013E37] flex-shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#013E37] focus:border-transparent text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="h-10 w-10 rounded-full bg-[#013E37] hover:bg-[#025C52] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </>
      )}

      {isMinimized && (
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 text-center">
            Click to expand AI Assistant
          </p>
        </CardContent>
      )}
    </Card>
  );
}
