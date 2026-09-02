"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase-client";

// Numara veritabanında kulübün yayımladığı düz haliyle duruyor; "SAT-"
// öneki sadece ekranda ekleniyor (bkz. lib/member.ts). Kullanıcı öneki
// de yazarsa atıyoruz, yoksa listede "SAT-SAT-1105" görünürdü.
function normalizeSatNo(value: string): string {
  return value.trim().replace(/^sat[\s-]*/i, "");
}

export function MemberForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [satNo, setSatNo] = useState("");
  const [joinedYear, setJoinedYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim() === "") {
      setError("İsim gerekli.");
      return;
    }

    let year: number | null = null;
    if (joinedYear.trim() !== "") {
      year = Number(joinedYear);
      if (!Number.isInteger(year) || year < 1985 || year > 2100) {
        setError("Katılım yılı 1985 ile 2100 arasında olmalı.");
        return;
      }
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("member").insert({
      name: name.trim(),
      sat_no: normalizeSatNo(satNo) === "" ? null : normalizeSatNo(satNo),
      joined_year: year,
    });

    if (insertError) {
      setSaving(false);
      // sat_no üzerinde tekil indeks var
      setError(
        insertError.code === "23505"
          ? "Bu SAT no zaten kayıtlı."
          : insertError.message,
      );
      return;
    }

    router.push("/members");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base">
          İsim
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 text-base md:text-base"
          autoComplete="off"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sat-no" className="text-base">
          SAT no <span className="text-muted-foreground">(opsiyonel)</span>
        </Label>
        <Input
          id="sat-no"
          value={satNo}
          onChange={(event) => setSatNo(event.target.value)}
          placeholder="1105"
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          Sadece numara; ekranda &quot;SAT-&quot; öneki kendiliğinden eklenir.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="joined-year" className="text-base">
          Katılım yılı <span className="text-muted-foreground">(opsiyonel)</span>
        </Label>
        <Input
          id="joined-year"
          type="number"
          inputMode="numeric"
          value={joinedYear}
          onChange={(event) => setJoinedYear(event.target.value)}
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
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
