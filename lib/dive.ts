// Dalış gösterimi için saf yardımcılar. Veritabanına dokunmaz.

import type { Database } from "./database.types";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

/** entry_time'dan bu yana geçen saniye. Negatifse (saat ileri girilmişse) 0. */
export function elapsedSeconds(entryTime: string, now: number): number {
  const seconds = Math.floor((now - new Date(entryTime).getTime()) / 1000);
  return seconds > 0 ? seconds : 0;
}

/** 38:24 · bir saati geçince 1:02:15 */
export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** formatElapsed çıktısının altına yazılan birim etiketi. */
export function elapsedUnitLabel(totalSeconds: number): string {
  return totalSeconds >= 3600 ? "sa:dk:sn" : "dk:sn";
}

/** Ekran okuyucu için: "38 dakika 24 saniye" */
export function describeElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} saat`);
  parts.push(`${minutes} dakika`, `${seconds} saniye`);
  return parts.join(" ");
}

// Suda geçen süre arttıkça mavi koyulaşır. Uyarı değil, göz taraması
// kolaylığı. Yazı rengi her bant için elle seçildi: açık zeminde koyu,
// koyu zeminde açık.
const DIVE_BANDS = [
  { untilMinutes: 16, bg: "bg-dive-fresh", text: "text-brand-950" },
  { untilMinutes: 28, bg: "bg-dive-mid", text: "text-brand-950" },
  { untilMinutes: 40, bg: "bg-dive-long", text: "text-brand-50" },
  { untilMinutes: Infinity, bg: "bg-dive-deep", text: "text-brand-50" },
];

export function diveBand(totalSeconds: number) {
  const minutes = totalSeconds / 60;
  return DIVE_BANDS.find((band) => minutes < band.untilMinutes)!;
}

const MATERIAL_LABEL: Record<TankMaterial, string> = {
  aluminum: "alüminyum",
  steel: "çelik",
};

/** "12 L çelik" · twin ise "2×12 L çelik" */
export function formatTank(
  size: number | null,
  material: TankMaterial | null,
  twin: boolean | null,
): string {
  if (size === null) return "—";
  const prefix = twin ? "2×" : "";
  const label = material ? ` ${MATERIAL_LABEL[material]}` : "";
  return `${prefix}${size} L${label}`;
}

/**
 * Dakika cinsinden dalış süresi → "1 sa 35 dk" · bir saatin altında "42 dk"
 *
 * Yukarıdaki elapsed* yardımcıları saniye bazlı ve suda kim var
 * sayacı içindir; bu ise kapanmış bir dalışın (ya da toplamın) süresi.
 */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} sa ${rest} dk` : `${rest} dk`;
}
