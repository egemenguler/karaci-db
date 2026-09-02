"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase-client";

// Opsiyonel log alanları: derinlik, dalış tipi, nokta, not.
// Bunlar bilgisayardan/log defterinden gelir, giriş formunda sorulmaz —
// kişi dalıştan sonra kendisi doldurur.
export function DiveLogForm({
  diveId,
  maxDepth,
  diveType,
  site,
  notes,
}: {
  diveId: string;
  maxDepth: number | null;
  diveType: string | null;
  site: string | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [maxDepthValue, setMaxDepthValue] = useState(
    maxDepth !== null ? String(maxDepth) : "",
  );
  const [diveTypeValue, setDiveTypeValue] = useState(diveType ?? "");
  const [siteValue, setSiteValue] = useState(site ?? "");
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    let depth: number | null = null;
    if (maxDepthValue.trim() !== "") {
      depth = Number(maxDepthValue);
      if (!Number.isFinite(depth) || depth <= 0 || depth >= 200) {
        setError("Derinlik 0 ile 200 metre arasında olmalı.");
        return;
      }
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("dive")
      .update({
        max_depth: depth,
        dive_type: diveTypeValue.trim() === "" ? null : diveTypeValue.trim(),
        site: siteValue.trim() === "" ? null : siteValue.trim(),
        notes: notesValue.trim() === "" ? null : notesValue.trim(),
      })
      .eq("id", diveId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-sm font-medium text-muted-foreground">
        Log bilgileri <span className="text-muted-foreground/70">(opsiyonel)</span>
      </h2>

      <div className="space-y-2">
        <Label htmlFor="max-depth" className="text-base">
          Maks. derinlik
        </Label>
        {/* Birim input'un içinde ki alanın sağ kenarı aşağıdaki
            alanlarla hizalı kalsın. Bkz. PressureInput. */}
        <div className="relative">
          <Input
            id="max-depth"
            type="number"
            inputMode="decimal"
            min={0}
            max={200}
            step={0.1}
            value={maxDepthValue}
            onChange={(event) => {
              setSaved(false);
              setMaxDepthValue(event.target.value);
            }}
            className="h-12 pr-10 text-base md:text-base"
            autoComplete="off"
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
            m
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dive-type" className="text-base">
          Dalış tipi
        </Label>
        <Input
          id="dive-type"
          value={diveTypeValue}
          onChange={(event) => {
            setSaved(false);
            setDiveTypeValue(event.target.value);
          }}
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site" className="text-base">
          Nokta
        </Label>
        <Input
          id="site"
          value={siteValue}
          onChange={(event) => {
            setSaved(false);
            setSiteValue(event.target.value);
          }}
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-base">
          Not
        </Label>
        <Textarea
          id="notes"
          value={notesValue}
          onChange={(event) => {
            setSaved(false);
            setNotesValue(event.target.value);
          }}
          className="min-h-24 text-base md:text-base"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="h-12 flex-1 text-base">
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Kaydedildi</span>
        )}
      </div>
    </form>
  );
}

// Dalışı soft-delete ile siler (deleted_at = now()). İki aşamalı onay:
// yanlışlıkla dokunmaya karşı. --destructive rengi sadece burada kullanılıyor.
export function DeleteDiveButton({ diveId }: { diveId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("dive")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", diveId);

    if (deleteError) {
      setDeleting(false);
      setError(deleteError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-center">
        <p className="text-sm font-medium text-destructive">
          Bu dalış silinecek.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            disabled={deleting}
            onClick={() => setConfirming(false)}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-12 flex-1"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Siliniyor…" : "Sil"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      className="h-12 w-full text-base"
      onClick={() => setConfirming(true)}
    >
      Bu dalışı sil
    </Button>
  );
}
