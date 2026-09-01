import Link from "next/link";
import { CampForm } from "@/components/camp-form";

export default function NewCampPage() {
  const defaultYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Yeni kamp</h1>

      <CampForm defaultYear={defaultYear} />

      <Link
        href="/camps"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Vazgeç
      </Link>
    </div>
  );
}
