// Ana ekran: aktif kamp + suda kim var.
//
// Server Component. Okuma sunucuda yapılır, veriyi WaterList'e
// (client) geçirir; sayaç ve renk orada tazelenir.

import Link from "next/link";
import { WaterList } from "@/components/water-list";
import { Button } from "@/components/ui/button";
import { createServerSupabase } from "@/lib/supabase-server";

// Bu ekran her zaman taze olmalı — kim suda, o anki gerçek.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabase();

  const { data: camp, error: campError } = await supabase
    .from("camp")
    .select("id, name, year")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (campError) {
    return <ErrorBox title="Kamp okunamadı" message={campError.message} />;
  }

  if (!camp) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="font-medium">Aktif kamp yok</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Dalış kaydı girebilmek için önce bir kampın aktif olması gerekiyor.
        </p>
      </div>
    );
  }

  const { data: dives, error: diveError } = await supabase
    .from("active_dive")
    .select("*")
    .eq("camp_id", camp.id)
    // En uzun süredir suda olan en üstte.
    .order("entry_time", { ascending: true });

  if (diveError) {
    return <ErrorBox title="Dalışlar okunamadı" message={diveError.message} />;
  }

  // Server Component istek başına bir kez render ediliyor, dolayısıyla
  // burada saati okumak güvenli. WaterList ilk render'ı bu değerle yapıp
  // hydration uyuşmazlığını önlüyor, sonra tarayıcı saatine geçiyor.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suda kim var</h1>
        <p className="text-sm text-muted-foreground">
          {camp.name} · {camp.year}
        </p>
      </div>

      <WaterList dives={dives ?? []} serverNow={serverNow} />

      <Button asChild className="h-14 w-full text-base">
        <Link href="/dives/new">Dalış Başlat</Link>
      </Button>
    </div>
  );
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border px-6 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
