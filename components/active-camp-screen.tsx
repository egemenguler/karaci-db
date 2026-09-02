"use client";

// Suda kim var ekranı + cihazın hangi kampta olduğu.
//
// Aynı anda birden fazla kamp aktif olabiliyor (iki kulüp kampının
// çakışması; nadir ama oluyor). Buna karşılık BİR CİHAZ her zaman tek
// kampla çalışıyor: karacı kıyıda hangi kamptaysa telefonu da odur.
//
// Bu yüzden seçim veritabanında değil cihazda duruyor. Sunucu aktif
// kampların hepsini ve onlara ait açık dalışları veriyor, süzme burada
// yapılıyor — normalde tek kamp aktif olduğu için süzülecek bir şey de
// olmuyor ve ekran bugünküyle birebir aynı kalıyor.

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { WaterList } from "@/components/water-list";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import {
  read as readSelectedCamp,
  readOnServer as readSelectedCampOnServer,
  subscribe as subscribeSelectedCamp,
  write as writeSelectedCamp,
} from "@/lib/selected-camp";

type ActiveDive = Database["public"]["Views"]["active_dive"]["Row"];

export type ActiveCamp = { id: string; name: string; year: number };

export function ActiveCampScreen({
  camps,
  dives,
  serverNow,
}: {
  /** aktif kampların hepsi, en son başlayan önce */
  camps: ActiveCamp[];
  /** bu kampların hepsine ait açık dalışlar */
  dives: ActiveDive[];
  serverNow: number;
}) {
  // Tek kamp aktifse sorulacak bir şey yok — neredeyse her zamanki hal.
  // Bu kısa yol sayesinde o durumda depolamaya hiç bakılmıyor, ekran da
  // bugünküyle birebir aynı kalıyor.
  const onlyCamp = camps.length === 1 ? camps[0] : null;

  // undefined: henüz bilinmiyor (sunucu render'ı ve hydration).
  // null: cihaz seçim yapmamış. string: seçili kampın id'si.
  const storedId = useSyncExternalStore(
    subscribeSelectedCamp,
    readSelectedCamp,
    readSelectedCampOnServer,
  );

  // "Kampı değiştir"e basıldığında seçimi geçici olarak yok sayıyoruz;
  // yeni kamp seçilince depolamaya yazılıyor ve bu tekrar kapanıyor.
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    // Sonradan ikinci bir kamp aktif olursa cihaz bu kampta kalsın diye
    // tek kampı da yazıyoruz. Sadece yan etki, state'e dokunmuyor.
    if (onlyCamp) writeSelectedCamp(onlyCamp.id);
  }, [onlyCamp]);

  function pick(campId: string) {
    writeSelectedCamp(campId);
    setChanging(false);
  }

  const selected = onlyCamp ?? camps.find((camp) => camp.id === storedId);

  // Sunucuda hangi kampta olduğumuz bilinmiyor; kampa bağlı hiçbir şey
  // çizmiyoruz ki seçimi olan cihazda kamp sorusu bir an görünmesin.
  if (storedId === undefined && !onlyCamp) return null;

  if (!selected || changing) {
    return (
      <CampChooser
        camps={camps}
        onPick={pick}
        // İlk seçimde vazgeçilecek bir şey yok; sadece kamp
        // değiştirilirken geri dönüş sunuluyor.
        onCancel={changing ? () => setChanging(false) : undefined}
      />
    );
  }

  const campDives = dives.filter((dive) => dive.camp_id === selected.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suda kim var</h1>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selected.name} · {selected.year}
          </p>
          {camps.length > 1 && (
            <button
              type="button"
              onClick={() => setChanging(true)}
              className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Kampı değiştir
            </button>
          )}
        </div>
      </div>

      <WaterList dives={campDives} serverNow={serverNow} />

      <Button asChild className="h-14 w-full text-base">
        <Link href={`/dives/new?camp=${selected.id}`}>Dalış Başlat</Link>
      </Button>
    </div>
  );
}

/** Birden fazla kamp aktif ve cihaz henüz seçmemiş. Cihaz başına bir kez. */
function CampChooser({
  camps,
  onPick,
  onCancel,
}: {
  camps: ActiveCamp[];
  onPick: (campId: string) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hangi kamptasın?
        </h1>
        <p className="text-sm text-muted-foreground">
          Şu an birden fazla kamp aktif. Bu telefon seçtiğin kampla
          çalışacak; sonra üstteki bağlantıdan değiştirebilirsin.
        </p>
      </div>

      <ul className="space-y-3">
        {camps.map((camp) => (
          <li key={camp.id}>
            <button
              type="button"
              onClick={() => onPick(camp.id)}
              className="w-full rounded-xl border px-4 py-4 text-left transition-colors hover:bg-accent active:bg-accent"
            >
              <span className="block font-semibold">{camp.name}</span>
              <span className="block text-sm text-muted-foreground">
                {camp.year}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Vazgeç
        </button>
      )}
    </div>
  );
}
