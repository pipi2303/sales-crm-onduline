import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, DollarSign, Edit, Trash2, Star, AlertCircle, Check, RefreshCw, LayoutGrid, List as ListIcon, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { productsRepository } from '@/services/productsRepository';
import type { Product } from '@/types/product';
import { ProductFormModal } from '@/app/components/forms/ProductForm';
import { ProposalBuilder, ProposalFloatingButton } from '@/app/components/ProposalBuilder';
import type { ProposalItem } from '@/types/proposal';

// Data source: productsRepository (localStorage-backed, unified Product model).
// Migrated from the legacy productsApi/`sales_monitoring_products` key — see
// src/services/productsRepository.ts for why this uses a different storage key.

export function ProductCatalog() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem('productCatalog.viewMode') as 'grid' | 'list') || 'grid';
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('productCatalog.viewMode', mode);
    } catch {
      // Persistence is a nicety (remember the last view across visits) —
      // the toggle itself keeps working from in-memory state either way.
    }
  };
  
  // Proposal state
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [showProposal, setShowProposal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching products from productsRepository...');
      
      const result = await productsRepository.getAll();
      
      if (result.success && result.data) {
        console.log(`✅ Loaded ${result.data.length} products`);
        setProducts(result.data);
      } else {
        console.error('❌ Error:', result.error);
        toast.error(result.error || 'Failed to load products');
      }
    } catch (error: any) {
      console.error('❌ Error fetching products:', error);
      console.error('Error details:', error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    if (!(await confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`, { variant: 'destructive', confirmText: 'Hapus' }))) {
      return;
    }

    try {
      setDeleteLoading(product.id);
      
      const result = await productsRepository.remove(product.id);
      
      if (result.success) {
        toast.success('Product berhasil dihapus!');
        fetchProducts();
      } else {
        toast.error(result.error || 'Gagal menghapus product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Terjadi kesalahan saat menghapus product');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalProducts: products.length,
    totalSold: products.reduce((sum, p) => sum + (p.sold || 0), 0),
    totalRevenue: products.reduce((sum, p) => sum + (p.price * (p.sold || 0)), 0),
    bestSeller: products.length > 0 
      ? products.reduce((prev, current) => ((current.sold || 0) > (prev.sold || 0)) ? current : prev)
      : { name: '-', description: '-', sold: 0, price: 0, features: [] as string[] }
  };

  // Format revenue menggunakan utility function standar
  const formatRevenue = (amount: number) => {
    return formatCurrency(amount);
  };

  const getCategorySubtext = (category: string) => {
    const mapping: Record<string, string> = {
      'all': 'SEMUA PRODUK',
      'Hospital Management System': 'SISTEM ENTERPRISE',
      'Document Management': 'ARSIP DIGITAL',
      'Telemedicine': 'LAYANAN JARAK JAUH',
      'Electronic Medical Record': 'REKAM MEDIS DIGITAL',
      'Radiology': 'PENCITRAAN MEDIS',
      'Laboratory': 'SISTEM INFORMASI LAB',
      'Pharmacy Management': 'STOK & DISPENSING',
      'Finance & Billing': 'TRANSAKSI & KLAIM',
      'Mobile Application': 'PASIEN & DOKTER APP',
      'Nursing Management': 'ASUHAN KEPERAWATAN',
      'Inventory & Supply Chain': 'LOGISTIK MEDIS'
    };
    return mapping[category] || 'KATALOG PRODUK';
  };

  const handleAddToProposal = (product: Product) => {
    const existingItem = proposalItems.find(item => item.id === product.id);
    if (existingItem) {
      setProposalItems(proposalItems.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
      toast.success(`Quantity ${product.name} ditambah menjadi ${existingItem.quantity + 1}`);
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
        description: product.description,
        features: product.features || [],
      };
      setProposalItems([...proposalItems, newItem]);
      toast.success(`${product.name} ditambahkan ke proposal`);
    }
    console.log('Proposal items updated:', proposalItems.length + 1);
  };

  const handleAddToProposalTeknis = (product: Product) => {
    const existingItem = proposalItems.find(item => item.id === product.id);
    if (existingItem) {
      setProposalItems(proposalItems.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
      toast.success(`Quantity ${product.name} ditambah ke Proposal Teknis menjadi ${existingItem.quantity + 1}`);
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
        description: product.description,
        features: product.features || [],
        proposalType: 'teknis' as const, // Mark as technical proposal
      };
      setProposalItems([...proposalItems, newItem]);
      toast.success(`${product.name} ditambahkan ke Proposal Teknis`);
    }
    console.log('Technical proposal items updated:', proposalItems.length + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Katalog Produk
          </h1>
          <p className="text-gray-600 mt-1">Jelajahi dan kelola semua produk & layanan</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Mode tampilan produk">
            <button
              type="button"
              onClick={() => handleViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#013E37] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'list' ? 'bg-white text-[#013E37] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
              List
            </button>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAdd}
              className="bg-[#013E37] hover:bg-[#025C52] text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Tambah Product
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Terjual</p>
                  <p className="text-2xl font-bold">{stats.totalSold}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-xl font-bold">{formatRevenue(stats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Seller</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-bold line-clamp-2 cursor-help">{stats.bestSeller.name}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{stats.bestSeller.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari produk atau layanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={fetchProducts}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      {products.length === 0 ? (
        <Card className="py-12">
          <CardContent>
            <div className="text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Produk</h3>
              <p className="text-gray-600 mb-6">Mulai tambahkan produk pertama Anda</p>
              <Button 
                onClick={handleAdd}
                className="bg-gradient-to-r from-[#013E37] to-[#013E37] hover:from-[#013E37] hover:to-[#013E37] text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
          <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-1">
            {categories.map(category => (
              <TabsTrigger 
                key={category} 
                value={category} 
                className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[72px]"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight leading-[1.1] mb-1 max-w-[110px] whitespace-normal">
                    {category === 'all' ? 'Semua Produk' : category}
                  </div>
                  <div className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none opacity-80">
                    {getCategorySubtext(category)}
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4 mt-6">
            {filteredProducts.length === 0 ? (
              <Card className="py-12">
                <CardContent>
                  <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Hasil</h3>
                    <p className="text-gray-600">Tidak ada produk yang cocok dengan pencarian Anda</p>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              <ProductListView
                products={filteredProducts}
                proposalItems={proposalItems}
                deleteLoading={deleteLoading}
                onAddToProposalTeknis={handleAddToProposalTeknis}
                onAddToProposal={handleAddToProposal}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-xl transition-all group overflow-hidden flex flex-col">
                    {/* Product Image/Icon */}
                    <div className="h-48 bg-[#013E37] flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
                      <Package className="h-24 w-24 text-white/80 group-hover:scale-110 transition-transform" />
                      <Badge className="absolute top-4 right-4 bg-white/90 text-[#013E37]">
                        {product.sold || 0} Terjual
                      </Badge>
                    </div>

                    <CardContent className="p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge className="mb-2 bg-[#EEF7F5] text-[#013E37]">{product.category}</Badge>
                          <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{product.name}</h3>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>

                      <div className="space-y-2 mb-4">
                        {(product.features || []).slice(0, 3).map((feature: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="line-clamp-1">{feature}</span>
                          </div>
                        ))}
                        {(product.features || []).length > 3 && (
                          <p className="text-xs text-gray-500 ml-6">+{product.features.length - 3} fitur lainnya</p>
                        )}
                      </div>

                      {/* Spacer untuk mendorong tombol ke bawah */}
                      <div className="flex-1"></div>

                      <div className="pt-4 border-t mt-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Harga Mulai</p>
                            <p className="text-2xl font-bold text-[#013E37]">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Stock</p>
                            <p className="text-lg font-semibold text-green-600">{product.stock || 0}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {/* Primary Actions - 2 tombol proposal */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              className={`text-white text-xs ${
                                proposalItems.some(item => item.id === product.id && item.proposalType === 'teknis')
                                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                  : 'bg-[#013E37] hover:bg-[#025C52]'
                              }`}
                              onClick={() => handleAddToProposalTeknis(product)}
                              disabled={proposalItems.some(item => item.id === product.id && item.proposalType === 'teknis')}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Proposal Teknis
                            </Button>
                            <Button 
                              className={`text-white text-xs ${
                                proposalItems.some(item => item.id === product.id && !item.proposalType)
                                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                  : 'bg-[#013E37] hover:bg-[#025C52]'
                              }`}
                              onClick={() => handleAddToProposal(product)}
                              disabled={proposalItems.some(item => item.id === product.id && !item.proposalType)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Proposal
                            </Button>
                          </div>
                          
                          {/* Secondary Actions - Edit & Delete */}
                          <div className="flex gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="flex-1"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              disabled={deleteLoading === product.id}
                              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleteLoading === product.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Hapus
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Best Seller Highlight */}
      {products.length > 0 && stats.bestSeller.sold > 0 && (
        <Card className="bg-[#013E37] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6" />
              Produk Terlaris Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">{stats.bestSeller.name}</h3>
                <p className="text-white/80 mb-4">{stats.bestSeller.description}</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-white/80">Total Terjual</p>
                    <p className="text-2xl font-bold">{stats.bestSeller.sold}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/80">Revenue</p>
                    <p className="text-2xl font-bold">Rp {((stats.bestSeller.price * stats.bestSeller.sold) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white/80 mb-2">Fitur Unggulan:</p>
                {(stats.bestSeller.features || []).slice(0, 6).map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductFormModal
          product={selectedProduct}
          onClose={() => {
            setShowForm(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Proposal Builder */}
      <ProposalBuilder
        isOpen={showProposal}
        items={proposalItems}
        onClose={() => setShowProposal(false)}
        onUpdateQuantity={(id, quantity) => {
          setProposalItems(proposalItems.map(item =>
            item.id === id ? { ...item, quantity } : item
          ));
        }}
        onRemoveItem={(id) => {
          setProposalItems(proposalItems.filter(item => item.id !== id));
        }}
        onClearAll={async () => {
          if (await confirm('Hapus semua item dari proposal?', { variant: 'destructive', confirmText: 'Hapus' })) {
            setProposalItems([]);
            setShowProposal(false);
          }
        }}
      />
      
      {/* Floating Button */}
      <ProposalFloatingButton
        itemCount={proposalItems.length}
        onClick={() => setShowProposal(true)}
      />
    </div>
  );
}

// List view for the product catalog — same data and actions as the card
// grid above (see the `viewMode` toggle in ProductCatalog), just laid out
// as a dense, scannable table. Kept in this file since it only exists to
// serve ProductCatalog's own state/handlers, not as a reusable component.
interface ProductListViewProps {
  products: Product[];
  proposalItems: ProposalItem[];
  deleteLoading: string | null;
  onAddToProposalTeknis: (product: Product) => void;
  onAddToProposal: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function ProductListView({
  products,
  proposalItems,
  deleteLoading,
  onAddToProposalTeknis,
  onAddToProposal,
  onEdit,
  onDelete,
}: ProductListViewProps) {
  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="min-w-[240px]">Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Terjual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right min-w-[220px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const inTeknis = proposalItems.some(
                  (item) => item.id === product.id && item.proposalType === 'teknis'
                );
                const inProposal = proposalItems.some(
                  (item) => item.id === product.id && !item.proposalType
                );
                return (
                  <TableRow key={product.id} className="align-top">
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-md bg-[#013E37] flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-[#EEF7F5] text-[#013E37] whitespace-nowrap">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          product.productType === 'software'
                            ? 'border-blue-200 text-blue-700 bg-blue-50'
                            : 'border-amber-200 text-amber-700 bg-amber-50'
                        }
                      >
                        {product.productType === 'software' ? 'Software' : 'Fisik'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#013E37] whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{product.stock || 0}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{product.sold || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          product.status === 'active'
                            ? 'border-green-200 text-green-700 bg-green-50'
                            : 'border-gray-300 text-gray-500 bg-gray-50'
                        }
                      >
                        {product.status === 'active' ? 'Aktif' : 'Discontinued'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className={`text-white text-xs h-8 px-2 ${
                                inTeknis ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-[#013E37] hover:bg-[#025C52]'
                              }`}
                              onClick={() => onAddToProposalTeknis(product)}
                              disabled={inTeknis}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{inTeknis ? 'Sudah di Proposal Teknis' : 'Tambah ke Proposal Teknis'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className={`text-white text-xs h-8 px-2 ${
                                inProposal ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-[#013E37] hover:bg-[#025C52]'
                              }`}
                              onClick={() => onAddToProposal(product)}
                              disabled={inProposal}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{inProposal ? 'Sudah di Proposal' : 'Tambah ke Proposal'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => onEdit(product)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDelete(product)}
                              disabled={deleteLoading === product.id}
                            >
                              {deleteLoading === product.id ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Hapus</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </TooltipProvider>
  );
}

export default ProductCatalog;
