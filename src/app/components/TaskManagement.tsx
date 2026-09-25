import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, CheckCircle, Circle, Clock, AlertCircle, Calendar, User, Tag, Filter, Trash2, Edit, Flag, Star, Eye, MapPin, CornerDownRight, Navigation } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { toast } from 'sonner';
import { formatDate } from '@/utils/formatters';
import { tasksRepository } from '@/services/tasksRepository';
import type { Task, TaskType } from '@/types/task';
import { useAuth } from '@/app/contexts/AuthContext';

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  visit: 'Visit',
  call: 'Call',
  email: 'Email',
  other: 'Other',
};

const TASK_CATEGORIES = ['Sales Follow-up', 'Reporting', 'Admin', 'Contract', 'Training', 'Customer Success', 'Approvals'];
const TASK_ASSIGNEES = ['Budi Santoso', 'Ani Wijaya', 'Dewi Kartika', 'Eko Prasetyo', 'Sarah Manager'];


// Bab 8 gap 2: downsizes+recompresses a picked/captured photo client-side
// before it's base64-encoded and sent to the server — keeps the payload
// well under lib/blob.ts's 5MB decoded-size limit and Vercel's serverless
// body-size limit, since a modern phone camera photo straight out of
// <input capture="environment"> can be several times that.
async function resizeImageToDataUrl(file: File, maxDimension = 1280, quality = 0.7): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar. Coba foto lain.'));
    img.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale) || 1;
  const height = Math.round(image.height * scale) || 1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak didukung di perangkat/browser ini.');
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

interface TaskFormState {
  title: string;
  description: string;
  priority: Task['priority'];
  type: TaskType;
  category: string;
  assignedTo: string;
  dueDate: string;
  relatedTo: string;
}

const emptyTaskForm = (): TaskFormState => ({
  title: '',
  description: '',
  priority: 'medium',
  type: 'other',
  category: '',
  assignedTo: '',
  dueDate: '',
  relatedTo: '',
});

export function TaskManagement() {
  const { user } = useAuth();
  const confirm = useConfirm();
  // FR-07: role Super Admin / Sales Manager boleh override lock status Completed
  // (menghubungkan role system yang sudah ada di Admin System ke rule ini).
  const isAdminOverride = user?.role === 'Super Admin' || user?.role === 'Sales Manager';
  const [activeTab, setActiveTab] = useState('my-tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Tasks are persisted via tasksRepository (real API, prisma/schema.prisma's Task model — see the file's header).
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [checkInBusy, setCheckInBusy] = useState(false);
  // Bab 8 gap 2: which task the hidden file input's next photo belongs to
  // (set right before checkInFileInputRef.current?.click(), consumed by
  // onCheckInPhotoSelected).
  const [checkInTargetTaskId, setCheckInTargetTaskId] = useState<string | null>(null);
  const checkInFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await tasksRepository.getAll();
        if (cancelled) return;
        if (result.success && result.data) {
          // Bab 50: dulu di sini ada auto-seed diam-diam (bikin 7 SEED_TASKS
          // begitu tabel kosong, tanpa lewat tombol "Load Dummy Data") --
          // pola yang sama seperti yang sudah dihapus dari
          // CommissionCalculator.tsx di Bab 39. Sekarang data dummy Task
          // (lebih banyak & relevan ke konteks Onduline) dipindah ke
          // loadAllDummyData.ts, satu-satunya sumber dummy data di seluruh
          // aplikasi. Tabel kosong di sini sekarang benar-benar tampil
          // kosong sampai tombol itu ditekan, bukan lagi diam-diam terisi.
          setTasks(result.data as Task[]);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Failed to load tasks from storage:', error);
        setTasks([]);
      } finally {
        if (!cancelled) setTasksLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Statistics
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length,
    dueToday: tasks.filter(t => t.status !== 'completed' && t.dueDate === new Date().toISOString().split('T')[0]).length,
    highPriority: tasks.filter(t => t.status !== 'completed' && (t.priority === 'high' || t.priority === 'urgent')).length
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: { variant: 'secondary', label: 'Low', icon: Flag, className: '' },
      medium: { variant: 'default', label: 'Medium', icon: Flag, className: 'bg-blue-500' },
      high: { variant: 'default', label: 'High', icon: Flag, className: 'bg-orange-500' },
      urgent: { variant: 'destructive', label: 'Urgent', icon: AlertCircle, className: '' }
    };
    return variants[priority] || variants.low;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'todo': { variant: 'outline', label: 'To Do', icon: Circle },
      'in-progress': { variant: 'default', label: 'In Progress', icon: Clock, className: 'bg-blue-500' },
      'completed': { variant: 'default', label: 'Completed', icon: CheckCircle, className: 'bg-green-500' }
    };
    return variants[status] || variants.todo;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Sales Follow-up': 'bg-[#DFF0EC] text-[#013E37]',
      'Reporting': 'bg-[#DFF0EC] text-[#013E37]',
      'Admin': 'bg-gray-100 text-gray-700',
      'Contract': 'bg-green-100 text-green-700',
      'Training': 'bg-blue-100 text-blue-700',
      'Customer Success': 'bg-pink-100 text-pink-700',
      'Approvals': 'bg-orange-100 text-orange-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  // FR-07: Not Started (todo) -> Ongoing (in-progress) -> Completed, in order.
  // Skipping straight from todo to completed requires explicit confirmation.
  // Completed tasks terkunci untuk role biasa. Super Admin / Sales Manager bisa
  // override (reopen) dengan konfirmasi eksplisit, memanfaatkan role system yang
  // sudah ada di Admin System.
  const changeTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === 'completed') {
      if (!isAdminOverride) {
        toast.error('Task yang sudah Completed tidak bisa diubah lagi (butuh akses Admin).');
        return;
      }
      const proceedOverride = await confirm(
        `Task ini sudah Completed. Sebagai ${user?.role}, Anda bisa membuka kembali task ini. Lanjutkan reopen ke "${newStatus === 'todo' ? 'Not Started' : 'Ongoing'}"?`,
        { title: 'Reopen Task (Admin Override)' }
      );
      if (!proceedOverride) return;
    }

    if (task.status === newStatus) return;

    if (task.status === 'todo' && newStatus === 'completed') {
      const proceed = await confirm(
        'Task ini belum melalui status "Ongoing". Tandai langsung sebagai Completed?'
      );
      if (!proceed) return;
    }

    const updatedTask: Task = {
      ...task,
      status: newStatus,
      completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : task.completedDate,
    };

    try {
      const result = await tasksRepository.update(taskId, updatedTask);
      if (result.success) {
        setTasks(prev => prev.map(t => (t.id === taskId ? (result.data as Task) : t)));
        toast.success('Status task diperbarui');
      } else {
        toast.error(result.error || 'Gagal memperbarui status task');
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast.error('Gagal memperbarui status task');
    }
  };

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus: Task['status'] = task.status === 'completed' ? 'todo' : 'completed';
    if (task.status === 'completed' && newStatus === 'todo') {
      // Reopening a completed task is also locked by the same "Completed is final" rule.
      toast.error('Task yang sudah Completed tidak bisa diubah lagi (butuh akses Admin).');
      return;
    }
    changeTaskStatus(taskId, newStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const result = await tasksRepository.remove(taskId);
      if (result.success) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        toast.success('Task deleted successfully');
      } else {
        toast.error(result.error || 'Gagal menghapus task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Gagal menghapus task');
    }
  };

  // FR-03/Bab 8 gap 2: GPS check-in + "foto toko bertanggal" for Visit-type
  // tasks. Now server-backed (tasksRepository.checkIn -> POST /api/tasks/:id)
  // instead of the old plain tasksApi.update() against localStorage, which
  // also means check_in_at is now a real server timestamp (Date.now() on
  // the API route), not a device-clock stand-in.
  //
  // Photo capture is a separate user gesture (the hidden file input below)
  // from geolocation, so the flow is: "Check In" button opens the file
  // picker/camera -> onCheckInPhotoSelected resizes it client-side -> then
  // performCheckIn() asks for geolocation and sends both together in one
  // request. A location-permission denial still saves the check-in (photo +
  // locationValidated: false), matching the previous location-only behavior.
  const performCheckIn = async (taskId: string, photoDataUrl?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.checkInAt) {
      const overwrite = await confirm(
        'Task ini sudah memiliki data check-in sebelumnya. Timpa dengan data baru?'
      );
      if (!overwrite) return;
    }

    if (!navigator.geolocation) {
      toast.error('Perangkat/browser ini tidak mendukung Geolocation API.');
      return;
    }

    setCheckInBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          const result = await tasksRepository.checkIn(taskId, {
            lat: latitude,
            lng: longitude,
            accuracy,
            locationValidated: true,
            photoDataUrl,
          });
          if (result.success && result.data) {
            setTasks(prev => prev.map(t => (t.id === taskId ? (result.data as Task) : t)));
            setSelectedTask(prev => (prev && prev.id === taskId ? (result.data as Task) : prev));
            toast.success(`Check-in berhasil (± ${Math.round(accuracy)}m)`);
          } else {
            toast.error(result.error || 'Gagal menyimpan data check-in');
          }
        } catch (error) {
          console.error('Failed to save check-in:', error);
          toast.error('Gagal menyimpan data check-in');
        } finally {
          setCheckInBusy(false);
        }
      },
      async (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Izin lokasi diperlukan untuk validasi kunjungan. Foto tetap disimpan tanpa data lokasi.');
          try {
            const result = await tasksRepository.checkIn(taskId, {
              locationValidated: false,
              photoDataUrl,
            });
            if (result.success && result.data) {
              setTasks(prev => prev.map(t => (t.id === taskId ? (result.data as Task) : t)));
              setSelectedTask(prev => (prev && prev.id === taskId ? (result.data as Task) : prev));
            }
          } catch (e) {
            console.error('Failed to mark location unvalidated:', e);
          } finally {
            setCheckInBusy(false);
          }
        } else {
          setCheckInBusy(false);
          toast.error('Gagal mengambil lokasi (sinyal lemah / timeout). Coba lagi.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Triggered by the "Check In" button — opens the hidden file input
  // (camera on mobile, via capture="environment") rather than doing
  // anything itself; onCheckInPhotoSelected picks up from there.
  const handleCheckIn = (taskId: string) => {
    setCheckInTargetTaskId(taskId);
    checkInFileInputRef.current?.click();
  };

  const onCheckInPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    const taskId = checkInTargetTaskId;
    setCheckInTargetTaskId(null);
    if (!file || !taskId) return;

    try {
      const photoDataUrl = await resizeImageToDataUrl(file);
      await performCheckIn(taskId, photoDataUrl);
    } catch (error) {
      console.error('Failed to process check-in photo:', error);
      toast.error('Gagal memproses foto. Coba lagi.');
    }
  };

  const handleOpenNewTask = () => {
    setTaskForm(emptyTaskForm());
    setEditingTaskId(null);
    setParentTaskId(null);
    setShowTaskDialog(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      type: task.type,
      category: task.category,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      relatedTo: task.relatedTo || '',
    });
    setEditingTaskId(task.id);
    setParentTaskId(null);
    setShowDetailDialog(false);
    setShowTaskDialog(true);
  };

  // FR-07: pre-fills a new task from its parent, copying the related account/opportunity reference.
  const handleCreateFollowUp = (task: Task) => {
    setTaskForm({
      title: `Follow-up: ${task.title}`,
      description: '',
      priority: task.priority,
      type: task.type,
      category: task.category,
      assignedTo: task.assignedTo,
      dueDate: '',
      relatedTo: task.relatedTo || '',
    });
    setEditingTaskId(null);
    setParentTaskId(task.id);
    setShowDetailDialog(false);
    setShowTaskDialog(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error('Task Title wajib diisi');
      return;
    }
    if (!taskForm.category) {
      toast.error('Category wajib dipilih');
      return;
    }
    if (!taskForm.assignedTo) {
      toast.error('Assign To wajib dipilih');
      return;
    }
    if (!taskForm.dueDate) {
      toast.error('Due Date wajib diisi');
      return;
    }

    if (editingTaskId) {
      const existing = tasks.find(t => t.id === editingTaskId);
      if (!existing) return;
      const updatedTask: Task = {
        ...existing,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        type: taskForm.type,
        category: taskForm.category,
        assignedTo: taskForm.assignedTo,
        dueDate: taskForm.dueDate,
        relatedTo: taskForm.relatedTo.trim() || undefined,
      };
      try {
        const result = await tasksRepository.update(editingTaskId, updatedTask);
        if (result.success) {
          setTasks(prev => prev.map(t => (t.id === editingTaskId ? (result.data as Task) : t)));
          toast.success('Task updated successfully!');
          setShowTaskDialog(false);
        } else {
          toast.error(result.error || 'Gagal memperbarui task');
        }
      } catch (error) {
        console.error('Failed to update task:', error);
        toast.error('Gagal memperbarui task');
      }
      return;
    }

    const newTask: Task = {
      id: `TASK-${Date.now()}`,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      status: 'todo',
      priority: taskForm.priority,
      type: taskForm.type,
      dueDate: taskForm.dueDate,
      assignedTo: taskForm.assignedTo,
      createdBy: taskForm.assignedTo,
      createdDate: new Date().toISOString().split('T')[0],
      category: taskForm.category,
      relatedTo: taskForm.relatedTo.trim() || undefined,
      tags: [],
      parentTaskId: parentTaskId || undefined,
    };

    try {
      const result = await tasksRepository.create(newTask);
      if (result.success && result.data) {
        setTasks(prev => [...prev, result.data as Task]);
        toast.success('Task created successfully!');
        setShowTaskDialog(false);
      } else {
        toast.error(result.error || 'Gagal membuat task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Gagal membuat task');
    }
  };

  const isOverdue = (task: Task) => {
    return task.status !== 'completed' && new Date(task.dueDate) < new Date();
  };

  const isDueToday = (task: Task) => {
    return task.status !== 'completed' && task.dueDate === new Date().toISOString().split('T')[0];
  };

  const getCompletionPercentage = (task: Task): number => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(st => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#013E37]">
          Task & Activity Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personal & team task lists with follow-up reminders and activity scheduling
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <Circle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todo}</div>
            <p className="text-xs text-muted-foreground">Pending tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Active work</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past deadline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
            <p className="text-xs text-muted-foreground">Today's deadline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">Urgent items</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-4">
          <TabsTrigger 
            value="my-tasks" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">My Tasks</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest group-data-[state=active]:text-[#013E37]/70">Daftar Tugas Saya</span>
          </TabsTrigger>
          <TabsTrigger 
            value="team-tasks" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Team Tasks</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Aktivitas Tim</span>
          </TabsTrigger>
          <TabsTrigger 
            value="calendar" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Calendar</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Timeline Jadwal</span>
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Completed</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Riwayat Tugas</span>
          </TabsTrigger>
        </TabsList>

        {/* My Tasks Tab */}
        <TabsContent value="my-tasks" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleOpenNewTask} className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
              <CardDescription>Your personal tasks and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                      isOverdue(task) ? 'border-red-300 bg-red-50/50' : ''
                    } ${isDueToday(task) ? 'border-orange-300 bg-orange-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleTask(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <div className="flex flex-wrap gap-2 items-center">
                              <Badge {...getStatusBadge(task.status)}>
                                {getStatusBadge(task.status).label}
                              </Badge>
                              <Badge {...getPriorityBadge(task.priority)}>
                                {getPriorityBadge(task.priority).label}
                              </Badge>
                              <Badge variant="outline" className={getCategoryColor(task.category)}>
                                <Tag className="h-3 w-3 mr-1" />
                                {task.category}
                              </Badge>
                              {task.type === 'visit' && (
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {task.checkInAt ? 'Sudah Check In' : 'Visit'}
                                </Badge>
                              )}
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              <span className={isOverdue(task) ? 'text-red-600 font-semibold' : isDueToday(task) ? 'text-orange-600 font-semibold' : ''}>
                                {formatDate(task.dueDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{task.assignedTo}</span>
                            </div>
                          </div>
                        </div>

                        {/* Subtasks Progress */}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="mt-3 p-3 bg-accent/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium">Subtasks ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})</span>
                              <span className="text-xs text-muted-foreground">{getCompletionPercentage(task)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#013E37] to-[#025C52] transition-all"
                                style={{ width: `${getCompletionPercentage(task)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditTask(task)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tasks Tab */}
        <TabsContent value="team-tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Tasks</CardTitle>
              <CardDescription>All tasks across the team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Budi Santoso', 'Ani Wijaya', 'Dewi Kartika', 'Eko Prasetyo'].map((member) => {
                  const memberTasks = tasks.filter(t => t.assignedTo === member && t.status !== 'completed');
                  return (
                    <div key={member} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center text-white font-semibold">
                            {member.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-semibold">{member}</h3>
                            <p className="text-sm text-muted-foreground">{memberTasks.length} active tasks</p>
                          </div>
                        </div>
                        <Badge variant="outline">{memberTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length} high priority</Badge>
                      </div>
                      <div className="space-y-2">
                        {memberTasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="text-sm p-2 bg-accent/30 rounded">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{task.title}</span>
                              <Badge {...getPriorityBadge(task.priority)} className="text-xs">
                                {getPriorityBadge(task.priority).label}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Calendar</CardTitle>
              <CardDescription>Tasks organized by due date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
                <p className="text-sm text-muted-foreground">
                  Calendar integration coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>Task completion history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.filter(t => t.status === 'completed').map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg bg-green-50/50">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold line-through text-muted-foreground mb-1">
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Completed: {formatDate(task.completedDate || task.createdDate)}</span>
                          <span>By: {task.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details: {selectedTask?.title}</DialogTitle>
            <DialogDescription>
              Complete details and progress tracking for task: {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedTask.title}</h2>
                <p className="text-muted-foreground">{selectedTask.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge {...getStatusBadge(selectedTask.status)}>
                      {getStatusBadge(selectedTask.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <div className="mt-1">
                    <Badge {...getPriorityBadge(selectedTask.priority)}>
                      {getPriorityBadge(selectedTask.priority).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Assigned To</Label>
                  <p className="font-semibold">{selectedTask.assignedTo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p className="font-semibold">{formatDate(selectedTask.dueDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-semibold">{selectedTask.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-semibold">{TASK_TYPE_LABEL[selectedTask.type]}</p>
                </div>
                {selectedTask.relatedTo && (
                  <div>
                    <Label className="text-muted-foreground">Related To</Label>
                    <p className="font-semibold">{selectedTask.relatedTo}</p>
                  </div>
                )}
              </div>

              {/* FR-07: sequential status workflow (Not Started -> Ongoing -> Completed) */}
              <div className="flex items-center gap-2 flex-wrap p-3 bg-accent/30 rounded-lg">
                <Label className="text-muted-foreground mr-1">Ubah Status:</Label>
                {selectedTask.status === 'completed' && isAdminOverride && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    Admin override aktif ({user?.role})
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={selectedTask.status === 'todo' ? 'default' : 'outline'}
                  disabled={selectedTask.status !== 'in-progress' && !(isAdminOverride && selectedTask.status === 'completed')}
                  onClick={() => changeTaskStatus(selectedTask.id, 'todo')}
                >
                  Not Started
                </Button>
                <Button
                  size="sm"
                  variant={selectedTask.status === 'in-progress' ? 'default' : 'outline'}
                  disabled={selectedTask.status === 'completed' && !isAdminOverride}
                  onClick={() => changeTaskStatus(selectedTask.id, 'in-progress')}
                >
                  Ongoing
                </Button>
                <Button
                  size="sm"
                  variant={selectedTask.status === 'completed' ? 'default' : 'outline'}
                  disabled={selectedTask.status === 'completed'}
                  onClick={() => changeTaskStatus(selectedTask.id, 'completed')}
                >
                  Completed
                </Button>
              </div>

              {/* FR-03/Bab 8 gap 2: GPS + foto check-in, only for Visit-type tasks not yet completed */}
              {selectedTask.type === 'visit' && (
                <div className="p-3 border rounded-lg space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> GPS Check-in & Foto Toko
                  </Label>
                  {selectedTask.checkInAt ? (
                    <div className="text-sm">
                      <p className="font-semibold text-green-700">
                        Sudah Check In ({new Date(selectedTask.checkInAt).toLocaleString('id-ID')})
                      </p>
                      {selectedTask.checkInLat != null && selectedTask.checkInLng != null && (
                        <p className="text-muted-foreground">
                          Koordinat: {selectedTask.checkInLat.toFixed(5)}, {selectedTask.checkInLng.toFixed(5)}
                          {selectedTask.checkInAccuracy != null && ` (± ${Math.round(selectedTask.checkInAccuracy)}m)`}
                        </p>
                      )}
                      {selectedTask.locationValidated === false && (
                        <p className="text-orange-600">Belum Tervalidasi Lokasi (izin lokasi ditolak saat disimpan)</p>
                      )}
                      {selectedTask.checkInPhotoUrl ? (
                        <img
                          src={selectedTask.checkInPhotoUrl}
                          alt="Foto display toko saat check-in"
                          className="mt-2 rounded-md border max-h-40 object-cover"
                        />
                      ) : (
                        <p className="text-muted-foreground mt-1">Tidak ada foto tersimpan untuk check-in ini.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum Check In</p>
                  )}
                  {selectedTask.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={checkInBusy}
                      onClick={() => handleCheckIn(selectedTask.id)}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      {checkInBusy ? 'Menyimpan check-in...' : 'Ambil Foto & Check In'}
                    </Button>
                  )}
                  {/* Hidden -- triggered programmatically by handleCheckIn(); capture="environment"
                      opens the rear camera directly on mobile, falls back to a normal file picker
                      on desktop. */}
                  <input
                    ref={checkInFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onCheckInPhotoSelected}
                  />
                </div>
              )}

              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Subtasks</Label>
                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 border rounded">
                        <Checkbox checked={subtask.completed} />
                        <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.tags.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            {selectedTask && (
              <Button variant="outline" onClick={() => handleCreateFollowUp(selectedTask)}>
                <CornerDownRight className="h-3 w-3 mr-1" />
                Create Follow-Up Task
              </Button>
            )}
            <Button onClick={() => selectedTask && handleEditTask(selectedTask)}>Edit Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task / Edit Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? 'Edit Task' : parentTaskId ? 'Create Follow-Up Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {editingTaskId
                ? 'Update the task details below.'
                : 'Add a new task to your pipeline with priority, deadline, and assignee'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title *</Label>
              <Input
                placeholder="Enter task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Describe the task..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Priority *</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as Task['priority'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type *</Label>
                <Select
                  value={taskForm.type}
                  onValueChange={(v) => setTaskForm({ ...taskForm, type: v as TaskType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visit">Visit (GPS check-in tersedia)</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={taskForm.category || undefined}
                  onValueChange={(v) => setTaskForm({ ...taskForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign To *</Label>
                <Select
                  value={taskForm.assignedTo || undefined}
                  onValueChange={(v) => setTaskForm({ ...taskForm, assignedTo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_ASSIGNEES.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Related To (Optional)</Label>
              <Input
                placeholder="e.g., OPP-001, CONTRACT-003"
                value={taskForm.relatedTo}
                onChange={(e) => setTaskForm({ ...taskForm, relatedTo: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTask}>
              {editingTaskId ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
