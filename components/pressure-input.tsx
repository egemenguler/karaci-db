"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Hava basıncı alanı. Eller ıslak, güneş var: büyük hedef,
// telefonda sayı klavyesi açılıyor.
//
// Birim etiketi input'un İÇİNDE duruyor. Yanına koyduğumuzda alan
// diğerlerinden ~35 px kısa kalıyor ve formdaki alanların sağ kenarları
// hizasız görünüyordu (bkz. TimeInput, birimi yok).
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
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={400}
          step={5}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 pr-14 text-2xl tabular-nums md:text-2xl"
          autoComplete="off"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg text-muted-foreground">
          bar
        </span>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
