"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase-client";

type CampValues = {
  id: string;
  name: string;
  year: number;
  starts_on: string | null;
  ends_on: string | null;
};

// Yeni kamp ve kamp düzenleme aynı form. camp verilirse düzenleme.
export function CampForm({
  camp,
  defaultYear,
}: {
  camp?: CampValues;
  defaultYear: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(camp?.name ?? "");
  const [year, setYear] = useState(String(camp?.year ?? defaultYear));
  const [startsOn, setStartsOn] = useState(camp?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(camp?.ends_on ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim() === "") {
      setError("Kamp adı gerekli.");
      return;
    }
    const numericYear = Number(year);
    if (!Number.isInteger(numericYear) || numericYear < 1985 || numericYear > 2100) {
      setError("Yıl 1985 ile 2100 arasında olmalı.");
      return;
    }
    if (startsOn !== "" && endsOn !== "" && endsOn < startsOn) {
      setError("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }

    setSaving(true);

    const values = {
      name: name.trim(),
      year: numericYear,
      starts_on: startsOn === "" ? null : startsOn,
      ends_on: endsOn === "" ? null : endsOn,
    };

    const { error: writeError } = camp
      ? await supabase.from("camp").update(values).eq("id", camp.id)
      : await supabase.from("camp").insert(values);

    if (writeError) {
      setSaving(false);
      setError(writeError.message);
      return;
    }

    router.push("/camps");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="camp-name" className="text-base">
          Kamp adı
        </Label>
        <Input
          id="camp-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 text-base md:text-base"
          autoComplete="off"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="camp-year" className="text-base">
          Yıl
        </Label>
        <Input
          id="camp-year"
          type="number"
          inputMode="numeric"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="starts-on" className="text-base">
            Başlangıç
          </Label>
          <Input
            id="starts-on"
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            className="h-12 text-base md:text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends-on" className="text-base">
            Bitiş
          </Label>
          <Input
            id="ends-on"
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            className="h-12 text-base md:text-base"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving} className="h-12 w-full text-base">
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
