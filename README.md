# ODTÜ-SAT Karacı Veritabanı

Kulübün kağıt karacı defterinin yerini alan web uygulaması.

Proje kararları ve kapsam: [CLAUDE.md](CLAUDE.md) — **yeni bir şey eklemeden önce oku.**
Veritabanı şeması: [schema.sql](schema.sql) · Geliştirme verisi: [seed.sql](seed.sql)

## Çalıştırma

```bash
npm install
npm run dev
```

## Ortam değişkenleri

`.env.local` (repoya **girmez**, `.gitignore`'da):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# sadece `npm run types:gen` için, uygulama kullanmıyor
SUPABASE_PROJECT_ID=
```

Değerler Supabase panelinde **Project Settings → API** altında.
Production'da aynı iki `NEXT_PUBLIC_*` değişkeni Vercel/Cloudflare proje
ayarlarına girilir.

Supabase, Vercel/Cloudflare hesapları **kulüp hesabı** altındadır; kişisel
hesap altında değil.

## Veritabanı kurulumu

Supabase SQL editor'de sırayla:

1. `schema.sql`
2. `seed.sql` — sadece geliştirme/test verisi, **production'da çalıştırma**

`seed.sql` tekrar çalıştırılabilir: sabit UUID'lerle upsert eder ve test
durumunu sıfırlar (açık dalışlar yeniden açılır, süreleri tazelenir).

## Tipler

Şema değiştiğinde:

```bash
npx supabase login   # bir kez
npm run types:gen
```

Üretilen `lib/database.types.ts` repoya commit edilir. **Elle düzenleme.**

---

## Mimari — devralan için

Üç kural var, hepsi bilinçli. Değiştirmeden önce iki kez düşün.

### 1. Okuma sunucuda, yazma tarayıcıda

Sayfalar Server Component. Veriyi `createServerSupabase()` ile çekerler
(`lib/supabase-server.ts`). **Server Action yok.**

Bütün yazmalar tarayıcıdan, `supabase` client'ıyla gider
(`lib/supabase-client.ts`). Yazmadan sonra `router.refresh()` çağrılır ki
sunucudan gelen liste tazelensin.

Sebep: outbox tarayıcıda yaşıyor. Yazmaların bir kısmı Server Action, bir kısmı
client çağrısı olsaydı iki ayrı zihinsel model çıkardı. v1'de auth yok, anon key
zaten public — sunucuda yazmanın güvenlik avantajı da yok.

### 2. Outbox sadece iki yazmayı kapsar

`lib/outbox.ts`, IndexedDB üzerinde küçük bir kuyruk.

| Buradan geçen | Geçmeyen |
|---|---|
| Dalış başlat | Kamp CRUD |
| Dalış kapat | Üye CRUD |
| | Opsiyonel log doldurma |
| | Dalış düzenleme / soft delete |

Sebep: ilk ikisi kıyıda, telefon çekmezken, kişi bekleyemezken oluyor.
Diğerleri masa başında; kuyruğa almak hatayı görünmez kılmaktan başka bir şey
yapmaz.

Kuyruğun bilmen gereken üç davranışı:

- **Dalış id'si tarayıcıda üretilir** (`crypto.randomUUID()`) ve insert'e dahil
  edilir. Yeniden gönderim birincil anahtar çakışması verir, bu "zaten
  gönderilmiş" sayılır. Aynı dalış iki kez düşmez.
- **FIFO, ilk hatada durur.** Böylece girişi gönderilmemiş bir dalışın çıkışı
  asla önce gitmez.
- **Ağ hatası ile kalıcı hata ayrılır.** Ağ hatasında kayıt `pending` kalır ve
  bağlantı gelince (`online` olayı) kendiliğinden denenir. Kısıt ihlali gibi
  kalıcı hatalarda kayıt `error` işaretlenir, kuyruk durur, `/outbox`
  sayfasında insan çözer.

Ana ekran, sunucudan gelen açık dalışlarla kuyrukta bekleyenleri
**birleştirir** (`components/water-list.tsx`). Bu olmasa karacı çevrimdışıyken
dalışı girer, listede göremez, ikinci kez girer.

Service worker / PWA / background sync **yok**.

### 3. Soft delete, hard delete yok

Her sorgu `.is("deleted_at", null)` filtreler. RLS'te DELETE policy yazılmadı ve
`anon`/`authenticated` rollerinden DELETE yetkisi geri alındı — yani API
üzerinden bir satırı kalıcı silmek **mümkün değil.**

---

## Bilinen pürüzler

- Kamp özetinde hâlâ suda olan dalgıç "0 dk" dip zamanıyla görünüyor; açık
  dalışın süresi hesaplanamıyor. "—" daha doğru olurdu.
- Üye listesi ve arama tüm üyeleri client'a çekip orada filtreliyor. Birkaç yüz
  üyede sorun değil, binlerce olursa sunucu tarafı aramaya geçmek gerekir.
- Türkçe sıralama client'ta yapılıyor (`localeCompare(..., "tr")`), çünkü
  Postgres'in collation'ı Ç/Ğ/İ/Ö/Ş/Ü'yü doğru sıralamıyor.
