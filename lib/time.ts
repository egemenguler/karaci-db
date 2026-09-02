// Saat biçimleme ve <input type="datetime-local"> dönüşümleri.
//
// Buradaki her şey KAMP SAAT DİLİMİNE sabitlenmiştir, makinenin saat
// dilimine değil. Sebep: sayfalar sunucuda render ediliyor ve sunucu
// (Vercel/Cloudflare) UTC'de çalışıyor. Sabitlemezsek aynı dalış
// sunucuda 11:32, telefonda 14:32 görünür.
//
// Dilim farkı sabit "+03:00" yazılmadı, o anki değeri Intl'e soruluyor;
// Türkiye yaz saatine dönerse kod kendiliğinden doğru kalır.

const TIME_ZONE = "Europe/Istanbul";

/** Verilen andaki dilim farkı, "+03:00" biçiminde. */
function zoneOffset(date: Date): string {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")!.value; // "GMT+03:00"

  return name.replace("GMT", "") || "+00:00";
}

/** Date → "2026-08-26T14:32" (kamp saati, input'un beklediği biçim) */
export function toDateTimeLocalValue(date: Date): string {
  // en-CA sayısal biçim veriyor; parçaları tek tek alıp diziyoruz ki
  // yerelin araya koyduğu noktalama işin içine karışmasın.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // gece yarısı 24 değil 00 olsun
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)!.value;

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "2026-08-26T14:32" → Date (değer kamp saati olarak yorumlanır) */
export function fromDateTimeLocalValue(value: string): Date {
  // Farkı öğrenmek için bir ana ihtiyacımız var; değeri önce UTC kabul
  // edip o anın farkını soruyoruz, sonra doğru farkla tekrar parse
  // ediyoruz.
  const guess = new Date(`${value}:00Z`);
  return new Date(`${value}:00${zoneOffset(guess)}`);
}

/** timestamptz → "14:32" */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** timestamptz → "26 Ağu 14:32" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * date kolonu ("2026-08-26") → "26 Ağu"
 *
 * Saat taşımayan bir değer; UTC gece yarısı olarak parse ediliyor,
 * bu yüzden UTC'de biçimlenmeli. Kamp dilimine çevirseydik UTC'nin
 * gerisindeki bir dilimde tarih bir gün geri kayardı.
 */
export function formatDay(dateOnly: string): string {
  return new Date(dateOnly).toLocaleDateString("tr-TR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

/** İki date kolonundan aralık: "24 Ağu – 31 Ağu". İkisi de boşsa "". */
export function formatDayRange(
  startsOn: string | null,
  endsOn: string | null,
): string {
  if (!startsOn && !endsOn) return "";
  if (startsOn && endsOn) return `${formatDay(startsOn)} – ${formatDay(endsOn)}`;
  return formatDay((startsOn ?? endsOn)!);
}
