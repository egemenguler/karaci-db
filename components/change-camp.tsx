"use client";

// "Kampı değiştir": bu cihazın hangi kampla çalıştığını seçtiren kutu.
//
// Seçim cihaza ait (localStorage, bkz. lib/selected-camp.ts), veritabanına
// değil. Değiştirilecek bir şey olması için en az iki kamp aktif olmalı —
// tek kamp aktifken bu bileşen hiç görünmüyor, ana ekranla aynı davranış.

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  read as readSelectedCamp,
  readOnServer as readSelectedCampOnServer,
  subscribe as subscribeSelectedCamp,
  write as writeSelectedCamp,
} from "@/lib/selected-camp";

type ActiveCamp = { id: string; name: string; year: number };

export function ChangeCamp({ camps }: { camps: ActiveCamp[] }) {
  const router = useRouter();
  const storedId = useSyncExternalStore(
    subscribeSelectedCamp,
    readSelectedCamp,
    readSelectedCampOnServer,
  );
  const [open, setOpen] = useState(false);

  // Tek kamp aktifse (ya da hiç yoksa) seçilecek bir şey yok.
  if (camps.length < 2) return null;

  const selected = camps.find((camp) => camp.id === storedId);

  function pick(campId: string) {
    writeSelectedCamp(campId);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bu cihaz:{" "}
          <span className="font-medium text-foreground">
            {selected ? `${selected.name} · ${selected.year}` : "seçilmedi"}
          </span>
        </p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Kampı değiştir
          </button>
        )}
      </div>

      {open && (
        <ul className="mt-3 space-y-2">
          {camps.map((camp) => (
            <li key={camp.id}>
              <button
                type="button"
                onClick={() => pick(camp.id)}
                aria-current={camp.id === storedId}
                className="w-full rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent aria-[current=true]:border-primary"
              >
                <span className="block font-semibold">{camp.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {camp.year}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
