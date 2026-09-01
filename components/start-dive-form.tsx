"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MemberSearch, type MemberOption } from "@/components/member-search";
import { PressureInput } from "@/components/pressure-input";
import { TankPicker } from "@/components/tank-picker";
import { TimeInput } from "@/components/time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";
import { enqueue, flush } from "@/lib/outbox";
import { supabase } from "@/lib/supabase-client";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/time";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

export function StartDiveForm({
  campId,
  members,
  openDiveByMember,
  serverNow,
}: {
  campId: string;
  members: MemberOption[];
  /** üye id → o üyenin açık dalışının id'si */
  openDiveByMember: Record<string, string>;
  serverNow: number;
}) {
  const router = useRouter();

  const [member, setMember] = useState<MemberOption | null>(null);
  const [buddy, setBuddy] = useState<MemberOption | null>(null);
  const [leader, setLeader] = useState<MemberOption | null>(null);

  // Yeni üyede geçmiş yok; kulüpte en yaygın kurulum burada varsayılan.
  const [size, setSize] = useState("12");
  const [material, setMaterial] = useState<TankMaterial>("steel");

  const [weight, setWeight] = useState("");
  const [startPressure, setStartPressure] = useState("");
  const [entryTime, setEntryTime] = useState(() =>
    toDateTimeLocalValue(new Date(serverNow)),
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Kişinin aynı tüp kurulumuyla yaptığı son dalışın ağırlığı.
  async function fillSuggestedWeight(
    memberId: string,
    nextMaterial: TankMaterial,
    nextSize: string,
  ) {
    const numericSize = Number(nextSize);
    if (!Number.isFinite(numericSize) || numericSize <= 0) return;

    const { data } = await supabase.rpc("suggested_weight", {
      p_member_id: memberId,
      p_tank_material: nextMaterial,
      p_tank_size: numericSize,
      p_twin: false,
    });

    setWeight(data === null || data === undefined ? "" : String(data));
  }

  async function handleMemberSelect(next: MemberOption | null) {
    setMember(next);
    setError(null);
    if (!next) return;

    // Son kullanılan tüp seçili gelsin.
    const { data: last } = await supabase
      .from("dive")
      .select("tank_size, tank_material")
      .eq("member_id", next.id)
      .is("deleted_at", null)
      .order("entry_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSize = last ? String(last.tank_size) : size;
    const nextMaterial = last ? last.tank_material : material;

    setSize(nextSize);
    setMaterial(nextMaterial);

    await fillSuggestedWeight(next.id, nextMaterial, nextSize);
  }

  async function handleSizeChange(nextSize: string) {
    setSize(nextSize);
    if (member) await fillSuggestedWeight(member.id, material, nextSize);
  }

  async function handleMaterialChange(nextMaterial: TankMaterial) {
    setMaterial(nextMaterial);
    if (member) await fillSuggestedWeight(member.id, nextMaterial, size);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!member) {
      setError("Üye seçilmedi.");
      return;
    }
    const numericSize = Number(size);
    if (!Number.isFinite(numericSize) || numericSize <= 0) {
      setError("Tüp hacmi gerekli.");
      return;
    }
    if (weight.trim() === "" || !Number.isFinite(Number(weight))) {
      setError("Ağırlık gerekli.");
      return;
    }
    if (startPressure.trim() === "" || !Number.isFinite(Number(startPressure))) {
      setError("Giriş havası gerekli.");
      return;
    }
    if (entryTime === "") {
      setError("Giriş saati gerekli.");
      return;
    }
    if (buddy && buddy.id === member.id) {
      setError("Eş, dalgıcın kendisi olamaz.");
      return;
    }

    setSaving(true);

    // Dalış id'sini burada üretiyoruz: kuyruk yeniden denerse aynı id ile
    // gider, birincil anahtar çakışması "zaten gönderilmiş" demek olur.
    const diveId = crypto.randomUUID();

    await enqueue({
      kind: "dive_entry",
      diveId,
      payload: {
        id: diveId,
        camp_id: campId,
        member_id: member.id,
        entry_time: fromDateTimeLocalValue(entryTime).toISOString(),
        start_pressure: Number(startPressure),
        weight: Number(weight),
        tank_size: numericSize,
        tank_material: material,
        // Kulüpte twin kullanılmıyor. Kolon şemada duruyor çünkü
        // dive_detail hacmi ona göre ikiye katlıyor ve eski kayıtlar
        // için doğru kalması gerekiyor.
        twin: false,
        buddy_id: buddy?.id ?? null,
        leader_id: leader?.id ?? null,
      },
      display: {
        memberName: member.name,
        buddyName: buddy?.name ?? null,
        leaderName: leader?.name ?? null,
      },
    });

    // Beklemeden dönüyoruz: kart zaten kuyruktan çizilecek.
    void flush();

    router.push("/");
    router.refresh();
  }

  const openDiveId = member ? openDiveByMember[member.id] : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <MemberSearch
        id="member"
        label="Dalgıç"
        members={members}
        selected={member}
        onSelect={handleMemberSelect}
      />

      {member && openDiveId && (
        <div className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <p className="font-medium">
            {member.name} şu an suda görünüyor. Önceki dalışın çıkışı
            girilmemiş olabilir.
          </p>
          <Link
            href={`/dives/${openDiveId}/exit`}
            className="mt-1 inline-block font-medium text-primary underline underline-offset-4"
          >
            O dalışı kapat
          </Link>
        </div>
      )}

      <TankPicker
        size={size}
        material={material}
        onSizeChange={handleSizeChange}
        onMaterialChange={handleMaterialChange}
      />

      <div className="space-y-2">
        <Label htmlFor="weight" className="text-base">
          Ağırlık
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            min={0}
            max={30}
            step={0.5}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="h-14 text-2xl tabular-nums md:text-2xl"
            autoComplete="off"
          />
          <span className="text-lg text-muted-foreground">kg</span>
        </div>
      </div>

      <PressureInput
        id="start-pressure"
        label="Giriş havası"
        value={startPressure}
        onChange={setStartPressure}
      />

      <TimeInput
        id="entry-time"
        label="Giriş saati"
        value={entryTime}
        onChange={setEntryTime}
      />

      <MemberSearch
        id="buddy"
        label="Eş"
        members={members}
        selected={buddy}
        onSelect={setBuddy}
        optional
      />

      <MemberSearch
        id="leader"
        label="Lider"
        members={members}
        selected={leader}
        onSelect={setLeader}
        optional
      />

      {error && (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving} className="h-14 w-full text-base">
        {saving ? "Kaydediliyor…" : "Dalışı başlat"}
      </Button>
    </form>
  );
}
