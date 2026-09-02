// Kamp özeti: toplam dalış, toplam dalış süresi, en aktif dalgıç,
// katılan dalgıçlar listesi.
//
// Hesaplamalar burada JS'te yapılıyor (kamp başına birkaç yüz satır,
// yeni view/RPC'ye gerek yok): dive_detail kapalı dalışları, active_dive
// açık dalışları verir; ikisi member_id üzerinden JS'te birleştirilir.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/dive";
import { formatDayRange } from "@/lib/time";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type MemberStat = {
  memberId: string;
  name: string;
  diveCount: number;
  durationMin: number;
};

export default async function CampSummaryPage({
  params,
}: PageProps<"/camps/[id]">) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: camp, error: campError } = await supabase
    .from("camp")
    .select("id, name, year, starts_on, ends_on, is_active")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (campError) {
    return (
      <Box title="Kamp okunamadı">
        <p className="text-sm text-muted-foreground">{campError.message}</p>
      </Box>
    );
  }

  if (!camp) notFound();

  const { data: closedDives, error: closedError } = await supabase
    .from("dive_detail")
    .select("member_id, member_name, duration_min")
    .eq("camp_id", id);

  if (closedError) {
    return (
      <Box title="Dalışlar okunamadı">
        <p className="text-sm text-muted-foreground">{closedError.message}</p>
      </Box>
    );
  }

  const { data: openDives, error: openError } = await supabase
    .from("active_dive")
    .select("id, member_id, member_name")
    .eq("camp_id", id);

  if (openError) {
    return (
      <Box title="Dalışlar okunamadı">
        <p className="text-sm text-muted-foreground">{openError.message}</p>
      </Box>
    );
  }

  const closed = closedDives ?? [];
  const open = openDives ?? [];

  // Üye başına dalış sayısı + toplam dalış süresi. Süre sadece kapalı
  // dalışlardan gelir (duration_min açık dalışta hesaplanamaz).
  const statsByMember = new Map<string, MemberStat>();

  for (const dive of closed) {
    if (!dive.member_id || !dive.member_name) continue;
    const stat = statsByMember.get(dive.member_id) ?? {
      memberId: dive.member_id,
      name: dive.member_name,
      diveCount: 0,
      durationMin: 0,
    };
    stat.diveCount += 1;
    stat.durationMin += dive.duration_min ?? 0;
    statsByMember.set(dive.member_id, stat);
  }

  for (const dive of open) {
    if (!dive.member_id || !dive.member_name) continue;
    const stat = statsByMember.get(dive.member_id) ?? {
      memberId: dive.member_id,
      name: dive.member_name,
      diveCount: 0,
      durationMin: 0,
    };
    stat.diveCount += 1;
    statsByMember.set(dive.member_id, stat);
  }

  const members = Array.from(statsByMember.values()).sort(
    (a, b) => b.diveCount - a.diveCount || a.name.localeCompare(b.name, "tr"),
  );

  const totalDiveCount = closed.length + open.length;
  const totalDurationMin = closed.reduce(
    (sum, d) => sum + (d.duration_min ?? 0),
    0,
  );

  const maxDiveCount = members.length > 0 ? members[0].diveCount : 0;
  const mostActive = members.filter((m) => m.diveCount === maxDiveCount);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{camp.name}</h1>
          {camp.is_active && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              Aktif
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {camp.year}
          {formatDayRange(camp.starts_on, camp.ends_on) &&
            ` · ${formatDayRange(camp.starts_on, camp.ends_on)}`}
        </p>
      </div>

      {totalDiveCount === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Bu kampta henüz dalış yok.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Toplam dalış
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {totalDiveCount}
                </p>
                {open.length > 0 && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {closed.length} kapalı · {open.length} açık
                  </p>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Toplam dalış süresi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatDuration(totalDurationMin)}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  En aktif dalgıç
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mostActive.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold leading-snug">
                      {mostActive.map((m) => m.name).join(", ")}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {maxDiveCount} dalış
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Katılan dalgıçlar
            </h2>
            <ul className="divide-y rounded-xl border">
              {members.map((m) => (
                <li key={m.memberId} className="px-4 py-3">
                  <Link
                    href={`/members/${m.memberId}`}
                    className="flex items-center justify-between gap-3 hover:underline"
                  >
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {m.diveCount} dalış · {formatDuration(m.durationMin)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Link
        href="/camps"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Kamplar
      </Link>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-6 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
