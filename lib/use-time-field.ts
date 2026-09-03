"use client";

// Formlardaki "şimdi" saat alanı (giriş saati, çıkış saati).
//
// Alan <input type="datetime-local">, yani dakika hassasiyetinde: 14:32:47'de
// "14:32" gösteriyor. Yazdığı değeri olduğu gibi kaydedersek dalış 14:32:00'da
// başlamış olur ve suda kim var sayacı daha ilk saniyede 0:47 görünür.
//
// Çözüm: kullanıcı alana DOKUNMADIYSA kayda o anın tam saniyesi gider.
// Dokunduysa yazdığı değer aynen kullanılır — elle saat düzeltmek zaten
// dakika işi.

import { useEffect, useState } from "react";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "./time";

export function useTimeField(serverNow: number) {
  // İlk render sunucununkiyle aynı olsun diye serverNow ile başlıyor;
  // aksi halde hydration uyuşmazlığı çıkar.
  const [value, setValue] = useState(() =>
    toDateTimeLocalValue(new Date(serverNow)),
  );
  const [edited, setEdited] = useState(false);

  // Dokunulmamış alan form açık beklerken geride kalmasın: ekranda yazan
  // dakika ile kaydedilecek an hep aynı olsun. Değer sadece dakika başında
  // değiştiği için bu setState'lerin çoğu React tarafından yutuluyor.
  useEffect(() => {
    if (edited) return;
    const timer = setInterval(
      () => setValue(toDateTimeLocalValue(new Date())),
      1000,
    );
    return () => clearInterval(timer);
  }, [edited]);

  return {
    value,
    onChange(next: string) {
      setEdited(true);
      setValue(next);
    },
    /** "Şimdi" düğmesi: alanı elle girilmiş saatten çıkarıp şimdiye bağlar. */
    reset() {
      setEdited(false);
      setValue(toDateTimeLocalValue(new Date()));
    },
    /** Kayda gidecek an. Alana dokunulmadıysa saniyesiyle birlikte şimdi. */
    resolve(): Date {
      return edited ? fromDateTimeLocalValue(value) : new Date();
    },
  };
}
