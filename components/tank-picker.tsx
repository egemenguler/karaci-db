"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/database.types";

type TankMaterial = Database["public"]["Enums"]["tank_material"];

// 11.1 L kulüpte yaygın alüminyum tüp. Listede olmayan hacimler
// "Diğer" ile girilir.
const COMMON_SIZES = [10, 11.1, 12, 15];

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
      className={`h-12 rounded-lg border text-base font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent active:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

// Hacim ve malzeme ayrı geri çağırımlarla bildiriliyor. Tek bir
// onChange({size, material}) olsaydı, art arda gelen iki dokunuştan
// ikincisi render anında yakaladığı eski değeri geri yazardı.
export function TankPicker({
  size,
  material,
  onSizeChange,
  onMaterialChange,
}: {
  size: string;
  material: TankMaterial;
  onSizeChange: (size: string) => void;
  onMaterialChange: (material: TankMaterial) => void;
}) {
  const numericSize = Number(size);
  const isCommon = COMMON_SIZES.includes(numericSize);

  return (
    <div className="space-y-3">
      <Label className="text-base">Tüp</Label>

      <div className="grid grid-cols-3 gap-2">
        {COMMON_SIZES.map((option) => (
          <Segment
            key={option}
            active={isCommon && numericSize === option}
            onClick={() => onSizeChange(String(option))}
          >
            {option} L
          </Segment>
        ))}
        <Segment active={!isCommon} onClick={() => onSizeChange("")}>
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
          onChange={(event) => onSizeChange(event.target.value)}
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
            onClick={() => onMaterialChange(option.value)}
          >
            {option.label}
          </Segment>
        ))}
      </div>
    </div>
  );
}
