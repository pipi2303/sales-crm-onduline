"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

// Bab 55 (26 Sep 2026): komponen KPI/info card bersama, diekstrak dari
// desain asli CustomReportBuilder.tsx ("Total Laporan/Terjadwal/Penerima/
// Exported") yang diminta user untuk diseragamkan ke seluruh menu app.
// Sebelumnya setiap menu punya card statistik dengan bentuk sendiri-sendiri
// (icon bulat gradient + baris horizontal, icon kotak kanan + label kiri,
// CardHeader polos, dst) -- lihat MEMORY.md Bab 55 untuk daftar lengkap.
export interface StatCardData {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  /** Tailwind text-color class untuk icon & ghost background, mis. 'text-blue-600' */
  color: string;
  /** Tailwind bg-color class untuk badge icon kecil, mis. 'bg-blue-50' */
  bg: string;
}

interface StatCardProps {
  stat: StatCardData;
  /** Index dalam grid, dipakai untuk stagger delay animasi masuk */
  index?: number;
  /** Konten tambahan opsional di bawah caption, mis. baris delta naik/turun */
  children?: React.ReactNode;
}

export function StatCard({ stat, index = 0, children }: StatCardProps) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-none shadow-sm hover:shadow-md transition-all bg-white group overflow-hidden relative">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform ${stat.color}`}>
          <Icon size={64} />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            {stat.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-gray-900">{stat.value}</div>
          {stat.sub && (
            <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-tighter">{stat.sub}</p>
          )}
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
