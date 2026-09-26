import React, { useState } from 'react';
import { Search, Book, FileText, Video, HelpCircle, Star, ThumbsUp, Plus, Eye, Download, Upload, X, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/app/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  category: string;
  type: 'document' | 'video' | 'faq';
  views: number;
  rating: number;
}

export function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [articles, setArticles] = useState<Article[]>([
    { id: '1', title: 'Product Documentation - Enterprise Plan', category: 'Product Docs', type: 'document', views: 245, rating: 4.8 },
    { id: '2', title: 'Sales Playbook 2024', category: 'Sales', type: 'document', views: 189, rating: 4.9 },
    { id: '3', title: 'Objection Handling Techniques', category: 'Training', type: 'video', views: 167, rating: 4.7 },
    { id: '4', title: 'Competitive Analysis - Market Leaders', category: 'Competitive', type: 'document', views: 203, rating: 4.6 },
    { id: '5', title: 'Demo Best Practices', category: 'Training', type: 'video', views: 198, rating: 4.9 },
    { id: '6', title: 'FAQ - Common Customer Questions', category: 'FAQ', type: 'faq', views: 312, rating: 4.5 },
  ]);

  const [newContent, setNewContent] = useState({
    title: '',
    category: 'Product Docs',
    type: 'document' as 'document' | 'video' | 'faq'
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    // Simulating upload delay
    setTimeout(() => {
      const id = (articles.length + 1).toString();
      const articleToAdd: Article = {
        ...newContent,
        id,
        views: 0,
        rating: 5.0
      };
      
      setArticles(prev => [articleToAdd, ...prev]);
      setIsUploading(false);
      setIsUploadOpen(false);
      setNewContent({ title: '', category: 'Product Docs', type: 'document' });
      toast.success('Konten berhasil diunggah ke Knowledge Base');
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Knowledge Base
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-2">
            <Book className="h-4 w-4 text-[#013E37]" />
            Pusat dokumentasi produk, panduan penjualan, dan analisis kompetitif.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-xs px-4">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button 
            className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-wider text-xs px-6 shadow-lg shadow-[#013E37]/20"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Upload Content
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Articles</CardTitle>
            <Book className="h-4 w-4 text-[#013E37]" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-gray-900">{articles.length}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Items available</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-[#013E37]" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-[#013E37]">{articles.reduce((sum, a) => sum + a.views, 0)}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">All time reach</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-amber-600">{(articles.reduce((sum, a) => sum + a.rating, 0) / articles.length).toFixed(1)}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sales satisfaction</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Topics</CardTitle>
            <FileText className="h-4 w-4 text-[#013E37]" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-gray-900">6</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Categorized domains</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-5">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Semua</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest group-data-[state=active]:text-white/70">Library</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Dokumen</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">PDF & Guides</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Video</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Training</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">FAQ</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Solusi Cepat</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Internal</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Contributor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Cari dokumentasi atau panduan..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Card key={article.id} className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-gray-100">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-[#EEF7F5] transition-colors">
                      {article.type === 'document' && <FileText className="h-8 w-8 text-[#013E37]" />}
                      {article.type === 'video' && <Video className="h-8 w-8 text-[#013E37]" />}
                      {article.type === 'faq' && <HelpCircle className="h-8 w-8 text-[#013E37]" />}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-gray-200">
                      {article.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 leading-tight group-hover:text-[#013E37] transition-colors">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{article.views} Views</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{article.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 font-bold text-[10px] uppercase tracking-widest border-gray-200 h-10">
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                    <Button variant="outline" className="font-bold border-gray-200 h-10 w-10 p-0">
                      <Download className="h-4 w-4 text-[#013E37]" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.filter(a => a.type === 'document').map((article) => (
              <Card key={article.id} className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-gray-100">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-[#EEF7F5] transition-colors">
                      <FileText className="h-8 w-8 text-[#013E37]" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-gray-200">{article.category}</Badge>
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 leading-tight group-hover:text-[#013E37] transition-colors">{article.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{article.views} views</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      <span className="text-gray-900">{article.rating}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full font-bold text-[10px] uppercase tracking-widest border-gray-200 h-10">
                    <Download className="h-4 w-4 mr-2 text-[#013E37]" /> Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {articles.filter(a => a.type === 'video').map((article) => (
              <Card key={article.id} className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-gray-100">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-[#EEF7F5] transition-colors">
                      <Video className="h-8 w-8 text-[#013E37]" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-gray-200">{article.category}</Badge>
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 leading-tight group-hover:text-[#013E37] transition-colors">{article.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{article.views} views</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      <span className="text-gray-900">{article.rating}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full font-bold text-[10px] uppercase tracking-widest border-gray-200 h-10">
                    <Video className="h-4 w-4 mr-2 text-[#013E37]" /> Watch Video
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card className="border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
              <CardTitle className="text-xl font-black text-gray-900 uppercase tracking-tight">Frequently Asked Questions</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Solusi cepat untuk pertanyaan umum tim sales</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {articles.filter(a => a.type === 'faq').map((article) => (
                  <div key={article.id} className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#013E37]/30 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-[#EEF7F5] transition-colors shrink-0">
                        <HelpCircle className="h-6 w-6 text-[#013E37]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-gray-900 uppercase tracking-tight group-hover:text-[#013E37] transition-colors mb-1">{article.title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Klik untuk melihat detail solusi dan panduan</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                        <Eye className="h-3 w-3" />
                        <span>{article.views}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card className="border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
              <CardTitle className="text-xl font-black text-gray-900 uppercase tracking-tight">Upload Knowledge Content</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Kontribusi konten baru ke sistem pusat</CardDescription>
            </CardHeader>
            <CardContent className="p-12">
              <div className="text-center max-w-sm mx-auto space-y-6">
                <div className="h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center mx-auto border-4 border-white shadow-xl group hover:bg-[#EEF7F5] transition-all">
                  <Plus className="h-10 w-10 text-gray-300 group-hover:text-[#013E37] transition-colors" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Kontribusi Materi Baru</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Unggah file PDF panduan, video pelatihan, atau entri FAQ untuk membantu performa tim sales.</p>
                </div>
                <Button 
                  className="bg-[#013E37] hover:bg-[#028076] text-white h-12 px-8 font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-900/20 w-full"
                  onClick={() => setIsUploadOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Upload Materi Baru
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Content Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <VisuallyHidden>
            <DialogTitle>Upload Knowledge Content</DialogTitle>
            <DialogDescription>Tambahkan dokumen, video, atau FAQ baru ke library</DialogDescription>
          </VisuallyHidden>

          <div className="bg-[#013E37] p-8 text-white">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Upload className="h-6 w-6 text-emerald-400" /> 
              Upload Content
            </h2>
            <p className="text-emerald-100/70 text-xs font-bold uppercase tracking-widest mt-2">Add new resource to knowledge library</p>
          </div>

          <form onSubmit={handleUpload}>
            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Content Title</Label>
                <Input 
                  required
                  placeholder="e.g. Q4 Sales Strategy Guide"
                  value={newContent.title} 
                  onChange={(e) => setNewContent(prev => ({...prev, title: e.target.value}))}
                  className="h-11 font-bold uppercase tracking-tight placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</Label>
                  <Select 
                    value={newContent.category} 
                    onValueChange={(val) => setNewContent(prev => ({...prev, category: val}))}
                  >
                    <SelectTrigger className="h-11 font-bold uppercase tracking-tight">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product Docs">Product Docs</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Competitive">Competitive</SelectItem>
                      <SelectItem value="FAQ">FAQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Content Type</Label>
                  <Select 
                    value={newContent.type} 
                    onValueChange={(val: any) => setNewContent(prev => ({...prev, type: val}))}
                  >
                    <SelectTrigger className="h-11 font-bold uppercase tracking-tight">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document (PDF)</SelectItem>
                      <SelectItem value="video">Video Training</SelectItem>
                      <SelectItem value="faq">FAQ Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">File Attachment</Label>
                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center hover:border-[#013E37]/30 transition-all bg-gray-50/50 group cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2 group-hover:text-[#013E37] transition-colors" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click or drag file to upload</p>
                  <p className="text-[9px] text-gray-300 mt-1 italic">Max size: 50MB (PDF, MP4, PNG)</p>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-gray-50 p-6 border-t border-gray-100 gap-2">
              <Button type="button" variant="outline" className="font-black uppercase tracking-widest text-[10px] h-11 px-6" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isUploading}
                className="bg-[#013E37] hover:bg-[#028076] text-white font-black uppercase tracking-widest text-[10px] h-11 px-10 shadow-lg shadow-[#013E37]/20 min-w-[140px]"
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  'Publish Content'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
