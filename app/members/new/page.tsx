import Link from "next/link";
import { MemberForm } from "@/components/member-form";

export default function NewMemberPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Yeni üye</h1>

      <MemberForm />

      <Link
        href="/members"
        className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Vazgeç
      </Link>
    </div>
  );
}
