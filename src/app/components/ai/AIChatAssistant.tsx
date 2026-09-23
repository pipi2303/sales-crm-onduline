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

function getAuthToken(): string | undefined {
  try {
    const raw = localStorage.getItem('salesMonitorUser');
    if (!raw) return undefined;
    return JSON.parse(raw)?.accessToken;
  } catch {
    return undefined;
  }
}

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


  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const outgoingText = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: outgoingText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // 10 giliran terakhir sebagai konteks percakapan untuk API --
      // pesan sistem/error tidak ikut dikirim, hanya user/ai.
      const history = messages
        .filter(m => m.type === 'user' || m.type === 'ai')
        .slice(-10)
        .map(m => ({ role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.content }));

      const token = getAuthToken();
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: outgoingText, history }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'AI Assistant sedang bermasalah, coba lagi sebentar lagi.');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: body.data?.reply || '(Tidak ada balasan dari AI Assistant)',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorText = error?.message || 'Gagal menghubungi AI Assistant. Periksa koneksi Anda dan coba lagi.';
      toast.error(errorText);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: errorText,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
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
