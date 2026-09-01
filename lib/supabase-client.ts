// Tarayıcı tarafı Supabase client — TÜM yazma işlemleri buradan geçer.
//
// Projenin temel kuralı: okuma sunucuda (RSC), yazma tarayıcıda.
// Server Action kullanmıyoruz; outbox tarayıcıda yaşadığı için
// yazmaların hepsinin aynı yerden gitmesi tek bir zihinsel model bırakıyor.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false },
});
