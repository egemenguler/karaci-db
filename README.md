# ODTÜ-SAT Karacı Veritabanı

Kulübün kağıt karacı defterinin yerini alan web uygulaması.

Proje kararları ve kapsam: [CLAUDE.md](CLAUDE.md) — **yeni bir şey eklemeden önce oku.**
Veritabanı şeması: [schema.sql](schema.sql) · Üye listesi: [members.sql](members.sql) ·
Geliştirme verisi: [seed.sql](seed.sql)

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

1. `schema.sql` — tablolar, view'lar, RLS
2. `members.sql` — 776 gerçek üye. **Production'da da çalıştırılır**, test
   verisi değil.
3. `seed.sql` — uydurma kamp ve dalışlar, sadece geliştirme.
   **Production'da çalıştırma.**

Sıfırdan kurulumda `cleanup-dummy.sql` **çalıştırılmaz** — silecek bir şey
yok. Uygulamanın geliştirilirken kullandığı uydurma veriyi taşıyan mevcut
veritabanında ise 1. adımdan sonra, `members.sql`'den **önce** bir kez
çalıştırılır (aşağıda "Uydurma verinin temizlenmesi").

`seed.sql` üye oluşturmaz; dalgıçları `members.sql`'den `sat_no` ile bulur.
Sırayı atlarsan aramalar null döner ve insert `member_id` üzerinde patlar —
kasıtlı, sırayı yanlış yaptığını böyle anlarsın.

İkisi de tekrar çalıştırılabilir. `seed.sql` sabit UUID'lerle upsert eder ve
sadece kendi satırlarına dokunur: tekrar çalıştırmak test durumunu sıfırlar
(açık dalışlar yeniden açılır, süreleri tazelenir), veritabanındaki başka
hiçbir şeyi bozmaz.

### Üye listesi

`members.sql` **üretilen bir dosyadır**, elle düzenleme:

```bash
npm run members:gen
```

Kaynak [kulübün genel üye listesi](https://odtusat.com.tr/uye-listesi/).
Kurallar betiğin başında yazılı, özeti:

- **Üye numarası olmayan satırlar alınmaz.** Sayfadaki 831 satırın 55'inde
  numara yok; numarasız bir üye kaydını tanımlayamıyoruz.
- `sat_no` düz sayı olarak saklanır (`1105`). `SAT-` öneki sunuma ait,
  ekranda `formatSatNo` ile eklenir (`lib/member.ts`) — veritabanında yok.
- Üye id'si `sat_no`'dan türetilir (uuid5, sabit namespace). Betikteki
  namespace'i **değiştirme**: değişirse bütün üye id'leri değişir ve mevcut
  dalışların bağlı olduğu üyeler kaybolur.

Kulüp listesi güncellenince betiği tekrar çalıştır ve `members.sql`'i commit
et. Site yapısı değişirse betik hata verip durur, sessizce bozuk dosya
üretmez.

### Uydurma verinin temizlenmesi

`cleanup-dummy.sql` **tek seferlik** bir dosya: uygulamanın geliştirilirken
kullandığı uydurma veriyi (altı hayali üye, test kampları, test dalışları)
kalıcı olarak siler. Bütün kamp ve dalış satırlarını sildiği için, kulüp
gerçek kayıt tutmaya başladıktan sonra **bir daha çalıştırılmaz.**

Kalıcı silme sadece SQL editor'den mümkün; API'den değil (aşağıdaki
"Soft delete, hard delete yok" bölümü).

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

### 4. Saat biçimleme kamp dilimine sabit

`lib/time.ts` her şeyi `Europe/Istanbul`'da biçimler; makinenin saat dilimini
kullanmaz. Sayfalar sunucuda render ediliyor ve sunucu UTC'de çalışıyor —
sabitlemezsek aynı dalış sunucuda 11:32, telefonda 14:32 görünür (ve
`datetime-local` alanlarında hydration uyuşmazlığı çıkar).

Saat gösteren/okuyan yeni kod `lib/time.ts`'ten geçmeli; doğrudan
`getHours()` ya da `toLocaleString()` çağırma.

---

## Bilinen pürüzler

- Kamp özetinde hâlâ suda olan dalgıç "0 dk" süreyle görünüyor; açık dalışın
  süresi hesaplanamıyor. "—" daha doğru olurdu.
- Üye listesi ve arama tüm üyeleri client'a çekip orada filtreliyor. Birkaç yüz
  üyede sorun değil, binlerce olursa sunucu tarafı aramaya geçmek gerekir.
- Türkçe sıralama client'ta yapılıyor (`localeCompare(..., "tr")`), çünkü
  Postgres'in collation'ı Ç/Ğ/İ/Ö/Ş/Ü'yü doğru sıralamıyor.
