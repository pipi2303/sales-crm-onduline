import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, Target, TrendingUp, Info } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import type { TerritoryWithPerformance } from '@/types/territory';

interface TerritoryMapProps {
  territories: TerritoryWithPerformance[];
  onSelectTerritory: (territory: TerritoryWithPerformance) => void;
}

export function TerritoryMap({ territories, onSelectTerritory }: TerritoryMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Approximate coordinates for stylized map (Java Island).
  //
  // Bab 32/33 (24 Sep 2026, deep review + smoke test grup Produk &
  // Wilayah): these points used to carry hardcoded ids '1'-'4' and were
  // matched against real Territory records by `t.id === id` -- since
  // Territory.id is a Prisma-generated UUID, that comparison could never
  // be true, so NO pin ever rendered for ANY territory (live-verified: the
  // map showed its background + legend but zero pins). Matched by `name`
  // instead, since the 4 territories this stylized map was drawn for are
  // known, stable seed names (see TerritoryManagement.tsx's
  // SEED_TERRITORIES / prisma/seed.ts's seedTerritories()). This is still
  // a fixed 4-city stylized map, not real GIS data -- a territory with a
  // different name (added later via "Add New Territory") simply has no
  // coordinate here and won't get a pin, same known limitation already
  // documented for the CRM Management "Coverage Gap Wilayah" panel.
  const mapPoints = [
    { name: 'Jakarta Pusat', x: 200, y: 150 },
    { name: 'Jakarta Selatan', x: 220, y: 180 },
    { name: 'Bandung', x: 280, y: 220 },
    { name: 'Surabaya', x: 750, y: 280 },
  ];

  const getTerritoryData = (name: string) => territories.find(t => t.name === name);

  return (
    <div className="relative w-full h-[500px] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
      {/* Map Background (Stylized Java) */}
      <svg viewBox="0 0 1000 400" className="w-full h-full opacity-20 pointer-events-none">
        <path 
          d="M50,150 Q150,120 300,180 T600,250 T950,300 L950,350 Q600,320 300,300 T50,250 Z" 
          fill="#013E37" 
          stroke="#013E37" 
          strokeWidth="2"
        />
        {/* Decorative Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-gray-300" />
      </svg>

      {/* Interactive Points */}
      {mapPoints.map((point) => {
        const data = getTerritoryData(point.name);
        if (!data) return null;

        const isHovered = hoveredId === data.id;
        const colorClass = data.achievement >= 100 ? 'text-emerald-500' : 'text-[#013E37]';

        return (
          <div 
            key={data.id}
            className="absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: `${(point.x / 1000) * 100}%`, top: `${(point.y / 400) * 100}%` }}
            onMouseEnter={() => setHoveredId(data.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectTerritory(data)}
          >
            {/* Achievement Ring */}
            <div className="relative">
              <motion.div 
                className={`absolute inset-0 rounded-full border-2 border-current opacity-20 ${colorClass}`}
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className={`relative h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center border-2 transition-transform group-hover:scale-110 ${data.achievement >= 100 ? 'border-emerald-500' : 'border-[#013E37]'}`}>
                <MapPin className={`h-5 w-5 ${colorClass}`} />
              </div>

              {/* Tooltip Popup */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 w-64 pointer-events-none"
                  >
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{data.region}</p>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{data.name}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase ${data.achievement >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900 text-white'}`}>
                          {data.achievement.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-gray-400 uppercase">Revenue</span>
                          <span className="text-[#013E37]">{formatCurrency(data.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${data.achievement >= 100 ? 'bg-emerald-500' : 'bg-[#013E37]'}`} 
                            style={{ width: `${Math.min(data.achievement, 100)}%` }} 
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-tight">{data.assignedTo}</span>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-sm flex flex-col gap-3">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 border-b pb-1">Map Indicators</p>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">On Target ({'>'}100%)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[#013E37] shadow-sm shadow-emerald-200" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Below Target</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-6 right-6 bg-black/5 backdrop-blur-sm px-4 py-2 rounded-full border border-black/5 flex items-center gap-2">
        <Info className="h-3 w-3 text-gray-500" />
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Hover pins to view insights</span>
      </div>
    </div>
  );
}
