import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getKPITargets, saveKPITargets } from './kpiPersistence';

// Regresi untuk pola guard JSON.parse(localStorage) yang diaudit di Bab
// 16.5 Tier 1 -- getKPITargets() sudah benar sebelumnya (sudah
// try/catch), test ini mengunci perilakunya supaya tidak regresi kalau
// file ini disentuh lagi nanti.
describe('getKPITargets', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('kembalikan array kosong (bukan throw) kalau data di localStorage korup', () => {
    localStorage.setItem('sales_monitoring_kpi_targets', '{not valid json');

    expect(() => getKPITargets()).not.toThrow();
    expect(getKPITargets()).toEqual([]);
  });

  it('kembalikan data yang sudah tersimpan apa adanya kalau valid', () => {
    const targets = [{ id: 'kpi-1', managerId: 'm1' }] as any;
    saveKPITargets(targets);

    expect(getKPITargets()).toEqual(targets);
  });

  it('generate data awal (array, tidak throw) kalau localStorage kosong sama sekali', () => {
    expect(() => getKPITargets()).not.toThrow();
    expect(Array.isArray(getKPITargets())).toBe(true);
  });
});
