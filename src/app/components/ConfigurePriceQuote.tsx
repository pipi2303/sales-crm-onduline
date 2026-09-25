import React, { useState, useEffect } from 'react';
import { Settings, FileText, DollarSign, Plus, Search, Filter, Download, Eye, Pencil, Trash2, Copy, CheckCircle, XCircle, Clock, Package, Users, Calendar, Tag } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { toast } from 'sonner';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { Product } from '@/types/product';
import { productsRepository } from '@/services/productsRepository';
import { quotationsRepository, type Quotation } from '@/services/quotationsRepository';
import { exportToPDF } from '@/utils/exportUtils';

type ConfigurationItem = {
  productId: string;
  quantity: number;
  customization: string;
  discount: number;
};

type Quote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  // Bab 30 lanjutan (24 Sep 2026): dulu cuma 4 status lokal dengan dummy
  // seed -- sekarang backend sungguhan (prisma/schema.prisma's
  // QuotationStatus) punya 6, expired/cancelled ditambahkan di sini
  // supaya tidak ada data yang diam-diam disamarkan jadi status lain.
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  items: ConfigurationItem[];
  totalAmount: number;
  discount: number;
  validUntil: string;
  createdDate: string;
  notes: string;
};

// Bab 30 lanjutan: dulu dummyQuotes (3 quote palsu) jadi initial state dan
// "Generate Quote" cuma setQuotes(...) lokal -- hilang setiap refresh, dan
// "Additional Discount (%)" yang diisi di form TIDAK PERNAH mengurangi
// totalAmount yang ditampilkan/disimpan (bug data konkret, lihat
// handleCreateQuote/calculateTotal di bawah). Sekarang backend sungguhan
// (quotationsRepository -> /api/quotations) yang menghitung ulang
// subtotal/totalAmount dari items + additionalDiscountPercent, jadi bug
// itu tidak mungkin terulang di sisi server.
function fromApiQuote(q: Quotation): Quote {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    clientName: q.clientName,
    clientEmail: q.clientEmail ?? '',
    status: q.status,
    items: q.items.map((it) => ({
      productId: it.productId ?? '',
      quantity: it.quantity,
      customization: '',
      discount: it.discountPercent,
    })),
    totalAmount: q.totalAmount,
    discount: q.additionalDiscountPercent,
    validUntil: q.validUntil ? q.validUntil.toISOString().split('T')[0] : '',
    createdDate: q.createdAt.toISOString().split('T')[0],
    notes: q.notes ?? '',
  };
}

export function ConfigurePriceQuote() {
  const [activeTab, setActiveTab] = useState('configure');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ConfigurationItem[]>([]);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [isViewQuoteOpen, setIsViewQuoteOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteDialogMode, setQuoteDialogMode] = useState<'quote' | 'proposal'>('quote');
  // Data source: productsRepository (localStorage-backed, unified Product model) --
  // the same catalog ProductCatalog.tsx reads/writes, so a quote always prices
  // against real stock/SKU data instead of this component's own disconnected mock list.
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchQuotes();
  }, []);

  const fetchProducts = async () => {
    const result = await productsRepository.getAll();
    if (result.success && result.data) {
      setProducts(result.data);
    } else {
      toast.error(result.error || 'Failed to load products');
    }
  };

  const fetchQuotes = async () => {
    const result = await quotationsRepository.getAll();
    if (result.success && result.data) {
      setQuotes(result.data.map(fromApiQuote));
    } else {
      toast.error(result.error || 'Failed to load quotes');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuotes = quotes.filter(quote =>
    quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProductToConfiguration = (productId: string) => {
    const existingItem = selectedProducts.find(item => item.productId === productId);
    if (existingItem) {
      setSelectedProducts(selectedProducts.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success('Quantity updated!');
    } else {
      setSelectedProducts([...selectedProducts, {
        productId,
        quantity: 1,
        customization: '',
        discount: 0
      }]);
      toast.success('Product added to configuration!');
    }
  };

  const removeProductFromConfiguration = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.productId !== productId));
    toast.success('Product removed from configuration!');
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const itemTotal = product.price * item.quantity;
        const discountAmount = (itemTotal * item.discount) / 100;
        return total + (itemTotal - discountAmount);
      }
      return total;
    }, 0);
  };

  const handleCreateQuote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const additionalDiscountPercent = parseInt(formData.get('discount') as string) || 0;
    const result = await quotationsRepository.create({
      clientName: formData.get('clientName') as string,
      clientEmail: formData.get('clientEmail') as string,
      additionalDiscountPercent,
      status: 'draft',
      validUntil: formData.get('validUntil') as string,
      notes: formData.get('notes') as string,
      // Bab 30 lanjutan: server recomputes subtotal/totalAmount from these
      // items + additionalDiscountPercent -- this is what actually applies
      // the "Additional Discount (%)" the old client-only calculateTotal()
      // silently ignored.
      items: selectedProducts.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name ?? '',
          quantity: item.quantity,
          unitPrice: product?.price ?? 0,
          discountPercent: item.discount,
        };
      }),
    });

    if (result.success && result.data) {
      setQuotes([fromApiQuote(result.data), ...quotes]);
      setIsCreateQuoteOpen(false);
      setSelectedProducts([]);
      if (quoteDialogMode === 'proposal') {
        toast.success('Proposal berhasil dibuat! Kelola statusnya dari tab Quote.');
        setActiveTab('quote');
      } else {
        toast.success('Quote created successfully!');
      }
    } else {
      toast.error(result.error || 'Gagal membuat quote');
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    const result = await quotationsRepository.update(quoteId, { status: 'sent' });
    if (result.success && result.data) {
      setQuotes(quotes.map((quote) => (quote.id === quoteId ? fromApiQuote(result.data!) : quote)));
      toast.success('Quote sent to client!');
    } else {
      toast.error(result.error || 'Gagal mengirim quote');
    }
  };

  const handleApproveQuote = async (quoteId: string) => {
    const result = await quotationsRepository.update(quoteId, { status: 'approved' });
    if (result.success && result.data) {
      setQuotes(quotes.map((quote) => (quote.id === quoteId ? fromApiQuote(result.data!) : quote)));
      toast.success('Quote approved!');
    } else {
      toast.error(result.error || 'Gagal menyetujui quote');
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    const result = await quotationsRepository.update(quoteId, { status: 'rejected' });
    if (result.success && result.data) {
      setQuotes(quotes.map((quote) => (quote.id === quoteId ? fromApiQuote(result.data!) : quote)));
      toast.success('Quote rejected!');
    } else {
      toast.error(result.error || 'Gagal menolak quote');
    }
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    // Bab 30 lanjutan: perlu record lengkap (dengan items) untuk
    // diduplikasi dengan benar -- state lokal `quote` di sini cukup untuk
    // itu (fromApiQuote sudah membawa items), tapi ambil ulang dari server
    // supaya duplikasi selalu berdasarkan data terbaru, bukan snapshot
    // yang mungkin sudah basi di state lokal.
    const current = await quotationsRepository.getById(quote.id);
    if (!current.success || !current.data) {
      toast.error(current.error || 'Gagal mengambil data quote');
      return;
    }
    const result = await quotationsRepository.duplicate(current.data);
    if (result.success && result.data) {
      setQuotes([fromApiQuote(result.data), ...quotes]);
      toast.success('Quote duplicated successfully!');
    } else {
      toast.error(result.error || 'Gagal menduplikasi quote');
    }
  };

  const getStatusBadge = (status: Quote['status']) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, icon: Clock, label: 'Draft' },
      sent: { variant: 'default' as const, icon: FileText, label: 'Sent' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' },
      expired: { variant: 'destructive' as const, icon: Clock, label: 'Expired' },
      cancelled: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelled' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">Configure, Propose & Quote</h1>
          <p className="text-gray-600 mt-1">Kelola konfigurasi produk, buat proposal, dan kirim quotation</p>
        </div>
        <Dialog open={isCreateQuoteOpen} onOpenChange={setIsCreateQuoteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#013E37] hover:bg-[#013d38] text-white" onClick={() => setQuoteDialogMode('quote')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[calc(100%-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{quoteDialogMode === 'proposal' ? 'Create Proposal' : 'Create New Quote'}</DialogTitle>
              <DialogDescription>
                {quoteDialogMode === 'proposal'
                  ? 'Buat proposal draft berdasarkan konfigurasi produk. Proposal akan tersimpan sebagai quotation berstatus draft yang bisa dikelola dari tab Quote.'
                  : 'Fill in the details below to create a new quote for your client'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateQuote} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input id="clientName" name="clientName" required placeholder="Enter client name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email *</Label>
                  <Input id="clientEmail" name="clientEmail" type="email" required placeholder="client@gmail.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until *</Label>
                  <Input id="validUntil" name="validUntil" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Additional Discount (%)</Label>
                  <Input id="discount" name="discount" type="number" min="0" max="100" defaultValue="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selected Products</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  {selectedProducts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No products selected. Add products from the Configure tab.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedProducts.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        const itemTotal = product.price * item.quantity;
                        const discountAmount = (itemTotal * item.discount) / 100;
                        return (
                          <div key={item.productId} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">Qty: {item.quantity} × {formatCurrency(product.price)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(itemTotal - discountAmount)}</p>
                              {item.discount > 0 && (
                                <p className="text-sm text-green-600">-{item.discount}% discount</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between font-bold text-lg">
                          <span>Total Amount</span>
                          <span className="text-[#013E37]">{formatCurrency(calculateTotal())}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  placeholder="Add any additional notes or special terms..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateQuoteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#013E37] hover:bg-[#013d38]" disabled={selectedProducts.length === 0}>
                  {quoteDialogMode === 'proposal' ? 'Create Proposal' : 'Create Quote'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="configure" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="propose" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Propose
          </TabsTrigger>
          <TabsTrigger value="quote" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white">
            <DollarSign className="h-4 w-4 mr-2" />
            Quote
          </TabsTrigger>
        </TabsList>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Configuration</CardTitle>
                  <CardDescription>Pilih dan konfigurasi produk untuk quotation</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Selected Products Summary */}
                {selectedProducts.length > 0 && (
                  <div className="bg-[#EEF7F5] border-2 border-[#013E37] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[#013E37]">Current Configuration</h3>
                      <Badge className="bg-[#013E37]">{selectedProducts.length} Products</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedProducts.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.productId} className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Quantity</p>
                                <p className="font-semibold">{item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Price</p>
                                <p className="font-semibold">{formatCurrency(product.price * item.quantity)}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProductFromConfiguration(item.productId)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-3 border-t border-[#013E37] flex items-center justify-between">
                        <span className="font-bold text-lg">Total Configuration Value</span>
                        <span className="font-bold text-xl text-[#013E37]">{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Catalog */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map(product => (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <CardDescription>SKU: {product.sku}</CardDescription>
                          </div>
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Base Price</p>
                            <p className="text-2xl font-bold text-[#013E37]">{formatCurrency(product.price)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Stock</p>
                            <p className="text-lg font-semibold">{product.stock} units</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.features.map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={() => addProductToConfiguration(product.id)}
                          className="w-full bg-[#013E37] hover:bg-[#013d38]"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Configuration
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Propose Tab */}
        <TabsContent value="propose" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Management</CardTitle>
              <CardDescription>Buat dan kelola proposal penjualan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Proposal Builder</h3>
                  <p className="text-gray-600 mb-6">
                    Create professional proposals based on your product configurations
                  </p>
                  <Button
                    className="bg-[#013E37] hover:bg-[#013d38]"
                    onClick={() => {
                      setQuoteDialogMode('proposal');
                      setIsCreateQuoteOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Proposal
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="font-semibold mb-1">Template Library</h4>
                        <p className="text-sm text-gray-600">12 templates available</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h4 className="font-semibold mb-1">Approval Diskon</h4>
                        <p className="text-sm text-gray-600">
                          Dikelola di menu <span className="font-medium">Discount Approval</span>, bukan di sini
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="h-12 w-12 rounded-full bg-[#DFF0EC] flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-[#013E37]" />
                        </div>
                        <h4 className="font-semibold mb-1">Collaboration</h4>
                        <p className="text-sm text-gray-600">Team collaboration</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quote Tab */}
        <TabsContent value="quote" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quote Management</CardTitle>
                  <CardDescription>Kelola dan kirim quotation ke client</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search quotes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map(quote => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{quote.clientName}</p>
                          <p className="text-sm text-gray-600">{quote.clientEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(quote.totalAmount)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>{new Date(quote.validUntil).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>{new Date(quote.createdDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setIsViewQuoteOpen(true);
                            }}
                            title="View Quote"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateQuote(quote)}
                            title="Duplicate Quote"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {quote.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSendQuote(quote.id)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Send Quote"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {quote.status === 'sent' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApproveQuote(quote.id)}
                                className="text-green-600 hover:text-green-700"
                                title="Approve Quote"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRejectQuote(quote.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Reject Quote"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Quote Dialog */}
      <Dialog open={isViewQuoteOpen} onOpenChange={setIsViewQuoteOpen}>
        <DialogContent className="max-w-3xl max-h-[calc(100%-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
            <DialogDescription>
              View complete quote information
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Quote Number</Label>
                  <p className="font-semibold">{selectedQuote.quoteNumber}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedQuote.status)}</div>
                </div>
                <div>
                  <Label className="text-gray-600">Client Name</Label>
                  <p className="font-semibold">{selectedQuote.clientName}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Client Email</Label>
                  <p className="font-semibold">{selectedQuote.clientEmail}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Created Date</Label>
                  <p className="font-semibold">{new Date(selectedQuote.createdDate).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Valid Until</Label>
                  <p className="font-semibold">{new Date(selectedQuote.validUntil).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              <div>
                <Label className="text-gray-600">Notes</Label>
                <p className="mt-1">{selectedQuote.notes || 'No notes'}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Quote Summary</h4>
                  <Badge className="bg-[#013E37]">
                    Total: {formatCurrency(selectedQuote.totalAmount)}
                  </Badge>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-green-700 font-medium">
                      Additional Discount: {selectedQuote.discount}%
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewQuoteOpen(false)}>
                  Close
                </Button>
                <Button
                  className="bg-[#013E37] hover:bg-[#013d38]"
                  onClick={() => {
                    // Bab 30 lanjutan: tombol ini dulu tidak punya onClick
                    // sama sekali. exportToPDF sudah dipakai di menu lain
                    // (mis. KPI/AdvancedAnalytics) lewat jsPDF + autoTable.
                    if (!selectedQuote) return;
                    exportToPDF(
                      selectedQuote.items.map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        return {
                          product: product?.name ?? item.productId,
                          quantity: item.quantity,
                          discount: `${item.discount}%`,
                        };
                      }),
                      `${selectedQuote.quoteNumber}.pdf`,
                      `Quote ${selectedQuote.quoteNumber} - ${selectedQuote.clientName}`,
                      ['product', 'quantity', 'discount'],
                    );
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}