// Sunucu tarafı Supabase client — sadece OKUMA için.
//
// Server Component'lerde her istekte yeni bir client kuruyoruz:
// modül seviyesinde tek instance tutmak, istekler arasında durum
// paylaşmak demek olurdu.
//
// v1'de auth yok, dolayısıyla burada da anon key kullanılıyor.
// Yazma işlemleri tarayıcıda: lib/supabase-client.ts

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil. " +
        ".env.local dosyasına bak (README'de anlatılıyor).",
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
