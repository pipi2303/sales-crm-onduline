import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalPortalContainer } from '@/app/contexts/ModalPortalContext';
import { X, Plus, Minus, Trash2, Send, Download, FileText, DollarSign, Package, Calendar, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { ProposalItem } from '@/types/proposal';

const publicAnonKey = 'mock-anon-key';

// Mock API URL - using localStorage only
const API_URL = 'https://mock-project-id.supabase.co/functions/v1/make-server-67367fc1';

interface ProposalBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProposalItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export function ProposalBuilder({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemoveItem,
  onClearAll 
}: ProposalBuilderProps) {
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // FIX: hook harus dipanggil sebelum early return (Rules of Hooks).
  // Portal ke #modal-portal-root (di dalam .content-area, lihat App.tsx &
  // ModalPortalContext) supaya modal ini: (1) tidak menutupi sidebar/header,
  // (2) tidak ikut ter-scroll/clip oleh div konten yang scrollable (karena
  // secara DOM jadi sibling dari div tersebut, bukan descendant-nya).
  const modalPortalRoot = useModalPortalContainer();

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discount / 100);
  const tax = (subtotal - discountAmount) * 0.11; // PPN 11%
  const total = subtotal - discountAmount + tax;

  const saveProposal = async () => {
    if (!clientName || !clientCompany) {
      toast.error('Nama klien dan perusahaan harus diisi!');
      return null;
    }

    if (items.length === 0) {
      toast.error('Proposal masih kosong!');
      return null;
    }

    try {
      setIsSaving(true);
      const proposalData = {
        clientName,
        clientCompany,
        items,
        discount,
        notes,
        subtotal,
        total,
      };

      const response = await fetch(`${API_URL}/proposals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save proposal');
      }

      return result.data;
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Gagal menyimpan proposal');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendProposal = async () => {
    if (!clientEmail) {
      toast.error('Email klien harus diisi!');
      return;
    }

    try {
      setIsSending(true);
      
      // Save proposal first
      const savedProposal = await saveProposal();
      if (!savedProposal) return;

      // Send via email
      const response = await fetch(`${API_URL}/proposals/${savedProposal.id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientEmail: clientEmail }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Reset form
        setClientName('');
        setClientCompany('');
        setClientEmail('');
        setDiscount(0);
        setNotes('');
        onClearAll();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error('Gagal mengirim proposal');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!clientName || !clientCompany) {
      toast.error('Nama klien dan perusahaan harus diisi!');
      return;
    }

    if (items.length === 0) {
      toast.error('Proposal masih kosong!');
      return;
    }

    try {
      generatePDF();
      toast.success('PDF berhasil diunduh!');
      
      // Save proposal after download
      saveProposal();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal membuat PDF');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('PROPOSAL PENJUALAN', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
    
    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Kepada Yth.', 14, 55);
    doc.setFont(undefined, 'normal');
    doc.text(clientName, 14, 62);
    doc.text(clientCompany, 14, 69);
    if (clientEmail) {
      doc.text(`Email: ${clientEmail}`, 14, 76);
    }
    
    // Table
    const tableData = items.map(item => [
      item.name,
      item.category,
      item.quantity.toString(),
      `Rp ${(item.price / 1000000).toFixed(1)}Jt`,
      `Rp ${((item.price * item.quantity) / 1000000).toFixed(1)}Jt`
    ]);

    (doc as any).autoTable({
      head: [['Produk', 'Kategori', 'Qty', 'Harga Satuan', 'Total']],
      body: tableData,
      startY: clientEmail ? 85 : 78,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Pricing Summary
    doc.setFontSize(11);
    const rightX = 150;
    
    doc.text('Subtotal:', rightX - 60, finalY);
    doc.text(`Rp ${(subtotal / 1000000000).toFixed(2)}M`, rightX, finalY, { align: 'right' });
    
    if (discount > 0) {
      doc.setTextColor(220, 38, 38); // Red
      doc.text(`Diskon (${discount}%):`, rightX - 60, finalY + 7);
      doc.text(`- Rp ${(discountAmount / 1000000).toFixed(2)}Jt`, rightX, finalY + 7, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
    
    doc.text('PPN (11%):', rightX - 60, finalY + (discount > 0 ? 14 : 7));
    doc.text(`Rp ${(tax / 1000000).toFixed(2)}Jt`, rightX, finalY + (discount > 0 ? 14 : 7), { align: 'right' });
    
    // Total
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(rightX - 60, finalY + (discount > 0 ? 18 : 11), rightX, finalY + (discount > 0 ? 18 : 11));
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('TOTAL:', rightX - 60, finalY + (discount > 0 ? 25 : 18));
    doc.text(`Rp ${(total / 1000000000).toFixed(2)}M`, rightX, finalY + (discount > 0 ? 25 : 18), { align: 'right' });
    
    // Notes
    if (notes) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Catatan:', 14, finalY + (discount > 0 ? 40 : 33));
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(notes, 180);
      doc.text(splitNotes, 14, finalY + (discount > 0 ? 47 : 40));
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Sales Monitoring System - Proposal Generator', 105, pageHeight - 10, { align: 'center' });
    
    // Save
    const fileName = `Proposal_${clientCompany.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
  };

  const modalContent = (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#013E37] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Proposal Builder</h2>
                <p className="text-white/80 text-sm">Buat proposal penjualan profesional</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Klien</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Nama Klien <span className="text-red-500">*</span>
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Contoh: John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Perusahaan <span className="text-red-500">*</span>
                </label>
                <Input
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Contoh: PT Sehat Indonesia"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Email Klien
                </label>
                <Input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Contoh: john.doe@gmail.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Daftar Produk ({items.length})</CardTitle>
                {items.length > 0 && (
                  <Button
                    onClick={onClearAll}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus Semua
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Belum ada produk ditambahkan</p>
                  <p className="text-sm text-gray-500 mt-1">Klik "Tambah ke Proposal" pada katalog produk</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge className="mb-2 bg-[#DFF0EC] text-[#012D29]">{item.category}</Badge>
                              <h4 className="font-bold text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            </div>
                            <Button
                              onClick={() => onRemoveItem(item.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">Quantity:</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-12 text-center font-semibold">{item.quantity}</span>
                                <Button
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Harga Satuan</p>
                              <p className="font-semibold text-gray-900">
                                Rp {(item.price / 1000000).toFixed(1)} Jt
                              </p>
                              <p className="text-lg font-bold text-[#013E37] mt-1">
                                Rp {((item.price * item.quantity) / 1000000).toFixed(1)} Jt
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Notes */}
          {items.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Catatan Tambahan</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tambahkan catatan atau syarat & ketentuan..."
                    className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#EEF7F5]0"
                  />
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-gradient-to-br bg-[#EEF7F5]">
                <CardHeader>
                  <CardTitle className="text-lg">Ringkasan Biaya</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-semibold">
                      Rp {(subtotal / 1000000000).toFixed(2)} M
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">Diskon</span>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-16 h-8 text-sm"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm">%</span>
                    </div>
                    <span className="font-semibold text-red-600">
                      - Rp {(discountAmount / 1000000).toFixed(2)} Jt
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">PPN (11%)</span>
                    <span className="font-semibold">
                      Rp {(tax / 1000000).toFixed(2)} Jt
                    </span>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-[#013E37]">
                        Rp {(total / 1000000000).toFixed(2)} M
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {items.length > 0 && (
          <div className="border-t bg-gray-50 p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                onClick={handleSendProposal}
                className="flex-1 bg-[#013E37] hover:bg-[#025C52] text-white gap-2"
              >
                <Send className="h-4 w-4" />
                Kirim Proposal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, modalPortalRoot ?? document.body);
}

// Floating Button Component
interface ProposalFloatingButtonProps {
  itemCount: number;
  onClick: () => void;
}

export function ProposalFloatingButton({ itemCount, onClick }: ProposalFloatingButtonProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[9999]">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Floating button clicked!');
          onClick();
        }}
        className="relative bg-[#013E37] hover:bg-[#025C52] text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-all group cursor-pointer"
        style={{ pointerEvents: 'auto' }}
      >
        <FileText className="h-6 w-6" />
        {itemCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
            {itemCount}
          </div>
        )}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded px-3 py-1 whitespace-nowrap">
            Lihat Proposal ({itemCount} item)
          </div>
        </div>
      </button>
    </div>
  );
}