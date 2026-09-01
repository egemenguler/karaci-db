"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

// Hacim ve o hacmin kulüpteki olağan malzemesi bir arada: 11.1 alüminyum,
// gerisi çelik. Hacme dokunulunca malzeme de buna göre ayarlanıyor,
// karacının ikinci bir dokunuş yapması gerekmiyor. Farklıysa malzeme
// elle değiştirilebiliyor.
const SIZES: { liters: number; material: TankMaterial }[] = [
  { liters: 11.1, material: "aluminum" },
  { liters: 10, material: "steel" },
  { liters: 12, material: "steel" },
  { liters: 15, material: "steel" },
];

const MATERIALS: { value: TankMaterial; label: string }[] = [
  { value: "aluminum", label: "Alüminyum" },
  { value: "steel", label: "Çelik" },
];

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // min-w-0: ızgara hücresi içeriğe göre genişleyip satırı taşırmasın
      className={`h-12 min-w-0 rounded-lg border px-1 text-base font-medium whitespace-nowrap transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent active:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Değişiklikler kısmi olarak bildiriliyor ({ size } veya { material }).
 * Tamamı gönderilseydi, art arda gelen iki dokunuştan ikincisi render
 * anında yakaladığı eski değeri geri yazardı.
 */
export function TankPicker({
  size,
  material,
  onChange,
}: {
  size: string;
  material: TankMaterial;
  onChange: (patch: { size?: string; material?: TankMaterial }) => void;
}) {
  const numericSize = Number(size);
  const isCommon = SIZES.some((option) => option.liters === numericSize);

  return (
    <div className="space-y-3">
      <Label className="text-base">Tüp</Label>

      <div className="grid grid-cols-4 gap-2">
        {SIZES.map((option) => (
          <Segment
            key={option.liters}
            active={numericSize === option.liters}
            onClick={() =>
              onChange({
                size: String(option.liters),
                material: option.material,
              })
            }
          >
            {option.liters} L
          </Segment>
        ))}
      </div>

      <div className="grid">
        <Segment active={!isCommon} onClick={() => onChange({ size: "" })}>
          Diğer
        </Segment>
      </div>

      {!isCommon && (
        <Input
          type="number"
          inputMode="decimal"
          min={1}
          max={50}
          step={0.1}
          value={size}
          onChange={(event) => onChange({ size: event.target.value })}
          placeholder="Hacim (L)"
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        {MATERIALS.map((option) => (
          <Segment
            key={option.value}
            active={material === option.value}
            onClick={() => onChange({ material: option.value })}
          >
            {option.label}
          </Segment>
        ))}
      </div>
    </div>
  );
}
