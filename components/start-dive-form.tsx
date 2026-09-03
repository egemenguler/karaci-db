"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MemberSearch, type MemberOption } from "@/components/member-search";
import { PressureInput } from "@/components/pressure-input";
import { TankPicker } from "@/components/tank-picker";
import { TimeInput } from "@/components/time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";
import { enqueue, flush, getAll, type OutboxItem } from "@/lib/outbox";
import { supabase } from "@/lib/supabase-client";
import { formatClock } from "@/lib/time";
import { useTimeField } from "@/lib/use-time-field";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

/** Suda duran bir dalışın, eş önerisi için gereken kadarı. */
export type OpenDive = {
  diveId: string;
  memberId: string;
  memberName: string;
  buddyId: string | null;
  leaderId: string | null;
  leaderName: string | null;
  entryTime: string;
};

/**
 * Eşi bu üye olan, suda duran dalışlardan en yenisi.
 *
 * Karacı ikiliyi arka arkaya giriyor: Egemen'in kaydına eş olarak Metin
 * yazıldıysa, sıra Metin'e geldiğinde eş, lider ve giriş saati bu dalıştan
 * öneriliyor. Buddy yönsüz olduğu için hepsi sadece öneri; alanlar her
 * zaman değiştirilebilir.
 */
function findPartnerDive(
  memberId: string,
  openDives: OpenDive[],
): OpenDive | null {
  const latest = openDives
    .filter((dive) => dive.buddyId === memberId && dive.memberId !== memberId)
    .sort(
      (a, b) =>
        new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime(),
    )[0];

  return latest ?? null;
}

/**
 * Lideri bu üye olan, suda duran dalışlardan en yenisi.
 *
 * Karacı bazen önce grubun liderini giriyor: liderlik yaptığı dalgıç
 * zaten sudaysa, grup birlikte indiği için giriş saati o dalıştan
 * öneriliyor. Eş eşleşmesi önceliklidir; bu yalnızca eş yokken görünüyor.
 */
function findLedDive(memberId: string, openDives: OpenDive[]): OpenDive | null {
  const latest = openDives
    .filter((dive) => dive.leaderId === memberId && dive.memberId !== memberId)
    .sort(
      (a, b) =>
        new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime(),
    )[0];

  return latest ?? null;
}

/**
 * "Dalış Başlat"a basıldığında seçili gelecek dalgıç, ya da null.
 *
 * Karacı ikiliyi/üçlüyü arka arkaya giriyor: ilk kişinin kaydında eş
 * (ve belki lider) yazılıdır ama onların henüz açık dalışı yoktur —
 * sıradaki büyük ihtimalle onlardan biridir. Önce eşlere, sonra liderlere
 * bakılıyor; suda zaten görünen kimse aday olmuyor. Birden çok aday varsa
 * ilki alınıyor — hepsi sadece öneri, alan her zaman değiştirilebilir.
 */
function findAutofillMember(
  openDives: OpenDive[],
  members: MemberOption[],
): MemberOption | null {
  const inWater = new Set(openDives.map((dive) => dive.memberId));
  const notInWater = (id: string | null): id is string =>
    id !== null && !inWater.has(id);

  const pickedId =
    openDives.map((dive) => dive.buddyId).find(notInWater) ??
    openDives.map((dive) => dive.leaderId).find(notInWater);

  return pickedId ? (members.find((m) => m.id === pickedId) ?? null) : null;
}

/** Kuyrukta bekleyen dalış girişleri de suda sayılır. */
function queuedOpenDives(queue: OutboxItem[]): OpenDive[] {
  return queue.flatMap((item) =>
    item.kind === "dive_entry"
      ? [
          {
            diveId: item.diveId,
            memberId: item.payload.member_id,
            memberName: item.display.memberName,
            buddyId: item.payload.buddy_id ?? null,
            leaderId: item.payload.leader_id ?? null,
            leaderName: item.display.leaderName,
            entryTime: item.payload.entry_time,
          },
        ]
      : [],
  );
}

export function StartDiveForm({
  campId,
  members,
  openDives,
  serverNow,
}: {
  campId: string;
  members: MemberOption[];
  /** kampta suda duran dalışlar; hem uyarı hem eş önerisi için */
  openDives: OpenDive[];
  serverNow: number;
}) {
  const router = useRouter();

  const [member, setMember] = useState<MemberOption | null>(null);
  const [buddy, setBuddy] = useState<MemberOption | null>(null);
  const [leader, setLeader] = useState<MemberOption | null>(null);
  // Karacı eş/lider alanına elle dokundu mu. Dokunduysa dalgıç değişince
  // otomatik doldurma o alanı artık ellemiyor; dokunulmamış alan ise yeni
  // dalgıcın eşine göre yeniden doluyor (eşleşme yoksa temizleniyor).
  const [buddyTouched, setBuddyTouched] = useState(false);
  const [leaderTouched, setLeaderTouched] = useState(false);
  // Eşi bu kişi olan açık dalış. Giriş saatini oradan almayı önermek için
  // seçimden sonra da elde tutuluyor.
  const [partnerDive, setPartnerDive] = useState<OpenDive | null>(null);
  // Lideri bu kişi olan açık dalış. Aynı amaçla; eş kutusu yoksa gösteriliyor.
  const [ledDive, setLedDive] = useState<OpenDive | null>(null);

  // Geçmişi olmayan üyede kulüpteki en yaygın kurulum varsayılan.
  // Üye seçilince bu, kişinin son kullandığı tüple değişiyor.
  const [tank, setTank] = useState<{ size: string; material: TankMaterial }>({
    size: "11.1",
    material: "aluminum",
  });

  const [weight, setWeight] = useState("");
  // Kulüpte tüpler 200 bara basılıyor; eksik dolmuşsa üzerine yazılıyor.
  const [startPressure, setStartPressure] = useState("200");
  const entryTime = useTimeField(serverNow);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Çevrimdışıyken az önce girilen dalış henüz sunucuda yok; eş önerisi
  // için kuyruğa da bakıyoruz. Tek seferlik okuma yetiyor: form açıkken
  // kuyruğa yeni dalış girmiyor.
  const [queuedDives, setQueuedDives] = useState<OpenDive[]>([]);

  useEffect(() => {
    let alive = true;
    getAll().then((items) => {
      if (!alive) return;
      const queued = queuedOpenDives(items);
      setQueuedDives(queued);

      // Sıradaki dalgıcı tahmin edip seçili getiriyoruz. Kuyruk henüz
      // state'e yazılmadığı için birleşik listeyi elden geçiriyoruz.
      const pool = [...openDives, ...queued];
      const candidate = findAutofillMember(pool, members);
      if (candidate) void handleMemberSelect(candidate, pool);
    });
    return () => {
      alive = false;
    };
    // Sadece ilk açılışta çalışır; sonraki seçimleri karacı yapıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Üye ya da tüp değişince, kişinin aynı kurulumla yaptığı son dalışın
  // ağırlığı forma dolar. Tek yerde durduğu için hangi alanın önce
  // değiştiğinin bir önemi kalmıyor.
  useEffect(() => {
    if (!member) return;

    const numericSize = Number(tank.size);
    if (!Number.isFinite(numericSize) || numericSize <= 0) return;

    let alive = true;

    const run = async () => {
      const { data } = await supabase.rpc("suggested_weight", {
        p_member_id: member.id,
        p_tank_material: tank.material,
        p_tank_size: numericSize,
        p_twin: false,
      });
      if (alive) {
        setWeight(data === null || data === undefined ? "" : String(data));
      }
    };
    run();

    return () => {
      alive = false;
    };
  }, [member, tank.size, tank.material]);

  async function handleMemberSelect(
    next: MemberOption | null,
    // İlk açılıştaki otomatik seçim, kuyruk state'e yazılmadan önce eldeki
    // birleşik listeyle çağırıyor; normal seçimde varsayılan yeterli.
    openDivePool: OpenDive[] = [...openDives, ...queuedDives],
  ) {
    setMember(next);
    setError(null);
    setPartnerDive(null);
    setLedDive(null);
    if (!next) return;

    // Eşi bu kişi olan açık bir dalıştan eş ve lider öneriliyor. Elle
    // dokunulmamış alanlar yeni dalgıca göre yeniden hesaplanıyor:
    // eşleşme varsa doluyor, yoksa (önceki dalgıçtan kalan) değer siliniyor.
    const partner = findPartnerDive(next.id, openDivePool);
    setPartnerDive(partner);

    // Liderlik yaptığı biri suda mı — sadece saat önerisi için, alanlara
    // dokunmuyor. Eş kutusu öncelikli, ikisi birden gösterilmiyor.
    setLedDive(findLedDive(next.id, openDivePool));

    if (!buddyTouched) {
      setBuddy(
        partner ? { id: partner.memberId, name: partner.memberName } : null,
      );
    }
    if (!leaderTouched) {
      setLeader(
        partner?.leaderId && partner.leaderName
          ? { id: partner.leaderId, name: partner.leaderName }
          : null,
      );
    }

    // Son kullanılan tüp seçili gelsin.
    const { data: last } = await supabase
      .from("dive")
      .select("tank_size, tank_material")
      .eq("member_id", next.id)
      .is("deleted_at", null)
      .order("entry_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Son kullanılan tüp seçili gelsin. Ağırlığı yukarıdaki effect dolduruyor.
    if (last) {
      setTank({ size: String(last.tank_size), material: last.tank_material });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!member) {
      setError("Üye seçilmedi.");
      return;
    }
    const numericSize = Number(tank.size);
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
    if (entryTime.value === "") {
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
        entry_time: entryTime.resolve().toISOString(),
        start_pressure: Number(startPressure),
        weight: Number(weight),
        tank_size: numericSize,
        tank_material: tank.material,
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

  // Sadece sunucudaki dalışlar: "o dalışı kapat" bağlantısı gerçek bir
  // kayda gitmeli, kuyrukta bekleyen bir dalışın sayfası henüz yok.
  const openDiveId = member
    ? openDives.find((dive) => dive.memberId === member.id)?.diveId
    : undefined;

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
        size={tank.size}
        material={tank.material}
        onChange={(patch) => setTank((prev) => ({ ...prev, ...patch }))}
      />

      <div className="space-y-2">
        <Label htmlFor="weight" className="text-base">
          Ağırlık
        </Label>
        {/* Birim input'un içinde: yanına koyunca alan diğerlerinden kısa
            kalıyor ve sağ kenarlar hizasız görünüyor. Bkz. PressureInput. */}
        <div className="relative">
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            min={0}
            max={30}
            step={0.5}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="h-14 pr-14 text-2xl tabular-nums md:text-2xl"
            autoComplete="off"
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg text-muted-foreground">
            kg
          </span>
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
        value={entryTime.value}
        onChange={entryTime.onChange}
        onNow={entryTime.reset}
      />

      {/* Eşi zaten suda ama bu kişininki henüz açılmamış: ikisi birlikte
          suya girdiyse saat de aynı olsun, sayaçlar birlikte aksın. Kendi
          dalışı da açıksa bu kutu çıkmıyor — yukarıdaki uyarı yeter. */}
      {partnerDive && !openDiveId && (
        <div className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <p>
            <span className="font-medium">{partnerDive.memberName}</span> suda.
            Giriş saati: {formatClock(partnerDive.entryTime)}
          </p>
          <button
            type="button"
            onClick={() => entryTime.setAt(new Date(partnerDive.entryTime))}
            className="mt-1 font-medium text-primary underline underline-offset-4"
          >
            Aynı saati kullan
          </button>
        </div>
      )}

      {/* Eşi değil ama liderlik yaptığı biri suda: grup birlikte indiyse
          saat de aynı olsun. Eş kutusu çıktıysa bu çıkmıyor — eş öncelikli. */}
      {!partnerDive && ledDive && !openDiveId && (
        <div className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <p>
            Liderlik yaptığı{" "}
            <span className="font-medium">{ledDive.memberName}</span> suda. Giriş
            saati: {formatClock(ledDive.entryTime)}
          </p>
          <button
            type="button"
            onClick={() => entryTime.setAt(new Date(ledDive.entryTime))}
            className="mt-1 font-medium text-primary underline underline-offset-4"
          >
            Aynı saati kullan
          </button>
        </div>
      )}

      <MemberSearch
        id="buddy"
        label="Eş"
        members={members}
        selected={buddy}
        onSelect={(next) => {
          setBuddy(next);
          setBuddyTouched(true);
        }}
        optional
      />

      <MemberSearch
        id="leader"
        label="Lider"
        members={members}
        selected={leader}
        onSelect={(next) => {
          setLeader(next);
          setLeaderTouched(true);
        }}
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
