// Üye profili: dijital log defteri. Özet, grafikler, tüm dalışların
// tablosu. Opsiyonel alanların (max_depth, site) kendi doldurma ekranı
// burada değil — bu sadece görüntüleme sayfası.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsumptionChart } from "@/components/consumption-chart";
import { WeightChart } from "@/components/weight-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatTank } from "@/lib/dive";
import { formatSatNo } from "@/lib/member";
import { formatDateTime } from "@/lib/time";
import { createServerSupabase } from "@/lib/supabase-server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: PageProps<"/members/[id]">) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: member } = await supabase
    .from("member")
    .select("id, name, sat_no, joined_year")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!member) notFound();

  const { data: divesData, error } = await supabase
    .from("dive_detail")
    .select("*")
    .eq("member_id", id)
    .order("entry_time", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border px-6 py-8 text-center">
        <p className="font-medium">Dalışlar okunamadı</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  // View kolonlarının hepsi nullable; id veya entry_time olmayan bir
  // satır pratikte olmaz ama TS'i memnun etmek ve güvenli kalmak için
  // eleniyor.
  const dives = (divesData ?? []).filter(
    (d): d is typeof d & { id: string; entry_time: string } =>
      d.id !== null && d.entry_time !== null,
  );

  const totalDives = dives.length;
  const totalMinutes = dives.reduce((sum, d) => sum + (d.duration_min ?? 0), 0);

  const divesWithDepth = dives.filter((d) => d.max_depth !== null);
  const deepest =
    divesWithDepth.length > 0
      ? divesWithDepth.reduce((best, d) => (d.max_depth! > best.max_depth! ? d : best))
      : null;

  const longest =
    dives.length > 0
      ? dives.reduce((best, d) =>
          (d.duration_min ?? 0) > (best.duration_min ?? 0) ? d : best,
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
        {(member.sat_no || member.joined_year) && (
          <p className="text-sm text-muted-foreground">
            {[formatSatNo(member.sat_no), member.joined_year]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Toplam dalış" value={String(totalDives)} />
        <StatCard
          label="Toplam dalış süresi"
          value={formatDuration(totalMinutes)}
        />
      </div>

      {(longest || deepest) && (
        <div className="grid grid-cols-2 gap-3">
          {longest && (
            <StatCard
              label="En uzun"
              value={formatDuration(longest.duration_min ?? 0)}
              sub={formatDateTime(longest.entry_time)}
            />
          )}
          {deepest && (
            <StatCard
              label="En derin"
              value={`${deepest.max_depth} m`}
              sub={formatDateTime(deepest.entry_time)}
            />
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hava tüketimi</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsumptionChart dives={dives} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ağırlık trendi</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart dives={dives} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Log defteri</h2>

        {dives.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="font-medium">Henüz dalış yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary text-left text-muted-foreground">
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Tarih</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Süre</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Tüp</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Ağırlık</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Giriş→Çıkış</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Derinlik</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Nokta</th>
                </tr>
              </thead>
              <tbody>
                {dives.map((dive) => {
                  const href = `/dives/${dive.id}`;
                  // Her hücre kendi linkini taşıyor. "Stretched link"
                  // (tek link + after:absolute) bir <tr>'yi kaplamıyor:
                  // tarayıcı <td>'yi containing block sayıyor, tıklanabilir
                  // alan ilk hücrede kalıyordu.
                  return (
                    <tr
                      key={dive.id}
                      className="border-b last:border-b-0 hover:bg-accent"
                    >
                      <LogCell href={href}>
                        {formatDateTime(dive.entry_time)}
                      </LogCell>
                      <LogCell href={href}>
                        {formatDuration(dive.duration_min ?? 0)}
                      </LogCell>
                      <LogCell href={href}>
                        {formatTank(dive.tank_size, dive.tank_material, dive.twin)}
                      </LogCell>
                      <LogCell href={href}>
                        {dive.weight !== null ? `${dive.weight} kg` : "—"}
                      </LogCell>
                      <LogCell href={href} className="tabular-nums">
                        {dive.start_pressure ?? "—"} → {dive.end_pressure ?? "—"}{" "}
                        bar
                      </LogCell>
                      <LogCell href={href}>
                        {dive.max_depth !== null ? `${dive.max_depth} m` : "—"}
                      </LogCell>
                      <LogCell href={href}>{dive.site ?? "—"}</LogCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Log defteri satırındaki bir hücre: içeriği dalış detayına giden bir
// linkle sarılı, dolayısıyla hücrenin tamamı tıklanabilir.
function LogCell({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <td className="p-0">
      <Link
        href={href}
        className={cn("block whitespace-nowrap px-3 py-2", className)}
      >
        {children}
      </Link>
    </td>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
