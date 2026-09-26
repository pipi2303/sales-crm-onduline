import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, Users, Plus, Search, Filter, Edit2, Trash2, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, ChevronDown, ChevronUp, ChevronRight, Building2, User, UserPlus, UserCheck, UserX, DoorOpen, Laptop, MonitorPlay, Timer, RotateCcw, Mail, Settings, FileText, TrendingUp, Brain, Send, Trophy, Target, Award, Star, Zap, BarChart3, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Demo } from '@/app/data/dummyData';
import { demosApi } from '@/services/api';
import { toast } from 'sonner';
import { DemoAdvancedInfo } from '@/app/components/DemoAdvancedInfo';
import { DemoReschedule } from '@/app/components/DemoReschedule';
import { initializeDemosData } from '@/utils/initializeDemos';

export function DemoScheduler() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Demo>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    schedule: false,
    details: false,
    advanced: false,
    rating: true,
  });

  // Advanced Scheduling States
  const [attendees, setAttendees] = useState<Array<{
    id: string;
    name: string;
    email: string;
    type: 'internal' | 'external';
    rsvp: 'pending' | 'accepted' | 'declined';
  }>>([]);

  const [resources, setResources] = useState<Array<{
    id: string;
    name: string;
    type: 'room' | 'equipment' | 'software';
  }>>([]);

  const [bufferTime, setBufferTime] = useState({ before: 15, after: 15 });
  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeType, setNewAttendeeType] = useState<'internal' | 'external'>('external');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState<'room' | 'equipment' | 'software'>('room');

  // Rating & Review States
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  // New Feature States
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showSmartScheduler, setShowSmartScheduler] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Helper function to convert string date to Date object
  const parseDate = (date: any): Date => {
    if (date instanceof Date) return date;
    return new Date(date);
  };

  // Helper function to format date for input
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    // Initialize demo data on component mount
    initializeDemosData();
    fetchDemos();
  }, []);

  const fetchDemos = async () => {
    try {
      setLoading(true);
      const result = await demosApi.getAll();
      
      if (result.success && result.data) {
        console.log('📊 Demos loaded from backend:', result.data);
        
        // Check if data has advanced scheduling
        const hasAdvancedScheduling = result.data.some((demo: Demo) => 
          demo.attendees && demo.attendees.length > 0
        );
        
        console.log('✅ Has advanced scheduling?', hasAdvancedScheduling);
        console.log('📝 First demo sample:', result.data[0]);
        
        setDemos(result.data);
      } else {
        toast.error(result.error || 'Failed to load demos');
      }
    } catch (error: any) {
      console.error('Error fetching demos:', error);
      toast.error('Error loading demos');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetDemos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Resetting demos to dummy data...');
      
      // Clear backend data
      await demosApi.clearAll();
      
      // Re-initialize with dummy data
      const result = initializeDemosData();
      
      if (result.success) {
        // Fetch the newly initialized data
        await fetchDemos();
        toast.success(`Demos reset successfully! ${result.count} demos loaded.`);
      } else {
        toast.error('Failed to reset demos');
      }
    } catch (error: any) {
      console.error('Error resetting demos:', error);
      toast.error('Error resetting demos');
    } finally {
      setLoading(false);
    }
  };

  // Demo Templates
  const demoTemplates = [
    {
      id: 'enterprise',
      name: 'Enterprise Demo',
      icon: Building2,
      color: 'bg-[#013E37]',
      duration: 60,
      product: 'Enterprise Suite',
      description: 'Comprehensive demo for large organizations',
      defaultAttendees: ['Sales Manager', 'Technical Architect', 'Account Executive'],
      defaultResources: ['Conference Room A', 'Projector', 'Enterprise Demo Environment']
    },
    {
      id: 'smb',
      name: 'SMB Quick Demo',
      icon: Zap,
      color: 'bg-[#013E37]',
      duration: 30,
      product: 'Business Edition',
      description: 'Fast-paced demo for small-medium businesses',
      defaultAttendees: ['Sales Rep', 'Product Specialist'],
      defaultResources: ['Meeting Room B', 'SMB Demo Environment']
    },
    {
      id: 'technical',
      name: 'Technical Deep Dive',
      icon: Settings,
      color: 'bg-[#013E37]',
      duration: 90,
      product: 'Platform API',
      description: 'In-depth technical demonstration',
      defaultAttendees: ['Solutions Engineer', 'Technical Lead', 'DevOps Specialist'],
      defaultResources: ['Lab Environment', 'API Sandbox', 'Technical Documentation']
    },
    {
      id: 'executive',
      name: 'Executive Briefing',
      icon: Star,
      color: 'bg-[#013E37]',
      duration: 45,
      product: 'Strategic Overview',
      description: 'High-level strategic presentation',
      defaultAttendees: ['VP Sales', 'Account Director', 'Executive Sponsor'],
      defaultResources: ['Executive Boardroom', 'Presentation System']
    }
  ];

  // Apply template to form
  const applyTemplate = (templateId: string) => {
    const template = demoTemplates.find(t => t.id === templateId);
    if (!template) return;

    setFormData({
      ...formData,
      duration: template.duration,
      product: template.product,
      notes: template.description
    });

    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rescheduled: 'bg-yellow-100 text-yellow-800'
  };

  const upcomingDemos = demos.filter(d => d.status === 'scheduled' && d.date >= new Date());
  const completedDemos = demos.filter(d => d.status === 'completed');

  const handleAddDemo = () => {
    setFormData({});
    setSelectedDemo(null);
    setAttendees([]);
    setResources([]);
    setBufferTime({ before: 15, after: 15 });
    setRating(0);
    setReviewText('');
    setReviewerName('');
    setReviewDate('');
    setIsDialogOpen(true);
  };

  const handleEditDemo = (demo: Demo) => {
    setFormData(demo);
    setSelectedDemo(demo);
    // Load advanced scheduling data
    setAttendees(demo.attendees || []);
    setResources(demo.resources || []);
    setBufferTime(demo.bufferTime || { before: 15, after: 15 });
    // Load rating & review data
    setRating((demo as any).rating || 0);
    setReviewText((demo as any).reviewText || '');
    setReviewerName((demo as any).reviewerName || '');
    setReviewDate((demo as any).reviewDate || '');
    setIsDialogOpen(true);
  };

  const handleViewDetail = (demo: Demo) => {
    setSelectedDemo(demo);
    setIsDetailOpen(true);
  };

  const handleSaveDemo = async () => {
    setIsSubmitting(true);
    if (selectedDemo) {
      // Update existing demo - include advanced scheduling data and rating & review
      const updatedData = {
        ...formData,
        attendees: attendees,
        resources: resources,
        bufferTime: bufferTime,
        rating: rating,
        reviewText: reviewText,
        reviewerName: reviewerName,
        reviewDate: reviewDate
      };
      const result = await demosApi.update(selectedDemo.id, updatedData);
      if (result.success) {
        const updatedDemo = { ...selectedDemo, ...updatedData };
        setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
        toast.success('Demo berhasil diupdate');
      } else {
        toast.error(result.error || 'Failed to update demo');
      }
    } else {
      // Create new demo - include advanced scheduling data and rating & review
      const newDemo: Demo = {
        id: `D${String(demos.length + 1).padStart(3, '0')}`,
        title: formData.title || '',
        leadName: formData.leadName || '',
        company: formData.company || '',
        date: formData.date || new Date(),
        time: formData.time || '',
        duration: formData.duration || 60,
        presenter: formData.presenter || '',
        product: formData.product || '',
        status: 'scheduled',
        meetingLink: formData.meetingLink || '',
        notes: formData.notes || '',
        attendees: attendees,
        resources: resources,
        bufferTime: bufferTime,
        rating: rating,
        reviewText: reviewText,
        reviewerName: reviewerName,
        reviewDate: reviewDate
      };
      const result = await demosApi.create(newDemo);
      if (result.success && result.data) {
        setDemos([...demos, result.data]);
        toast.success('Demo baru berhasil dijadwalkan');
      } else {
        toast.error(result.error || 'Failed to create demo');
      }
    }
    setIsSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDeleteDemo = async (id: string) => {
    const result = await demosApi.delete(id);
    if (result.success) {
      setDemos(demos.filter(d => d.id !== id));
      toast.success('Demo berhasil dihapus');
    } else {
      toast.error(result.error || 'Failed to delete demo');
    }
  };

  const handleJoinMeeting = (link: string) => {
    toast.success('Membuka link meeting...');
    window.open(link, '_blank');
  };

  const handleReschedule = async (updatedDemo: Demo) => {
    const result = await demosApi.update(updatedDemo.id, updatedDemo);
    if (result.success) {
      setDemos(demos.map(d => d.id === updatedDemo.id ? updatedDemo : d));
      setSelectedDemo(updatedDemo);
      toast.success('Demo berhasil dijadwal ulang!');
    } else {
      toast.error(result.error || 'Failed to reschedule demo');
    }
  };

  const filteredDemos = demos.filter(demo => {
    const matchesSearch = demo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          demo.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          demo.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || demo.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Demo Scheduler
          </h1>
          <p className="text-gray-600 mt-1">Kelola dan jadwalkan demo produk</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleResetDemos} 
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Data
          </Button>
          <Button 
            onClick={() => setShowSmartScheduler(true)} 
            variant="outline"
          >
            <Brain className="h-4 w-4 mr-2" />
            Smart Scheduler
          </Button>
          <Button onClick={handleAddDemo} className="bg-[#013E37] hover:bg-[#025C52]">
            <Plus className="h-4 w-4 mr-2" />
            Jadwalkan Demo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Demo</p>
                <p className="text-2xl font-bold">{demos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingDemos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{completedDemos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <span className="text-white font-bold">{((completedDemos.length / demos.length) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{((completedDemos.length / demos.length) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start">
          <TabsTrigger value="upcoming" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white min-w-[120px]">
            <span className="font-bold text-sm">Upcoming Demos</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">DEMO MENDATANG</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white min-w-[120px]">
            <span className="font-bold text-sm">All Demos</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">SEMUA JADWAL</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white min-w-[120px]">
            <span className="font-bold text-sm">Calendar View</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">TAMPILAN KALENDER</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white min-w-[120px]">
            <div className="flex items-center gap-1.5 justify-center">
              <FileText className="h-4 w-4" />
              <span className="font-bold text-sm">Templates</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">SETUP CEPAT</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white min-w-[120px]">
            <div className="flex items-center gap-1.5 justify-center">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold text-sm">Metrics</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">ANALITIK PERFORMA</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-[#013E37] data-[state=active]:shadow-sm data-[state=active]:text-white min-w-[120px]">
            <div className="flex items-center gap-1.5 justify-center">
              <Trophy className="h-4 w-4" />
              <span className="font-bold text-sm">Leaderboard</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">RANKING PRESENTER</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingDemos.map((demo) => (
            <Card key={demo.id} className="hover:shadow-lg transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-lg bg-[#013E37] flex items-center justify-center">
                        <Video className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{demo.title}</h3>
                        <Badge className={statusColors[demo.status]}>{demo.status.toUpperCase()}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Client Info</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{demo.leadName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{demo.company}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Schedule</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{parseDate(demo.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{demo.time} ({demo.duration} menit)</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Demo Details</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{demo.product}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>Presenter: {demo.presenter}</span>
                        </div>
                      </div>
                    </div>

                    {demo.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Notes:</p>
                        <p className="text-sm text-gray-700">{demo.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleJoinMeeting(demo.meetingLink)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Join Meeting
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditDemo(demo)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteDemo(demo.id)}>
                      <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {filteredDemos.map((demo) => (
              <Card 
                key={demo.id} 
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleViewDetail(demo)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-[#013E37] flex items-center justify-center">
                        <Video className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{demo.title}</h3>
                        <p className="text-sm text-gray-600">{demo.leadName} • {demo.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div>
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {parseDate(demo.date).toLocaleDateString('id-ID')}
                      </div>
                      <div>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {demo.time}
                      </div>
                      <Badge className={statusColors[demo.status]}>{demo.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Calendar View - Demo Schedule</span>
                <span className="text-sm font-normal text-gray-500">Klik card untuk lihat detail lengkap</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demos
                  .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
                  .map((demo) => (
                    <div 
                      key={demo.id} 
                      onClick={() => handleViewDetail(demo)}
                      className="flex items-center gap-4 p-4 bg-[#EEF7F5] rounded-lg hover:shadow-md transition-all cursor-pointer hover:bg-[#d6e8e7] hover:scale-[1.02]"
                    >
                      <div className="text-center min-w-16">
                        <div className="text-2xl font-bold text-[#013E37]">{parseDate(demo.date).getDate()}</div>
                        <div className="text-xs text-gray-600">{parseDate(demo.date).toLocaleDateString('id-ID', { month: 'short' })}</div>
                      </div>
                      <div className="h-12 w-1 bg-[#013E37] rounded"></div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{demo.title}</h4>
                        <p className="text-sm text-gray-600">
                          <Clock className="h-3.5 w-3.5 inline mr-1" />
                          {demo.time} ({demo.duration} min) • {demo.leadName} ({demo.company})
                        </p>
                        <p className="text-xs text-[#013E37] mt-1">
                          <Video className="h-3 w-3 inline mr-1" />
                          {demo.product} • Presenter: {demo.presenter}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[demo.status]}>{demo.status}</Badge>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#013E37] transition-colors" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#013E37]" />
                Demo Templates - Quick Setup
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">Pilih template untuk auto-fill demo details dan hemat waktu hingga 70%</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {demoTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <Card 
                      key={template.id} 
                      className="hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-[#C3DDD9]"
                      onClick={() => {
                        setIsDialogOpen(true);
                        applyTemplate(template.id);
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <IconComponent className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">{template.name}</h3>
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{template.duration} minutes</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Video className="h-3.5 w-3.5" />
                                <span>{template.product}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Users className="h-3.5 w-3.5" />
                                <span>{template.defaultAttendees.length} default attendees</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button 
                          className={`w-full mt-4 bg-gradient-to-r ${template.color} hover:opacity-90`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsDialogOpen(true);
                            applyTemplate(template.id);
                          }}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Usage Tips */}
              <Card className="mt-6 bg-[#EEF7F5] border-[#013E37]/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-[#013E37] mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Pro Tips:</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Templates auto-fill duration, product, and suggested attendees</li>
                        <li>• Customize any field after applying template</li>
                        <li>• Save 5-10 minutes per demo scheduling</li>
                        <li>• Consistent setup = better demo quality</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* METRICS TAB */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Demos */}
            <Card className="bg-[#013E37] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Demos</p>
                    <p className="text-2xl font-bold mt-1">{demos.length}</p>
                  </div>
                  <Video className="h-10 w-10 text-white/70" />
                </div>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card className="bg-[#013E37] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Success Rate</p>
                    <p className="text-2xl font-bold mt-1">{((completedDemos.length / demos.length) * 100).toFixed(0)}%</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-white/70" />
                </div>
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="bg-[#013E37] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Upcoming</p>
                    <p className="text-2xl font-bold mt-1">{upcomingDemos.length}</p>
                  </div>
                  <Calendar className="h-10 w-10 text-white/70" />
                </div>
              </CardContent>
            </Card>

            {/* Avg Duration */}
            <Card className="bg-[#013E37] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Avg Duration</p>
                    <p className="text-2xl font-bold mt-1">
                      {Math.round(demos.reduce((acc, d) => acc + (d.duration || 60), 0) / demos.length)} min
                    </p>
                  </div>
                  <Clock className="h-10 w-10 text-white/70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Product */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#013E37]" />
                Performance by Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(demos.map(d => d.product))).map(product => {
                  const productDemos = demos.filter(d => d.product === product);
                  const productCompleted = productDemos.filter(d => d.status === 'completed').length;
                  const successRate = (productCompleted / productDemos.length) * 100;
                  
                  return (
                    <div key={product} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{product}</span>
                        <span className="text-sm text-gray-600">{productDemos.length} demos • {successRate.toFixed(0)}% success</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-[#013E37] h-2.5 rounded-full transition-all"
                          style={{ width: `${successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Performance by Presenter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#013E37]" />
                Performance by Presenter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(demos.map(d => d.presenter))).map(presenter => {
                  const presenterDemos = demos.filter(d => d.presenter === presenter);
                  const presenterCompleted = presenterDemos.filter(d => d.status === 'completed').length;
                  const successRate = (presenterCompleted / presenterDemos.length) * 100;
                  
                  return (
                    <div key={presenter} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center text-white font-semibold">
                            {presenter.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium text-gray-900">{presenter}</span>
                        </div>
                        <span className="text-sm text-gray-600">{presenterDemos.length} demos • {successRate.toFixed(0)}% success</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 rounded-full transition-all"
                          style={{ width: `${successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-400" />
                Presenter Performance Leaderboard
              </CardTitle>
              <p className="text-gray-300 text-sm mt-2">Top performers ranked by success rate and total demos</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(new Set(demos.map(d => d.presenter)))
                  .map(presenter => {
                    const presenterDemos = demos.filter(d => d.presenter === presenter);
                    const presenterCompleted = presenterDemos.filter(d => d.status === 'completed').length;
                    const successRate = (presenterCompleted / presenterDemos.length) * 100;
                    return { presenter, total: presenterDemos.length, completed: presenterCompleted, successRate };
                  })
                  .sort((a, b) => b.successRate - a.successRate || b.total - a.total)
                  .map((data, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const medal = index < 3 ? medals[index] : null;
                    const bgColors = [
                      'from-yellow-500/20 to-orange-500/20 border-yellow-400',
                      'from-gray-400/20 to-gray-500/20 border-gray-300',
                      'from-orange-600/20 to-orange-700/20 border-orange-400'
                    ];
                    
                    return (
                      <Card 
                        key={data.presenter} 
                        className={`bg-gradient-to-r ${index < 3 ? bgColors[index] : 'from-gray-700/50 to-gray-800/50 border-gray-600'} border-2`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-12">
                                {medal ? (
                                  <span className="text-2xl">{medal}</span>
                                ) : (
                                  <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                                )}
                              </div>
                              <div className="h-14 w-14 rounded-full bg-[#013E37] flex items-center justify-center text-white font-bold text-lg">
                                {data.presenter.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-white">{data.presenter}</h3>
                                <p className="text-sm text-gray-300">{data.total} total demos • {data.completed} completed</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-400" />
                                <span className="text-2xl font-bold text-white">{data.successRate.toFixed(0)}%</span>
                              </div>
                              <p className="text-xs text-gray-300 mt-1">Success Rate</p>
                            </div>
                          </div>
                          
                          {/* Achievement Badges */}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {data.successRate === 100 && (
                              <Badge className="bg-yellow-500 text-yellow-900">
                                <Star className="h-3 w-3 mr-1" />
                                Perfect Score
                              </Badge>
                            )}
                            {data.total >= 3 && (
                              <Badge className="bg-blue-500 text-blue-900">
                                <Target className="h-3 w-3 mr-1" />
                                High Volume
                              </Badge>
                            )}
                            {data.successRate >= 80 && (
                              <Badge className="bg-green-500 text-green-900">
                                <Award className="h-3 w-3 mr-1" />
                                Top Performer
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Star className="h-10 w-10 text-yellow-200" />
                  <div>
                    <p className="text-yellow-100 text-xs">Top Performer</p>
                    <p className="text-xl font-bold mt-0.5">
                      {Array.from(new Set(demos.map(d => d.presenter)))
                        .map(p => ({
                          presenter: p,
                          rate: (demos.filter(d => d.presenter === p && d.status === 'completed').length / demos.filter(d => d.presenter === p).length) * 100
                        }))
                        .sort((a, b) => b.rate - a.rate)[0]?.presenter}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Zap className="h-10 w-10 text-green-200" />
                  <div>
                    <p className="text-green-100 text-xs">Highest Success Rate</p>
                    <p className="text-xl font-bold mt-0.5">
                      {Math.max(...Array.from(new Set(demos.map(d => d.presenter)))
                        .map(p => (demos.filter(d => d.presenter === p && d.status === 'completed').length / demos.filter(d => d.presenter === p).length) * 100)
                      ).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#013E37] text-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Target className="h-10 w-10 text-white/70" />
                  <div>
                    <p className="text-white/80 text-xs">Most Active</p>
                    <p className="text-xl font-bold mt-0.5">
                      {Array.from(new Set(demos.map(d => d.presenter)))
                        .map(p => ({ presenter: p, count: demos.filter(d => d.presenter === p).length }))
                        .sort((a, b) => b.count - a.count)[0]?.presenter.split(' ')[0]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-[900px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden flex flex-col">
          <DialogDescription className="sr-only">
            {selectedDemo ? `Edit demo schedule for ${selectedDemo.clientName} - ${selectedDemo.title}` : 'Create new demo schedule with client information, demo details, participants, and logistics'}
          </DialogDescription>
          
          {/* HEADER */}
          <DialogHeader className="relative bg-[#013E37] text-white px-6 py-5 space-y-0 flex-shrink-0">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-3">
              {/* Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold leading-tight">
                    {formData.title || (selectedDemo ? 'Edit Demo' : 'Jadwalkan Demo Baru')}
                  </DialogTitle>
                  <DialogDescription className="text-white/80 text-sm mt-1 leading-tight">
                    {formData.company || 'Product Demo Schedule'}
                  </DialogDescription>
                </div>
              </div>

              {/* Status Badges */}
              {selectedDemo && (
                <div className="flex gap-2 flex-wrap">
                  {formData.status && (
                    <Badge className={
                      formData.status === 'scheduled' 
                        ? 'bg-blue-500 text-blue-900 hover:bg-blue-600' 
                        : formData.status === 'completed'
                        ? 'bg-emerald-500 text-emerald-900 hover:bg-emerald-600'
                        : 'bg-red-500 text-red-900 hover:bg-red-600'
                    }>
                      {formData.status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveDemo(); }} className="flex flex-col flex-1 overflow-hidden">
            {/* CONTENT - Scrollable area */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              
              {/* SECTION 1: Client Information */}
              <div className="bg-[#EEF7F5] rounded-xl border border-[#013E37]/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('info')}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-[#013E37]/10 hover:bg-[#013E37]/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">Client Information</span>
                  </div>
                  {expandedSections.info ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.info && (
                  <div className="p-5 space-y-4 bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-semibold text-gray-700">Judul Demo</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Demo Enterprise Plan"
                        className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="leadName" className="text-sm font-semibold text-gray-700">Nama Lead</Label>
                        <Input
                          id="leadName"
                          name="leadName"
                          value={formData.leadName || ''}
                          onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                          placeholder="Nama lead"
                          className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-semibold text-gray-700">Perusahaan</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company || ''}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Nama perusahaan"
                          className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Schedule */}
              <div className="bg-gradient-to-br from-emerald-50 to-[#EEF7F5] rounded-xl border border-emerald-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('schedule')}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-emerald-100/50 hover:bg-emerald-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-gray-900">Schedule & Timing</span>
                  </div>
                  {expandedSections.schedule ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.schedule && (
                  <div className="p-5 space-y-4 bg-white">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-sm font-semibold text-gray-700">Tanggal</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          value={formData.date ? formatDateForInput(formData.date) : ''}
                          onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time" className="text-sm font-semibold text-gray-700">Waktu</Label>
                        <Input
                          id="time"
                          name="time"
                          type="time"
                          value={formData.time || ''}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          placeholder="10:00"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-sm font-semibold text-gray-700">Durasi (menit)</Label>
                        <Input
                          id="duration"
                          name="duration"
                          type="number"
                          value={formData.duration || ''}
                          onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                          placeholder="60"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: Demo Details */}
              <div className="bg-[#EEF7F5] rounded-xl border border-[#013E37]/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('details')}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-[#013E37]/10 hover:bg-[#013E37]/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-[#013E37]" />
                    <span className="font-semibold text-gray-900">Demo Details</span>
                  </div>
                  {expandedSections.details ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.details && (
                  <div className="p-5 space-y-4 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="presenter" className="text-sm font-semibold text-gray-700">Presenter</Label>
                        <Input
                          id="presenter"
                          name="presenter"
                          value={formData.presenter || ''}
                          onChange={(e) => setFormData({ ...formData, presenter: e.target.value })}
                          placeholder="Nama presenter"
                          className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product" className="text-sm font-semibold text-gray-700">Produk</Label>
                        <Input
                          id="product"
                          name="product"
                          value={formData.product || ''}
                          onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                          placeholder="Nama produk"
                          className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meetingLink" className="text-sm font-semibold text-gray-700">Meeting Link</Label>
                      <Input
                        id="meetingLink"
                        name="meetingLink"
                        value={formData.meetingLink || ''}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                        placeholder="https://meet.zoom.us/..."
                        className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Catatan</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Catatan demo..."
                        rows={3}
                        className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: Advanced Scheduling */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('advanced')}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-100/50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">Advanced Scheduling</span>
                  </div>
                  {expandedSections.advanced ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {expandedSections.advanced && (
                  <div className="p-5 space-y-4 bg-white">
                    {/* Attendees */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Attendees</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="newAttendeeName"
                          name="newAttendeeName"
                          value={newAttendeeName}
                          onChange={(e) => setNewAttendeeName(e.target.value)}
                          placeholder="Nama"
                          className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                        />
                        <Input
                          id="newAttendeeEmail"
                          name="newAttendeeEmail"
                          value={newAttendeeEmail}
                          onChange={(e) => setNewAttendeeEmail(e.target.value)}
                          placeholder="Email"
                          className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                        />
                        <Select
                          value={newAttendeeType}
                          onValueChange={(value) => setNewAttendeeType(value as 'internal' | 'external')}
                          className="w-24"
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                            <SelectValue>{newAttendeeType}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="external">External</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gray-500 hover:bg-gray-600"
                          onClick={() => {
                            if (newAttendeeName && newAttendeeEmail) {
                              setAttendees([...attendees, {
                                id: `A${String(attendees.length + 1).padStart(3, '0')}`,
                                name: newAttendeeName,
                                email: newAttendeeEmail,
                                type: newAttendeeType,
                                rsvp: 'pending'
                              }]);
                              setNewAttendeeName('');
                              setNewAttendeeEmail('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {attendees.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">List Attendees:</p>
                          <ul className="space-y-1">
                            {attendees.map((attendee) => (
                              <li key={attendee.id} className="flex items-center gap-2">
                                <span className="font-medium">{attendee.name}</span>
                                <span className="text-sm text-gray-500">({attendee.email})</span>
                                <Badge
                                  className={
                                    attendee.rsvp === 'pending'
                                      ? 'bg-gray-500 text-gray-900 hover:bg-gray-600'
                                      : attendee.rsvp === 'accepted'
                                      ? 'bg-green-500 text-green-900 hover:bg-green-600'
                                      : 'bg-red-500 text-red-900 hover:bg-red-600'
                                  }
                                >
                                  {attendee.rsvp.toUpperCase()}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Resources */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Resources</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="newResourceName"
                          name="newResourceName"
                          value={newResourceName}
                          onChange={(e) => setNewResourceName(e.target.value)}
                          placeholder="Nama"
                          className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                        />
                        <Select
                          value={newResourceType}
                          onValueChange={(value) => setNewResourceType(value as 'room' | 'equipment' | 'software')}
                          className="w-24"
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                            <SelectValue>{newResourceType}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="room">Room</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="software">Software</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gray-500 hover:bg-gray-600"
                          onClick={() => {
                            if (newResourceName) {
                              setResources([...resources, {
                                id: `R${String(resources.length + 1).padStart(3, '0')}`,
                                name: newResourceName,
                                type: newResourceType
                              }]);
                              setNewResourceName('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {resources.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">List Resources:</p>
                          <ul className="space-y-1">
                            {resources.map((resource) => (
                              <li key={resource.id} className="flex items-center gap-2">
                                <span className="font-medium">{resource.name}</span>
                                <span className="text-sm text-gray-500">({resource.type})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Buffer Time */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Buffer Time</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="bufferTimeBefore"
                          name="bufferTimeBefore"
                          type="number"
                          value={bufferTime.before}
                          onChange={(e) => setBufferTime({ ...bufferTime, before: Number(e.target.value) })}
                          placeholder="Before"
                          className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500 w-24"
                        />
                        <Input
                          id="bufferTimeAfter"
                          name="bufferTimeAfter"
                          type="number"
                          value={bufferTime.after}
                          onChange={(e) => setBufferTime({ ...bufferTime, after: Number(e.target.value) })}
                          placeholder="After"
                          className="bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500 w-24"
                        />
                        <span className="text-sm text-gray-500">minutes</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: Rating & Review */}
              <div className={`rounded-xl border-2 overflow-hidden ${
                rating 
                  ? rating <= 2 
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' 
                    : rating === 3 
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200' 
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                  : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300'
              }`}>
                <button
                  type="button"
                  onClick={() => toggleSection('rating')}
                  className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
                    rating 
                      ? rating <= 2 
                        ? 'bg-red-100/50 hover:bg-red-100 border-b border-red-200' 
                        : rating === 3 
                        ? 'bg-yellow-100/50 hover:bg-yellow-100 border-b border-yellow-200' 
                        : 'bg-green-100/50 hover:bg-green-100 border-b border-green-200'
                      : 'bg-gray-100/50 hover:bg-gray-100 border-b border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className={`w-5 h-5 ${
                      rating 
                        ? rating <= 2 
                          ? 'text-red-600' 
                          : rating === 3 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                        : 'text-gray-500'
                    }`} />
                    <span className="font-semibold text-gray-900">Rating & Review</span>
                  </div>
                  {expandedSections.rating ? (
                    <ChevronUp className={`w-5 h-5 ${
                      rating 
                        ? rating <= 2 
                          ? 'text-red-600' 
                          : rating === 3 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                        : 'text-gray-500'
                    }`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 ${
                      rating 
                        ? rating <= 2 
                          ? 'text-red-600' 
                          : rating === 3 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                        : 'text-gray-500'
                    }`} />
                  )}
                </button>
                {expandedSections.rating && (
                  <div className="p-5 space-y-4 bg-white">
                    {/* Rating Stars */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Rating</Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          // Dynamic color based on selected rating
                          const getStarColor = () => {
                            if (rating === 0 || star > rating) return 'text-gray-300';
                            if (rating <= 2) return 'fill-red-500 text-red-500'; // Bintang 1-2: Merah
                            if (rating === 3) return 'fill-yellow-400 text-yellow-400'; // Bintang 3: Kuning
                            return 'fill-green-500 text-green-500'; // Bintang 4-5: Hijau
                          };

                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-8 h-8 ${getStarColor()}`}
                              />
                            </button>
                          );
                        })}
                        {rating > 0 && (
                          <span className={`ml-2 text-sm font-semibold ${
                            rating <= 2 ? 'text-red-600' : rating === 3 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {rating} / 5
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reviewer Name */}
                    <div className="space-y-2">
                      <Label htmlFor="reviewerName" className="text-sm font-semibold text-gray-700">
                        Reviewer Name
                      </Label>
                      <Input
                        id="reviewerName"
                        name="reviewerName"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="e.g., John Doe"
                        className={`bg-white ${
                          rating 
                            ? rating <= 2 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : rating === 3 
                              ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' 
                              : 'border-green-300 focus:border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500'
                        }`}
                      />
                    </div>

                    {/* Review Date */}
                    <div className="space-y-2">
                      <Label htmlFor="reviewDate" className="text-sm font-semibold text-gray-700">
                        Review Date
                      </Label>
                      <Input
                        id="reviewDate"
                        name="reviewDate"
                        type="date"
                        value={reviewDate}
                        onChange={(e) => setReviewDate(e.target.value)}
                        className={`bg-white ${
                          rating 
                            ? rating <= 2 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : rating === 3 
                              ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' 
                              : 'border-green-300 focus:border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500'
                        }`}
                      />
                    </div>

                    {/* Review Text */}
                    <div className="space-y-2">
                      <Label htmlFor="reviewText" className="text-sm font-semibold text-gray-700">
                        Review Comments
                      </Label>
                      <Textarea
                        id="reviewText"
                        name="reviewText"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your feedback about the demo..."
                        rows={4}
                        className={`bg-white resize-none ${
                          rating 
                            ? rating <= 2 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : rating === 3 
                              ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' 
                              : 'border-green-300 focus:border-green-500 focus:ring-green-500'
                            : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500'
                        }`}
                      />
                      <p className="text-xs text-gray-500">
                        {reviewText.length} / 500 characters
                      </p>
                    </div>

                    {/* Review Summary (if filled) */}
                    {(rating > 0 || reviewText || reviewerName) && (
                      <div className={`mt-4 p-4 rounded-lg border-2 ${
                        rating 
                          ? rating <= 2 
                            ? 'bg-red-50 border-red-200' 
                            : rating === 3 
                            ? 'bg-yellow-50 border-yellow-200' 
                            : 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Review Summary</h4>
                        <div className="space-y-2 text-sm">
                          {rating > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Rating:</span>
                              <div className="flex items-center gap-1">
                                {[...Array(rating)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${
                                      rating <= 2 
                                        ? 'fill-red-500 text-red-500' 
                                        : rating === 3 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'fill-green-500 text-green-500'
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {reviewerName && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Reviewer:</span>
                              <span className="font-medium">{reviewerName}</span>
                            </div>
                          )}
                          {reviewDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Date:</span>
                              <span className="font-medium">{new Date(reviewDate).toLocaleDateString('id-ID')}</span>
                            </div>
                          )}
                          {reviewText && (
                            <div className="mt-2">
                              <span className="text-gray-600">Comment:</span>
                              <p className="mt-1 text-gray-900 italic">&quot;{reviewText}&quot;</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* FOOTER - Fixed action buttons */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="px-6"
              >
                Batal
              </Button>
              <Button 
                type="submit"
                className="px-6 bg-[#013E37] hover:bg-[#025C52]" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : (selectedDemo ? 'Update Demo' : 'Jadwalkan Demo')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="!max-w-[900px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden flex flex-col">
          <DialogDescription className="sr-only">
            {selectedDemo ? `Complete details for demo ${selectedDemo.title} with ${selectedDemo.clientName} including participants, logistics, and follow-up actions` : 'Demo details'}
          </DialogDescription>
          
          {/* HEADER */}
          <DialogHeader className="relative bg-[#013E37] text-white px-6 py-5 space-y-0 flex-shrink-0">
            <button
              onClick={() => setIsDetailOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-3">
              {/* Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold leading-tight">
                    {selectedDemo?.title || 'Detail Demo'}
                  </DialogTitle>
                  <DialogDescription className="text-white/80 text-sm mt-1 leading-tight">
                    {selectedDemo?.company || 'Product Demo Schedule'}
                  </DialogDescription>
                </div>
              </div>

              {/* Status Badges & Action Buttons */}
              {selectedDemo && (
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={
                      selectedDemo.status === 'scheduled' 
                        ? 'bg-blue-500 text-blue-900 hover:bg-blue-600' 
                        : selectedDemo.status === 'completed'
                        ? 'bg-emerald-500 text-emerald-900 hover:bg-emerald-600'
                        : selectedDemo.status === 'cancelled'
                        ? 'bg-red-500 text-red-900 hover:bg-red-600'
                        : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600'
                    }>
                      {selectedDemo.status.toUpperCase()}
                    </Badge>
                    <Badge className="bg-white/20 text-white hover:bg-white/30">
                      {selectedDemo.duration} Minutes
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDetailOpen(false);
                        handleEditDemo(selectedDemo);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-red-500/20 hover:bg-red-500/30 border-red-300/30 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDetailOpen(false);
                        handleDeleteDemo(selectedDemo.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {selectedDemo && (
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              
              {/* SECTION 1: Client Information */}
              <div className="bg-[#EEF7F5] rounded-xl border border-[#013E37]/20 overflow-hidden">
                <div className="px-5 py-3.5 bg-[#013E37]/10 border-b border-[#013E37]/20">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#013E37]" />
                    <span className="font-semibold text-gray-900">Client Information</span>
                  </div>
                </div>
                <div className="p-5 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Lead Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDemo.leadName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Company</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDemo.company}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Schedule Information */}
              <div className="bg-gradient-to-br from-emerald-50 to-[#EEF7F5] rounded-xl border border-emerald-100 overflow-hidden">
                <div className="px-5 py-3.5 bg-emerald-100/50 border-b border-emerald-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-gray-900">Schedule & Timing</span>
                  </div>
                </div>
                <div className="p-5 bg-white">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {parseDate(selectedDemo.date).toLocaleDateString('id-ID', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Time</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDemo.time}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Duration</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDemo.duration} minutes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Demo Details */}
              <div className="bg-[#EEF7F5] rounded-xl border border-[#013E37]/20 overflow-hidden">
                <div className="px-5 py-3.5 bg-[#013E37]/10 border-b border-[#013E37]/20">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-[#013E37]" />
                    <span className="font-semibold text-gray-900">Demo Details</span>
                  </div>
                </div>
                <div className="p-5 bg-white space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Product</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDemo.product}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Presenter</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDemo.presenter}</p>
                    </div>
                  </div>

                  {/* Meeting Link */}
                  {selectedDemo.meetingLink && (
                    <div className="pt-3 border-t border-[#DFF0EC]">
                      <p className="text-xs font-medium text-gray-500 mb-2">Meeting Link</p>
                      <div className="flex items-center gap-3">
                        <Input 
                          value={selectedDemo.meetingLink} 
                          readOnly 
                          className="bg-gray-50 text-sm border-gray-200"
                        />
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600 whitespace-nowrap"
                          onClick={() => handleJoinMeeting(selectedDemo.meetingLink)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Join Meeting
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Notes (if exists) */}
              {selectedDemo.notes && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 overflow-hidden">
                  <div className="px-5 py-3.5 bg-amber-100/50 border-b border-amber-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-gray-900">Additional Notes</span>
                    </div>
                  </div>
                  <div className="p-5 bg-white">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedDemo.notes}</p>
                  </div>
                </div>
              )}

              {/* Advanced Scheduling Information */}
              <DemoAdvancedInfo demo={selectedDemo} />

              {/* SECTION 5: Rating & Review */}
              <div className={`rounded-xl border-2 overflow-hidden ${
                (selectedDemo as any).rating 
                  ? (selectedDemo as any).rating <= 2 
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' 
                    : (selectedDemo as any).rating === 3 
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200' 
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                  : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300'
              }`}>
                  <div className={`px-5 py-3.5 border-b ${
                    (selectedDemo as any).rating 
                      ? (selectedDemo as any).rating <= 2 
                        ? 'bg-red-100/50 border-red-200' 
                        : (selectedDemo as any).rating === 3 
                        ? 'bg-yellow-100/50 border-yellow-200' 
                        : 'bg-green-100/50 border-green-200'
                      : 'bg-gray-100/50 border-gray-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Star className={`w-5 h-5 ${
                        (selectedDemo as any).rating 
                          ? (selectedDemo as any).rating <= 2 
                            ? 'text-red-600' 
                            : (selectedDemo as any).rating === 3 
                            ? 'text-yellow-600' 
                            : 'text-green-600'
                          : 'text-gray-500'
                      }`} />
                      <span className="font-semibold text-gray-900">Rating & Review</span>
                    </div>
                  </div>
                  <div className="p-5 bg-white space-y-4">
                    {(selectedDemo as any).rating ? (
                      <>
                        {/* Rating Stars */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Rating</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-6 h-6 ${
                                    star <= (selectedDemo as any).rating
                                      ? (selectedDemo as any).rating <= 2
                                        ? 'fill-red-500 text-red-500'
                                        : (selectedDemo as any).rating === 3
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-green-500 text-green-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-lg font-bold ${
                              (selectedDemo as any).rating <= 2 
                                ? 'text-red-600' 
                                : (selectedDemo as any).rating === 3 
                                ? 'text-yellow-600' 
                                : 'text-green-600'
                            }`}>
                              {(selectedDemo as any).rating} / 5
                            </span>
                          </div>
                        </div>

                        {/* Reviewer Info */}
                        {(selectedDemo as any).reviewerName && (
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1.5">Reviewer Name</p>
                              <p className="text-sm font-semibold text-gray-900">{(selectedDemo as any).reviewerName}</p>
                            </div>
                            {(selectedDemo as any).reviewDate && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1.5">Review Date</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date((selectedDemo as any).reviewDate).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review Comments */}
                        {(selectedDemo as any).reviewText && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-2">Review Comments</p>
                            <div className={`p-4 rounded-lg ${
                              (selectedDemo as any).rating <= 2 
                                ? 'bg-red-50 border border-red-100' 
                                : (selectedDemo as any).rating === 3 
                                ? 'bg-yellow-50 border border-yellow-100' 
                                : 'bg-green-50 border border-green-100'
                            }`}>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {(selectedDemo as any).reviewText}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500 mb-1">No Rating Yet</p>
                        <p className="text-xs text-gray-400">This demo has not been rated or reviewed</p>
                      </div>
                    )}
                  </div>
                </div>

            </div>
          )}

          {/* FOOTER - Action buttons */}
          <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setIsDetailOpen(false)}
              className="px-6"
            >
              Tutup
            </Button>
            {selectedDemo && selectedDemo.status === 'scheduled' && (
              <DemoReschedule 
                demo={selectedDemo} 
                onReschedule={handleReschedule} 
              />
            )}
            {selectedDemo && selectedDemo.meetingLink && selectedDemo.status === 'scheduled' && (
              <Button 
                className="px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                onClick={() => handleJoinMeeting(selectedDemo.meetingLink)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Join Meeting Now
              </Button>
            )}
            {selectedDemo && selectedDemo.status === 'completed' && (
              <Button 
                className="px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                onClick={() => {
                  setIsDetailOpen(false);
                  setShowFollowUp(true);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Follow-up Actions
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Scheduling Assistant Dialog */}
      <Dialog open={showSmartScheduler} onOpenChange={setShowSmartScheduler}>
        <DialogContent className="!max-w-[700px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0">
          <DialogDescription className="sr-only">
            AI-powered smart scheduling assistant with optimal time recommendations, conflict detection, and intelligent scheduling suggestions
          </DialogDescription>
          
          <DialogHeader className="bg-[#013E37] text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Smart Scheduling Assistant</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">
                  AI-powered suggestions for optimal demo scheduling
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Optimal Time Slots */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#013E37]" />
                Recommended Time Slots
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { day: 'Tuesday', time: '10:00 AM', reason: 'Highest engagement rate (85%)', color: 'bg-[#013E37]' },
                  { day: 'Wednesday', time: '2:00 PM', reason: 'Low conflict probability (5%)', color: 'bg-[#013E37]' },
                  { day: 'Thursday', time: '11:00 AM', reason: 'Best presenter availability', color: 'bg-[#013E37]' }
                ].map((slot, idx) => (
                  <Card key={idx} className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-[#5BB5AB]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${slot.color} flex items-center justify-center text-white font-bold`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{slot.day} at {slot.time}</p>
                            <p className="text-sm text-gray-600">{slot.reason}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-[#013E37] hover:bg-[#025C52]"
                          onClick={() => {
                            setShowSmartScheduler(false);
                            setIsDialogOpen(true);
                            toast.success(`Time slot ${slot.day} ${slot.time} selected!`);
                          }}
                        >
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Presenter Recommendations */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#013E37]" />
                Best Presenter Match
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {Array.from(new Set(demos.map(d => d.presenter))).slice(0, 3).map((presenter, idx) => {
                  const presenterDemos = demos.filter(d => d.presenter === presenter);
                  const successRate = (presenterDemos.filter(d => d.status === 'completed').length / presenterDemos.length) * 100;
                  
                  return (
                    <Card key={presenter} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center text-white font-semibold">
                              {presenter.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{presenter}</p>
                              <p className="text-sm text-gray-600">{successRate.toFixed(0)}% success rate • {presenterDemos.length} demos</p>
                            </div>
                          </div>
                          {idx === 0 && (
                            <Badge className="bg-yellow-500 text-yellow-900">
                              <Star className="h-3 w-3 mr-1" />
                              Top Pick
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Conflict Detection */}
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Conflict Detection</h4>
                    <p className="text-sm text-gray-700">
                      ✅ No scheduling conflicts detected for this week
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      ⚠️ 2 demos scheduled for next Monday - consider spreading load
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="bg-[#EEF7F5] border-[#013E37]/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-[#013E37] mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">AI Insights</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Tuesday-Thursday mornings have 23% higher conversion rate</li>
                      <li>• 60-minute demos convert 15% better than 30-minute ones</li>
                      <li>• Enterprise demos perform best with 2+ attendees</li>
                      <li>• Buffer time reduces no-show rate by 18%</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSmartScheduler(false)}>
              Close
            </Button>
            <Button 
              className="bg-[#013E37] hover:bg-[#025C52]"
              onClick={() => {
                setShowSmartScheduler(false);
                setIsDialogOpen(true);
              }}
            >
              Schedule with AI Suggestions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Actions Dialog */}
      <Dialog open={showFollowUp} onOpenChange={setShowFollowUp}>
        <DialogContent className="!max-w-[600px] w-full">
          <DialogDescription className="sr-only">
            {selectedDemo ? `Follow-up actions and next steps for demo with ${selectedDemo.clientName}` : 'Demo follow-up actions'}
          </DialogDescription>
          
          <DialogHeader className="bg-[#013E37] text-white px-6 py-5 -mx-6 -mt-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Send className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Demo Follow-up Actions</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">
                  Post-demo workflow automation
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Cards */}
            {[
              {
                icon: Mail,
                title: 'Send Thank You Email',
                description: 'Automated personalized thank you with demo recording',
                color: 'bg-[#013E37]',
                action: 'Send Email'
              },
              {
                icon: FileText,
                title: 'Generate Proposal',
                description: 'Create custom proposal based on demo discussion',
                color: 'bg-[#013E37]',
                action: 'Create Proposal'
              },
              {
                icon: Target,
                title: 'Convert to Opportunity',
                description: 'Move qualified lead to sales pipeline',
                color: 'from-green-500 to-emerald-600',
                action: 'Create Opportunity'
              },
              {
                icon: Calendar,
                title: 'Schedule Follow-up',
                description: 'Book next meeting or technical deep dive',
                color: 'from-orange-500 to-red-600',
                action: 'Schedule'
              }
            ].map((item, idx) => (
              <Card key={idx} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-[#013E37] flex items-center justify-center">
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      className="bg-[#013E37] hover:bg-[#025C52]"
                      onClick={() => {
                        toast.success(`${item.action} initiated!`);
                      }}
                    >
                      {item.action}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Quick Notes */}
            <div>
              <Label className="text-sm font-medium">Follow-up Notes</Label>
              <Textarea 
                placeholder="Add notes about next steps, client feedback, or action items..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowFollowUp(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              onClick={() => {
                setShowFollowUp(false);
                toast.success('Follow-up actions saved!');
              }}
            >
              Save & Execute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}