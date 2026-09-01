"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

const COMMON_SIZES = [10, 12, 15];

// Malzeme önemli: alüminyum boşken pozitif yüzerlikli, çelik negatif.
// Aynı hacimde bile ağırlık ~2 kg değişiyor.
const MATERIALS: { value: TankMaterial; label: string }[] = [
  { value: "steel", label: "Çelik" },
  { value: "aluminum", label: "Alüminyum" },
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
      className={`h-12 flex-1 rounded-lg border text-base font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent active:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

export function TankPicker({
  size,
  material,
  twin,
  onChange,
}: {
  size: string;
  material: TankMaterial;
  twin: boolean;
  onChange: (next: {
    size: string;
    material: TankMaterial;
    twin: boolean;
  }) => void;
}) {
  const numericSize = Number(size);
  const isCommon = COMMON_SIZES.includes(numericSize);

  return (
    <div className="space-y-3">
      <Label className="text-base">Tüp</Label>

      <div className="flex gap-2">
        {COMMON_SIZES.map((option) => (
          <Segment
            key={option}
            active={isCommon && numericSize === option}
            onClick={() => onChange({ size: String(option), material, twin })}
          >
            {option} L
          </Segment>
        ))}
        <Segment
          active={!isCommon}
          onClick={() => onChange({ size: "", material, twin })}
        >
          Diğer
        </Segment>
      </div>

      {!isCommon && (
        <Input
          type="number"
          inputMode="decimal"
          min={1}
          max={50}
          step={0.5}
          value={size}
          onChange={(event) =>
            onChange({ size: event.target.value, material, twin })
          }
          placeholder="Hacim (L)"
          className="h-12 text-base md:text-base"
          autoComplete="off"
        />
      )}

      <div className="flex gap-2">
        {MATERIALS.map((option) => (
          <Segment
            key={option.value}
            active={material === option.value}
            onClick={() => onChange({ size, material: option.value, twin })}
          >
            {option.label}
          </Segment>
        ))}
      </div>

      <div className="flex">
        <Segment
          active={twin}
          onClick={() => onChange({ size, material, twin: !twin })}
        >
          {twin ? "Twin ✓" : "Twin"}
        </Segment>
      </div>
    </div>
  );
}
