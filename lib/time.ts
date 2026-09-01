// <input type="datetime-local"> ile timestamptz arasındaki dönüşüm.
//
// datetime-local her zaman YEREL duvar saati verir ("2026-08-26T14:32").
// new Date(...) bunu yerel kabul edip parse eder, toISOString() de doğru
// UTC'ye çevirir. Ters yönde toISOString kullanılamaz — o UTC yazar ve
// saat kayar; bu yüzden aşağıdaki elle biçimleme var.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → "2026-08-26T14:32" (yerel saat, input'un beklediği biçim) */
export function toDateTimeLocalValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** "2026-08-26T14:32" → Date (yerel saat olarak yorumlanır) */
export function fromDateTimeLocalValue(value: string): Date {
  return new Date(value);
}

/** timestamptz → "14:32" */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** timestamptz → "26 Ağu 14:32" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
