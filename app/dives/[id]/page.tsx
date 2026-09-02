// Dalış detay sayfası: zorunlu alanların salt okunur özeti, dalış
// kapalıysa hesaplanan tüketim değerleri ve opsiyonel log formu.

import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteDiveButton, DiveLogForm } from "@/components/dive-log-form";
import { formatDuration, formatTank } from "@/lib/dive";
import { formatClock, formatDateTime } from "@/lib/time";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type DiveDetail = Pick<
  Database["public"]["Views"]["dive_detail"]["Row"],
  "duration_min" | "pressure_used" | "bar_per_min" | "sac_rate"
>;

export default async function DiveDetailPage({
  params,
}: PageProps<"/dives/[id]">) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: dive, error } = await supabase
    .from("dive")
    .select(
      "id, camp_id, member_id, entry_time, start_pressure, weight, tank_size, tank_material, twin, exit_time, end_pressure, buddy_id, leader_id, max_depth, dive_type, site, notes",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return (
      <Box title="Dalış okunamadı">
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </Box>
    );
  }

  if (!dive) notFound();

  const { data: camp } = await supabase
    .from("camp")
    .select("name, year")
    .eq("id", dive.camp_id)
    .is("deleted_at", null)
    .maybeSingle();

  // Üye, eş ve lider isimleri tek sorguda: embedding/join yerine exit
  // sayfasındaki desen izleniyor (mevcut kod, bkz. app/dives/[id]/exit/page.tsx).
  const memberIds = [dive.member_id, dive.buddy_id, dive.leader_id].filter(
    (value): value is string => value !== null,
  );
  const { data: members } = await supabase
    .from("member")
    .select("id, name")
    .in("id", memberIds)
    .is("deleted_at", null);

  const nameById = new Map((members ?? []).map((m) => [m.id, m.name]));
  const memberName = nameById.get(dive.member_id) ?? "Bilinmeyen üye";
  const buddyName = dive.buddy_id
    ? (nameById.get(dive.buddy_id) ?? "—")
    : "—";
  const leaderName = dive.leader_id
    ? (nameById.get(dive.leader_id) ?? "—")
    : "—";

  const isOpen = dive.exit_time === null;

  // dive_detail sadece kapalı dalışları içeriyor, bu yüzden ikinci sorgu
  // sadece exit_time doluysa yapılıyor.
  let detail: DiveDetail | null = null;
  if (!isOpen) {
    const { data } = await supabase
      .from("dive_detail")
      .select("duration_min, pressure_used, bar_per_min, sac_rate")
      .eq("id", dive.id)
      .is("deleted_at", null)
      .maybeSingle();
    detail = data;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {memberName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {camp?.name ?? "Bilinmeyen kamp"}
          {camp?.year ? ` · ${camp.year}` : ""} ·{" "}
          {formatDateTime(dive.entry_time)}
        </p>
      </div>

      <div className="divide-y rounded-xl border">
        <Row label="Giriş saati" value={formatClock(dive.entry_time)} />
        <Row
          label="Çıkış saati"
          value={dive.exit_time ? formatClock(dive.exit_time) : "Suda"}
        />
        <Row
          label="Dalış süresi"
          value={
            detail?.duration_min != null
              ? formatDuration(detail.duration_min)
              : "—"
          }
        />
        <Row
          label="Tüp"
          value={formatTank(dive.tank_size, dive.tank_material, dive.twin)}
        />
        <Row label="Ağırlık" value={`${dive.weight} kg`} />
        <Row
          label="Giriş → Çıkış"
          value={`${dive.start_pressure} → ${dive.end_pressure ?? "—"} bar`}
        />
        <Row label="Eş" value={buddyName} />
        <Row label="Lider" value={leaderName} />
      </div>

      {isOpen && (
        <Link
          href={`/dives/${dive.id}/exit`}
          className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Dalışı kapat
        </Link>
      )}

      {!isOpen && detail && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Hesaplananlar
          </h2>
          <div className="divide-y rounded-xl border">
            <Row
              label="Harcanan hava"
              value={
                detail.pressure_used != null
                  ? `${detail.pressure_used} bar`
                  : "—"
              }
            />
            <Row
              label="Bar/dk"
              value={
                detail.bar_per_min != null
                  ? `${detail.bar_per_min.toFixed(1)} bar/dk`
                  : "—"
              }
            />
            {detail.sac_rate != null && (
              <Row label="SAC" value={`${detail.sac_rate.toFixed(1)} L/dk`} />
            )}
          </div>
        </div>
      )}

      <DiveLogForm
        diveId={dive.id}
        maxDepth={dive.max_depth}
        diveType={dive.dive_type}
        site={dive.site}
        notes={dive.notes}
      />

      <DeleteDiveButton diveId={dive.id} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border px-6 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
