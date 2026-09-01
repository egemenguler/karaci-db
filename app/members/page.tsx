// Üye listesi. Arama client tarafında — birkaç yüz kayıt, sunucuya
// her tuşta gitmeye değmez.

import Link from "next/link";
import { MemberList } from "@/components/member-list";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Üyeler</h1>
        <Button asChild>
          <Link href="/members/new">Yeni üye</Link>
        </Button>
      </div>

      <MemberList members={members ?? []} />
    </div>
  );
}
