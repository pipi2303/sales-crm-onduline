/**
 * Debug Utilities for Demo Scheduler
 * Add these to window for easy debugging in browser console
 */

import { initializeDemosData, clearDemosData, getDemosStatistics } from './initializeDemos';

// Add to window for console access
declare global {
  interface Window {
    demoDebug: {
      init: typeof initializeDemosData;
      clear: typeof clearDemosData;
      stats: typeof getDemosStatistics;
      view: () => void;
      reset: () => void;
    };
  }
}

// Initialize debug utilities
if (typeof window !== 'undefined') {
  window.demoDebug = {
    init: initializeDemosData,
    clear: clearDemosData,
    stats: getDemosStatistics,
    view: () => {
      let demos: any[] = [];
      try {
        demos = JSON.parse(localStorage.getItem('sales_monitoring_demos') || '[]');
      } catch (error) {
        console.error('Failed to parse sales_monitoring_demos from localStorage:', error);
        return;
      }
      console.log('📊 Demo Scheduler Data:');
      console.table(demos.map((d: any) => ({
        ID: d.id,
        Title: d.title,
        Company: d.company,
        Date: new Date(d.date).toLocaleDateString(),
        Status: d.status,
        Presenter: d.presenter,
        'Has Rating': d.rating ? `${d.rating}★` : 'N/A',
        Attendees: d.attendees?.length || 0,
        Resources: d.resources?.length || 0,
      })));
      console.log('\n📈 Statistics:', getDemosStatistics());
    },
    reset: () => {
      clearDemosData();
      const result = initializeDemosData();
      console.log(result.message);
      window.demoDebug.view();
    }
  };

  console.log('🔧 Demo Debug Utilities loaded! Use window.demoDebug');
  console.log('   - demoDebug.view()  : View all demos');
  console.log('   - demoDebug.stats() : Get statistics');
  console.log('   - demoDebug.reset() : Reset to dummy data');
  console.log('   - demoDebug.clear() : Clear all demos');
}

export {};
