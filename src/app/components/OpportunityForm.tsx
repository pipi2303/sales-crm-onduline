import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { X, Plus, Trash2, Package } from 'lucide-react';
import type { Opportunity, ProductItem } from '@/types/opportunity';

interface OpportunityFormProps {
  opportunity: Opportunity | null;
  products: any[];
  onSave: (data: Partial<Opportunity>) => void;
  onCancel: () => void;
}

export function OpportunityForm({ opportunity, products, onSave, onCancel }: OpportunityFormProps) {
  const [formData, setFormData] = useState<Partial<Opportunity>>({
    name: '',
    clientName: '',
    contactPerson: '',
    email: '',
    phone: '',
    stage: 'prospecting',
    status: 'open',
    probability: 30,
    totalValue: 0,
    currency: 'IDR',
    closeDate: '',
    source: 'website',
    description: '',
    notes: '',
    ownerName: 'Current User',
    products: [],
  });

  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (opportunity) {
      setFormData(opportunity);
      setSelectedProducts(opportunity.products || []);
    }
  }, [opportunity]);

  // Update total value when products change
  useEffect(() => {
    const total = selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [selectedProducts]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = () => {
    const newProduct: ProductItem = {
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setSelectedProducts([...selectedProducts, newProduct]);
  };

  const handleProductChange = (index: number, field: keyof ProductItem, value: any) => {
    const updated = [...selectedProducts];
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index] = {
          ...updated[index],
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          totalPrice: product.price * updated[index].quantity,
        };
      }
    } else if (field === 'quantity') {
      updated[index].quantity = Number(value);
      updated[index].totalPrice = updated[index].unitPrice * Number(value);
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Number(value);
      updated[index].totalPrice = Number(value) * updated[index].quantity;
    } else {
      updated[index][field] = value;
    }
    
    setSelectedProducts(updated);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
      products: selectedProducts,
    };
    
    onSave(dataToSave);
  };

  // Auto-adjust probability based on stage
  const handleStageChange = (stage: string) => {
    const probabilities: Record<string, number> = {
      'prospecting': 30,
      'proposal': 50,
      'negotiation': 70,
      'closed-won': 100,
      'closed-lost': 0,
    };
    
    handleChange('stage', stage);
    handleChange('probability', probabilities[stage] || 50);
    
    if (stage === 'closed-won') {
      handleChange('status', 'won');
    } else if (stage === 'closed-lost') {
      handleChange('status', 'lost');
    } else {
      handleChange('status', 'open');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#013E37]">
            {opportunity ? 'Edit Opportunity' : 'New Opportunity'}
          </DialogTitle>
          <DialogDescription>
            {opportunity ? 'Edit the details of this opportunity.' : 'Create a new opportunity.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Opportunity Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., 50 Unit Laptop untuk PT ABC"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                    placeholder="Company name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    placeholder="Contact name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@gmail.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+62 812 3456 7890"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the opportunity..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Products</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddProduct}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No products added yet</p>
                  <p className="text-sm">Click "Add Product" to get started</p>
                </div>
              ) : (
                selectedProducts.map((product, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <Label>Product</Label>
                        <Select
                          value={product.productId}
                          onValueChange={(value) => handleProductChange(index, 'productId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          value={product.unitPrice}
                          onChange={(e) => handleProductChange(index, 'unitPrice', e.target.value)}
                        />
                      </div>

                      <div className="col-span-3">
                        <Label>Total</Label>
                        <div className="h-10 flex items-center font-semibold text-[#013E37]">
                          {formatCurrency(product.totalPrice)}
                        </div>
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveProduct(index)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}

              {/* Total Value */}
              {selectedProducts.length > 0 && (
                <div className="flex justify-end pt-3 border-t">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Total Deal Value</div>
                    <div className="text-2xl font-bold text-[#013E37]">
                      {formatCurrency(formData.totalValue || 0)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Process */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sales Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stage">Stage *</Label>
                  <Select value={formData.stage} onValueChange={handleStageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospecting">Prospecting (30%)</SelectItem>
                      <SelectItem value="proposal">Proposal (50%)</SelectItem>
                      <SelectItem value="negotiation">Negotiation (70%)</SelectItem>
                      <SelectItem value="closed-won">Closed Won (100%)</SelectItem>
                      <SelectItem value="closed-lost">Closed Lost (0%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => handleChange('probability', Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="closeDate">Expected Close Date *</Label>
                  <Input
                    id="closeDate"
                    type="date"
                    value={formData.closeDate}
                    onChange={(e) => handleChange('closeDate', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select value={formData.source} onValueChange={(value) => handleChange('source', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="cold-call">Cold Call</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="social-media">Social Media</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="ownerName">Sales Owner *</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    placeholder="Sales person name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#013E37] to-[#013E37] text-white"
            >
              {opportunity ? 'Update Opportunity' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}