import { describe, it, expect, beforeEach, vi } from 'vitest';
import { needsDataInitialization } from './initializeAllData';

// Regresi untuk Bab 16.5 Tier 1: needsDataInitialization() dulunya throw
// tanpa try/catch kalau localStorage-nya korup (lihat commit 1cbc7ac4) --
// test ini memastikan itu tidak terulang.
describe('needsDataInitialization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('true kalau kedua key localStorage belum ada sama sekali', () => {
    expect(needsDataInitialization()).toBe(true);
  });

  it('true kalau salah satu key isinya JSON korup, TIDAK throw', () => {
    localStorage.setItem('sales_monitoring_demos', '{not valid json');
    localStorage.setItem('sales_monitoring_kpi_targets', JSON.stringify([{ id: '1' }]));

    expect(() => needsDataInitialization()).not.toThrow();
    expect(needsDataInitialization()).toBe(true);
  });

  it('true kalau salah satu key isinya array kosong', () => {
    localStorage.setItem('sales_monitoring_demos', JSON.stringify([]));
    localStorage.setItem('sales_monitoring_kpi_targets', JSON.stringify([{ id: '1' }]));

    expect(needsDataInitialization()).toBe(true);
  });

  it('false kalau kedua key ada dan tidak kosong', () => {
    localStorage.setItem('sales_monitoring_demos', JSON.stringify([{ id: '1' }]));
    localStorage.setItem('sales_monitoring_kpi_targets', JSON.stringify([{ id: '1' }]));

    expect(needsDataInitialization()).toBe(false);
  });
});
