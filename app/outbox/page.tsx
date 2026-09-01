"use client";

// Bekleyen kayıtlar. Düzenleme yok — sadece tekrar dene ve sil.
// Silmeden önce kaydın içeriği gösteriliyor.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTank } from "@/lib/dive";
import { getAll, remove, retry, subscribe, type OutboxItem } from "@/lib/outbox";
import { formatDateTime } from "@/lib/time";

function describe(item: OutboxItem): { title: string; lines: string[] } {
  if (item.kind === "dive_entry") {
    const lines = [
      `Giriş ${formatDateTime(item.payload.entry_time)}`,
      `${formatTank(item.payload.tank_size, item.payload.tank_material, item.payload.twin ?? false)} · ${item.payload.weight} kg · ${item.payload.start_pressure} bar`,
    ];
    if (item.display.buddyName) lines.push(`Eş: ${item.display.buddyName}`);
    if (item.display.leaderName) lines.push(`Lider: ${item.display.leaderName}`);
    return { title: `${item.display.memberName} — dalış başlat`, lines };
  }

  return {
    title: `${item.display.memberName} — dalış kapat`,
    lines: [
      `Çıkış ${formatDateTime(item.payload.exit_time)}`,
      `${item.payload.end_pressure} bar`,
    ],
  };
}

export default function OutboxPage() {
  const [queue, setQueue] = useState<OutboxItem[]>([]);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bekleyen kayıtlar
        </h1>
        <p className="text-sm text-muted-foreground">
          Gönderilemeyen dalış kayıtları burada bekler. Bağlantı gelince
          kendiliğinden gönderilir.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Bekleyen kayıt yok</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Her şey gönderildi.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {queue.map((item) => {
            const { title, lines } = describe(item);
            const confirming = confirmKey === item.key;

            return (
              <li key={item.key} className="rounded-xl border px-4 py-3">
                <div className="font-medium">{title}</div>
                {lines.map((line) => (
                  <div key={line} className="text-sm text-muted-foreground">
                    {line}
                  </div>
                ))}

                {item.status === "error" && item.error && (
                  <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                    {item.error}
                  </p>
                )}

                {confirming ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">
                      Bu kayıt silinecek ve gönderilmeyecek.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmKey(null)}
                      >
                        Vazgeç
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await remove(item.key);
                          setConfirmKey(null);
                        }}
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {item.status === "error" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retry(item.key)}
                      >
                        Tekrar dene
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmKey(item.key)}
                    >
                      Sil
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Ana ekrana dön
      </Link>
    </div>
  );
}
