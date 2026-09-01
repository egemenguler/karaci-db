// Dalış başlat. Opsiyonel log alanları (derinlik, tip, nokta, not)
// burada SORULMUYOR — onlar sonradan kişinin kendisi dolduruyor.

import Link from "next/link";
import { StartDiveForm } from "@/components/start-dive-form";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function NewDivePage() {
  const supabase = createServerSupabase();

  const { data: camp } = await supabase
    .from("camp")
    .select("id, name, year")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

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
