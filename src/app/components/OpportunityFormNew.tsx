import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/app/components/ui/tooltip';
import { 
  User, 
  Building2, 
  Package, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Plus,
  Trash2,
  Target,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
  Briefcase,
  Globe,
  Sparkles,
  X,
  Mail,
  Phone as PhoneIcon,
  UserCircle2,
  Info,
  Clock,
  Database,
  Brain,
  LineChart,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import type { Opportunity, ProductItem } from '@/types/opportunity';
import { partnersApi } from '@/services/api';
import { employeesRepository } from '@/services/employeesRepository';
import { clientsRepository } from '@/services/clientsRepository';

interface OpportunityFormNewProps {
  opportunity: Opportunity | null;
  products: any[];
  onSave: (data: Partial<Opportunity>) => void;
  onCancel: () => void;
}

export function OpportunityFormNew({ opportunity, products, onSave, onCancel }: OpportunityFormNewProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [clients, setClients] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [quickFillType, setQuickFillType] = useState<'client' | 'partner'>('client');
  
  // Basic Info State
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    contactPerson: '',
    email: '',
    phone: '',
    description: '',
    source: 'Direct',
  });

  // Sales Details State - Part 1: Main Fields
  const [salesDetails, setSalesDetails] = useState({
    // Opportunity Maturity
    opportunityMaturity: {
      selected: false,
      funded: false,
      timeline: false,
    },
    budgetStatus: '' as '' | 'Budget Proposed' | 'Budget Approved' | 'Budget Released',
    target: 'Q1' as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    targetYear: new Date().getFullYear().toString(),
    closingTarget: '',
    forecastType: 'Pipeline' as 'Pipeline' | 'Upside' | 'Strong Upside' | 'Forecast/Commit',
    lowHangingFruit: false,
    solution: '',
    product: '',
    existingSystem: '',
    competitor: '',
    competitorWebsite: '',
    partnerName: '',
    partnerId: '',
    salesRep: '',
    salesRepId: '',
    bizmod: '',
    contractPeriod: '',
    annualRevenue: 0,
    sizeOfDeal: 0,
    monthlyRev: 0,
    salesStage: 'Engage' as 'Engage' | 'Understand' | 'Solution' | 'Align' | 'Execute' | 'Close (Win/Loss)',
    winProbability: 0,
    currentStatus: '',
    nextAction: '',
    notes: '',
  });

  // Timestamp state for all trackable text fields
  const [timestamps, setTimestamps] = useState({
    currentStatus: null as string | null,
    nextAction: null as string | null,
    notes: null as string | null,
    solution: null as string | null,
    product: null as string | null,
    existingSystem: null as string | null,
    competitor: null as string | null,
    bizmod: null as string | null,
    managerNotes: null as string | null,
    actionsToClose: null as string | null,
    engineerNotes: null as string | null,
    whyBuyAnything: null as string | null,
    whyBuyNow: null as string | null,
    whyBuyIntramedika: null as string | null,
    winStrategyBuyingProcess: null as string | null,
    jointExecutionPlanCreated: null as string | null,
    risk: null as string | null,
    annualRevenue: null as string | null,
    sizeOfDeal: null as string | null,
    monthlyRev: null as string | null,
  });

  // History state for tracking all changes with timestamps
  const [fieldHistory, setFieldHistory] = useState({
    currentStatus: [] as Array<{ value: string; timestamp: string }>,
    nextAction: [] as Array<{ value: string; timestamp: string }>,
    notes: [] as Array<{ value: string; timestamp: string }>,
    solution: [] as Array<{ value: string; timestamp: string }>,
    product: [] as Array<{ value: string; timestamp: string }>,
    existingSystem: [] as Array<{ value: string; timestamp: string }>,
    competitor: [] as Array<{ value: string; timestamp: string }>,
    bizmod: [] as Array<{ value: string; timestamp: string }>,
    managerNotes: [] as Array<{ value: string; timestamp: string }>,
    actionsToClose: [] as Array<{ value: string; timestamp: string }>,
    engineerNotes: [] as Array<{ value: string; timestamp: string }>,
    whyBuyAnything: [] as Array<{ value: string; timestamp: string }>,
    whyBuyNow: [] as Array<{ value: string; timestamp: string }>,
    whyBuyIntramedika: [] as Array<{ value: string; timestamp: string }>,
    winStrategyBuyingProcess: [] as Array<{ value: string; timestamp: string }>,
    jointExecutionPlanCreated: [] as Array<{ value: string; timestamp: string }>,
    risk: [] as Array<{ value: string; timestamp: string }>,
    annualRevenue: [] as Array<{ value: string; timestamp: string }>,
    sizeOfDeal: [] as Array<{ value: string; timestamp: string }>,
    monthlyRev: [] as Array<{ value: string; timestamp: string }>,
  });

  // Helper function to format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Type for all trackable fields
  type TrackableField = keyof typeof timestamps;

  // Helper function to update timestamp on blur (when user finishes editing)
  const updateTimestamp = (field: TrackableField, value: string | number) => {
    const stringValue = typeof value === 'number' ? value.toString() : value;
    if (stringValue.trim() !== '' && stringValue !== '0') {
      const newTimestamp = formatTimestamp(new Date());
      setTimestamps({ ...timestamps, [field]: newTimestamp });
      
      // Add to history
      setFieldHistory(prev => ({
        ...prev,
        [field]: [
          ...prev[field],
          { value: stringValue.trim(), timestamp: newTimestamp }
        ]
      }));
    }
  };

  // Sales Details State - Part 2: Overview
  const [overviewDetails, setOverviewDetails] = useState({
    managerNotes: '',
    actionsToClose: '',
    engineerNotes: '',
  });

  // Sales Details State - Part 3: Commercial Detail
  const [commercialDetails, setCommercialDetails] = useState({
    whyBuyAnything: '',
    whyBuyNow: '',
    evaluationStarted: false,
    budgetAvailabilityStatus: 'No' as 'No' | 'Available' | 'Approved',
    whyBuyIntramedika: '',
    winStrategyBuyingProcess: '',
    jointExecutionPlanCreated: '',
    vendorChoice: false,
    agreementStatus: null as 'Agreement Reviewed' | 'Terms & Conditions Agreed' | null,
    customerCommit: 'No' as 'No' | 'Customer Commit in 90 Days' | 'Commit to Sign',
    businessCaseStatus: null as 'Business Case Validated' | 'No Business Case Required' | null,
    jointExecutionPlanAgreed: 'N/A' as 'N/A' | 'No' | 'Yes',
    risk: '',
  });

  // Sales Details State - Part 4: Technical Detail
  const [technicalDetails, setTechnicalDetails] = useState({
    functionFit: null as 'Major Gaps' | 'Some Gaps (addressable)' | 'No Gaps' | null,
    competitiveDifferentiation: null as 'Disadvantage' | 'Neutral' | 'Clear Advantage' | null,
    solutionDemoStatus: false,
    implementationStrategy: null as 'No Implementation Required' | 'Strategy Known' | null,
    solutionArchitectureValidated: false,
    implementationPlanAgreed: false,
  });

  // Financial State
  const [financialData, setFinancialData] = useState({
    currency: 'IDR',
    probability: 30,
    closeDate: '',
    stage: 'prospecting' as 'prospecting' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost',
    // Bab 30 (24 Sep 2026, hasil deep review + smoke test): dulu default-nya
    // literal 'Current User' tanpa UI untuk mengubahnya -- karena key ini
    // selalu terkirim (bukan undefined), nilai itu MENIMPA fallback masuk
    // akal di backend (ownerName ?? user.name), jadi setiap Opportunity baru
    // selalu tampil dengan owner "Current User" di semua list/pipeline/detail.
    // Default '' di sini supaya untuk opportunity BARU, key ini dibuang oleh
    // toApiPayload (opportunitiesRepository.ts membuang string kosong sama
    // seperti field opsional lain) dan backend jatuh ke fallback user.name
    // yang benar. loadOpportunity() di bawah tetap mengisi ini dengan
    // ownerName asli saat EDIT data yang sudah ada.
    ownerName: '',
  });

  useEffect(() => {
    fetchData();
    if (opportunity) {
      loadOpportunity(opportunity);
    }
  }, [opportunity]);

  const fetchData = async () => {
    try {
      const [clientsResult, partnersResult, employeesResult] = await Promise.all([
        clientsRepository.getAll(),
        partnersApi.getAll(),
        employeesRepository.getAll(),
      ]);

      if (clientsResult.success && clientsResult.data) {
        setClients(clientsResult.data);
      }
      if (partnersResult.success && partnersResult.data) {
        setPartners(partnersResult.data);
      }
      if (employeesResult.success && employeesResult.data) {
        setEmployees(employeesResult.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const loadOpportunity = (opp: Opportunity) => {
    setFormData({
      name: opp.name,
      clientName: opp.clientName,
      contactPerson: opp.contactPerson,
      email: opp.email || '',
      phone: opp.phone || '',
      description: opp.description,
      source: opp.source,
    });

    setSelectedProducts(opp.products || []);

    setSalesDetails({
      opportunityMaturity: opp.opportunityMaturity || { selected: false, funded: false, timeline: false },
      budgetStatus: (opp as any).budgetStatus || '',
      target: opp.target || 'Q1',
      targetYear: opp.targetYear || new Date().getFullYear().toString(),
      closingTarget: opp.closingTarget || '',
      forecastType: opp.forecastType || 'Pipeline',
      lowHangingFruit: opp.lowHangingFruit || false,
      solution: opp.solution || '',
      product: opp.product || '',
      existingSystem: opp.existingSystem || '',
      competitor: opp.competitor || '',
      competitorWebsite: opp.competitorWebsite || '',
      partnerName: opp.partnerName || '',
      partnerId: opp.partnerId || '',
      salesRep: opp.salesRep || '',
      salesRepId: opp.salesRepId || '',
      bizmod: opp.bizmod || '',
      contractPeriod: opp.contractPeriod || '',
      annualRevenue: opp.annualRevenue || 0,
      sizeOfDeal: opp.sizeOfDeal || 0,
      monthlyRev: opp.monthlyRev || 0,
      salesStage: opp.salesStage || 'Engage',
      winProbability: opp.winProbability || 0,
      currentStatus: opp.currentStatus || '',
      nextAction: opp.nextAction || '',
      notes: opp.notes || '',
    });

    // Load timestamps from backend if available
    if ((opp as any).timestamps) {
      setTimestamps({
        currentStatus: (opp as any).timestamps.currentStatus || null,
        nextAction: (opp as any).timestamps.nextAction || null,
        notes: (opp as any).timestamps.notes || null,
        solution: (opp as any).timestamps.solution || null,
        product: (opp as any).timestamps.product || null,
        existingSystem: (opp as any).timestamps.existingSystem || null,
        competitor: (opp as any).timestamps.competitor || null,
        bizmod: (opp as any).timestamps.bizmod || null,
        managerNotes: (opp as any).timestamps.managerNotes || null,
        actionsToClose: (opp as any).timestamps.actionsToClose || null,
        engineerNotes: (opp as any).timestamps.engineerNotes || null,
        whyBuyAnything: (opp as any).timestamps.whyBuyAnything || null,
        whyBuyNow: (opp as any).timestamps.whyBuyNow || null,
        whyBuyIntramedika: (opp as any).timestamps.whyBuyIntramedika || null,
        winStrategyBuyingProcess: (opp as any).timestamps.winStrategyBuyingProcess || null,
        jointExecutionPlanCreated: (opp as any).timestamps.jointExecutionPlanCreated || null,
        risk: (opp as any).timestamps.risk || null,
        annualRevenue: (opp as any).timestamps.annualRevenue || null,
        sizeOfDeal: (opp as any).timestamps.sizeOfDeal || null,
        monthlyRev: (opp as any).timestamps.monthlyRev || null,
      });
    }

    // Load field history from backend if available
    if ((opp as any).fieldHistory) {
      setFieldHistory({
        currentStatus: (opp as any).fieldHistory.currentStatus || [],
        nextAction: (opp as any).fieldHistory.nextAction || [],
        notes: (opp as any).fieldHistory.notes || [],
        solution: (opp as any).fieldHistory.solution || [],
        product: (opp as any).fieldHistory.product || [],
        existingSystem: (opp as any).fieldHistory.existingSystem || [],
        competitor: (opp as any).fieldHistory.competitor || [],
        bizmod: (opp as any).fieldHistory.bizmod || [],
        managerNotes: (opp as any).fieldHistory.managerNotes || [],
        actionsToClose: (opp as any).fieldHistory.actionsToClose || [],
        engineerNotes: (opp as any).fieldHistory.engineerNotes || [],
        whyBuyAnything: (opp as any).fieldHistory.whyBuyAnything || [],
        whyBuyNow: (opp as any).fieldHistory.whyBuyNow || [],
        whyBuyIntramedika: (opp as any).fieldHistory.whyBuyIntramedika || [],
        winStrategyBuyingProcess: (opp as any).fieldHistory.winStrategyBuyingProcess || [],
        jointExecutionPlanCreated: (opp as any).fieldHistory.jointExecutionPlanCreated || [],
        risk: (opp as any).fieldHistory.risk || [],
        annualRevenue: (opp as any).fieldHistory.annualRevenue || [],
        sizeOfDeal: (opp as any).fieldHistory.sizeOfDeal || [],
        monthlyRev: (opp as any).fieldHistory.monthlyRev || [],
      });
    }

    setOverviewDetails({
      managerNotes: opp.managerNotes || '',
      actionsToClose: opp.actionsToClose || '',
      engineerNotes: opp.engineerNotes || '',
    });

    setCommercialDetails({
      whyBuyAnything: opp.whyBuyAnything || '',
      whyBuyNow: opp.whyBuyNow || '',
      evaluationStarted: opp.evaluationStarted || false,
      budgetAvailabilityStatus: opp.budgetAvailabilityStatus || 'No',
      whyBuyIntramedika: opp.whyBuyIntramedika || '',
      winStrategyBuyingProcess: opp.winStrategyBuyingProcess || '',
      jointExecutionPlanCreated: opp.jointExecutionPlanCreated || '',
      vendorChoice: opp.vendorChoice || false,
      agreementStatus: opp.agreementStatus || null,
      customerCommit: opp.customerCommit || 'No',
      businessCaseStatus: opp.businessCaseStatus || null,
      jointExecutionPlanAgreed: opp.jointExecutionPlanAgreed || 'N/A',
      risk: opp.risk || '',
    });

    setTechnicalDetails({
      functionFit: opp.functionFit || null,
      competitiveDifferentiation: opp.competitiveDifferentiation || null,
      solutionDemoStatus: opp.solutionDemoStatus || false,
      implementationStrategy: opp.implementationStrategy || null,
      solutionArchitectureValidated: opp.solutionArchitectureValidated || false,
      implementationPlanAgreed: opp.implementationPlanAgreed || false,
    });

    setFinancialData({
      currency: opp.currency,
      probability: opp.probability,
      closeDate: opp.closeDate,
      stage: opp.stage,
      ownerName: opp.ownerName,
    });
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        clientName: client.nama_entitas || client.companyName || client.name || '',
        contactPerson: client.nama_pic || client.contactPerson || '',
        email: client.email_resmi || client.email || '',
        phone: client.nomor_telepon || client.phone || '',
      });
    }
  };

  const handlePartnerChange = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      setSalesDetails({
        ...salesDetails,
        partnerId: partnerId,
        partnerName: partner.nama_perusahaan || partner.companyName || partner.name || '',
      });
    }
  };

  const handleSalesRepChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setSalesDetails({
        ...salesDetails,
        salesRepId: employeeId,
        salesRep: employee.nama_lengkap || employee.name || '',
      });
    }
  };

  const handleAddProduct = () => {
    setSelectedProducts([
      ...selectedProducts,
      {
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...selectedProducts];
    const product = { ...updated[index] };

    if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        product.productId = value;
        product.productName = selectedProduct.name;
        product.unitPrice = selectedProduct.price || 0;
      }
    } else if (field === 'quantity' || field === 'unitPrice') {
      product[field] = parseFloat(value) || 0;
    }

    product.totalPrice = product.quantity * product.unitPrice;
    updated[index] = product;
    setSelectedProducts(updated);
  };

  const calculateTotalValue = () => {
    return selectedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Bab 30 (24 Sep 2026): closeDate lives in the "Sales Details" tab
    // (Financial Details section, collapsed by default) -- native HTML
    // `required` validation on that input does not reliably surface to the
    // user when the field sits in a currently-inactive Tabs panel (browsers
    // skip constraint validation for elements that aren't visible/focusable
    // there), so this used to fail silently at the SERVER with a confusing
    // "closeDate wajib diisi" error naming fields the user had already
    // filled in. Check it explicitly here, with a clear message, and jump
    // the user to the right tab so they can actually see and fix it.
    if (!financialData.closeDate) {
      toast.error('Close Date wajib diisi (tab "Sales Details" → Financial Details).');
      setActiveTab('sales');
      return;
    }

    const totalValue = calculateTotalValue();

    const opportunityData: Partial<Opportunity> = {
      ...formData,
      products: selectedProducts,
      totalValue,
      ...financialData,
      ...salesDetails,
      ...overviewDetails,
      ...commercialDetails,
      ...technicalDetails,
      // Bug fix: this used to hardcode 'open' on every save, which silently reset status back to
      // 'open' even for an already Closed Won/Lost opportunity whenever someone edited any other
      // field via this form (stage itself can only be changed via the Kanban drag-and-drop, which
      // now goes through the Close Reason flow in OpportunityManagement's handleStageChange).
      status: financialData.stage === 'closed-won' ? 'won' : financialData.stage === 'closed-lost' ? 'lost' : 'open',
      reminderSent: false,
      activities: opportunity?.activities || [],
      createdAt: opportunity?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Save timestamps to backend
      timestamps: timestamps,
      // Save field history to backend
      fieldHistory: fieldHistory,
    };

    // Bab 30 follow-up: for a brand-new opportunity with no owner picked
    // (financialData.ownerName left at its '' default -- see the comment on
    // that state above), omit the key entirely rather than sending an empty
    // string. opportunitiesRepository's toApiPayload only wraps EXTRA_KEYS,
    // it does not drop empty strings on its own, and the backend's fallback
    // (`body.ownerName ?? user.name`) only kicks in for null/undefined, not
    // ''. JSON.stringify drops keys whose value is `undefined` before the
    // request body is built (same mechanism the Close Reason clearing flow
    // in OpportunityManagement.tsx relies on), so deleting it here lets the
    // backend's real-user-name fallback apply as intended.
    if (!financialData.ownerName.trim()) {
      delete (opportunityData as Record<string, unknown>).ownerName;
    }

    onSave(opportunityData);
  };

  // Helper component for History Tooltip Icon
  const HistoryTooltipIcon = ({ 
    field, 
    color 
  }: { 
    field: TrackableField; 
    color: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'rose' | 'indigo' | 'amber' 
  }) => {
    const colorMap = {
      blue: { icon: 'text-blue-500 hover:text-blue-700', border: 'border-blue-200', text: 'text-blue-900', borderL: 'border-blue-300' },
      green: { icon: 'text-green-500 hover:text-green-700', border: 'border-green-200', text: 'text-green-900', borderL: 'border-green-300' },
      purple: { icon: 'text-[#EEF7F5]0 hover:text-[#013E37]', border: 'border-[#C3DDD9]', text: 'text-[#012D29]', borderL: 'border-[#5BB5AB]' },
      orange: { icon: 'text-orange-500 hover:text-orange-700', border: 'border-orange-200', text: 'text-orange-900', borderL: 'border-orange-300' },
      teal: { icon: 'text-[#013E37] hover:text-[#025C52]', border: 'border-[#013E37]/20', text: 'text-[#012D29]', borderL: 'border-[#013E37]/30' },
      rose: { icon: 'text-rose-500 hover:text-rose-700', border: 'border-rose-200', text: 'text-rose-900', borderL: 'border-rose-300' },
      indigo: { icon: 'text-[#EEF7F5]0 hover:text-[#013E37]', border: 'border-[#C3DDD9]', text: 'text-[#012D29]', borderL: 'border-[#5BB5AB]' },
      amber: { icon: 'text-amber-500 hover:text-amber-700', border: 'border-amber-200', text: 'text-amber-900', borderL: 'border-amber-300' },
    };
    const colors = colorMap[color];
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={colors.icon}>
            <Info className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className={`max-w-sm max-h-64 overflow-y-auto bg-white border-2 ${colors.border} shadow-lg p-3`}
        >
          <div className="space-y-2">
            <p className={`font-semibold text-sm ${colors.text} mb-2`}>📝 History of Changes</p>
            {fieldHistory[field].length > 0 ? (
              <div className="space-y-2 text-xs">
                {fieldHistory[field].map((entry, idx) => (
                  <div key={idx} className={`border-l-2 ${colors.borderL} pl-2 py-1`}>
                    <p className="text-gray-600 font-medium">⏰ {entry.timestamp}</p>
                    <p className="text-gray-800 mt-0.5">{entry.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No history yet</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="!max-w-[1100px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden flex flex-col">
        {/* HEADER */}
        <DialogHeader className="relative bg-[#013E37] text-white px-5 py-3 space-y-0 flex-shrink-0">
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-tight">
                {opportunity ? 'Edit Opportunity' : 'New Opportunity'}
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs mt-0.5 leading-tight">
                {opportunity 
                  ? 'Update opportunity details, products, and sales information' 
                  : 'Create a new sales opportunity'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-120px)] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full grid grid-cols-4 h-auto p-4 bg-[#013E37] gap-2 rounded-none flex-shrink-0">
              <TabsTrigger 
                value="basic" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white text-[#013E37] data-[state=inactive]:bg-white/20 data-[state=inactive]:text-white data-[state=inactive]:hover:bg-white/30 font-medium text-sm transition-all shadow-sm"
              >
                <Building2 className="w-4 h-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sales" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white text-[#013E37] data-[state=inactive]:bg-white/20 data-[state=inactive]:text-white data-[state=inactive]:hover:bg-white/30 font-medium text-sm transition-all shadow-sm"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Sales Details</span>
              </TabsTrigger>
              <TabsTrigger 
                value="overview" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white text-[#013E37] data-[state=inactive]:bg-white/20 data-[state=inactive]:text-white data-[state=inactive]:hover:bg-white/30 font-medium text-sm transition-all shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Overview Opportunity</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ai" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white text-[#013E37] data-[state=inactive]:bg-white/20 data-[state=inactive]:text-white data-[state=inactive]:hover:bg-white/30 font-medium text-sm transition-all shadow-sm"
              >
                <Brain className="w-4 h-4" />
                <span>AI Overview</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-8 py-6 bg-white">

            {/* TAB 1: BASIC INFO */}
            <TabsContent value="basic" className="space-y-6 mt-0">
              <div className="space-y-6">
                {/* Opportunity Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#013E37]" />
                    Opportunity Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 50 Unit Laptop untuk PT ABC"
                    className="text-sm h-11 border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
                    required
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Give your opportunity a clear, descriptive name
                  </p>
                </div>

                {/* Quick Fill from Existing Data */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-900">Quick Fill from Existing Data</Label>
                    <Badge variant="outline" className="text-xs bg-[#EEF7F5] text-[#013E37] border-[#013E37]/30">Optional</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Type Toggle */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">Type</Label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setQuickFillType('client')}
                          className={`py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            quickFillType === 'client' 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <UserCircle2 className="w-4 h-4" />
                          Client
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickFillType('partner')}
                          className={`py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            quickFillType === 'partner' 
                              ? 'bg-[#013E37] text-white shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Briefcase className="w-4 h-4" />
                          Partner
                        </button>
                      </div>
                    </div>

                    {/* Select Dropdown */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">
                        {quickFillType === 'client' ? 'Select Client' : 'Select Partner'}
                      </Label>
                      {quickFillType === 'client' ? (
                        <Select onValueChange={handleClientChange}>
                          <SelectTrigger className="h-11 text-sm border-gray-300">
                            <SelectValue placeholder="Select client..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {client.nama_entitas || client.companyName || client.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select onValueChange={handlePartnerChange}>
                          <SelectTrigger className="h-11 text-sm border-gray-300">
                            <SelectValue placeholder="Select partner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {partners.map((partner) => (
                              <SelectItem key={partner.id} value={partner.id}>
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-3.5 h-3.5" />
                                  {partner.nama_perusahaan || partner.companyName || partner.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#013E37] flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Select to auto-fill contact details, or fill manually below
                  </p>
                </div>

                {/* Client Name & Contact Person */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#013E37]" />
                      Client Name *
                    </Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Company name"
                      className="text-sm h-11 border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <UserCircle2 className="w-4 h-4 text-[#013E37]" />
                      Contact Person *
                    </Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="Contact name"
                      className="text-sm h-11 border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
                      required
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#013E37]" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@gmail.com"
                      className="text-sm h-11 border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-[#013E37]" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 812 3456 7890"
                      className="text-sm h-11 border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: SALES DETAILS - COMPLETE 60+ FIELDS */}
            <TabsContent value="sales" className="space-y-4 mt-0">
              
              <Accordion type="multiple" className="space-y-4">
                {/* Section 1: Sales Process */}
                <AccordionItem value="section-1" className="border rounded-lg bg-white shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#EEF7F5]/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#013E37] flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-gray-900">Sales Process</h3>
                        <p className="text-xs text-gray-500 font-normal">Stage, probability, and action items</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    {/* 18. SALES STAGES */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Sales Stages</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex items-center justify-center">
                              <Info className="h-3.5 w-3.5 text-gray-400 hover:text-[#013E37] transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            align="start"
                            className="max-w-md bg-white text-gray-900 border border-gray-200 shadow-lg p-0 overflow-hidden"
                            sideOffset={5}
                            style={{ pointerEvents: 'auto' }}
                            onPointerDownCapture={(e) => e.stopPropagation()}
                          >
                            <div 
                              className="h-[400px] overflow-y-auto sales-stage-tooltip-scroll p-4 pr-3 space-y-3 text-left cursor-default"
                              style={{ pointerEvents: 'auto', userSelect: 'text' }}
                              onWheel={(e) => e.stopPropagation()}
                            >
                              <div>
                                <h4 className="font-semibold text-sm text-[#013E37] mb-1">1. Engage (Prospecting/Initial Contact)</h4>
                                <p className="text-xs text-gray-700 mb-1"><strong>Purpose:</strong> Menghubungi kontak awal, membangun kesadaran, dan menentukan apakah prospek layak dikejar.</p>
                                <p className="text-xs text-gray-600 mb-1"><strong>Explanation:</strong> Pada tahap ini, perwakilan penjualan (atau sistem otomatis) terhubung dengan pelanggan potensial untuk memicu minat. Ini melibatkan pengiriman email pemasaran yang disesuaikan, memulai panggilan telepon, dan menggunakan alat untuk mulai membangun hubungan.</p>
                                <p className="text-xs text-[#013E37]"><strong>Key Focus:</strong> Mengubah prospek mentah menjadi prospek yang memenuhi syarat.</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-sm text-[#013E37] mb-1">2. Understand (Discovery & Qualification)</h4>
                                <p className="text-xs text-gray-700 mb-1"><strong>Purpose:</strong> Memahami secara mendalam kebutuhan bisnis pelanggan, titik masalah (pain points), dan anggaran.</p>
                                <p className="text-xs text-gray-600 mb-1"><strong>Explanation:</strong> Tim penjualan melakukan panggilan penemuan untuk menganalisis lingkungan pelanggan saat ini, mengidentifikasi pemangku kepentingan utama, dan menentukan apakah peluang tersebut selaras dengan solusi. Tahap ini sering melibatkan penggunaan "Assessments" untuk menilai kemungkinan keberhasilan peluang tersebut.</p>
                                <p className="text-xs text-[#013E37]"><strong>Key Focus:</strong> Kualifikasi, mengidentifikasi titik masalah, dan mengumpulkan informasi utama pelanggan.</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-sm text-[#013E37] mb-1">3. Solution (Building the Vision)</h4>
                                <p className="text-xs text-gray-700 mb-1"><strong>Purpose:</strong> Mengembangkan dan mempresentasikan solusi khusus yang menjawab kebutuhan yang telah diidentifikasi.</p>
                                <p className="text-xs text-gray-600 mb-1"><strong>Explanation:</strong> Penjual mendemonstrasikan bagaimana produk atau layanan secara spesifik memecahkan masalah pelanggan. Ini melibatkan pembuatan proposal, mengonfigurasi penawaran awal, dan membangun kasus bisnis yang meyakinkan.</p>
                                <p className="text-xs text-[#013E37]"><strong>Key Focus:</strong> Mendemonstrasikan nilai, membuat demonstrasi/presentasi, dan menentukan solusi yang diusulkan.</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-sm text-[#013E37] mb-1">4. Align (Consensus & Verification)</h4>
                                <p className="text-xs text-gray-700 mb-1"><strong>Purpose:</strong> Memastikan semua pemangku kepentingan setuju dengan solusi dan proposisi nilai yang diusulkan.</p>
                                <p className="text-xs text-gray-600 mb-1"><strong>Explanation:</strong> Tahap ini berfokus pada mendapatkan konsensus di antara para pembuat keputusan pelanggan dan menyelaraskan solusi dengan tujuan bisnis mereka. Ini menjembatani kesenjangan antara solusi teknis dan tujuan bisnis strategis.</p>
                                <p className="text-xs text-[#013E37]"><strong>Key Focus:</strong> Multi-threading (melibatkan banyak kontak), menyelesaikan keberatan, dan menyelaraskan dengan prioritas pelanggan.</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-sm text-[#013E37] mb-1">5. Execute (Negotiation & Finalization)</h4>
                                <p className="text-xs text-gray-700 mb-1"><strong>Purpose:</strong> Menegosiasikan persyaratan akhir dan membuat kontrak formal.</p>
                                <p className="text-xs text-gray-600 mb-1"><strong>Explanation:</strong> Pada tahap Eksekusi, fokus beralih ke penyelesaian kesepakatan. Ini melibatkan penggunaan CPQ (Configure, Price, Quote) untuk membuat kutipan harga yang akurat, menegosiasikan persyaratan kontrak, dan memastikan semua persetujuan internal yang diperlukan diperoleh.</p>
                                <p className="text-xs text-[#013E37]"><strong>Key Focus:</strong> Finalisasi proposal, negosiasi, dan pembuatan kontrak.</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-sm text-[#013E37] mb-1">6. Close (Win/Loss)</h4>
                                <p className="text-xs text-gray-700 mb-1"><strong>Purpose:</strong> Secara resmi memenangkan atau kehilangan peluang dan menyelesaikan transaksi.</p>
                                <p className="text-xs text-gray-600 mb-1"><strong>Explanation:</strong> Langkah terakhir di mana kontrak ditandatangani (Closed/Won) atau peluang hilang (Closed/Lost). Sistem mencatat hasilnya, yang membantu prakiraan masa depan dan analitik penjualan.</p>
                                <p className="text-xs text-[#013E37]"><strong>Key Focus:</strong> Tanda tangan akhir, memperbarui CRM dengan hasil akhir, dan pindah ke fase implementasi.</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        value={salesDetails.salesStage}
                        onValueChange={(value: any) => setSalesDetails({ ...salesDetails, salesStage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Engage">1. Engage</SelectItem>
                          <SelectItem value="Understand">2. Understand</SelectItem>
                          <SelectItem value="Solution">3. Solution</SelectItem>
                          <SelectItem value="Align">4. Align</SelectItem>
                          <SelectItem value="Execute">5. Execute</SelectItem>
                          <SelectItem value="Close (Win/Loss)">6. Close (Win/Loss)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Auto-Sync Info */}
                      <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-[#EEF7F5] border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-blue-900">Auto-Sync with Pipeline</p>
                            <div className="text-xs text-gray-700 space-y-0.5">
                              <p>• <span className="font-medium text-blue-700">Prospecting</span> → Engage</p>
                              <p>• <span className="font-medium text-[#013E37]">Proposal</span> → Solution</p>
                              <p>• <span className="font-medium text-orange-700">Negotiation</span> → Align</p>
                              <p>• <span className="font-medium text-green-700">Closed Won</span> → Execute</p>
                              <p>• <span className="font-medium text-red-700">Closed Lost</span> → Close</p>
                            </div>
                            <p className="text-xs text-gray-600 italic mt-1">
                              ⚡ When you move deals in Pipeline, Sales Stage auto-updates. You can also manually change it here.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 19. WIN PROBABILITY */}
                    <div className="space-y-2">
                      <Label>Win Probability (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={salesDetails.winProbability}
                        onChange={(e) => setSalesDetails({ ...salesDetails, winProbability: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 20. CURRENT STATUS */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Current Status</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-blue-500 hover:text-blue-700">
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="max-w-sm max-h-64 overflow-y-auto bg-white border-2 border-blue-200 shadow-lg p-3"
                          >
                            <div className="space-y-2">
                              <p className="font-semibold text-sm text-blue-900 mb-2">📝 History of Changes</p>
                              {fieldHistory.currentStatus.length > 0 ? (
                                <div className="space-y-2 text-xs">
                                  {fieldHistory.currentStatus.map((entry, idx) => (
                                    <div key={idx} className="border-l-2 border-blue-300 pl-2 py-1">
                                      <p className="text-gray-600 font-medium">⏰ {entry.timestamp}</p>
                                      <p className="text-gray-800 mt-0.5">{entry.value}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">No history yet</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        value={salesDetails.currentStatus}
                        onChange={(e) => setSalesDetails({ ...salesDetails, currentStatus: e.target.value })}
                        onBlur={(e) => updateTimestamp('currentStatus', e.target.value)}
                        placeholder="Current status of the deal..."
                        rows={2}
                      />
                      {timestamps.currentStatus && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.currentStatus}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>

                    {/* 21. NEXT ACTION */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Next Action</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-green-500 hover:text-green-700">
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="max-w-sm max-h-64 overflow-y-auto bg-white border-2 border-green-200 shadow-lg p-3"
                          >
                            <div className="space-y-2">
                              <p className="font-semibold text-sm text-green-900 mb-2">📝 History of Changes</p>
                              {fieldHistory.nextAction.length > 0 ? (
                                <div className="space-y-2 text-xs">
                                  {fieldHistory.nextAction.map((entry, idx) => (
                                    <div key={idx} className="border-l-2 border-green-300 pl-2 py-1">
                                      <p className="text-gray-600 font-medium">⏰ {entry.timestamp}</p>
                                      <p className="text-gray-800 mt-0.5">{entry.value}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">No history yet</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        value={salesDetails.nextAction}
                        onChange={(e) => setSalesDetails({ ...salesDetails, nextAction: e.target.value })}
                        onBlur={(e) => updateTimestamp('nextAction', e.target.value)}
                        placeholder="Next action items..."
                        rows={2}
                      />
                      {timestamps.nextAction && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.nextAction}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 22. NOTES */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Notes</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-[#EEF7F5]0 hover:text-[#013E37]">
                            <Info className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="max-w-sm max-h-64 overflow-y-auto bg-white border-2 border-[#C3DDD9] shadow-lg p-3"
                        >
                          <div className="space-y-2">
                            <p className="font-semibold text-sm text-[#012D29] mb-2">📝 History of Changes</p>
                            {fieldHistory.notes.length > 0 ? (
                              <div className="space-y-2 text-xs">
                                {fieldHistory.notes.map((entry, idx) => (
                                  <div key={idx} className="border-l-2 border-[#5BB5AB] pl-2 py-1">
                                    <p className="text-gray-600 font-medium">⏰ {entry.timestamp}</p>
                                    <p className="text-gray-800 mt-0.5">{entry.value}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">No history yet</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      value={salesDetails.notes}
                      onChange={(e) => setSalesDetails({ ...salesDetails, notes: e.target.value })}
                      onBlur={(e) => updateTimestamp('notes', e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                    {timestamps.notes && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last updated: {timestamps.notes}</span>
                        <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                      </p>
                    )}
                  </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 2: Opportunity Qualification */}
                <AccordionItem value="section-2" className="border rounded-lg bg-white shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#EEF7F5]/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#013E37] flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-gray-900">Opportunity Qualification</h3>
                        <p className="text-xs text-gray-500 font-normal">Define maturity, targets, and forecast type</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-4">

                  {/* 1. Opportunity Maturity */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Opportunity Maturity
                    </Label>
                    <p className="text-xs text-gray-600 mb-2">
                      S = Selected, F = Funded, T = Timeline Committed
                    </p>
                    <div className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="maturity-s"
                          checked={salesDetails.opportunityMaturity.selected}
                          onCheckedChange={(checked) => 
                            setSalesDetails({
                              ...salesDetails,
                              opportunityMaturity: {
                                ...salesDetails.opportunityMaturity,
                                selected: checked as boolean
                              }
                            })
                          }
                        />
                        <label htmlFor="maturity-s" className="text-sm font-medium">
                          (S) Selected - Our Product is selected vs Competitor
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="maturity-f"
                          checked={salesDetails.opportunityMaturity.funded}
                          onCheckedChange={(checked) => 
                            setSalesDetails({
                              ...salesDetails,
                              opportunityMaturity: {
                                ...salesDetails.opportunityMaturity,
                                funded: checked as boolean
                              }
                            })
                          }
                        />
                        <label htmlFor="maturity-f" className="text-sm font-medium">
                          (F) Funded - Budget Commit from Customer
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="maturity-t"
                          checked={salesDetails.opportunityMaturity.timeline}
                          onCheckedChange={(checked) => 
                            setSalesDetails({
                              ...salesDetails,
                              opportunityMaturity: {
                                ...salesDetails.opportunityMaturity,
                                timeline: checked as boolean
                              }
                            })
                          }
                        />
                        <label htmlFor="maturity-t" className="text-sm font-medium">
                          (T) Timeline - Timeline committed from Customer
                        </label>
                      </div>
                    </div>
                    
                    {/* Budget Status Dropdown - Inside Opportunity Maturity */}
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <div className="grid grid-cols-3 gap-6">
                        {/* Empty left column for alignment */}
                        <div></div>
                        
                        {/* Budget Status - Centered column, label left-aligned */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            Budget Status
                          </Label>
                          <Select
                            value={salesDetails.budgetStatus}
                            onValueChange={(value: any) => setSalesDetails({ ...salesDetails, budgetStatus: value })}
                          >
                            <SelectTrigger className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Select budget status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Budget Proposed">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  Budget Proposed
                                </div>
                              </SelectItem>
                              <SelectItem value="Budget Approved">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                  Budget Approved
                                </div>
                              </SelectItem>
                              <SelectItem value="Budget Released">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  Budget Released
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Empty right column for alignment */}
                        <div></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* 2. TARGET Quarter */}
                    <div className="space-y-2">
                      <Label>TARGET Quarter</Label>
                      <Select
                        value={salesDetails.target}
                        onValueChange={(value: any) => setSalesDetails({ ...salesDetails, target: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1">Q1 - {salesDetails.targetYear}</SelectItem>
                          <SelectItem value="Q2">Q2 - {salesDetails.targetYear}</SelectItem>
                          <SelectItem value="Q3">Q3 - {salesDetails.targetYear}</SelectItem>
                          <SelectItem value="Q4">Q4 - {salesDetails.targetYear}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 3. CLOSING TARGET */}
                    <div className="space-y-2">
                      <Label>CLOSING TARGET</Label>
                      <Input
                        type="date"
                        value={salesDetails.closingTarget}
                        onChange={(e) => setSalesDetails({ ...salesDetails, closingTarget: e.target.value })}
                      />
                    </div>

                    {/* 4. Forecast Type */}
                    <div className="space-y-2">
                      <Label>Forecast Type</Label>
                      <Select
                        value={salesDetails.forecastType}
                        onValueChange={(value: any) => setSalesDetails({ ...salesDetails, forecastType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pipeline">Pipeline (10-30%)</SelectItem>
                          <SelectItem value="Upside">Upside (40%)</SelectItem>
                          <SelectItem value="Strong Upside">Strong Upside (50%)</SelectItem>
                          <SelectItem value="Forecast/Commit">Forecast/Commit (≥60%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 5. Low Hanging Fruit */}
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Checkbox
                      id="lowHangingFruit"
                      checked={salesDetails.lowHangingFruit}
                      onCheckedChange={(checked) => 
                        setSalesDetails({ ...salesDetails, lowHangingFruit: checked as boolean })
                      }
                    />
                    <label htmlFor="lowHangingFruit" className="text-sm font-medium">
                      Low Hanging Fruit (Closable within 3 months, no complexity)
                    </label>
                  </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 3: Solution & Competition */}
                <AccordionItem value="section-3" className="border rounded-lg bg-white shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#EEF7F5]/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-[#013E37] flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-gray-900">Solution & Competition</h3>
                        <p className="text-xs text-gray-500 font-normal">Product details and competitor analysis</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    {/* 6. Solution */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Solution</Label>
                        <HistoryTooltipIcon field="solution" color="teal" />
                      </div>
                      <Input
                        value={salesDetails.solution}
                        onChange={(e) => setSalesDetails({ ...salesDetails, solution: e.target.value })}
                        onBlur={(e) => updateTimestamp('solution', e.target.value)}
                        placeholder="Proposed solution"
                      />
                      {timestamps.solution && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.solution}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>

                    {/* 7. Product */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Product</Label>
                        <HistoryTooltipIcon field="product" color="indigo" />
                      </div>
                      <Input
                        value={salesDetails.product}
                        onChange={(e) => setSalesDetails({ ...salesDetails, product: e.target.value })}
                        onBlur={(e) => updateTimestamp('product', e.target.value)}
                        placeholder="Main product"
                      />
                      {timestamps.product && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.product}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 8. Existing System */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Existing System</Label>
                        <HistoryTooltipIcon field="existingSystem" color="amber" />
                      </div>
                      <Input
                        value={salesDetails.existingSystem}
                        onChange={(e) => setSalesDetails({ ...salesDetails, existingSystem: e.target.value })}
                        onBlur={(e) => updateTimestamp('existingSystem', e.target.value)}
                        placeholder="Current system in use"
                      />
                      {timestamps.existingSystem && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.existingSystem}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>

                    {/* 9. Competitor */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Competitor</Label>
                        <HistoryTooltipIcon field="competitor" color="rose" />
                      </div>
                      <Input
                        value={salesDetails.competitor}
                        onChange={(e) => setSalesDetails({ ...salesDetails, competitor: e.target.value })}
                        onBlur={(e) => updateTimestamp('competitor', e.target.value)}
                        placeholder="Main competitor"
                      />
                      {timestamps.competitor && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.competitor}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 10. Competitor Website */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Competitor Website
                    </Label>
                    <Input
                      type="url"
                      value={salesDetails.competitorWebsite}
                      onChange={(e) => setSalesDetails({ ...salesDetails, competitorWebsite: e.target.value })}
                      placeholder="https://competitor.com"
                    />
                  </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 4: Team & Partnership */}
                <AccordionItem value="section-4" className="border rounded-lg bg-white shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#EEF7F5]/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-gray-900">Team & Partnership</h3>
                        <p className="text-xs text-gray-500 font-normal">Partner and sales representative info</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    {/* 11. PARTNER NAME */}
                    <div className="space-y-2">
                      <Label>Partner Name</Label>
                      <Select
                        value={salesDetails.partnerId}
                        onValueChange={handlePartnerChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select partner" />
                        </SelectTrigger>
                        <SelectContent>
                          {partners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.nama_perusahaan || partner.companyName || partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 12. PARTNER SALES REP */}
                    <div className="space-y-2">
                      <Label>Partner Sales Rep</Label>
                      <Select
                        value={salesDetails.salesRepId}
                        onValueChange={handleSalesRepChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select partner sales rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.nama_lengkap || employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 5: Financial Details */}
                <AccordionItem value="section-5" className="border rounded-lg bg-white shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#EEF7F5]/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-gray-900">Financial Details</h3>
                        <p className="text-xs text-gray-500 font-normal">Revenue, deal size, and business model</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-4">
                    {/* Bab 30 (24 Sep 2026, hasil deep review + smoke test grup
                        Sales Pipeline): financialData.closeDate is REQUIRED by
                        POST /api/opportunities (api/handler.ts) but never had
                        an input anywhere in this ~2400-line form -- it only
                        ever got populated when EDITING an existing record via
                        loadOpportunity(). Every "New Opportunity" submission
                        failed with "closeDate wajib diisi" even though the
                        three other required fields (name/clientName/
                        contactPerson) were filled in, and there was no way to
                        fix it from the UI. This is that missing field. */}
                    <div className="space-y-2">
                      <Label>Close Date *</Label>
                      <Input
                        type="date"
                        required
                        value={financialData.closeDate}
                        onChange={(e) => setFinancialData({ ...financialData, closeDate: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">Target tanggal deal ini akan closed (wajib diisi).</p>
                    </div>

                    {/* 13. BIZMOD */}
                    <div className="space-y-2">
                      <Label>BizMod</Label>
                      <Select
                        value={salesDetails.bizmod}
                        onValueChange={(value) => setSalesDetails({ ...salesDetails, bizmod: value })}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select business model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KSO (Revenue Share)">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              KSO (Revenue Share)
                            </div>
                          </SelectItem>
                          <SelectItem value="Rent (Fix Subscription)">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Rent (Fix Subscription)
                            </div>
                          </SelectItem>
                          <SelectItem value="1 Time Purchase">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              1 Time Purchase
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 13b. CONTRACT PERIOD - Conditional (only for KSO & Rent) */}
                    {(salesDetails.bizmod === 'KSO (Revenue Share)' || salesDetails.bizmod === 'Rent (Fix Subscription)') && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          Contract Period
                        </Label>
                        <Select
                          value={salesDetails.contractPeriod}
                          onValueChange={(value) => setSalesDetails({ ...salesDetails, contractPeriod: value })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select contract period" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Show "1 Year" only for Rent, not for KSO */}
                            {salesDetails.bizmod !== 'KSO (Revenue Share)' && (
                              <SelectItem value="1 Year">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  1 Year
                                </div>
                              </SelectItem>
                            )}
                            <SelectItem value="3 Years">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                3 Years
                              </div>
                            </SelectItem>
                            <SelectItem value="5 Years">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                5 Years
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 14. ANNUAL REVENUE */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Annual Revenue</Label>
                        <HistoryTooltipIcon field="annualRevenue" color="blue" />
                      </div>
                      <Input
                        type="number"
                        value={salesDetails.annualRevenue}
                        onChange={(e) => setSalesDetails({ ...salesDetails, annualRevenue: parseFloat(e.target.value) || 0 })}
                        onBlur={(e) => updateTimestamp('annualRevenue', e.target.value)}
                        placeholder="0"
                      />
                      {timestamps.annualRevenue && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.annualRevenue}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 15. SIZE OF DEAL */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Size of Deal</Label>
                        <HistoryTooltipIcon field="sizeOfDeal" color="green" />
                      </div>
                      <Input
                        type="number"
                        value={salesDetails.sizeOfDeal}
                        onChange={(e) => setSalesDetails({ ...salesDetails, sizeOfDeal: parseFloat(e.target.value) || 0 })}
                        onBlur={(e) => updateTimestamp('sizeOfDeal', e.target.value)}
                        placeholder="0"
                      />
                      {timestamps.sizeOfDeal && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.sizeOfDeal}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>

                    {/* 16. MONTHLY REV */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Monthly Revenue</Label>
                        <HistoryTooltipIcon field="monthlyRev" color="purple" />
                      </div>
                      <Input
                        type="number"
                        value={salesDetails.monthlyRev}
                        onChange={(e) => setSalesDetails({ ...salesDetails, monthlyRev: parseFloat(e.target.value) || 0 })}
                        onBlur={(e) => updateTimestamp('monthlyRev', e.target.value)}
                        placeholder="0"
                      />
                      {timestamps.monthlyRev && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last updated: {timestamps.monthlyRev}</span>
                          <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                        </p>
                      )}
                    </div>
                  </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>

            </TabsContent>

            {/* TAB 3: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="space-y-4">

                {/* Section Header Card */}
                <div className="border rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg text-gray-900">Overview Notes</h3>
                      <p className="text-xs text-gray-500 font-normal">Manager notes and actions to close</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                  {/* 23.01 Manager Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Manager Notes</Label>
                      <HistoryTooltipIcon field="managerNotes" color="orange" />
                    </div>
                    <Textarea
                      value={overviewDetails.managerNotes}
                      onChange={(e) => setOverviewDetails({ ...overviewDetails, managerNotes: e.target.value })}
                      onBlur={(e) => updateTimestamp('managerNotes', e.target.value)}
                      placeholder="Notes from manager..."
                      rows={3}
                    />
                    {timestamps.managerNotes && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last updated: {timestamps.managerNotes}</span>
                        <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                      </p>
                    )}
                  </div>

                  {/* 23.02 Actions to Close */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Actions to Close</Label>
                      <HistoryTooltipIcon field="actionsToClose" color="rose" />
                    </div>
                    <Textarea
                      value={overviewDetails.actionsToClose}
                      onChange={(e) => setOverviewDetails({ ...overviewDetails, actionsToClose: e.target.value })}
                      onBlur={(e) => updateTimestamp('actionsToClose', e.target.value)}
                      placeholder="Required actions to close this deal..."
                      rows={3}
                    />
                    {timestamps.actionsToClose && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last updated: {timestamps.actionsToClose}</span>
                        <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                      </p>
                    )}
                  </div>

                  {/* 23.03 Engineer Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Engineer Notes</Label>
                      <HistoryTooltipIcon field="engineerNotes" color="teal" />
                    </div>
                    <Textarea
                      value={overviewDetails.engineerNotes}
                      onChange={(e) => setOverviewDetails({ ...overviewDetails, engineerNotes: e.target.value })}
                      onBlur={(e) => updateTimestamp('engineerNotes', e.target.value)}
                      placeholder="Technical notes from engineers..."
                      rows={3}
                    />
                    {timestamps.engineerNotes && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last updated: {timestamps.engineerNotes}</span>
                        <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                      </p>
                    )}
                  </div>

                  </div>
                </div>

                {/* Accordion for Commercial & Technical Detail */}
                <Accordion type="single" collapsible className="w-full space-y-4">
                  
                  {/* Commercial Detail Section - Collapsible */}
                  <AccordionItem value="commercial" className="border rounded-lg bg-gradient-to-r from-[#EEF7F5] to-[#EEF7F5]">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#013E37] to-[#013E37] flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-gray-900">Commercial Detail</h3>
                          <p className="text-sm text-gray-600">Budget, evaluation, and buying process</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4">
                        
                        {/* 23.04.01 Why Buy Anything? */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Why Buy Anything?</Label>
                            <HistoryTooltipIcon field="whyBuyAnything" color="blue" />
                          </div>
                          <Textarea
                            value={commercialDetails.whyBuyAnything}
                            onChange={(e) => setCommercialDetails({ ...commercialDetails, whyBuyAnything: e.target.value })}
                            onBlur={(e) => updateTimestamp('whyBuyAnything', e.target.value)}
                            placeholder="Business drivers..."
                            rows={2}
                          />
                          {timestamps.whyBuyAnything && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last updated: {timestamps.whyBuyAnything}</span>
                              <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                            </p>
                          )}
                        </div>

                        {/* 23.04.02 Why Buy Now? */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Why Buy Now?</Label>
                            <HistoryTooltipIcon field="whyBuyNow" color="green" />
                          </div>
                          <Textarea
                            value={commercialDetails.whyBuyNow}
                            onChange={(e) => setCommercialDetails({ ...commercialDetails, whyBuyNow: e.target.value })}
                            onBlur={(e) => updateTimestamp('whyBuyNow', e.target.value)}
                            placeholder="Urgency factors..."
                            rows={2}
                          />
                          {timestamps.whyBuyNow && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last updated: {timestamps.whyBuyNow}</span>
                              <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* 23.04.03 Evaluation Started? */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="evaluationStarted"
                              checked={commercialDetails.evaluationStarted}
                              onCheckedChange={(checked) => 
                                setCommercialDetails({ ...commercialDetails, evaluationStarted: checked as boolean })
                              }
                            />
                            <label htmlFor="evaluationStarted" className="text-sm font-medium">
                              Evaluation Started?
                            </label>
                          </div>

                          {/* 23.04.04 Budget Status? */}
                          <div className="space-y-2">
                            <Label>Budget Status?</Label>
                            <Select
                              value={commercialDetails.budgetAvailabilityStatus}
                              onValueChange={(value: any) => setCommercialDetails({ ...commercialDetails, budgetAvailabilityStatus: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 23.04.05 Why Buy INTRAMEDIKA? */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Why Buy INTRAMEDIKA?</Label>
                            <HistoryTooltipIcon field="whyBuyIntramedika" color="purple" />
                          </div>
                          <Textarea
                            value={commercialDetails.whyBuyIntramedika}
                            onChange={(e) => setCommercialDetails({ ...commercialDetails, whyBuyIntramedika: e.target.value })}
                            onBlur={(e) => updateTimestamp('whyBuyIntramedika', e.target.value)}
                            placeholder="Our unique value proposition..."
                            rows={2}
                          />
                          {timestamps.whyBuyIntramedika && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last updated: {timestamps.whyBuyIntramedika}</span>
                              <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                            </p>
                          )}
                        </div>

                        {/* 23.04.06 Win Strategy & Buying Process */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Win Strategy & Buying Process</Label>
                            <HistoryTooltipIcon field="winStrategyBuyingProcess" color="indigo" />
                          </div>
                          <Textarea
                            value={commercialDetails.winStrategyBuyingProcess}
                            onChange={(e) => setCommercialDetails({ ...commercialDetails, winStrategyBuyingProcess: e.target.value })}
                            onBlur={(e) => updateTimestamp('winStrategyBuyingProcess', e.target.value)}
                            placeholder="Strategy to win..."
                            rows={2}
                          />
                          {timestamps.winStrategyBuyingProcess && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last updated: {timestamps.winStrategyBuyingProcess}</span>
                              <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                            </p>
                          )}
                        </div>

                        {/* 23.04.07 Joint Execution Plan Created */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Joint Execution Plan Created</Label>
                            <HistoryTooltipIcon field="jointExecutionPlanCreated" color="amber" />
                          </div>
                          <Textarea
                            value={commercialDetails.jointExecutionPlanCreated}
                            onChange={(e) => setCommercialDetails({ ...commercialDetails, jointExecutionPlanCreated: e.target.value })}
                            onBlur={(e) => updateTimestamp('jointExecutionPlanCreated', e.target.value)}
                            placeholder="Execution plan details..."
                            rows={2}
                          />
                          {timestamps.jointExecutionPlanCreated && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last updated: {timestamps.jointExecutionPlanCreated}</span>
                              <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* 23.04.08 Vendor Choice? */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="vendorChoice"
                              checked={commercialDetails.vendorChoice}
                              onCheckedChange={(checked) => 
                                setCommercialDetails({ ...commercialDetails, vendorChoice: checked as boolean })
                              }
                            />
                            <label htmlFor="vendorChoice" className="text-sm font-medium">
                              Vendor Choice?
                            </label>
                          </div>

                          {/* 23.04.09 Agreement Status */}
                          <div className="space-y-2">
                            <Label>Agreement Status</Label>
                            <Select
                              value={commercialDetails.agreementStatus || ''}
                              onValueChange={(value: any) => setCommercialDetails({ ...commercialDetails, agreementStatus: value || null })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Agreement Proposed">Agreement Proposed</SelectItem>
                                <SelectItem value="Agreement Reviewed">Agreement Reviewed</SelectItem>
                                <SelectItem value="Terms & Conditions Agreed">Terms & Conditions Agreed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* 23.04.10 Customer Commit */}
                          <div className="space-y-2">
                            <Label>Customer Commit</Label>
                            <Select
                              value={commercialDetails.customerCommit}
                              onValueChange={(value: any) => setCommercialDetails({ ...commercialDetails, customerCommit: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="Customer Commit in 90 Days">Customer Commit in 90 Days</SelectItem>
                                <SelectItem value="Commit to Sign">Commit to Sign</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 23.04.11 Business Case Status */}
                          <div className="space-y-2">
                            <Label>Business Case Status</Label>
                            <Select
                              value={commercialDetails.businessCaseStatus || ''}
                              onValueChange={(value: any) => setCommercialDetails({ ...commercialDetails, businessCaseStatus: value || null })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Business Case Validated">Business Case Validated</SelectItem>
                                <SelectItem value="No Business Case Required">No Business Case Required</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 23.04.12 Joint Execution Plan Agreed */}
                        <div className="space-y-2">
                          <Label>Joint Execution Plan Agreed</Label>
                          <Select
                            value={commercialDetails.jointExecutionPlanAgreed}
                            onValueChange={(value: any) => setCommercialDetails({ ...commercialDetails, jointExecutionPlanAgreed: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N/A">N/A</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="Yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 23.04.13 Risk */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Risk</Label>
                            <HistoryTooltipIcon field="risk" color="rose" />
                          </div>
                          <Textarea
                            value={commercialDetails.risk}
                            onChange={(e) => setCommercialDetails({ ...commercialDetails, risk: e.target.value })}
                            onBlur={(e) => updateTimestamp('risk', e.target.value)}
                            placeholder="Identified risks..."
                            rows={3}
                          />
                          {timestamps.risk && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last updated: {timestamps.risk}</span>
                              <Database className="w-3 h-3 text-blue-500 ml-1" title="Saved to backend" />
                            </p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Technical Detail Section - Collapsible */}
                  <AccordionItem value="technical" className="border rounded-lg bg-gradient-to-r from-red-50 to-pink-50">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-gray-900">Technical Detail</h3>
                          <p className="text-sm text-gray-600">Solution fit and implementation plan</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4">
                        
                        {/* 23.05.01 Function Fit */}
                        <div className="space-y-2">
                          <Label>How is the Function Fit?</Label>
                          <Select
                            value={technicalDetails.functionFit || ''}
                            onValueChange={(value: any) => setTechnicalDetails({ ...technicalDetails, functionFit: value || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fit level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Major Gaps">Major Gaps</SelectItem>
                              <SelectItem value="Some Gaps (addressable)">Some Gaps (addressable)</SelectItem>
                              <SelectItem value="No Gaps">No Gaps</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 23.05.02 Competitive Differentiation */}
                        <div className="space-y-2">
                          <Label>Does INTRAMEDIKA have a Competitive Differentiation in this pursuit?</Label>
                          <Select
                            value={technicalDetails.competitiveDifferentiation || ''}
                            onValueChange={(value: any) => setTechnicalDetails({ ...technicalDetails, competitiveDifferentiation: value || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select differentiation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Disadvantage">Disadvantage</SelectItem>
                              <SelectItem value="Neutral">Neutral</SelectItem>
                              <SelectItem value="Clear Advantage">Clear Advantage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 23.05.03 Solution Demo Status */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="solutionDemoStatus"
                            checked={technicalDetails.solutionDemoStatus}
                            onCheckedChange={(checked) => 
                              setTechnicalDetails({ ...technicalDetails, solutionDemoStatus: checked as boolean })
                            }
                          />
                          <label htmlFor="solutionDemoStatus" className="text-sm font-medium">
                            Solution Demo Status - Demo Completed?
                          </label>
                        </div>

                        {/* 23.05.04 Implementation Strategy */}
                        <div className="space-y-2">
                          <Label>Are We Aware of Implementation Strategy?</Label>
                          <Select
                            value={technicalDetails.implementationStrategy || ''}
                            onValueChange={(value: any) => setTechnicalDetails({ ...technicalDetails, implementationStrategy: value || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="No Implementation Required">No Implementation Required</SelectItem>
                              <SelectItem value="Strategy Known">Strategy Known</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 23.05.05 Solution & Architecture Validated */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="solutionArchitectureValidated"
                            checked={technicalDetails.solutionArchitectureValidated}
                            onCheckedChange={(checked) => 
                              setTechnicalDetails({ ...technicalDetails, solutionArchitectureValidated: checked as boolean })
                            }
                          />
                          <label htmlFor="solutionArchitectureValidated" className="text-sm font-medium">
                            Solution & Architecture Validated?
                          </label>
                        </div>

                        {/* 23.05.06 Implementation Plan Agreed */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="implementationPlanAgreed"
                            checked={technicalDetails.implementationPlanAgreed}
                            onCheckedChange={(checked) => 
                              setTechnicalDetails({ ...technicalDetails, implementationPlanAgreed: checked as boolean })
                            }
                          />
                          <label htmlFor="implementationPlanAgreed" className="text-sm font-medium">
                            Implementation Plan Agreed with Customer & Implementation?
                          </label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>

              </div>
            </TabsContent>

            {/* TAB 4: AI OVERVIEW */}
            <TabsContent value="ai" className="space-y-4 mt-0">
              <div className="space-y-4">

                {/* AI Section Header */}
                <div className="border rounded-lg bg-gradient-to-r from-[#EEF7F5] via-[#EEF7F5] to-pink-50 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#013E37] to-[#013E37] flex items-center justify-center animate-pulse">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-xl text-gray-900">AI-Powered Insights</h3>
                      <p className="text-sm text-gray-600">Leverage AI to maximize your sales potential</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 bg-white/70 p-3 rounded-lg border border-[#DFF0EC]">
                    Our AI analyzes customer data, conversations, and behavior patterns to provide actionable insights and recommendations.
                  </p>
                </div>

                {/* 1. AI CUSTOMER INSIGHTS & ANALYTICS */}
                <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <LineChart className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 mb-1">AI Customer Insights & Analytics</h4>
                        <p className="text-sm text-gray-600 mb-3">Deep dive into customer behavior, preferences, and engagement patterns</p>
                        
                        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Customer Engagement Score</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '78%'}}></div>
                                </div>
                                <span className="text-sm font-bold text-blue-600">78/100</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Purchase Intent Signals</p>
                              <p className="text-xs text-gray-600">High interest detected in product demo requests (+35% vs. avg)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Communication Patterns</p>
                              <p className="text-xs text-gray-600">Responds best during 9-11 AM on Tuesdays & Thursdays</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. AI SALES COACHING */}
                <Card className="border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 mb-1">AI Sales Coaching</h4>
                        <p className="text-sm text-gray-600 mb-3">Personalized coaching tips based on your deal progress and best practices</p>
                        
                        <div className="bg-green-50 p-4 rounded-lg space-y-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Next Best Action</p>
                              <p className="text-xs text-gray-600">Schedule a technical demo with their IT team within 48 hours to maintain momentum</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Objection Handling</p>
                              <p className="text-xs text-gray-600">Price concern detected. Emphasize ROI: avg. customer saves 35% in operational costs within 12 months</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Deal Stage Optimization</p>
                              <p className="text-xs text-gray-600">Similar deals at this stage close 60% faster when a case study is shared</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. AI SMART RECOMMENDATIONS */}
                <Card className="border-2 border-[#C3DDD9] hover:border-[#038E7D] transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#EEF7F5]0 to-[#013E37] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 mb-1">AI Smart Recommendations</h4>
                        <p className="text-sm text-gray-600 mb-3">AI-suggested products, pricing strategies, and cross-sell opportunities</p>
                        
                        <div className="bg-[#EEF7F5] p-4 rounded-lg space-y-3">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-[#013E37] mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Recommended Products</p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <Badge className="bg-[#DFF0EC] text-[#013E37] hover:bg-[#C3DDD9]">Premium Package</Badge>
                                <Badge className="bg-[#DFF0EC] text-[#013E37] hover:bg-[#C3DDD9]">Implementation Support</Badge>
                                <Badge className="bg-[#DFF0EC] text-[#013E37] hover:bg-[#C3DDD9]">Training Module</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-[#013E37] mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Optimal Pricing Strategy</p>
                              <p className="text-xs text-gray-600">Suggest bundling with 15% discount to increase deal size by ~$12,000</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-[#013E37] mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Cross-Sell Opportunity</p>
                              <p className="text-xs text-gray-600">85% of similar customers also purchased Analytics Dashboard within 6 months</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. AI CONVERSATION INTELLIGENCE */}
                <Card className="border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 mb-1">AI Conversation Intelligence</h4>
                        <p className="text-sm text-gray-600 mb-3">Analyze call recordings and emails to extract key insights and action items</p>
                        
                        <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                          <div className="flex items-start gap-2">
                            <Activity className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Sentiment Analysis</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Positive</span>
                                <span className="text-xs text-gray-600">Customer shows strong interest and enthusiasm</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Activity className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Key Topics Discussed</p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Pricing</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Implementation</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">ROI</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Timeline</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Activity className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Action Items Detected</p>
                              <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5 mt-1">
                                <li>Send detailed pricing breakdown by Friday</li>
                                <li>Schedule meeting with CTO for technical discussion</li>
                                <li>Provide customer case studies from healthcare sector</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. AI LEAD SCORING & PREDICTION */}
                <Card className="border-2 border-rose-200 hover:border-rose-400 transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900 mb-1">AI Lead Scoring & Prediction</h4>
                        <p className="text-sm text-gray-600 mb-3">Predictive analytics to forecast deal closure probability and timeline</p>
                        
                        <div className="bg-rose-50 p-4 rounded-lg space-y-3">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">Win Probability</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                  <div className="bg-gradient-to-r from-rose-500 to-rose-600 h-3 rounded-full flex items-center justify-end pr-2" style={{width: '72%'}}>
                                    <span className="text-xs font-bold text-white">72%</span>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-rose-600">High</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Predicted Close Date</p>
                              <p className="text-xs text-gray-600">March 15-22, 2025 (85% confidence interval)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Deal Velocity</p>
                              <p className="text-xs text-gray-600">Moving 23% faster than average deals in this segment</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Risk Factors</p>
                              <p className="text-xs text-gray-600">Budget approval pending. Recommend engaging with CFO to accelerate decision</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            </div>
          </Tabs>

          {/* FOOTER - Reduced 25% */}
          <div className="flex justify-end gap-2.5 px-6 py-3 border-t bg-white flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="min-w-20 h-8 text-sm font-medium border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-w-28 h-8 text-sm font-semibold bg-[#013E37] hover:bg-[#025C52] text-white shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {opportunity ? 'Update' : 'Create'} Opportunity
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
