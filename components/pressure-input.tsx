"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Hava basıncı alanı. Eller ıslak, güneş var: büyük hedef,
// telefonda sayı klavyesi açılıyor.
export function PressureInput({
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
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={400}
          step={5}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 text-2xl tabular-nums md:text-2xl"
          autoComplete="off"
        />
        <span className="text-lg text-muted-foreground">bar</span>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
