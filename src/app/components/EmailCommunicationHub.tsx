import React, { useState } from 'react';
import { Search, Plus, Send, Mail, Inbox, Star, Archive, Trash2, Eye, Reply, Forward, Paperclip, Clock, CheckCircle, Users, FileText, Tag, Edit } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { formatDate } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CHART_COLORS, CHART_GRID, CHART_TOOLTIP_STYLE } from '@/styles/chartTheme';

interface Email {
  id: string;
  from: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  status: 'sent' | 'draft' | 'scheduled';
  category: string;
  attachments?: Attachment[];
  relatedTo?: string;
  opened?: boolean;
  clicked?: boolean;
  replied?: boolean;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  usageCount: number;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed';
  scheduledDate?: string;
  sentDate?: string;
}

export function EmailCommunicationHub() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  // Dummy data - Emails
  const [emails] = useState<Email[]>([
    {
      id: '1',
      from: 'Budi Hartono',
      fromEmail: 'budi@majujaya.com',
      to: ['me@gmail.com'],
      subject: 'Re: Enterprise Plan Demo Follow-up',
      body: 'Thank you for the demo presentation. We are very interested in proceeding with the Enterprise Plan. Could you send us the formal quotation?',
      date: '2024-02-19T10:30:00',
      read: false,
      starred: true,
      status: 'sent',
      category: 'Sales',
      relatedTo: 'OPP-001',
      opened: true,
      replied: false
    },
    {
      id: '2',
      from: 'Sarah Wijaya',
      fromEmail: 'sarah@berkahsejahtera.com',
      to: ['me@gmail.com'],
      subject: 'Contract Renewal Discussion',
      body: 'Hi, I would like to schedule a meeting to discuss our contract renewal terms. Are you available this week?',
      date: '2024-02-18T14:15:00',
      read: true,
      starred: false,
      status: 'sent',
      category: 'Customer Success',
      relatedTo: 'CONTRACT-002'
    },
    {
      id: '3',
      from: 'Me',
      fromEmail: 'me@gmail.com',
      to: ['prospects@gmail.com'],
      cc: ['marketing@gmail.com'],
      subject: 'Introducing Our New Features - Limited Time Offer',
      body: 'Dear valued customers, we are excited to announce new features...',
      date: '2024-02-17T09:00:00',
      read: true,
      starred: false,
      status: 'sent',
      category: 'Marketing',
      attachments: [
        { id: '1', name: 'new-features.pdf', size: '2.5 MB', type: 'application/pdf' }
      ],
      opened: true,
      clicked: true
    },
    {
      id: '4',
      from: 'Andi Prakoso',
      fromEmail: 'andi@gmail.com',
      to: ['me@gmail.com'],
      subject: 'Payment Confirmation',
      body: 'We have completed the payment for invoice #INV-2024-001. Please confirm receipt.',
      date: '2024-02-16T16:45:00',
      read: true,
      starred: false,
      status: 'sent',
      category: 'Finance'
    },
    {
      id: '5',
      from: 'Me',
      fromEmail: 'me@gmail.com',
      to: ['client@gmail.com'],
      subject: 'Demo Reminder - Tomorrow at 2 PM',
      body: 'This is a friendly reminder about our demo session scheduled for tomorrow...',
      date: '2024-02-20T08:00:00',
      read: true,
      starred: false,
      status: 'scheduled',
      category: 'Sales'
    },
  ]);

  // Email Templates
  const [templates] = useState<EmailTemplate[]>([
    {
      id: '1',
      name: 'Welcome Email',
      subject: 'Welcome to [Company Name]!',
      body: 'Dear [Client Name],\n\nWelcome to our platform! We are excited to have you on board...',
      category: 'Onboarding',
      usageCount: 45
    },
    {
      id: '2',
      name: 'Demo Follow-up',
      subject: 'Thank you for attending our demo',
      body: 'Dear [Client Name],\n\nThank you for taking the time to attend our product demonstration...',
      category: 'Sales',
      usageCount: 32
    },
    {
      id: '3',
      name: 'Quote Follow-up',
      subject: 'Following up on your quotation request',
      body: 'Dear [Client Name],\n\nI wanted to follow up on the quotation we sent you on [Date]...',
      category: 'Sales',
      usageCount: 28
    },
    {
      id: '4',
      name: 'Contract Renewal Reminder',
      subject: 'Your contract is expiring soon',
      body: 'Dear [Client Name],\n\nWe noticed that your contract is set to expire on [Date]...',
      category: 'Customer Success',
      usageCount: 18
    },
    {
      id: '5',
      name: 'Payment Reminder',
      subject: 'Payment reminder for Invoice #[Invoice Number]',
      body: 'Dear [Client Name],\n\nThis is a friendly reminder that payment for invoice #[Invoice Number]...',
      category: 'Finance',
      usageCount: 22
    },
  ]);

  // Email Campaigns
  const [campaigns] = useState<EmailCampaign[]>([
    {
      id: '1',
      name: 'Q1 Product Launch',
      subject: 'Introducing Revolutionary New Features',
      recipients: 500,
      sent: 500,
      opened: 325,
      clicked: 156,
      replied: 42,
      status: 'completed',
      sentDate: '2024-02-15'
    },
    {
      id: '2',
      name: 'Customer Satisfaction Survey',
      subject: 'We value your feedback',
      recipients: 250,
      sent: 250,
      opened: 180,
      clicked: 95,
      replied: 38,
      status: 'completed',
      sentDate: '2024-02-10'
    },
    {
      id: '3',
      name: 'End of Quarter Promotion',
      subject: 'Special Offer - 20% Discount',
      recipients: 750,
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      status: 'scheduled',
      scheduledDate: '2024-02-25'
    },
  ]);

  // Statistics
  const stats = {
    totalEmails: emails.length,
    unread: emails.filter(e => !e.read).length,
    sent: emails.filter(e => e.status === 'sent' && e.from === 'Me').length,
    starred: emails.filter(e => e.starred).length,
    totalTemplates: templates.length,
    totalCampaigns: campaigns.length,
    avgOpenRate: ((campaigns.reduce((sum, c) => sum + (c.opened / Math.max(c.sent, 1)), 0) / Math.max(campaigns.length, 1)) * 100).toFixed(1),
    avgClickRate: ((campaigns.reduce((sum, c) => sum + (c.clicked / Math.max(c.sent, 1)), 0) / Math.max(campaigns.length, 1)) * 100).toFixed(1)
  };

  // Chart data
  const campaignPerformanceData = campaigns.map(c => ({
    name: c.name.substring(0, 15) + '...',
    opened: c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(1) : 0,
    clicked: c.sent > 0 ? ((c.clicked / c.sent) * 100).toFixed(1) : 0,
    replied: c.sent > 0 ? ((c.replied / c.sent) * 100).toFixed(1) : 0,
  }));

  const emailVolumeData = [
    { month: 'Sep', sent: 320, received: 450 },
    { month: 'Oct', sent: 380, received: 520 },
    { month: 'Nov', sent: 420, received: 580 },
    { month: 'Dec', sent: 490, received: 650 },
    { month: 'Jan', sent: 550, received: 720 },
    { month: 'Feb', sent: 180, received: 280 },
  ];

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendEmail = () => {
    toast.success('Email sent successfully!');
    setShowComposeDialog(false);
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    toast.success(`Template "${template.name}" loaded`);
    setShowTemplateDialog(false);
    setShowComposeDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#013E37]">
          Email & Communication Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Email template library, follow-up automation & campaign tracking with analytics
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmails}</div>
            <p className="text-xs text-muted-foreground">All conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Inbox className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Outgoing mail</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-[#EEF7F5]0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Avg campaign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.avgClickRate}%</div>
            <p className="text-xs text-muted-foreground">Engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-5">
          <TabsTrigger value="inbox" className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Inbox</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Received</span>
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Sent</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Outgoing</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Templates</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Ready to Use</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Campaigns</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Bulk Emails</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Analytics</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowComposeDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Compose
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Your received emails and messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredEmails.filter(e => e.from !== 'Me').map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${
                      !email.read ? 'bg-blue-50/50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      setSelectedEmail(email);
                      setShowEmailDetail(true);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {email.from.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold ${!email.read ? 'text-blue-600' : ''}`}>
                                {email.from}
                              </h3>
                              {!email.read && <Badge variant="default" className="bg-blue-500">New</Badge>}
                              {email.starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                              {email.relatedTo && (
                                <Badge variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {email.relatedTo}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{email.fromEmail}</p>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <h4 className={`font-medium mb-1 ${!email.read ? 'text-blue-600' : ''}`}>
                          {email.subject}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{email.body}</p>
                        <div className="flex gap-2 mt-2">
                          {email.attachments && email.attachments.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {email.attachments.length} attachment(s)
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{email.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent Emails</CardTitle>
              <CardDescription>Your outgoing emails and tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {emails.filter(e => e.from === 'Me').map((email) => (
                  <div
                    key={email.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{email.subject}</h4>
                          {email.status === 'scheduled' && (
                            <Badge variant="default" className="bg-orange-500">
                              <Clock className="h-3 w-3 mr-1" />
                              Scheduled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          To: {email.to.join(', ')}
                        </p>
                        <div className="flex gap-2">
                          {email.opened && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <Eye className="h-3 w-3 mr-1" />
                              Opened
                            </Badge>
                          )}
                          {email.clicked && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Clicked
                            </Badge>
                          )}
                          {email.replied && (
                            <Badge variant="outline" className="text-xs bg-[#EEF7F5] text-[#013E37] border-[#C3DDD9]">
                              <Reply className="h-3 w-3 mr-1" />
                              Replied
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(email.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Email Templates</h3>
              <p className="text-sm text-muted-foreground">Pre-configured templates for faster email composition</p>
            </div>
            <Button onClick={() => setShowTemplateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.category}</CardDescription>
                    </div>
                    <Badge variant="outline">{template.usageCount} uses</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <p className="text-sm font-medium">{template.subject}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Body Preview</Label>
                    <p className="text-sm text-muted-foreground line-clamp-3">{template.body}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Email Campaigns</h3>
              <p className="text-sm text-muted-foreground">Bulk email campaigns with tracking and analytics</p>
            </div>
            <Button onClick={() => setShowCampaignDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription>{campaign.subject}</CardDescription>
                    </div>
                    <Badge
                      variant={campaign.status === 'completed' ? 'default' : campaign.status === 'sending' ? 'default' : 'outline'}
                      className={
                        campaign.status === 'completed' ? 'bg-green-500' :
                        campaign.status === 'sending' ? 'bg-blue-500' :
                        campaign.status === 'scheduled' ? 'bg-orange-500' : ''
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="text-center p-3 bg-accent/30 rounded-lg">
                      <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-2xl font-bold">{campaign.recipients}</div>
                      <div className="text-xs text-muted-foreground">Recipients</div>
                    </div>
                    <div className="text-center p-3 bg-accent/30 rounded-lg">
                      <Send className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-2xl font-bold">{campaign.sent}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Eye className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">
                        {campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Open Rate</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <div className="text-2xl font-bold text-blue-600">
                        {campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Click Rate</div>
                    </div>
                    <div className="text-center p-3 bg-[#EEF7F5] rounded-lg">
                      <Reply className="h-5 w-5 mx-auto mb-1 text-[#013E37]" />
                      <div className="text-2xl font-bold text-[#013E37]">
                        {campaign.sent > 0 ? ((campaign.replied / campaign.sent) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Reply Rate</div>
                    </div>
                  </div>
                  {campaign.scheduledDate && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Scheduled for: {formatDate(campaign.scheduledDate)}
                    </div>
                  )}
                  {campaign.sentDate && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Sent on: {formatDate(campaign.sentDate)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Open, click, and reply rates by campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaignPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="opened" fill={CHART_COLORS[0]} name="Open %" />
                    <Bar dataKey="clicked" fill={CHART_COLORS[1]} name="Click %" />
                    <Bar dataKey="replied" fill={CHART_COLORS[2]} name="Reply %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Volume</CardTitle>
                <CardDescription>Sent and received emails over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={emailVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="sent" stroke={CHART_COLORS[0]} strokeWidth={2} name="Sent" />
                    <Line type="monotone" dataKey="received" stroke={CHART_COLORS[1]} strokeWidth={2} name="Received" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Detail Dialog */}
      <Dialog open={showEmailDetail} onOpenChange={setShowEmailDetail}>
        <DialogContent className="max-w-3xl max-h-[calc(100%-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details - {selectedEmail?.subject}</DialogTitle>
            <DialogDescription>
              Detailed view of the communication between your team and the client
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="p-4 bg-accent/30 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold">{selectedEmail.subject}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(selectedEmail.date)}
                    </p>
                  </div>
                  {selectedEmail.starred && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">From:</span>
                    <span className="font-medium">{selectedEmail.from} &lt;{selectedEmail.fromEmail}&gt;</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">To:</span>
                    <span className="font-medium">{selectedEmail.to.join(', ')}</span>
                  </div>
                  {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16">Cc:</span>
                      <span className="font-medium">{selectedEmail.cc.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <p className="whitespace-pre-wrap">{selectedEmail.body}</p>
              </div>

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div>
                  <Label className="mb-2 block">Attachments</Label>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">{attachment.size}</span>
                        <Button variant="outline" size="sm">Download</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDetail(false)}>Close</Button>
            <Button variant="outline">
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline">
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Email Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>
              Draft and send a professional email to your leads or clients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To *</Label>
              <Input placeholder="recipient@gmail.com" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Cc (Optional)</Label>
                <Input placeholder="cc@gmail.com" />
              </div>
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="support">Customer Success</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input placeholder="Email subject" />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea rows={10} placeholder="Type your message here..." />
            </div>
            <div>
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach File
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>Cancel</Button>
            <Button variant="secondary">Save Draft</Button>
            <Button onClick={handleSendEmail}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Design a reusable email template for faster client communication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input placeholder="e.g., Welcome Email" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="support">Customer Success</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input placeholder="Email subject (use [Client Name] for dynamic fields)" />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea rows={8} placeholder="Email body (use [Client Name], [Date], etc. for dynamic fields)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Template created successfully!');
              setShowTemplateDialog(false);
            }}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Launch a targeted email campaign to multiple recipients in your pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Q1 Product Launch" />
            </div>
            <div>
              <Label>Email Subject *</Label>
              <Input placeholder="Subject line for the campaign" />
            </div>
            <div>
              <Label>Email Body *</Label>
              <Textarea rows={6} placeholder="Campaign message..." />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Recipients List</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contacts</SelectItem>
                    <SelectItem value="prospects">Prospects Only</SelectItem>
                    <SelectItem value="customers">Active Customers</SelectItem>
                    <SelectItem value="inactive">Inactive Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule (Optional)</Label>
                <Input type="datetime-local" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>Cancel</Button>
            <Button variant="secondary">Save as Draft</Button>
            <Button onClick={() => {
              toast.success('Campaign created successfully!');
              setShowCampaignDialog(false);
            }}>
              Create & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
