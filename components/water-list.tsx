"use client";

import { useEffect, useState } from "react";
import { ActiveDiveCard, type WaterCard } from "./active-dive-card";
import type { Database } from "@/lib/database.types";
import { getAll, subscribe, type OutboxItem } from "@/lib/outbox";

type ActiveDive = Database["public"]["Views"]["active_dive"]["Row"];

/**
 * Sunucudaki açık dalışlar ile kuyrukta bekleyenleri birleştirir.
 *
 * Bu olmazsa: karacı çevrimdışıyken dalışı girer, listede göremez,
 * ikinci kez girer.
 */
function mergeCards(dives: ActiveDive[], queue: OutboxItem[]): WaterCard[] {
  const pendingExitByDive = new Map<string, OutboxItem>();
  for (const item of queue) {
    if (item.kind === "dive_exit") pendingExitByDive.set(item.diveId, item);
  }

  const fromServer: WaterCard[] = dives.map((dive) => {
    const pendingExit = dive.id ? pendingExitByDive.get(dive.id) : undefined;

    return {
      key: dive.id ?? crypto.randomUUID(),
      diveId: dive.id ?? "",
      memberName: dive.member_name ?? "—",
      entryTime: dive.entry_time ?? new Date(0).toISOString(),
      tankSize: dive.tank_size,
      tankMaterial: dive.tank_material,
      twin: dive.twin,
      weight: dive.weight,
      startPressure: dive.start_pressure,
      buddyName: dive.buddy_name,
      leaderName: dive.leader_name,
      pending:
        pendingExit && pendingExit.kind === "dive_exit"
          ? {
              kind: "exit",
              status: pendingExit.status,
              exitTime: pendingExit.payload.exit_time,
            }
          : null,
    };
  });

  // Sunucuda görünen bir dalışı kuyruktan da çizmeyelim: gönderim başarılı
  // olup kayıt kuyruktan silinene kadar kısa bir an ikisi birden duruyor.
  const serverIds = new Set(dives.map((dive) => dive.id));

  const fromQueue: WaterCard[] = queue
    .filter((item) => item.kind === "dive_entry" && !serverIds.has(item.diveId))
    .map((item) => {
      const entry = item as Extract<OutboxItem, { kind: "dive_entry" }>;
      return {
        key: entry.key,
        diveId: entry.diveId,
        memberName: entry.display.memberName,
        entryTime: entry.payload.entry_time,
        tankSize: entry.payload.tank_size,
        tankMaterial: entry.payload.tank_material,
        twin: entry.payload.twin ?? false,
        weight: entry.payload.weight,
        startPressure: entry.payload.start_pressure,
        buddyName: entry.display.buddyName,
        leaderName: entry.display.leaderName,
        pending: { kind: "entry" as const, status: entry.status },
      };
    });

  return [...fromServer, ...fromQueue].sort(
    (a, b) =>
      new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime(),
  );
}

export function WaterList({
  dives,
  serverNow,
}: {
  dives: ActiveDive[];
  serverNow: number;
}) {
  // İlk render sunucununkiyle aynı olsun diye serverNow ile başlıyoruz;
  // aksi halde hydration uyuşmazlığı çıkar. Mount'tan sonra gerçek
  // tarayıcı saatine geçip saniyede bir tazeliyoruz.
  const [now, setNow] = useState(serverNow);
  const [queue, setQueue] = useState<OutboxItem[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const items = await getAll();
      if (alive) setQueue(items);
    };
    load();
    const unsubscribe = subscribe(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const cards = mergeCards(dives, queue);

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="font-medium">Suda kimse yok</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Dalış başladıkça burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <ActiveDiveCard key={card.key} card={card} now={now} />
      ))}
    </div>
  );
}
