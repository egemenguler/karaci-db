// Üye gösterimi için saf yardımcılar. Veritabanına dokunmaz.

/**
 * Üye numarasını ekranda gösterilecek biçime çevirir: "1105" → "SAT-1105"
 *
 * Numara veritabanında kulübün yayımladığı düz haliyle duruyor
 * (bkz. members.sql); "SAT-" öneki sunum katmanına ait, saklanmıyor.
 * Böylece kulüp listesiyle karşılaştırma ve yeni üye girişi hep düz
 * sayıyla yapılıyor.
 */
export function formatSatNo(satNo: string | null): string | null {
  if (satNo === null || satNo.trim() === "") return null;
  return `SAT-${satNo}`;
}
