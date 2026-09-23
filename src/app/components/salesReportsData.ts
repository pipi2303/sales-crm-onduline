// Chart data and constants for Sales Reports

export const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export const conversionFunnel = [
  { stage: 'Leads', count: 1245, percentage: 100 },
  { stage: 'Qualified', count: 890, percentage: 71 },
  { stage: 'Demo Scheduled', count: 456, percentage: 37 },
  { stage: 'Proposal Sent', count: 234, percentage: 19 },
  { stage: 'Negotiation', count: 156, percentage: 13 },
  { stage: 'Closed Won', count: 89, percentage: 7 }
];

export const monthlyData = [
  { month: 'Jan', leads: 145, demos: 89, contracts: 34 },
  { month: 'Feb', leads: 165, demos: 95, contracts: 42 },
  { month: 'Mar', leads: 178, demos: 105, contracts: 48 },
  { month: 'Apr', leads: 192, demos: 112, contracts: 51 },
  { month: 'May', leads: 208, demos: 125, contracts: 56 },
  { month: 'Jun', leads: 225, demos: 135, contracts: 62 }
];

export const productData = [
  { category: 'Medico Cloud', revenue: 2500, target: 2800, growth: 15 },
  { category: 'Medico Mobile', revenue: 1800, target: 2000, growth: 22 },
  { category: 'Medico Enterprise', revenue: 3200, target: 3500, growth: 18 },
  { category: 'Medico Analytics', revenue: 1200, target: 1400, growth: 12 }
];

export const regionData = [
  { region: 'Jakarta', revenue: 3500, target: 4000, performance: 87.5 },
  { region: 'Surabaya', revenue: 2100, target: 2500, performance: 84.0 },
  { region: 'Bandung', revenue: 1800, target: 2200, performance: 81.8 },
  { region: 'Medan', revenue: 1400, target: 1800, performance: 77.8 },
  { region: 'Semarang', revenue: 900, target: 1200, performance: 75.0 }
];

export const teamHierarchyData = {
  id: 'dir-1',
  avatar: 'DS',
  name: 'Direktur Sales',
  position: 'Sales Director',
  email: 'director@gmail.com',
  achievement: 12500000,
  target: 15000000,
  performance: 83.3,
  totalDeals: 89,
  areaManagers: [
    {
      id: 'am-1',
      avatar: 'AM',
      name: 'Area Manager Jakarta',
      position: 'Area Manager - Jakarta Region',
      email: 'am.jakarta@gmail.com',
      achievement: 4500000,
      target: 5500000,
      performance: 81.8,
      totalDeals: 34,
      managers: [
        {
          id: 'sm-1',
          avatar: 'SM',
          name: 'Sales Manager Jakarta Pusat',
          position: 'Sales Manager',
          email: 'sm.jakpus@gmail.com',
          achievement: 2200000,
          target: 2800000,
          performance: 78.6,
          totalDeals: 18,
          team: [
            {
              id: 'se-1',
              avatar: 'JD',
              name: 'John Doe',
              position: 'Sales Executive',
              email: 'john.doe@gmail.com',
              achievement: 750000,
              target: 950000,
              performance: 78.9,
              totalDeals: 8
            },
            {
              id: 'se-2',
              avatar: 'JS',
              name: 'Jane Smith',
              position: 'Sales Executive',
              email: 'jane.smith@gmail.com',
              achievement: 820000,
              target: 1000000,
              performance: 82.0,
              totalDeals: 10
            }
          ]
        }
      ]
    },
    {
      id: 'am-2',
      avatar: 'BS',
      name: 'Area Manager Surabaya',
      position: 'Area Manager - East Java Region',
      email: 'am.surabaya@gmail.com',
      achievement: 3200000,
      target: 4000000,
      performance: 80.0,
      totalDeals: 28,
      managers: [
        {
          id: 'sm-2',
          avatar: 'RM',
          name: 'Regional Manager Surabaya',
          position: 'Sales Manager',
          email: 'rm.surabaya@gmail.com',
          achievement: 1600000,
          target: 2000000,
          performance: 80.0,
          totalDeals: 14,
          team: [
            {
              id: 'se-3',
              avatar: 'AB',
              name: 'Ahmad Basuki',
              position: 'Sales Executive',
              email: 'ahmad.basuki@gmail.com',
              achievement: 650000,
              target: 800000,
              performance: 81.3,
              totalDeals: 7
            }
          ]
        }
      ]
    }
  ],
  accountManagers: [
    {
      id: 'acm-1',
      avatar: 'KA',
      name: 'Key Account Manager',
      position: 'Key Account Manager - Enterprise',
      email: 'kam@gmail.com',
      achievement: 4800000,
      target: 5500000,
      performance: 87.3,
      totalDeals: 27
    }
  ]
};
