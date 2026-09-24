import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Package, DollarSign, Box, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { productsRepository } from '@/services/productsRepository';
import type { Product, NewProduct } from '@/types/product';

// FIXED (was broken): this form used to call `fetch()` against a dead mock
// Supabase Edge Function URL (https://mock-project-id.supabase.co/...), so
// Tambah/Edit Product always silently failed in the deployed app — there was
// no real backend behind that endpoint. It now goes through productsRepository
// (real backend, Product model) like the rest of ProductCatalog.
//
// Also added: SKU field (required + unique, enforced by the repository).
//
// History (23 Sep 2026): this form used to also have a "Tipe Produk"
// software/physical selector with type-specific fields (license tier vs.
// unit of measure, etc.), inherited from a discriminated-union Product
// model. That concept was removed — Onduline only ever sells physical
// products — so the form now always represents a physical product; see
// src/types/product.ts's header comment for the full rationale.

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  sku: string;
  name: string;
  category: string;
  description: string;
  price: string;
  stock: string;
  sold: string;
  features: string; // newline-separated in the textarea, split to string[] on submit
  status: 'active' | 'discontinued';
  unitOfMeasure: string;
  color: string;
  specification: string;
  weightKg: string;
}

const emptyForm: FormState = {
  sku: '', name: '', category: '', description: '', price: '', stock: '', sold: '0',
  features: '', status: 'active',
  unitOfMeasure: '', color: '', specification: '', weightKg: '',
};

export function ProductFormModal({ product, onClose, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '0',
        sold: product.sold?.toString() || '0',
        features: Array.isArray(product.features) ? product.features.join('\n') : '',
        status: product.status || 'active',
        unitOfMeasure: product.unitOfMeasure || '',
        color: product.color || '',
        specification: product.specification || '',
        weightKg: product.weightKg ? product.weightKg.toString() : '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sku || !formData.name || !formData.category || !formData.price) {
      toast.error('Harap isi semua field yang wajib (SKU, Nama, Kategori, Harga)!');
      return;
    }
    if (!formData.unitOfMeasure || !formData.specification) {
      toast.error('Unit of Measure dan Spesifikasi wajib diisi!');
      return;
    }

    try {
      setLoading(true);

      const featuresArray = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const payload: NewProduct = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: parseInt(formData.price) || 0,
        currency: 'IDR',
        status: formData.status,
        stock: parseInt(formData.stock) || 0,
        sold: parseInt(formData.sold) || 0,
        features: featuresArray,
        unitOfMeasure: formData.unitOfMeasure,
        // Bab 32/33 (24 Sep 2026): kirim `null` eksplisit saat field
        // dikosongkan, bukan `undefined` -- JSON.stringify() MEMBUANG key
        // yang bernilai undefined (tapi menyimpan null), jadi mengosongkan
        // Warna/Berat yang sudah pernah diisi lalu Simpan sebelumnya tidak
        // pernah benar-benar menghapusnya di database (PUT handler membaca
        // key yang hilang sebagai "tidak berubah").
        color: formData.color || null,
        specification: formData.specification,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
      };

      const result = product
        ? await productsRepository.update(product.id, payload)
        : await productsRepository.create(payload);

      if (result.success) {
        toast.success(product ? 'Product berhasil diupdate!' : 'Product berhasil ditambahkan!');
        onSuccess();
      } else {
        toast.error(result.error || 'Gagal menyimpan data');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Terjadi kesalahan saat menyimpan data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!max-w-[700px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden flex flex-col">
        {/* HEADER */}
        <DialogHeader className="relative bg-[#013E37] text-white px-6 py-5 space-y-0 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="space-y-3">
            {/* Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold leading-tight text-white">
                  {formData.name || (product ? 'Edit Product' : 'Tambah Product Baru')}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1 leading-tight">
                  {formData.category || 'Onduline Product'}
                </DialogDescription>
              </div>
            </div>

            {/* Status Badges */}
            {product && (
              <div className="flex gap-2 flex-wrap">
                {formData.category && (
                  <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600 border-none">
                    {formData.category}
                  </Badge>
                )}
                {formData.stock && parseInt(formData.stock) > 0 && (
                  <Badge className="bg-emerald-500 text-emerald-900 hover:bg-emerald-600 border-none">
                    Stock: {formData.stock}
                  </Badge>
                )}
                {formData.sold && parseInt(formData.sold) > 0 && (
                  <Badge className="bg-blue-500 text-blue-900 hover:bg-blue-600 border-none">
                    Sold: {formData.sold}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* QUICK INFO CARDS - Only in Edit Mode */}
        {product && (
          <div className="bg-gradient-to-br bg-[#EEF7F5] px-6 py-4 grid grid-cols-3 gap-4 border-b border-[#DFF0EC] flex-shrink-0">
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#DFF0EC] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Harga</p>
                <p className="font-semibold text-gray-900 text-sm">
                  Rp {formData.price ? (parseInt(formData.price) / 1000000).toFixed(1) : '0'} Jt
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Box className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Stock</p>
                <p className="font-semibold text-gray-900 text-sm">{formData.stock || '0'}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#DFF0EC] flex items-center justify-center">
                <Package className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Terjual</p>
                <p className="font-semibold text-gray-900 text-sm">{formData.sold || '0'}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* CONTENT - Scrollable area */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Product Information */}
            <div className="bg-gradient-to-br bg-[#EEF7F5] rounded-xl border border-[#DFF0EC] p-5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#013E37] flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-[#012D29]">Informasi Produk</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    disabled={!!product}
                    placeholder="ONDC-CLS-001"
                    className="bg-white border-gray-300 font-mono"
                  />
                  {product && <p className="text-xs text-gray-500">SKU tidak bisa diubah setelah dibuat</p>}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Nama Produk <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Onduline Classic"
                    className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Bab 32/33 (24 Sep 2026, deep review + smoke test grup
                          Produk & Wilayah): nilai di sini HARUS persis sama
                          dengan string category yang dipakai di
                          prisma/seedData/productCatalog.ts dan di data
                          product.category sungguhan -- sebelumnya form ini
                          punya vocabulary sendiri ("Atap Bitumen", "Solar",
                          "Aksesoris & Talang", dst) yang berbeda dari 3 dari
                          5 kategori nyata ("Atap", "Photovoltaic",
                          "Aksesoris"), sehingga dropdown Edit tampil kosong
                          untuk 24 dari 29 produk demo (live-verified). */}
                      <SelectItem value="Atap">Atap</SelectItem>
                      <SelectItem value="Waterproofing">Waterproofing</SelectItem>
                      <SelectItem value="Photovoltaic">Photovoltaic (Panel Surya Atap)</SelectItem>
                      <SelectItem value="Green Roof">Green Roof</SelectItem>
                      <SelectItem value="Aksesoris">Aksesoris</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Harga (Rp) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    placeholder="50000000"
                    className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Stock (Gudang)
                  </Label>
                  <Input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="100"
                    className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Terjual</Label>
                  <Input
                    type="number"
                    name="sold"
                    value={formData.sold}
                    onChange={handleChange}
                    placeholder="0"
                    className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Unit of Measure <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    name="unitOfMeasure"
                    value={formData.unitOfMeasure}
                    onChange={handleChange}
                    placeholder="m2, pcs, roll"
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Warna (opsional)</Label>
                  <Input
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="Merah Bata"
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Berat (kg, opsional)</Label>
                  <Input
                    type="number"
                    name="weightKg"
                    value={formData.weightKg}
                    onChange={handleChange}
                    placeholder="12.5"
                    className="bg-white border-gray-300"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Spesifikasi <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    name="specification"
                    value={formData.specification}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-[#EEF7F5]0 text-sm bg-white"
                    placeholder="Ukuran 80x180cm, ketebalan 5mm..."
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">Deskripsi</Label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-[#EEF7F5]0 text-sm bg-white"
                    placeholder="Deskripsi lengkap tentang produk..."
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Fitur-fitur <span className="text-gray-500 text-xs">(satu baris per fitur)</span>
                  </Label>
                  <textarea
                    name="features"
                    value={formData.features}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-[#EEF7F5]0 text-sm bg-white font-mono"
                    placeholder="Tahan Cuaca Ekstrem&#10;Anti Bocor Bergaransi&#10;Ringan & Mudah Dipasang&#10;Ramah Lingkungan&#10;Garansi 15 Tahun"
                  />
                  <p className="text-xs text-gray-500">
                    Masukkan setiap fitur di baris baru. Contoh di atas akan menjadi 5 fitur terpisah.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* FOOTER - Action Buttons */}
          <div className="border-t bg-gray-50 px-6 py-5 flex justify-end gap-3 flex-shrink-0">
            <Button 
              type="button" 
              onClick={onClose} 
              variant="outline"
              disabled={loading}
              className="px-6"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              className="bg-[#013E37] hover:bg-[#025C52] text-white px-6 gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Product
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
