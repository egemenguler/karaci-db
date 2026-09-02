// Dalış başlat. Opsiyonel log alanları (derinlik, tip, nokta, not)
// burada SORULMUYOR — onlar sonradan kişinin kendisi dolduruyor.
//
// Kamp ?camp=<id> ile geliyor: ana ekrandaki "Dalış Başlat" butonu
// cihazın seçtiği kampı bağlantıda taşıyor, böylece sunucu dalışın
// hangi kampa yazılacağını doğrudan biliyor. Parametre yoksa ve tek
// kamp aktifse o kullanılır; birden fazlaysa kamp sorulur.

import Link from "next/link";
import { StartDiveForm } from "@/components/start-dive-form";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function NewDivePage({
  searchParams,
}: PageProps<"/dives/new">) {
  const { camp: campParam } = await searchParams;
  const supabase = createServerSupabase();

  const { data: camps } = await supabase
    .from("camp")
    .select("id, name, year")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

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

  // Parametre sadece AKTİF bir kampı gösteriyorsa kabul ediliyor; eski
  // bir bağlantı kapanmış bir kampa dalış yazamasın.
  const requested =
    typeof campParam === "string"
      ? camps.find((camp) => camp.id === campParam)
      : undefined;

  const camp = requested ?? (camps.length === 1 ? camps[0] : null);

  if (!camp) {
    return <CampChooser camps={camps} />;
  }

  const [{ data: members }, { data: openDives }] = await Promise.all([
    supabase
      .from("member")
      .select("id, name")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase.from("active_dive").select("id, member_id").eq("camp_id", camp.id),
  ]);

  // Aynı üyenin ikinci açık dalışında uyarı gösterebilmek için.
  const openDiveByMember: Record<string, string> = {};
  for (const dive of openDives ?? []) {
    if (dive.member_id && dive.id) openDiveByMember[dive.member_id] = dive.id;
  }

  // Server Component istek başına bir kez render ediliyor; saati burada
  // okumak güvenli. Form bunu tarayıcının saat diliminde yorumluyor.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dalış başlat</h1>
        <p className="text-sm text-muted-foreground">
          {camp.name} · {camp.year}
        </p>
      </div>

      <StartDiveForm
        campId={camp.id}
        members={members ?? []}
        openDiveByMember={openDiveByMember}
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

/**
 * Doğrudan /dives/new'e gelinmiş (yer imi, elle yazılmış adres) ve birden
 * fazla kamp aktif. Ana ekrandan gelindiğinde bu ekran görünmüyor: buton
 * kampı zaten bağlantıda taşıyor.
 */
function CampChooser({
  camps,
}: {
  camps: { id: string; name: string; year: number }[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hangi kampa dalış giriyorsun?
        </h1>
        <p className="text-sm text-muted-foreground">
          Şu an birden fazla kamp aktif.
        </p>
      </div>

      <ul className="space-y-3">
        {camps.map((camp) => (
          <li key={camp.id}>
            <Link
              href={`/dives/new?camp=${camp.id}`}
              className="block rounded-xl border px-4 py-4 transition-colors hover:bg-accent active:bg-accent"
            >
              <span className="block font-semibold">{camp.name}</span>
              <span className="block text-sm text-muted-foreground">
                {camp.year}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Ana ekrana dön
      </Link>
    </div>
  );
}
