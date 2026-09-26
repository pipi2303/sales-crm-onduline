import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Building2, Calendar, DollarSign, User, AlertTriangle, CheckCircle, Clock, XCircle, Edit, Trash2, Eye, Download, Edit2, Bell, TrendingUp, Shield, RefreshCw, FileSignature, BarChart3, GitBranch, Calculator, Package, Zap, Target, Award, Activity, PieChart, ArrowUpRight, ArrowDownRight, Percent, Hash } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { StatCard, type StatCardData } from '@/app/components/ui/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Contract as ContractType } from '@/app/data/dummyData';
import { ContractFormModal } from '@/app/components/forms/ContractForm';
import { ContractDetailDialog } from '@/app/components/ContractDetailDialog';
import { ContractDetailView } from '@/app/components/ContractDetailView';
import { contractsRepository } from '@/services/contractsRepository';
import { toast } from 'sonner';
import { ContractRenewalReminders, ContractTemplates, ContractRiskScoring } from '@/app/components/ContractEnhancements';
import { ContractAnalytics } from '@/app/components/ContractAnalytics';
import { ContractAmendments, ContractCompliance, ContractESignature, ContractRevenue } from '@/app/components/ContractAdvancedFeatures';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { formatCurrency, getEffectiveContractStatus } from '@/utils/formatters';

export function Contract() {
  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<ContractType | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ContractType>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Feature States - Top 8 Recommendations
  const [showRenewalReminders, setShowRenewalReminders] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showESignature, setShowESignature] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showRiskScoring, setShowRiskScoring] = useState(false);
  const [showAmendments, setShowAmendments] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'analytics' | 'calendar'>('list');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      // Bab 30 lanjutan: dulu contractsApi.getAll() (localStorage-only,
      // tidak pernah sinkron dengan create/edit yang -- sebelum fix ini --
      // toh selalu gagal diam-diam). Sekarang backend sungguhan.
      const result = await contractsRepository.getAll();

      if (result.success && result.data) {
        setContracts(result.data);
      } else {
        toast.error(result.error || 'Failed to load contracts');
      }
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast.error('Error loading contracts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    terminated: 'bg-red-100 text-red-800'
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || getEffectiveContractStatus(contract.status, contract.endDate) === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    // FIX: kontrak yang endDate-nya sudah lewat tidak lagi dihitung sebagai 'active'
    active: contracts.filter(c => getEffectiveContractStatus(c.status, c.endDate) === 'active').length,
    pending: contracts.filter(c => c.status === 'pending').length,
    totalValue: contracts.filter(c => getEffectiveContractStatus(c.status, c.endDate) === 'active').reduce((sum, c) => sum + c.value, 0)
  };

  const handleAddContract = () => {
    setFormData({});
    setSelectedContract(null);
    setIsDialogOpen(true);
  };

  const handleEditContract = (contract: ContractType) => {
    setFormData(contract);
    setSelectedContract(contract);
    setIsDialogOpen(true);
  };

  const handleSaveContract = (contract: ContractType) => {
    if (selectedContract) {
      setContracts(contracts.map(c => c.id === selectedContract.id ? contract : c));
    } else {
      setContracts([...contracts, contract]);
    }
    setIsDialogOpen(false);
    fetchContracts(); // Refresh data from server
  };

  const handleDeleteContract = async (id: string) => {
    try {
      // Bab 30 lanjutan: contractsApi tidak pernah punya method `delete`
      // sama sekali (error TS2339 di tsc) -- tombol hapus di UI sudah ada
      // dari awal tapi tidak mungkin pernah berfungsi.
      const result = await contractsRepository.remove(id);

      if (result.success) {
        setContracts(contracts.filter(c => c.id !== id));
        toast.success('Kontrak berhasil dihapus');
      } else {
        toast.error(result.error || 'Gagal menghapus kontrak');
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    }
  };

  const handleDownloadContract = (contractNumber: string) => {
    toast.success(`Mengunduh kontrak ${contractNumber}...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Contract Management
          </h1>
          <p className="text-gray-600 mt-1">Kelola semua kontrak dan perjanjian</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddContract} className="bg-[#013E37] hover:bg-[#025C52]">
            <Plus className="h-4 w-4 mr-2" />
            Buat Kontrak
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard index={0} stat={{ label: 'Total Kontrak', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' }} />
        <StatCard index={1} stat={{ label: 'Active', value: stats.active, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' }} />
        <StatCard index={2} stat={{ label: 'Pending', value: stats.pending, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' }} />
        <StatCard index={3} stat={{ label: 'Total Value', value: formatCurrency(stats.totalValue), icon: DollarSign, color: 'text-[#013E37]', bg: 'bg-[#EEF7F5]' }} />
      </div>

      {/* TOP 8 ENHANCEMENTS - Quick Action Bar */}
      <Card className="bg-gradient-to-r from-[#EEF7F5] via-[#EEF7F5] to-pink-50 border-2 border-[#C3DDD9]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Contract Intelligence Suite</h3>
              <p className="text-sm text-gray-600">Access all advanced contract management features</p>
            </div>
            <Badge className="bg-gradient-to-r from-[#013E37] to-[#025C52] text-white">
              <Award className="h-3 w-3 mr-1" />
              8 Advanced Features
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ContractRenewalReminders contracts={contracts} />
            <ContractTemplates />
            <ContractESignature contracts={contracts} />
            <ContractAnalytics contracts={contracts} />
            <ContractRiskScoring contracts={contracts} />
            <ContractAmendments contracts={contracts} selectedContract={selectedContract} />
            <ContractCompliance contracts={contracts} />
            <ContractRevenue contracts={contracts} />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari kontrak..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contracts List */}
      <div className="grid gap-4">
        {filteredContracts.map((contract) => (
          <Card 
            key={contract.id} 
            className="hover:shadow-lg transition-all group cursor-pointer"
            onClick={() => {
              setSelectedContract(contract);
              setIsDetailOpen(true);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contract.contractNumber}</h3>
                      <Badge className={statusColors[getEffectiveContractStatus(contract.status, contract.endDate)]}>{getEffectiveContractStatus(contract.status, contract.endDate).toUpperCase()}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Client Information</p>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4 text-gray-400" />
                        {contract.clientName}
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {contract.company}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contract Details</p>
                      <p className="text-sm"><span className="font-medium">Product:</span> {contract.product}</p>
                      <p className="text-sm"><span className="font-medium">Value:</span> <span className="text-green-600 font-semibold">{formatCurrency(contract.value)}</span></p>
                      <p className="text-sm"><span className="font-medium">Sales:</span> {contract.salesPerson}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Timeline</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Start: {contract.startDate.toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>End: {contract.endDate.toLocaleDateString('id-ID')}</span>
                      </div>
                      <p className="text-sm mt-1"><span className="font-medium">Signed by:</span> {contract.signedBy}</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContract(contract);
                      setIsDetailOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadContract(contract.contractNumber);
                    }}
                  >
                    <Download className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditContract(contract);
                    }}
                  >
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteContract(contract.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contract Detail View Dialog */}
      <ContractDetailView
        contract={selectedContract}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedContract(null);
        }}
        onEdit={() => {
          setIsDetailOpen(false);
          if (selectedContract) {
            handleEditContract(selectedContract);
          }
        }}
      />

      {/* Add/Edit Dialog - New Modern Form */}
      {isDialogOpen && (
        <ContractFormModal
          contract={selectedContract}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedContract(null);
          }}
          onSuccess={handleSaveContract}
        />
      )}
    </div>
  );
}