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

/**
 * sat_no'nun sayısal değeri; numarası olmayan (ya da sayı olmayan) üyede
 * null. Kolon metin olduğu için karşılaştırma öncesi çevrilmesi gerekiyor:
 * metin sıralamasında "999" ile "1105" yanlış sıraya giriyor.
 */
function satNoValue(satNo: string | null): number | null {
  if (satNo === null || !/^\d+$/.test(satNo)) return null;
  return Number(satNo);
}

/**
 * Üye listesi sıralaması: numaraya göre AZALAN, yani en yeni üye en üstte.
 *
 * Numarası olmayan üyeler en sona düşer (uygulamadan elle eklenmiş
 * olabilirler) ve kendi aralarında Türkçe alfabetik sıralanır — Postgres'in
 * collation'ı Ç/Ğ/İ/Ö/Ş/Ü'yü doğru sıralamadığı için burada yapılıyor.
 */
export function compareBySatNoDesc(
  a: { name: string; sat_no: string | null },
  b: { name: string; sat_no: string | null },
): number {
  const aNo = satNoValue(a.sat_no);
  const bNo = satNoValue(b.sat_no);

  if (aNo !== null && bNo !== null) return bNo - aNo;
  if (aNo !== null) return -1;
  if (bNo !== null) return 1;
  return a.name.localeCompare(b.name, "tr");
}
