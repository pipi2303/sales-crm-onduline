/**
 * Initialize All Dummy Data
 * Centralized function to initialize all dummy data across the application
 */

import { initializeDemosData } from './initializeDemos';
import { getKPITargets } from './kpiPersistence';
import { populateCRMToLocalStorage } from './populateCRMData';

export { populateCRMToLocalStorage };

/**
 * Initialize all application data
 * Call this on app startup to ensure all dummy data is loaded
 */
export function initializeAllData(): {
  success: boolean;
  message: string;
  details: {
    demos: { success: boolean; count: number };
    kpis: { success: boolean; count: number };
    crm: { success: boolean; data?: any };
  };
} {
  try {
    console.log('🚀 Initializing all application data...');
    
    // Initialize Demos
    const demosResult = initializeDemosData();

    // Initialize KPIs
    const kpiTargets = getKPITargets();
    const kpiResult = { success: kpiTargets.length > 0, count: kpiTargets.length };

    // Initialize CRM (Employees, Clients, Partners)
    // Only initialize if data doesn't exist to avoid overwriting user changes on refresh
    let crmResult = { success: true };
    const hasEmployees = localStorage.getItem('sales_monitoring_employees');
    if (!hasEmployees || JSON.parse(hasEmployees).length === 0) {
      const result = populateCRMToLocalStorage();
      crmResult = { success: result.success, data: result.data };
    }
    
    console.log('✅ All data initialized successfully');
    
    return {
      success: true,
      message: 'All application data initialized successfully',
      details: {
        demos: {
          success: demosResult.success,
          count: demosResult.count,
        },
        kpis: {
          success: kpiResult.success,
          count: kpiResult.count,
        },
        crm: crmResult
      },
    };
  } catch (error) {
    console.error('❌ Error initializing application data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize data',
      details: {
        demos: { success: false, count: 0 },
        kpis: { success: false, count: 0 },
        crm: { success: false }
      },
    };
  }
}

/**
 * Check if data initialization is needed
 */
export function needsDataInitialization(): boolean {
  const demosData = localStorage.getItem('sales_monitoring_demos');
  const kpiData = localStorage.getItem('sales_monitoring_kpi_targets');

  // If any data is missing, we need initialization. Corrupted JSON in
  // either key is treated the same as missing data (needs re-init),
  // instead of throwing uncaught.
  try {
    return (
      !demosData ||
      JSON.parse(demosData).length === 0 ||
      !kpiData ||
      JSON.parse(kpiData).length === 0
    );
  } catch (error) {
    console.error('Failed to parse stored demos/KPI data:', error);
    return true;
  }
}
