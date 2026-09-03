"use client";

// Ağırlık trendi: her kapalı dalışta girilen ağırlık, zamana yayılmış.

import {
  CartesianGrid,
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

export function WeightChart({ dives }: { dives: DiveDetail[] }) {
  if (dives.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Grafik için en az iki dalış gerekiyor.
      </p>
    );
  }

  // dives entry_time azalan sırayla geliyor (en yeni önce); grafikte
  // soldan sağa kronolojik akış için ters çeviriyoruz.
  const chronological = [...dives].reverse();

  const data = chronological
    .filter((d) => d.entry_time !== null && d.weight !== null)
    .map((d) => ({
      date: formatShortDate(d.entry_time!),
      weight: d.weight!,
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={40} unit=" kg" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="weight"
            name="Ağırlık (kg)"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
