"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateTimeLocalValue } from "@/lib/time";

// Saat alanı: "şimdi" ile dolu gelir, gerekirse düzeltilir.
export function TimeInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        <button
          type="button"
          onClick={() => onChange(toDateTimeLocalValue(new Date()))}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Şimdi
        </button>
      </div>
      <Input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 text-lg md:text-lg"
      />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
