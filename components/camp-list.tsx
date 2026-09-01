"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-client";

type Camp = {
  id: string;
  name: string;
  year: number;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

function formatRange(startsOn: string | null, endsOn: string | null): string {
  if (!startsOn && !endsOn) return "";
  const format = (value: string) =>
    new Date(value).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  if (startsOn && endsOn) return `${format(startsOn)} – ${format(endsOn)}`;
  return format((startsOn ?? endsOn)!);
}

export function CampList({ camps }: { camps: Camp[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // camp_single_active tekil indeksi tek aktif kampa izin veriyor,
  // bu yüzden önce eskisi kapatılıp sonra yenisi açılıyor.
  async function activate(id: string) {
    setError(null);
    setBusyId(id);

    const { error: clearError } = await supabase
      .from("camp")
      .update({ is_active: false })
      .eq("is_active", true)
      .is("deleted_at", null);

    if (clearError) {
      setBusyId(null);
      setError(clearError.message);
      return;
    }

    const { error: setError_ } = await supabase
      .from("camp")
      .update({ is_active: true })
      .eq("id", id);

    setBusyId(null);

    if (setError_) {
      setError(setError_.message);
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
                {formatRange(camp.starts_on, camp.ends_on) &&
                  ` · ${formatRange(camp.starts_on, camp.ends_on)}`}
              </div>
            </div>

            {!camp.is_active && (
              <Button
                variant="outline"
                size="sm"
                disabled={busyId !== null}
                onClick={() => activate(camp.id)}
              >
                {busyId === camp.id ? "…" : "Aktif yap"}
              </Button>
            )}

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
