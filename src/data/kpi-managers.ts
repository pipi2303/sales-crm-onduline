import { Manager } from '@/types/kpi-enhanced';

export const KPI_MANAGERS: Manager[] = [
  {
    id: 'MGR-001',
    name: 'Budi Santoso',
    position: 'Sales Manager - Proyek',
    department: 'Proyek Division',
    teamMembers: [
      { id: 'TM-001', name: 'Ahmad Hidayat', position: 'Senior Sales Executive', managerId: 'MGR-001' },
      { id: 'TM-002', name: 'Siti Rahmawati', position: 'Sales Executive', managerId: 'MGR-001' },
      { id: 'TM-003', name: 'Doni Prasetyo', position: 'Sales Executive', managerId: 'MGR-001' },
      { id: 'TM-004', name: 'Maya Wulandari', position: 'Junior Sales Executive', managerId: 'MGR-001' },
      { id: 'TM-005', name: 'Rizky Firmansyah', position: 'Junior Sales Executive', managerId: 'MGR-001' }
    ]
  },
  {
    id: 'MGR-002',
    name: 'Dewi Kusuma',
    position: 'Sales Manager - Retail',
    department: 'Retail Division',
    teamMembers: [
      { id: 'TM-006', name: 'Andi Wijaya', position: 'Senior Sales Executive', managerId: 'MGR-002' },
      { id: 'TM-007', name: 'Linda Puspita', position: 'Sales Executive', managerId: 'MGR-002' },
      { id: 'TM-008', name: 'Fajar Setiawan', position: 'Sales Executive', managerId: 'MGR-002' },
      { id: 'TM-009', name: 'Rina Marlina', position: 'Junior Sales Executive', managerId: 'MGR-002' },
      { id: 'TM-010', name: 'Yoga Pratama', position: 'Junior Sales Executive', managerId: 'MGR-002' }
    ]
  },
  {
    id: 'MGR-003',
    name: 'Hendra Gunawan',
    position: 'Sales Manager - Distributor',
    department: 'Distributor Division',
    teamMembers: [
      { id: 'TM-011', name: 'Diana Safitri', position: 'Senior Sales Executive', managerId: 'MGR-003' },
      { id: 'TM-012', name: 'Irfan Hakim', position: 'Sales Executive', managerId: 'MGR-003' },
      { id: 'TM-013', name: 'Putri Anggraeni', position: 'Sales Executive', managerId: 'MGR-003' },
      { id: 'TM-014', name: 'Bayu Setiawan', position: 'Junior Sales Executive', managerId: 'MGR-003' },
      { id: 'TM-015', name: 'Citra Dewi', position: 'Junior Sales Executive', managerId: 'MGR-003' }
    ]
  }
];
