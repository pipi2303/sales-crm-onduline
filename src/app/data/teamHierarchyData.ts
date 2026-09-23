import { Director, AreaManager, Manager, TeamMember } from '@/app/components/dialogs/sales-dialog-types';

export const teamHierarchy: Director = {
  id: 'dir-001',
  name: 'Sutrisno Wijaya',
  position: 'Sales Director',
  avatar: 'SW',
  email: 'sutrisno.wijaya@gmail.com',
  achievement: 4500000000,
  target: 5000000000,
  performance: 90,
  totalDeals: 156,
  pipelineValue: 8500000000,
  upside: 2100000000,
  strongUpside: 1800000000,
  forecast: 3200000000,
  areaManagers: [
    {
      id: 'am-001',
      name: 'Ahmad Rizki Pratama',
      position: 'Area Manager - Jabodetabek',
      avatar: 'AR',
      email: 'ahmad.rizki@gmail.com',
      achievement: 2950000000,
      target: 3300000000,
      performance: 89.4,
      totalDeals: 100,
      pipelineValue: 5200000000,
      upside: 1300000000,
      strongUpside: 1100000000,
      forecast: 1900000000,
      managers: [
        {
          id: 'mgr-001',
          name: 'Bambang Hartono',
          position: 'Area Sales Manager - Jakarta',
          avatar: 'BH',
          email: 'bambang.hartono@gmail.com',
          achievement: 1500000000,
          target: 1650000000,
          performance: 90.9,
          totalDeals: 52,
          pipelineValue: 2800000000,
          upside: 680000000,
          strongUpside: 580000000,
          forecast: 990000000,
          team: [
            { id: 'tm-001', name: 'Andi Saputra', position: 'Senior Sales Executive', avatar: 'AS', email: 'andi.saputra@gmail.com', achievement: 320000000, target: 350000000, performance: 91.4, totalDeals: 11, pipelineValue: 580000000, upside: 140000000, strongUpside: 120000000, forecast: 205000000 },
            { id: 'tm-002', name: 'Siti Nurhaliza', position: 'Sales Executive', avatar: 'SN', email: 'siti.nurhaliza@gmail.com', achievement: 280000000, target: 300000000, performance: 93.3, totalDeals: 9, pipelineValue: 504000000, upside: 123000000, strongUpside: 105000000, forecast: 182000000 },
            { id: 'tm-003', name: 'Dedi Kurniawan', position: 'Sales Executive', avatar: 'DK', email: 'dedi.kurniawan@gmail.com', achievement: 310000000, target: 330000000, performance: 93.9, totalDeals: 10, pipelineValue: 558000000, upside: 136000000, strongUpside: 116000000, forecast: 202000000 },
            { id: 'tm-004', name: 'Maya Sari', position: 'Junior Sales Executive', avatar: 'MS', email: 'maya.sari@gmail.com', achievement: 295000000, target: 340000000, performance: 86.8, totalDeals: 11, pipelineValue: 531000000, upside: 130000000, strongUpside: 110000000, forecast: 192000000 },
            { id: 'tm-005', name: 'Rudi Hermawan', position: 'Junior Sales Executive', avatar: 'RH', email: 'rudi.hermawan@gmail.com', achievement: 295000000, target: 330000000, performance: 89.4, totalDeals: 11, pipelineValue: 531000000, upside: 130000000, strongUpside: 110000000, forecast: 192000000 }
          ]
        },
        {
          id: 'mgr-002',
          name: 'Dewi Lestari',
          position: 'Area Sales Manager - Bogor',
          avatar: 'DL',
          email: 'dewi.lestari@gmail.com',
          achievement: 1450000000,
          target: 1650000000,
          performance: 87.9,
          totalDeals: 48,
          pipelineValue: 2620000000,
          upside: 642000000,
          strongUpside: 543000000,
          forecast: 958000000,
          team: [
            { id: 'tm-006', name: 'Agus Wibowo', position: 'Senior Sales Executive', avatar: 'AW', email: 'agus.wibowo@gmail.com', achievement: 310000000, target: 340000000, performance: 91.2, totalDeals: 10, pipelineValue: 558000000, upside: 136000000, strongUpside: 116000000, forecast: 202000000 },
            { id: 'tm-007', name: 'Linda Kusuma', position: 'Sales Executive', avatar: 'LK', email: 'linda.kusuma@gmail.com', achievement: 285000000, target: 320000000, performance: 89.1, totalDeals: 9, pipelineValue: 513000000, upside: 125000000, strongUpside: 107000000, forecast: 185000000 },
            { id: 'tm-008', name: 'Hendra Gunawan', position: 'Sales Executive', avatar: 'HG', email: 'hendra.gunawan@gmail.com', achievement: 290000000, target: 330000000, performance: 87.9, totalDeals: 10, pipelineValue: 522000000, upside: 127000000, strongUpside: 109000000, forecast: 189000000 },
            { id: 'tm-009', name: 'Fitri Handayani', position: 'Junior Sales Executive', avatar: 'FH', email: 'fitri.handayani@gmail.com', achievement: 275000000, target: 330000000, performance: 83.3, totalDeals: 9, pipelineValue: 495000000, upside: 121000000, strongUpside: 103000000, forecast: 179000000 },
            { id: 'tm-010', name: 'Budi Santoso', position: 'Junior Sales Executive', avatar: 'BS', email: 'budi.santoso@gmail.com', achievement: 290000000, target: 330000000, performance: 87.9, totalDeals: 10, pipelineValue: 522000000, upside: 127000000, strongUpside: 109000000, forecast: 189000000 }
          ]
        }
      ]
    },
    {
      id: 'am-002',
      name: 'Siti Rahmawati',
      position: 'Area Manager - Jawa Timur',
      avatar: 'SR',
      email: 'siti.rahmawati@gmail.com',
      achievement: 1550000000,
      target: 1700000000,
      performance: 91.2,
      totalDeals: 56,
      pipelineValue: 2790000000,
      upside: 682000000,
      strongUpside: 578000000,
      forecast: 1008000000,
      managers: [
        {
          id: 'mgr-003',
          name: 'Hadi Pranoto',
          position: 'Area Sales Manager - Surabaya',
          avatar: 'HP',
          email: 'hadi.pranoto@gmail.com',
          achievement: 1550000000,
          target: 1700000000,
          performance: 91.2,
          totalDeals: 56,
          pipelineValue: 2790000000,
          upside: 682000000,
          strongUpside: 578000000,
          forecast: 1008000000,
          team: [
            { id: 'tm-011', name: 'Cahya Pratama', position: 'Senior Sales Executive', avatar: 'CP', email: 'cahya.pratama@gmail.com', achievement: 330000000, target: 350000000, performance: 94.3, totalDeals: 12, pipelineValue: 594000000, upside: 145000000, strongUpside: 124000000, forecast: 215000000 },
            { id: 'tm-012', name: 'Rina Marlina', position: 'Sales Executive', avatar: 'RM', email: 'rina.marlina@gmail.com', achievement: 310000000, target: 340000000, performance: 91.2, totalDeals: 11, pipelineValue: 558000000, upside: 136000000, strongUpside: 116000000, forecast: 202000000 },
            { id: 'tm-013', name: 'Irfan Hakim', position: 'Sales Executive', avatar: 'IH', email: 'irfan.hakim@gmail.com', achievement: 305000000, target: 340000000, performance: 89.7, totalDeals: 11, pipelineValue: 549000000, upside: 134000000, strongUpside: 114000000, forecast: 198000000 },
            { id: 'tm-014', name: 'Nurul Aisyah', position: 'Junior Sales Executive', avatar: 'NA', email: 'nurul.aisyah@gmail.com', achievement: 300000000, target: 335000000, performance: 89.6, totalDeals: 11, pipelineValue: 540000000, upside: 132000000, strongUpside: 112000000, forecast: 195000000 },
            { id: 'tm-015', name: 'Tono Sugiarto', position: 'Junior Sales Executive', avatar: 'TS', email: 'tono.sugiarto@gmail.com', achievement: 305000000, target: 335000000, performance: 91.0, totalDeals: 11, pipelineValue: 549000000, upside: 134000000, strongUpside: 114000000, forecast: 198000000 }
          ]
        }
      ]
    }
  ],
  accountManagers: [
    {
      id: 'acm-001',
      name: 'Rini Kartika',
      position: 'Account Manager - Enterprise',
      avatar: 'RK',
      email: 'rini.kartika@gmail.com',
      achievement: 850000000,
      target: 950000000,
      performance: 89.5,
      totalDeals: 12,
      pipelineValue: 1530000000,
      upside: 374000000,
      strongUpside: 318000000,
      forecast: 553000000
    },
    {
      id: 'acm-002',
      name: 'Eko Prasetyo',
      position: 'Account Manager - Commercial',
      avatar: 'EP',
      email: 'eko.prasetyo@gmail.com',
      achievement: 920000000,
      target: 1000000000,
      performance: 92.0,
      totalDeals: 15,
      pipelineValue: 1656000000,
      upside: 405000000,
      strongUpside: 344000000,
      forecast: 598000000
    }
  ]
};

export const monthlyData = [
  { month: 'Jan', leads: 45, demos: 12, contracts: 8, revenue: 845, pipeline: 1560, upside: 385, strongUpside: 330, forecast: 590 },
  { month: 'Feb', leads: 52, demos: 15, contracts: 10, revenue: 920, pipeline: 1702, upside: 420, strongUpside: 360, forecast: 645 },
  { month: 'Mar', leads: 48, demos: 13, contracts: 9, revenue: 880, pipeline: 1628, upside: 402, strongUpside: 344, forecast: 616 },
  { month: 'Apr', leads: 60, demos: 18, contracts: 12, revenue: 1050, pipeline: 1942, upside: 480, strongUpside: 410, forecast: 735 },
  { month: 'May', leads: 55, demos: 16, contracts: 11, revenue: 980, pipeline: 1813, upside: 448, strongUpside: 383, forecast: 686 },
  { month: 'Jun', leads: 58, demos: 17, contracts: 13, revenue: 1120, pipeline: 2072, upside: 512, strongUpside: 438, forecast: 784 }
];

export const productPerformance = [
  { name: 'Enterprise Plan', sales: 23, revenue: 805 },
  { name: 'Professional Plan', sales: 32, revenue: 480 },
  { name: 'Starter Plan', sales: 45, revenue: 225 },
  { name: 'Consulting', sales: 18, revenue: 450 },
  { name: 'Custom Dev', sales: 12, revenue: 600 }
];

export const regionalData = [
  { region: 'Jakarta', value: 450, percentage: 35 },
  { region: 'Bogor', value: 320, percentage: 25 },
  { region: 'Surabaya', value: 250, percentage: 19 },
  { region: 'Medan', value: 180, percentage: 14 },
  { region: 'Others', value: 90, percentage: 7 }
];

export const conversionFunnel = [
  { stage: 'Leads', count: 100, percentage: 100 },
  { stage: 'Contacted', count: 85, percentage: 85 },
  { stage: 'Qualified', count: 68, percentage: 68 },
  { stage: 'Proposal', count: 45, percentage: 45 },
  { stage: 'Negotiation', count: 32, percentage: 32 },
  { stage: 'Close', count: 24, percentage: 24 },
  { stage: 'Lost', count: 8, percentage: 8 }
];