"use client";

// Hava tüketim grafiği: bar/dk her zaman çizilir. sac_rate sadece
// derinlik girilmiş dalışlarda dolu geliyor (bkz. dive_detail view),
// o yüzden ikinci seri yalnızca en az bir dalışta varsa eklenir.

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Database } from "@/lib/database.types";

type DiveDetail = Database["public"]["Views"]["dive_detail"]["Row"];

// x ekseni için kısa tarih: "26 Ağu"
function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function ConsumptionChart({ dives }: { dives: DiveDetail[] }) {
  if (dives.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Grafik için en az iki kapalı dalış gerekiyor.
      </p>
    );
  }

  // dives entry_time azalan sırayla geliyor (en yeni önce); grafikte
  // soldan sağa kronolojik akış için ters çeviriyoruz.
  const chronological = [...dives].reverse();

  const data = chronological
    .filter((d) => d.entry_time !== null && d.bar_per_min !== null)
    .map((d) => ({
      date: formatShortDate(d.entry_time!),
      barPerMin: round1(d.bar_per_min!),
      sacRate: d.sac_rate !== null ? round1(d.sac_rate) : null,
    }));

  const hasSac = data.some((d) => d.sacRate !== null);

  return (
    <div className="space-y-2">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={40} />
            <Tooltip />
            {hasSac && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Line
              type="monotone"
              dataKey="barPerMin"
              name="bar/dk"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
            {hasSac && (
              <Line
                type="monotone"
                dataKey="sacRate"
                name="SAC (L/dk)"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!hasSac && (
        <p className="text-xs text-muted-foreground">
          SAC için derinlik girilmiş dalış gerekiyor.
        </p>
      )}
    </div>
  );
}
