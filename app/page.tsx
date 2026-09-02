// Ana ekran: aktif kamp + suda kim var.
//
// Server Component. Okuma sunucuda yapılır; aynı anda birden fazla kamp
// aktif olabildiği için AKTİF KAMPLARIN HEPSİ ve onlara ait açık
// dalışlar çekilir. Cihazın hangi kampta olduğunu ActiveCampScreen
// (client) biliyor — seçim cihaza ait, veritabanına değil.

import { ActiveCampScreen } from "@/components/active-camp-screen";
import { createServerSupabase } from "@/lib/supabase-server";

// Bu ekran her zaman taze olmalı — kim suda, o anki gerçek.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabase();

  const { data: camps, error: campError } = await supabase
    .from("camp")
    .select("id, name, year")
    .eq("is_active", true)
    .is("deleted_at", null)
    // Birden fazla aktif kamp varsa en son başlayan üstte listelenir.
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (campError) {
    return <ErrorBox title="Kamp okunamadı" message={campError.message} />;
  }

  if (!camps || camps.length === 0) {
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
    .in(
      "camp_id",
      camps.map((camp) => camp.id),
    )
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
    <ActiveCampScreen
      camps={camps}
      dives={dives ?? []}
      serverNow={serverNow}
    />
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
