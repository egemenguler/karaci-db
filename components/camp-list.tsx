"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-client";
import { formatDayRange } from "@/lib/time";

type Camp = {
  id: string;
  name: string;
  year: number;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

export function CampList({ camps }: { camps: Camp[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Aynı anda birden fazla kamp aktif olabiliyor (nadir ama oluyor),
  // dolayısıyla aktiflik kamp başına bir anahtar: tek update, dokunulan
  // kamptan başkası etkilenmiyor.
  //
  // Eskiden şemadaki tekil indeks yüzünden "hepsini kapat, sonra birini
  // aç" gerekiyordu; ikinci update hata verirse hiç aktif kamp kalmıyor
  // ve ana ekran "aktif kamp yok" diyordu. O yarış bu modelde yok.
  async function setActive(id: string, isActive: boolean) {
    setError(null);
    setBusyId(id);

    const { error: writeError } = await supabase
      .from("camp")
      .update({ is_active: isActive })
      .eq("id", id);

    setBusyId(null);

    if (writeError) {
      setError(writeError.message);
      return;
    }

    router.refresh();
  }

  if (camps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="font-medium">Henüz kamp yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          {error}
        </p>
      )}

      <ul className="divide-y rounded-xl border">
        {camps.map((camp) => (
          <li key={camp.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/camps/${camp.id}`}
                  className="truncate font-medium underline-offset-4 hover:underline"
                >
                  {camp.name}
                </Link>
                {camp.is_active && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Aktif
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {camp.year}
                {formatDayRange(camp.starts_on, camp.ends_on) &&
                  ` · ${formatDayRange(camp.starts_on, camp.ends_on)}`}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={busyId !== null}
              onClick={() => setActive(camp.id, !camp.is_active)}
            >
              {busyId === camp.id
                ? "…"
                : camp.is_active
                  ? "Bitir"
                  : "Aktif yap"}
            </Button>

            <Link
              href={`/camps/${camp.id}/edit`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Düzenle
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
