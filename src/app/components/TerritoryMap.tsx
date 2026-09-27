import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Users, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import type { TerritoryWithPerformance } from '@/types/territory';

interface TerritoryMapProps {
  territories: TerritoryWithPerformance[];
  onSelectTerritory: (territory: TerritoryWithPerformance) => void;
}

// Bab 59 (27 Sep 2026): peta ini sebelumnya SVG "Pulau Jawa" gambar
// tangan (bentuk blob, bukan geografi asli) dengan posisi pin dalam
// persentase piksel yang di-hardcode cuma untuk 4 nama wilayah seed --
// wilayah lain (termasuk yang dibuat lewat "Add New Territory") tidak
// pernah dapat pin sama sekali. Diganti jadi peta nyata (Leaflet + tile
// OpenStreetMap), pola yang sama dengan DistributorStoreMap.tsx yang
// sudah dipakai di menu lain.
//
// Territory (prisma/schema.prisma) tidak punya kolom lat/lng sendiri --
// cuma name & region (teks bebas). Posisi di-resolve dari tabel nama
// kota di bawah ini; kalau nama wilayah tidak dikenali, fallback ke
// titik tengah region/provinsi-nya (REGION_COORDS) supaya wilayah baru
// tetap muncul di peta alih-alih hilang begitu saja.
const CITY_COORDS: Record<string, [number, number]> = {
  'jakarta pusat': [-6.1805, 106.8284],
  'jakarta selatan': [-6.2615, 106.8106],
  'jakarta utara': [-6.1194, 106.8656],
  'jakarta barat': [-6.1352, 106.7658],
  'jakarta timur': [-6.225, 106.9004],
  bandung: [-6.9175, 107.6191],
  bekasi: [-6.2383, 106.9756],
  bogor: [-6.5971, 106.806],
  depok: [-6.4025, 106.7942],
  tangerang: [-6.1783, 106.6319],
  'tangerang selatan': [-6.2884, 106.718],
  cirebon: [-6.7063, 108.5571],
  sukabumi: [-6.9277, 106.93],
  tasikmalaya: [-7.3274, 108.2207],
  surabaya: [-7.2575, 112.7521],
  malang: [-7.9666, 112.6326],
  kediri: [-7.848, 112.0178],
  sidoarjo: [-7.4478, 112.7183],
  jember: [-8.1723, 113.7002],
  semarang: [-6.9932, 110.4203],
  solo: [-7.5755, 110.8243],
  surakarta: [-7.5755, 110.8243],
  yogyakarta: [-7.7956, 110.3695],
  tegal: [-6.8694, 109.1402],
  magelang: [-7.4706, 110.2177],
};

const REGION_COORDS: Record<string, [number, number]> = {
  'dki jakarta': [-6.2088, 106.8456],
  'jawa barat': [-6.9175, 107.6191],
  'jawa timur': [-7.2575, 112.7521],
  'jawa tengah': [-6.9932, 110.4203],
  banten: [-6.4058, 106.064],
  yogyakarta: [-7.7956, 110.3695],
  'di yogyakarta': [-7.7956, 110.3695],
};

function resolveCoords(t: Pick<TerritoryWithPerformance, 'name' | 'region'>): [number, number] | null {
  const byName = CITY_COORDS[t.name.trim().toLowerCase()];
  if (byName) return byName;
  const byRegion = REGION_COORDS[t.region.trim().toLowerCase()];
  if (byRegion) return byRegion;
  return null;
}

function pinColor(achievement: number): string {
  return achievement >= 100 ? '#10b981' : '#013E37';
}

function pinIcon(color: string): L.DivIcon {
  const size = 28;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

type PlottedTerritory = { territory: TerritoryWithPerformance; coords: [number, number] };

function TerritoryMarker({
  entry,
  onSelectTerritory,
}: {
  entry: PlottedTerritory;
  onSelectTerritory: (territory: TerritoryWithPerformance) => void;
}) {
  const { territory: t, coords } = entry;
  return (
    <Marker position={coords} icon={pinIcon(pinColor(t.achievement))}>
      <Popup>
        <div className="space-y-2 min-w-[200px]">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t.region}</p>
              <p className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{t.name}</p>
            </div>
            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap ${t.achievement >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900 text-white'}`}>
              {t.achievement.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-gray-400 uppercase">Revenue</span>
              <span className="text-[#013E37]">{formatCurrency(t.revenue)}</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${t.achievement >= 100 ? 'bg-emerald-500' : 'bg-[#013E37]'}`}
                style={{ width: `${Math.min(t.achievement, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
            <Users className="h-3 w-3 text-gray-400" />
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-tight">{t.assignedTo || 'Belum ditugaskan'}</span>
          </div>

          <Button
            size="sm"
            className="w-full h-7 text-[10px] font-black uppercase tracking-widest bg-[#013E37] hover:bg-[#028076] text-white"
            onClick={() => onSelectTerritory(t)}
          >
            Lihat Detail
          </Button>
        </div>
      </Popup>
    </Marker>
  );
}

export function TerritoryMap({ territories, onSelectTerritory }: TerritoryMapProps) {
  const plotted = useMemo<PlottedTerritory[]>(
    () =>
      territories
        .map((territory) => ({ territory, coords: resolveCoords(territory) }))
        .filter((p): p is PlottedTerritory => p.coords !== null),
    [territories]
  );
  const unplottedCount = territories.length - plotted.length;
  const bounds = useMemo<[number, number][]>(() => plotted.map((p) => p.coords), [plotted]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-gray-100 shadow-inner">
      {plotted.length === 0 ? (
        <div className="h-full w-full flex items-center justify-center text-sm text-gray-400 bg-gray-50 text-center px-6">
          Belum ada wilayah dengan lokasi yang bisa dipetakan.
        </div>
      ) : plotted.length === 1 ? (
        <MapContainer center={plotted[0].coords} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TerritoryMarker entry={plotted[0]} onSelectTerritory={onSelectTerritory} />
        </MapContainer>
      ) : (
        <MapContainer bounds={bounds} boundsOptions={{ padding: [40, 40] }} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {plotted.map((entry) => (
            <TerritoryMarker key={entry.territory.id} entry={entry} onSelectTerritory={onSelectTerritory} />
          ))}
        </MapContainer>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-sm flex flex-col gap-3 pointer-events-none">
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
      <div className="absolute top-6 right-6 z-[1000] bg-black/5 backdrop-blur-sm px-4 py-2 rounded-full border border-black/5 flex items-center gap-2 pointer-events-none">
        <Info className="h-3 w-3 text-gray-500" />
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Klik pin untuk melihat insight</span>
      </div>

      {unplottedCount > 0 && (
        <div className="absolute top-6 left-6 z-[1000] bg-amber-50/90 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-200 flex items-center gap-2">
          <MapPin className="h-3 w-3 text-amber-600" />
          <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
            {unplottedCount} wilayah belum punya lokasi peta
          </span>
        </div>
      )}
    </div>
  );
}
