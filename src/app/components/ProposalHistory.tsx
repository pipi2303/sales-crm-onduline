import React, { useState, useEffect } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { 
  Download, RefreshCw, FileText, Mail, DollarSign, 
  Search, User, Building, Eye, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { publicAnonKey } from '/utils/supabase/info';

// Mock API URL - using localStorage only
const API_URL = 'https://mock-project-id.supabase.co/functions/v1/make-server-67367fc1';

interface ProposalData {
  id: string;
  clientName: string;
  clientCompany: string;
  items: any[];
  discount: number;
  notes: string;
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentTo?: string;
}

export function ProposalHistory() {
  const confirm = useConfirm();
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/proposals`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setProposals(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Gagal memuat riwayat proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Yakin ingin menghapus proposal ini?', { variant: 'destructive', confirmText: 'Hapus' }))) return;

    try {
      setDeleteLoading(id);
      const response = await fetch(`${API_URL}/proposals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Proposal berhasil dihapus');
        setProposals(proposals.filter(p => p.id !== id));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Gagal menghapus proposal');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleExportExcel = () => {
    try {
      const data = filteredProposals.map(proposal => ({
        'ID': proposal.id,
        'Klien': proposal.clientName,
        'Perusahaan': proposal.clientCompany,
        'Total Item': proposal.items.length,
        'Subtotal': proposal.subtotal,
        'Diskon (%)': proposal.discount,
        'Total': proposal.total,
        'Status': proposal.status,
        'Tanggal Dibuat': new Date(proposal.createdAt).toLocaleDateString('id-ID'),
        'Dikirim Ke': proposal.sentTo || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Proposals');

      // Auto-size columns
      const maxWidth = 20;
      const wscols = Object.keys(data[0] || {}).map(() => ({ wch: maxWidth }));
      ws['!cols'] = wscols;

      XLSX.writeFile(wb, `Proposal_History_${Date.now()}.xlsx`);
      toast.success('Data berhasil diexport ke Excel');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Gagal export data');
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    const matchSearch = 
      proposal.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.clientCompany.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || proposal.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const stats = {
    total: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    totalValue: proposals.reduce((sum, p) => sum + p.total, 0),
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Terkirim', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Diterima', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Proposal</h1>
          <p className="text-gray-600 mt-1">Kelola semua proposal penjualan Anda</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={fetchProposals} variant="outline" className="gap-2" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Proposal</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-[#DFF0EC] rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#013E37]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Terkirim</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.sent}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Diterima</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.accepted}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Nilai</p>
                <p className="text-2xl font-bold text-[#013E37] mt-1">
                  Rp {(stats.totalValue / 1000000000).toFixed(1)}M
                </p>
              </div>
              <div className="h-12 w-12 bg-[#DFF0EC] rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#013E37]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama klien atau perusahaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFilterStatus('all')}
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
              >
                Semua
              </Button>
              <Button
                onClick={() => setFilterStatus('draft')}
                variant={filterStatus === 'draft' ? 'default' : 'outline'}
                size="sm"
              >
                Draft
              </Button>
              <Button
                onClick={() => setFilterStatus('sent')}
                variant={filterStatus === 'sent' ? 'default' : 'outline'}
                size="sm"
              >
                Terkirim
              </Button>
              <Button
                onClick={() => setFilterStatus('accepted')}
                variant={filterStatus === 'accepted' ? 'default' : 'outline'}
                size="sm"
              >
                Diterima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Proposal ({filteredProposals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37] mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data...</p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada proposal</p>
              <p className="text-sm text-gray-500 mt-1">Buat proposal baru dari katalog produk</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(proposal.status)}
                        <span className="text-xs text-gray-500">
                          {new Date(proposal.createdAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <h4 className="font-bold text-gray-900">{proposal.clientName}</h4>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{proposal.clientCompany}</p>
                      </div>
                      {proposal.sentTo && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          Dikirim ke: {proposal.sentTo}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-[#013E37]">
                        Rp {(proposal.total / 1000000000).toFixed(2)}M
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {proposal.items.length} item{proposal.items.length > 1 ? 's' : ''}
                      </p>
                      {proposal.discount > 0 && (
                        <Badge className="mt-1 bg-red-100 text-red-800">
                          Diskon {proposal.discount}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // TODO: Implement view detail modal
                        toast.info('Fitur detail proposal coming soon!');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(proposal.id)}
                      disabled={deleteLoading === proposal.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deleteLoading === proposal.id ? (
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}