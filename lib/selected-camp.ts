// Cihazın hangi kampta olduğu.
//
// Aynı anda birden fazla kamp aktif olabiliyor ama bir cihaz her zaman
// tek kampla çalışıyor: karacı kıyıda hangi kamptaysa telefonu da odur.
// Bu yüzden seçim veritabanında değil cihazda, localStorage'da duruyor
// ve sunucuya hiç gitmiyor.
//
// lib/outbox.ts ile aynı kalıp: modül seviyesinde küçük bir dinleyici
// listesi, React tarafında useSyncExternalStore ile okunuyor.

const STORAGE_KEY = "karaci.camp";

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Başka bir sekmede değişirse burası da haberdar olsun.
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Seçili kampın id'si, seçim yoksa null.
 *
 * Gizli sekmede ya da depolaması kapatılmış tarayıcıda okuma hata
 * fırlatıyor; o durumda seçim hatırlanmıyor ama akış çalışmaya devam
 * ediyor.
 */
export function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Sunucudaki ilk render için: localStorage orada yok, dolayısıyla cevap
 * "seçim yok" değil "BİLİNMİYOR" olmalı.
 *
 * Ayrımı korumak önemli: null görseydik, seçimi olan bir cihazda sunucu
 * "hangi kamptasın?" ekranını çizer, hydration'dan hemen sonra da doğru
 * ekrana atlardı — yani bir an yanlış ekran görünürdü.
 */
export function readOnServer(): undefined {
  return undefined;
}

export function write(campId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, campId);
  } catch {
    // Hatırlamamak akışı durdurmuyor.
  }
  for (const listener of listeners) listener();
}
