"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateTimeLocalValue } from "@/lib/time";

// Saat alanı: "şimdi" ile dolu gelir, gerekirse düzeltilir.
//
// appearance:none NEDEN GEREKLİ: iOS Safari datetime-local'i yerel bir
// kontrol olarak çiziyor ve o kontrolün içsel genişliği width:100%'ü
// ezerek alanı kapsayıcının sağ kenarından dışarı taşırıyor. Telefonda
// alan diğerlerinden sonra bitiyor, masaüstü tarayıcılarda ise fark
// görünmüyor — ölçüm masaüstünde sorunu göstermiyor.
//
// appearance:none onu sıradan bir metin alanı gibi yerleştiriyor;
// dokununca yerel tarih/saat seçici yine açılıyor. -webkit- öneki elle
// yazıldı, eski iOS sürümleri öneksiz halini tanımıyor.
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
        className="h-14 appearance-none text-lg md:text-lg [-webkit-appearance:none]"
      />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
