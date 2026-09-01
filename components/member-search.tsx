"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MemberOption = { id: string; name: string };

// Türkçe'de "İ"/"ı" yüzünden düz toLowerCase yanlış eşleşir.
function normalize(text: string): string {
  return text.toLocaleLowerCase("tr");
}

// İsim yazarak üye seçme. Popover/combobox yerine düz bir input +
// altında liste: mobilde daha az sürprizli, kodu da okunaklı.
export function MemberSearch({
  id,
  label,
  members,
  selected,
  onSelect,
  optional,
}: {
  id: string;
  label: string;
  members: MemberOption[];
  selected: MemberOption | null;
  onSelect: (member: MemberOption | null) => void;
  optional?: boolean;
}) {
  const [query, setQuery] = useState("");

  if (selected) {
    return (
      <div className="space-y-2">
        <Label className="text-base">{label}</Label>
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <span className="flex-1 font-medium">{selected.name}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Değiştir
          </button>
        </div>
      </div>
    );
  }

  const needle = normalize(query.trim());
  const matches =
    needle === ""
      ? []
      : members
          .filter((member) => normalize(member.name).includes(needle))
          .sort((a, b) => a.name.localeCompare(b.name, "tr"))
          .slice(0, 6);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
        {optional && <span className="text-muted-foreground"> (opsiyonel)</span>}
      </Label>
      <Input
        id={id}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="İsim yaz"
        className="h-12 text-base md:text-base"
        autoComplete="off"
      />

      {needle !== "" && (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              Eşleşen üye yok
            </li>
          ) : (
            matches.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(member);
                    setQuery("");
                  }}
                  className="w-full px-4 py-3 text-left font-medium hover:bg-accent active:bg-accent"
                >
                  {member.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
