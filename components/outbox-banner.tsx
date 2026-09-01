"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flush, getAll, retryAll, subscribe, type OutboxItem } from "@/lib/outbox";

// Kuyruk boş değilse her ekranın üstünde durur. Aynı zamanda kuyruğu
// deneyen yer: uygulama açılışında ve bağlantı geri geldiğinde.
export function OutboxBanner() {
  const router = useRouter();
  const [queue, setQueue] = useState<OutboxItem[]>([]);
  const [busy, setBusy] = useState(false);
  const previousCount = useRef(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const items = await getAll();
      if (!alive) return;

      // Kuyruk küçüldüyse bir kayıt sunucuya geçmiş demektir; sunucudan
      // gelen liste artık eski. Tazelemezsek kapatılmış bir dalış ekranda
      // açık görünmeye devam eder.
      if (items.length < previousCount.current) router.refresh();

      previousCount.current = items.length;
      setQueue(items);
    };
    load();
    const unsubscribe = subscribe(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    flush();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (queue.length === 0) return null;

  const failed = queue.filter((item) => item.status === "error").length;

  async function handleRetry() {
    setBusy(true);
    await retryAll();
    setBusy(false);
  }

  return (
    <div className="border-b bg-secondary">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5 text-sm">
        <span className="flex-1 font-medium text-secondary-foreground">
          {queue.length} kayıt gönderilmedi
          {failed > 0 && ` · ${failed} tanesi hata verdi`}
        </span>
        <button
          type="button"
          onClick={handleRetry}
          disabled={busy}
          className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          {busy ? "Deneniyor…" : "Tekrar dene"}
        </button>
        <Link
          href="/outbox"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Gör
        </Link>
      </div>
    </div>
  );
}
