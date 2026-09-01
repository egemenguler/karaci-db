"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PressureInput } from "@/components/pressure-input";
import { TimeInput } from "@/components/time-input";
import { enqueue, flush } from "@/lib/outbox";
import { fromDateTimeLocalValue, formatClock, toDateTimeLocalValue } from "@/lib/time";

export function ExitDiveForm({
  diveId,
  memberName,
  entryTime,
  startPressure,
  serverNow,
}: {
  diveId: string;
  memberName: string;
  entryTime: string;
  startPressure: number;
  serverNow: number;
}) {
  const router = useRouter();

  // serverNow bir epoch değeri; yerel duvar saatine çeviren getter'lar
  // tarayıcının saat diliminde çalışıyor, yani sunucunun TZ'si karışmıyor.
  const [exitTime, setExitTime] = useState(() =>
    toDateTimeLocalValue(new Date(serverNow)),
  );
  const [endPressure, setEndPressure] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (endPressure.trim() === "") {
      setError("Çıkış havası gerekli.");
      return;
    }
    const pressure = Number(endPressure);
    if (!Number.isFinite(pressure) || pressure < 0) {
      setError("Çıkış havası geçerli bir sayı olmalı.");
      return;
    }
    if (pressure > startPressure) {
      setError(
        `Çıkış havası giriş havasından (${startPressure} bar) büyük olamaz.`,
      );
      return;
    }
    if (exitTime === "") {
      setError("Çıkış saati gerekli.");
      return;
    }
    const exitDate = fromDateTimeLocalValue(exitTime);
    if (exitDate.getTime() < new Date(entryTime).getTime()) {
      setError(
        `Çıkış saati giriş saatinden (${formatClock(entryTime)}) önce olamaz.`,
      );
      return;
    }

    setSaving(true);

    // Gönderim kuyruktan yapılıyor. Kuyruk update'i "exit_time is null"
    // koşuluyla atıyor, yani bu arada başkası kapatmışsa üzerine yazılmıyor.
    await enqueue({
      kind: "dive_exit",
      diveId,
      payload: {
        exit_time: exitDate.toISOString(),
        end_pressure: pressure,
      },
      display: { memberName },
    });

    void flush();

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PressureInput
        id="end-pressure"
        label="Çıkış havası"
        value={endPressure}
        onChange={setEndPressure}
        hint={`Giriş: ${startPressure} bar`}
      />

      <TimeInput
        id="exit-time"
        label="Çıkış saati"
        value={exitTime}
        onChange={setExitTime}
        hint={`Giriş: ${formatClock(entryTime)}`}
      />

      {error && (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving} className="h-14 w-full text-base">
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
