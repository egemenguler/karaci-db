// Üye listesi. Arama client tarafında — birkaç yüz kayıt, sunucuya
// her tuşta gitmeye değmez.

import { MemberList } from "@/components/member-list";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = createServerSupabase();

  const { data: members, error } = await supabase
    .from("member")
    .select("id, name, sat_no, joined_year")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border px-6 py-8 text-center">
        <p className="font-medium">Üyeler okunamadı</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Üyeler</h1>

      <MemberList members={members ?? []} />
    </div>
  );
}
