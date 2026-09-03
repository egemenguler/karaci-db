"use client";

import Link from "next/link";
import type { Database } from "@/lib/database.types";
import {
  describeElapsed,
  diveBand,
  elapsedSeconds,
  elapsedUnitLabel,
  formatElapsed,
  formatTank,
} from "@/lib/dive";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

/** Suda kim var listesindeki tek kart. Sunucudan da outbox'tan da gelebilir. */
export type WaterCard = {
  key: string;
  diveId: string;
  memberName: string;
  entryTime: string;
  tankSize: number | null;
  tankMaterial: TankMaterial | null;
  twin: boolean | null;
  weight: number | null;
  startPressure: number | null;
  buddyName: string | null;
  leaderName: string | null;
  /** null ise sunucuda duruyor; doluysa kuyrukta bekliyor */
  pending: {
    kind: "entry" | "exit";
    status: "pending" | "error";
    /** çıkış kuyruktaysa sayaç bu saatte donar */
    exitTime?: string;
  } | null;
};

function PendingBadge({ pending }: { pending: NonNullable<WaterCard["pending"]> }) {
  const label =
    pending.status === "error"
      ? "Gönderilemedi"
      : pending.kind === "entry"
        ? "Gönderilmedi"
        : "Çıkış gönderilmedi";

  return (
    <Link
      href="/outbox"
      className="inline-block rounded-full border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}

export function ActiveDiveCard({ card, now }: { card: WaterCard; now: number }) {
  // Çıkış kuyrukta bekliyorsa süre artık akmıyor; girilen çıkış saatinde donar.
  const reference = card.pending?.exitTime
    ? new Date(card.pending.exitTime).getTime()
    : now;
  const seconds = elapsedSeconds(card.entryTime, reference);
  const band = diveBand(seconds);

  const body = (
    <>
      <div
        className={`flex w-28 shrink-0 flex-col items-center justify-center px-2 py-4 ${band.bg} ${band.text} ${card.pending ? "opacity-70" : ""}`}
      >
        <span
          className="text-2xl font-semibold tabular-nums"
          aria-label={describeElapsed(seconds)}
        >
          {formatElapsed(seconds)}
        </span>
        <span className="text-[11px] font-medium opacity-80">
          {elapsedUnitLabel(seconds)}
        </span>
      </div>

      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="truncate text-lg font-semibold">
            {card.memberName}
          </span>
        </div>

        <div className="mt-0.5 text-sm text-muted-foreground">
          {formatTank(card.tankSize, card.tankMaterial, card.twin)}
          {card.weight !== null && <> · {card.weight} kg</>}
          {card.startPressure !== null && <> · {card.startPressure} bar</>}
        </div>

        {/* Eş ve lider ayrı satırda: yan yana yazınca uzun isimlerde
            satır ortada kırılıyor ve lider tek başına aşağı düşüyordu. */}
        {card.buddyName && (
          <div className="mt-1.5 truncate text-sm text-muted-foreground">
            Eş: {card.buddyName}
          </div>
        )}
        {card.leaderName && (
          <div className="mt-0.5 truncate text-sm text-muted-foreground">
            Lider: {card.leaderName}
          </div>
        )}

        {card.pending && (
          <div className="mt-1.5">
            <PendingBadge pending={card.pending} />
          </div>
        )}
      </div>
    </>
  );

  // Kuyruktaki kayıt sunucuda yok; kapatma sayfasına gidilemez.
  if (card.pending) {
    return (
      <div className="flex items-stretch overflow-hidden rounded-xl border border-dashed bg-card">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/dives/${card.diveId}/exit`}
      className="flex items-stretch overflow-hidden rounded-xl border bg-card transition-colors hover:bg-accent active:bg-accent"
    >
      {body}
    </Link>
  );
}
