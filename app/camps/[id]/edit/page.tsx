import Link from "next/link";
import { notFound } from "next/navigation";
import { CampForm } from "@/components/camp-form";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function EditCampPage({
  params,
}: PageProps<"/camps/[id]/edit">) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: camp } = await supabase
    .from("camp")
    .select("id, name, year, starts_on, ends_on")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!camp) notFound();

  const defaultYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Kampı düzenle</h1>

      <CampForm camp={camp} defaultYear={defaultYear} />

      <Link
        href="/camps"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Vazgeç
      </Link>
    </div>
  );
}
