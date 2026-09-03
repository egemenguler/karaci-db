import Link from "next/link";
import { CampList } from "@/components/camp-list";
import { ChangeCamp } from "@/components/change-camp";
import { Button } from "@/components/ui/button";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function CampsPage() {
  const supabase = createServerSupabase();

  const { data: camps, error } = await supabase
    .from("camp")
    .select("id, name, year, starts_on, ends_on, is_active")
    .is("deleted_at", null)
    .order("year", { ascending: false })
    .order("starts_on", { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <div className="rounded-xl border px-6 py-8 text-center">
        <p className="font-medium">Kamplar okunamadı</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Kamplar</h1>
        <Button asChild>
          <Link href="/camps/new">Yeni kamp</Link>
        </Button>
      </div>

      <ChangeCamp
        camps={(camps ?? [])
          .filter((camp) => camp.is_active)
          .map((camp) => ({ id: camp.id, name: camp.name, year: camp.year }))}
      />

      <CampList camps={camps ?? []} />
    </div>
  );
}
