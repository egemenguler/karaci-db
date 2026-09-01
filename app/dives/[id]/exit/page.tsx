// Dalış kapat: çıkış havası + saat. Başka bir şey sorulmuyor.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ExitDiveForm } from "@/components/exit-dive-form";
import { formatClock, formatDateTime } from "@/lib/time";
import { formatTank } from "@/lib/dive";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ExitDivePage({
  params,
}: PageProps<"/dives/[id]/exit">) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: dive, error } = await supabase
    .from("dive")
    .select(
      "id, member_id, entry_time, start_pressure, weight, tank_size, tank_material, twin, exit_time",
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

  const { data: member } = await supabase
    .from("member")
    .select("name")
    .eq("id", dive.member_id)
    .maybeSingle();

  const memberName = member?.name ?? "Bilinmeyen üye";

  if (dive.exit_time) {
    return (
      <Box title="Bu dalış zaten kapatılmış">
        <p className="text-sm text-muted-foreground">
          {memberName} · {formatDateTime(dive.entry_time)} –{" "}
          {formatClock(dive.exit_time)}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Ana ekrana dön
        </Link>
      </Box>
    );
  }

  // Server Component istek başına bir kez render ediliyor; saati burada
  // okumak güvenli. Form bunu tarayıcının saat diliminde yorumluyor.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{memberName}</h1>
        <p className="text-sm text-muted-foreground">
          Giriş {formatClock(dive.entry_time)} ·{" "}
          {formatTank(dive.tank_size, dive.tank_material, dive.twin)} ·{" "}
          {dive.weight} kg · {dive.start_pressure} bar
        </p>
      </div>

      <ExitDiveForm
        diveId={dive.id}
        memberName={memberName}
        entryTime={dive.entry_time}
        startPressure={dive.start_pressure}
        serverNow={serverNow}
      />

      <Link
        href="/"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Vazgeç
      </Link>
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
