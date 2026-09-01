// Outbox: gönderilemeyen dalış kayıtlarının tutulduğu yerel kuyruk.
//
// Sadece İKİ yazma buradan geçer: dalış başlat ve dalış kapat. İkisi de
// kıyıda, telefon çekmezken, kişi bekleyemezken oluyor. Kamp/üye CRUD ve
// log doldurma doğrudan yazar — onlar masa başında yapılıyor, kuyruğa
// almak hatayı görünmez kılmaktan başka bir şey yapmaz.
//
// Service worker / background sync YOK. Kuyruk şurada denenir:
// uygulama açılışı, "online" olayı, manuel "tekrar dene".

import { openDB, type IDBPDatabase } from "idb";
import type { Database } from "./database.types";
import { supabase } from "./supabase-client";

const DB_NAME = "karaci";
const STORE = "outbox";

type DiveInsert = Database["public"]["Tables"]["dive"]["Insert"];

type Common = {
  /** kuyruk kaydının kendi kimliği (dalış id'siyle aynı değil) */
  key: string;
  diveId: string;
  createdAt: number;
  status: "pending" | "error";
  error?: string;
};

export type OutboxItem = Common &
  (
    | {
        kind: "dive_entry";
        payload: DiveInsert;
        /** kart çevrimdışıyken de çizilebilsin diye */
        display: {
          memberName: string;
          buddyName: string | null;
          leaderName: string | null;
        };
      }
    | {
        kind: "dive_exit";
        payload: { exit_time: string; end_pressure: number };
        display: { memberName: string };
      }
  );

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

// Kuyruk değişince ekranların haberi olsun diye küçük bir dinleyici listesi.
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

/** Kuyruk, eklenme sırasına göre (FIFO). */
export async function getAll(): Promise<OutboxItem[]> {
  const db = await getDb();
  const items: OutboxItem[] = await db.getAll(STORE);
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function enqueue(
  item: Omit<OutboxItem, "key" | "createdAt" | "status">,
): Promise<void> {
  const db = await getDb();
  await db.put(STORE, {
    ...item,
    key: crypto.randomUUID(),
    createdAt: Date.now(),
    status: "pending",
  });
  notify();
}

export async function remove(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, key);
  notify();
}

/** Hata işaretini kaldırır; bir sonraki flush tekrar dener. */
export async function retry(key: string): Promise<void> {
  const db = await getDb();
  const item: OutboxItem | undefined = await db.get(STORE, key);
  if (!item) return;
  await db.put(STORE, { ...item, status: "pending", error: undefined });
  notify();
  await flush();
}

/** Hatalı kayıtların hepsini yeniden dener. Banner'daki "tekrar dene". */
export async function retryAll(): Promise<void> {
  const db = await getDb();
  const items: OutboxItem[] = await db.getAll(STORE);
  for (const item of items) {
    if (item.status === "error") {
      await db.put(STORE, { ...item, status: "pending", error: undefined });
    }
  }
  notify();
  await flush();
}

async function markError(item: OutboxItem, message: string) {
  const db = await getDb();
  await db.put(STORE, { ...item, status: "error", error: message });
  notify();
}

// transient: ağ hatası — kayıt "pending" kalır, bağlantı gelince kendiliğinden
// tekrar denenir. transient olmayan hata (kısıt ihlali gibi) insan müdahalesi
// ister, kayıt "error" işaretlenir ve kuyruk orada durur.
type SendResult =
  | { ok: true }
  | { ok: false; message: string; transient: boolean };

// supabase-js ağ hatasında boş code döner; Postgres hatalarında 23505 gibi
// bir kod olur.
function isTransient(error: { code?: string }): boolean {
  return !error.code;
}

async function send(item: OutboxItem): Promise<SendResult> {
  if (item.kind === "dive_entry") {
    const { error } = await supabase.from("dive").insert(item.payload);

    // 23505 = birincil anahtar çakışması. Dalış id'sini tarayıcıda ürettiğimiz
    // için bu "zaten gönderilmiş" demek, hata değil.
    if (error && error.code !== "23505") {
      return {
        ok: false,
        message: error.message,
        transient: isTransient(error),
      };
    }
    return { ok: true };
  }

  // "exit_time is null" koşulu: dalış bu arada başkası tarafından
  // kapatıldıysa hiçbir satır eşleşmez ve üzerine yazılmaz. Bu bir hata
  // değil, kayıt kuyruktan düşer — kullanıcı zaten kapatma sayfasında
  // "bu dalış zaten kapatılmış" uyarısını görüyor.
  const { error } = await supabase
    .from("dive")
    .update(item.payload)
    .eq("id", item.diveId)
    .is("exit_time", null)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, message: error.message, transient: isTransient(error) };
  }

  return { ok: true };
}

let flushing = false;

/**
 * Kuyruğu sırayla gönderir. İlk hatada DURUR — böylece girişi gönderilmemiş
 * bir dalışın çıkışı asla önce gitmez.
 */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;

  try {
    const items = await getAll();

    for (const item of items) {
      // Kalıcı hata insan müdahalesi bekliyor; kuyruk burada durur.
      if (item.status === "error") return;

      const result = await send(item);

      if (result.ok) {
        await remove(item.key);
        continue;
      }

      // Ağ yoksa kayıt bekliyor kalsın; kuyruk durur, bağlantı gelince
      // "online" olayı flush'ı yeniden çağırır.
      if (result.transient) return;

      await markError(item, result.message);
      return;
    }
  } finally {
    flushing = false;
  }
}
