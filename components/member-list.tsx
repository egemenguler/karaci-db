"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/database.types";
import { formatSatNo } from "@/lib/member";

type Member = Pick<
  Database["public"]["Tables"]["member"]["Row"],
  "id" | "name" | "sat_no" | "joined_year"
>;

// Türkçe'de "İ"/"ı" yüzünden düz toLowerCase yanlış eşleşir.
function normalize(text: string): string {
  return text.toLocaleLowerCase("tr");
}

export function MemberList({ members }: { members: Member[] }) {
  const [query, setQuery] = useState("");

  const needle = normalize(query.trim());
  // Numara aramasında gösterilen biçime bakıyoruz ("SAT-1105"), böylece
  // hem "1105" hem "SAT-1105" yazan bulur.
  const matched =
    needle === ""
      ? members
      : members.filter(
          (member) =>
            normalize(member.name).includes(needle) ||
            normalize(formatSatNo(member.sat_no) ?? "").includes(needle),
        );

  // Postgres'in collation'ı Ç/Ğ/İ/Ö/Ş/Ü'yü Türkçe sıraya koymuyor,
  // sıralamayı burada yapıyoruz.
  const shown = [...matched].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="İsim veya SAT no ara"
        className="h-12 text-base md:text-base"
        autoComplete="off"
      />

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Eşleşen üye yok</p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {shown.map((member) => (
            <li key={member.id} className="flex items-baseline gap-3 px-4 py-3">
              <Link
                href={`/members/${member.id}`}
                className="flex-1 font-medium underline-offset-4 hover:underline"
              >
                {member.name}
              </Link>
              {formatSatNo(member.sat_no) && (
                <span className="text-sm text-muted-foreground">
                  {formatSatNo(member.sat_no)}
                </span>
              )}
              {member.joined_year && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {member.joined_year}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        {shown.length} üye{needle !== "" && ` (toplam ${members.length})`}
      </p>
    </div>
  );
}
