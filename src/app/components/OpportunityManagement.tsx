import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { 
  LayoutGrid, 
  List, 
  TrendingUp, 
  Plus, 
  RefreshCw,
  DollarSign,
  Target,
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { opportunitiesRepository } from '@/services/opportunitiesRepository';
import { productsRepository } from '@/services/productsRepository';
import { OpportunityPipeline } from './OpportunityPipeline';
import { OpportunityList } from './OpportunityList';
import { OpportunityFormNew } from './OpportunityFormNew';
import { SalesForecast } from './SalesForecast';
import { OpportunityDetailDialog } from './OpportunityDetailDialog';
import type { ProductItem, Activity, Opportunity } from '@/types/opportunity';


// FR-04: Close Reason options differ for Won vs Lost. Mirrors the pattern found in the Salesforce
// Onduline implementation reviewed during the FSD work — the Sales Manager should review/confirm this
// list before it's treated as final.
const WON_CLOSE_REASONS = [
  'Product Quality', 'Delivery Time', 'Term of Payment', 'Brand Awareness', 'Commitment Service',
  'Guarantee Period', 'Man Power', 'Availability of Product', 'Testing Certificate', 'User Decision', 'Other',
];
const LOST_CLOSE_REASONS = [
  'Price Competition', 'Budget', 'Technical Aspect', 'Limited Size of Product', 'Local Content Material',
  'Delivery Time', 'Other',
];

export function OpportunityManagement() {
  const confirm = useConfirm();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [viewOpportunity, setViewOpportunity] = useState<Opportunity | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // FR-04: Close Opportunity dialog state (collects Close Reason/Detail before Won/Lost is saved)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeDialogOpp, setCloseDialogOpp] = useState<Opportunity | null>(null);
  const [closeDialogStage, setCloseDialogStage] = useState<'closed-won' | 'closed-lost' | null>(null);
  const [closeReasonValue, setCloseReasonValue] = useState('');
  const [closeDetailValue, setCloseDetailValue] = useState('');

  useEffect(() => {
    fetchData();
    // Check reminders every minute
    const reminderInterval = setInterval(fetchReminders, 60000);
    return () => clearInterval(reminderInterval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [oppResult, prodResult] = await Promise.all([
        opportunitiesRepository.getAll(),
        productsRepository.getAll(),
      ]);
      
      if (oppResult.success && oppResult.data) {
        setOpportunities(oppResult.data);
      }
      
      if (prodResult.success && prodResult.data) {
        setProducts(prodResult.data);
      }
      
      await fetchReminders();
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error loading opportunities');
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const result = await opportunitiesRepository.getReminders();
      if (result.success && result.data) {
        setReminders(result.data);
        
        // Show toast for urgent reminders
        result.data.forEach((reminder: any) => {
          if (reminder.priority === 'urgent' && !reminder.reminderSent) {
            toast.error(reminder.reminderMessage, {
              description: `${reminder.name} - ${reminder.clientName}`,
              duration: 10000,
            });
          }
        });
      }
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
    }
  };

  const handleCreate = () => {
    setSelectedOpportunity(null);
    setIsFormOpen(true);
  };

  const handleEdit = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsFormOpen(true);
  };

  const handleView = (opportunity: Opportunity) => {
    setViewOpportunity(opportunity);
    setShowDetailDialog(true);
  };

  const handleSave = async (opportunityData: Partial<Opportunity>) => {
    try {
      if (selectedOpportunity) {
        // Update
        const result = await opportunitiesRepository.update(selectedOpportunity.id, opportunityData);
        if (result.success && result.data) {
          setOpportunities(opportunities.map(o => 
            o.id === selectedOpportunity.id ? result.data : o
          ));
          toast.success('Opportunity updated successfully!');
        } else {
          toast.error(result.error || 'Failed to update opportunity');
        }
      } else {
        // Create
        const result = await opportunitiesRepository.create(opportunityData);
        if (result.success && result.data) {
          setOpportunities([...opportunities, result.data]);
          toast.success('Opportunity created successfully!');
        } else {
          toast.error(result.error || 'Failed to create opportunity');
        }
      }
      
      setIsFormOpen(false);
      setSelectedOpportunity(null);
    } catch (error: any) {
      console.error('Error saving opportunity:', error);
      toast.error('Error saving opportunity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Are you sure you want to delete this opportunity?', { variant: 'destructive', confirmText: 'Hapus' }))) {
      return;
    }
    
    try {
      const result = await opportunitiesRepository.remove(id);
      if (result.success) {
        setOpportunities(opportunities.filter(o => o.id !== id));
        toast.success('Opportunity deleted successfully!');
      } else {
        toast.error(result.error || 'Failed to delete opportunity');
      }
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      toast.error('Error deleting opportunity');
    }
  };

  // Applies a stage change plus any extra fields (close reason/detail, or clearing them on reopen).
  // Also fixes a pre-existing bug: `status` (open/won/lost) was never actually set anywhere in the
  // app — even though the stats below (stats.won, winRate) read `status === 'won'` — so win-rate and
  // won-count KPIs were structurally broken regardless of real sales activity. Stage and status are
  // now always kept in sync here.
  const applyStageChange = async (
    opportunity: Opportunity,
    newStage: string,
    extra: Partial<Opportunity> = {}
  ) => {
    const pipelineToSalesStageMap: Record<string, string> = {
      'prospecting': 'Engage',
      'proposal': 'Solution',
      'negotiation': 'Align',
      'closed-won': 'Execute',
      'closed-lost': 'Close (Win/Loss)',
    };

    const autoSalesStage = pipelineToSalesStageMap[newStage] || opportunity.salesStage || 'Engage';
    const newStatus: Opportunity['status'] =
      newStage === 'closed-won' ? 'won' : newStage === 'closed-lost' ? 'lost' : 'open';

    const updatedData: Opportunity = {
      ...opportunity,
      stage: newStage as Opportunity['stage'],
      status: newStatus,
      salesStage: autoSalesStage, // Auto-update sales stage based on pipeline stage
      actualCloseDate: newStatus !== 'open'
        ? new Date().toISOString().split('T')[0]
        : undefined,
      ...extra,
      activities: [
        ...opportunity.activities,
        {
          id: `ACT-${Date.now()}`,
          type: 'stage-change',
          description: `Stage changed to ${newStage}`,
          createdAt: new Date().toISOString(),
        }
      ],
    };

    try {
      const result = await opportunitiesRepository.update(opportunity.id, updatedData);
      if (result.success && result.data) {
        setOpportunities(prev => prev.map(o =>
          o.id === opportunity.id ? result.data : o
        ));
        toast.success(`Moved to ${newStage} • Sales Stage: ${autoSalesStage}`);
      }
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast.error('Error updating stage');
    }
  };

  const handleStageChange = async (id: string, newStage: string) => {
    const opportunity = opportunities.find(o => o.id === id);
    if (!opportunity) return;

    const wasClosed = opportunity.stage === 'closed-won' || opportunity.stage === 'closed-lost';
    const willBeClosed = newStage === 'closed-won' || newStage === 'closed-lost';

    // FR-04 alt flow A2: reopening a closed opportunity needs confirmation and clears Close Reason/Detail.
    if (wasClosed && !willBeClosed) {
      const proceed = await confirm(
        'Membuka kembali opportunity yang sudah ditutup? Close Reason/Detail akan dikosongkan.'
      );
      if (!proceed) return;
      // null (not undefined) so the "kosongkan" intent survives JSON.stringify -- see the comment on Opportunity.closeReason/closeDetail in src/types/opportunity.ts.
      applyStageChange(opportunity, newStage, { closeReason: null, closeDetail: null });
      return;
    }

    // FR-04 main flow: moving to Won/Lost requires Close Reason first — the stage is not saved
    // until the dialog below is confirmed, so a cancel leaves the opportunity in its original stage.
    if (willBeClosed) {
      setCloseDialogOpp(opportunity);
      setCloseDialogStage(newStage as 'closed-won' | 'closed-lost');
      setCloseReasonValue(opportunity.closeReason || '');
      setCloseDetailValue(opportunity.closeDetail || '');
      setCloseDialogOpen(true);
      return;
    }

    applyStageChange(opportunity, newStage);
  };

  const handleConfirmClose = async () => {
    if (!closeDialogOpp || !closeDialogStage) return;

    if (!closeReasonValue) {
      toast.error('Close Reason wajib dipilih');
      return;
    }
    if (closeReasonValue === 'Other' && !closeDetailValue.trim()) {
      toast.error('Close Detail wajib diisi ketika Close Reason = Other');
      return;
    }

    await applyStageChange(closeDialogOpp, closeDialogStage, {
      closeReason: closeReasonValue,
      // null clears any stale detail left over from a previous 'Other' selection -- see the comment on Opportunity.closeDetail in src/types/opportunity.ts for why null (not undefined).
      closeDetail: closeReasonValue === 'Other' ? closeDetailValue.trim() : null,
    });

    setCloseDialogOpen(false);
    setCloseDialogOpp(null);
    setCloseDialogStage(null);
    setCloseReasonValue('');
    setCloseDetailValue('');
  };

  // Calculate stats
  const stats = {
    total: opportunities.length,
    open: opportunities.filter(o => o.status === 'open').length,
    won: opportunities.filter(o => o.status === 'won').length,
    totalValue: opportunities
      .filter(o => o.status === 'open')
      .reduce((sum, o) => sum + o.totalValue, 0),
    weightedValue: opportunities
      .filter(o => o.status === 'open')
      .reduce((sum, o) => sum + (o.totalValue * o.probability / 100), 0),
    upside: opportunities
      .filter(o => o.status === 'open' && o.forecastType === 'Upside')
      .reduce((sum, o) => sum + o.totalValue, 0),
    strongUpside: opportunities
      .filter(o => o.status === 'open' && o.forecastType === 'Strong Upside')
      .reduce((sum, o) => sum + o.totalValue, 0),
    forecast: opportunities
      .filter(o => o.status === 'open' && o.forecastType === 'Forecast/Commit')
      .reduce((sum, o) => sum + o.totalValue, 0),
    winRate: opportunities.filter(o => o.status !== 'open').length > 0
      ? (opportunities.filter(o => o.status === 'won').length / 
         opportunities.filter(o => o.status !== 'open').length * 100).toFixed(1)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Opportunity Management
          </h1>
          <p className="text-gray-600 mt-1">Track deals from prospect to close</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchData}
            className="flex items-center gap-2"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleCreate} 
            className="bg-[#013E37] hover:bg-[#025C52] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Deals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.open}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  Rp {(stats.totalValue / 1000000).toFixed(0)}M
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upside</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  Rp {(stats.upside / 1000000).toFixed(0)}M
                </p>
              </div>
              <div className="h-12 w-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Strong Upside</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  Rp {(stats.strongUpside / 1000000).toFixed(0)}M
                </p>
              </div>
              <div className="h-12 w-12 bg-[#DFF0EC] rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[#013E37]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Forecast</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  Rp {(stats.forecast / 1000000).toFixed(0)}M
                </p>
              </div>
              <div className="h-12 w-12 bg-[#EEF7F5] rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[#013E37]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weighted Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  Rp {(stats.weightedValue / 1000000).toFixed(0)}M
                </p>
              </div>
              <div className="h-12 w-12 bg-[#DFF0EC] rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[#013E37]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.winRate}%</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Action Required ({reminders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reminders.slice(0, 3).map((reminder: any) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{reminder.name}</p>
                    <p className="text-sm text-gray-600">{reminder.clientName}</p>
                    <p className="text-sm text-orange-600 mt-1">{reminder.reminderMessage}</p>
                  </div>
                  <Badge className={
                    reminder.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    reminder.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    reminder.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {reminder.daysUntilClose < 0 ? 'Overdue' : `${reminder.daysUntilClose}d left`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-3">
          <TabsTrigger 
            value="pipeline" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-1.5 justify-center">
              <LayoutGrid className="h-4 w-4" />
              <span className="font-bold text-sm uppercase tracking-tight">Pipeline</span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Visualisasi Proses</span>
          </TabsTrigger>
          <TabsTrigger 
            value="list" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-1.5 justify-center">
              <List className="h-4 w-4" />
              <span className="font-bold text-sm uppercase tracking-tight">List View</span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Data Terstruktur</span>
          </TabsTrigger>
          <TabsTrigger 
            value="forecast" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-1.5 justify-center">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold text-sm uppercase tracking-tight">Forecast</span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Prediksi Penjualan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6">
          <OpportunityPipeline 
            opportunities={opportunities}
            onStageChange={handleStageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <OpportunityList 
            opportunities={opportunities}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <SalesForecast opportunities={opportunities} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      {isFormOpen && (
        <OpportunityFormNew
          opportunity={selectedOpportunity}
          products={products}
          onSave={handleSave}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedOpportunity(null);
          }}
        />
      )}

      {/* Detail Dialog */}
      {showDetailDialog && (
        <OpportunityDetailDialog
          open={showDetailDialog}
          opportunity={viewOpportunity}
          onClose={() => setShowDetailDialog(false)}
        />
      )}

      {/* FR-04: Close Opportunity dialog — Close Reason (and Close Detail if "Other") required before Won/Lost is saved */}
      <Dialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCloseDialogOpen(false);
            setCloseDialogOpp(null);
            setCloseDialogStage(null);
            setCloseReasonValue('');
            setCloseDetailValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Close Opportunity — {closeDialogStage === 'closed-won' ? 'Won' : 'Lost'}
            </DialogTitle>
            <DialogDescription>
              {closeDialogOpp?.name}: pilih Close Reason sebelum opportunity ini ditandai{' '}
              {closeDialogStage === 'closed-won' ? 'Won' : 'Lost'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Close Reason *</Label>
              <Select value={closeReasonValue || undefined} onValueChange={setCloseReasonValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Close Reason" />
                </SelectTrigger>
                <SelectContent>
                  {(closeDialogStage === 'closed-won' ? WON_CLOSE_REASONS : LOST_CLOSE_REASONS).map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {closeReasonValue === 'Other' && (
              <div>
                <Label>Close Detail *</Label>
                <Textarea
                  rows={3}
                  placeholder="Jelaskan alasan lainnya..."
                  value={closeDetailValue}
                  onChange={(e) => setCloseDetailValue(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCloseDialogOpen(false);
                setCloseDialogOpp(null);
                setCloseDialogStage(null);
                setCloseReasonValue('');
                setCloseDetailValue('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmClose} className="bg-[#013E37] hover:bg-[#025C52] text-white">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}