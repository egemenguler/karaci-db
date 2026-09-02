# ODTÜ-SAT Karacı Veritabanı

Kulübün kağıt karacı defterinin yerini alan web uygulaması. Defter ıslanıyor, taşınması zahmetli ve kimse geriye dönüp bakmıyor.

Arayüz dili Türkçe. Kod, identifier ve commit mesajları İngilizce.

Logo repo kökünde. Header, favicon ve (v2'de) paylaşılabilir kartlarda kullanılacak. Logo dışında ekstra marka öğesi üretme — kulübün mevcut görsel kimliği neyse ona sadık kal.

## Stack

- Next.js (App Router, TypeScript)
- Supabase (Postgres + auth, ileride)
- Tailwind + shadcn/ui
- Deploy: Vercel veya Cloudflare

Şema: `schema.sql` · Gerçek üye listesi: `members.sql` (üretilen dosya,
`npm run members:gen`) · Geliştirme verisi: `seed.sql`

---

## Veri modeli kararları

Bunların hepsi bilinçli. "Eksik" görünen şeyler kasıtlı olarak yok.

**Üç tablo: `camp`, `member`, `dive`.** Başka tablo eklemeden önce iki kez düşün.

**Kamp–üye ilişkisi ayrı tabloda tutulmuyor**, dalış kayıtlarından türetiliyor. Sebep: insanlara mümkün olduğunca az veri girdirmek. Kampa gelip hiç dalmayan birinin kaydı tutulmuyor, buna ihtiyaç yok.

**Aynı anda birden fazla kamp aktif olabilir.** Nadir (iki kulüp kampının
çakışması) ama mümkün, o yüzden şemada tekil indeks yok. Bir cihaz ise her
zaman tek kampla çalışıyor; hangi kamp olduğu cihazda tutuluyor
(`lib/selected-camp.ts`), veritabanında değil. Tek kamp aktifken hiçbir şey
sorulmuyor. Ayrıntı README'de.

**Aktif dalış = `exit_time IS NULL`.** Ayrı bir durum kolonu yok. Suda kim var sorgusu bunun üzerinden gider (`active_dive` view).

**Buddy yönsüz.** A'nın kaydında B yazar, B'nin kaydında A yazmak zorunda değil. Karşılıklı kayıt oluşturma, iki yönlü senkronizasyon yapma. Grafik çizerken ilişkiyi yönsüz say.

**Zorunlu alanlar sadece defterde yazanlar:** giriş saati, giriş havası, tüp, ağırlık, çıkış saati, çıkış havası. Bunlar karacının kağıda yazdığı şeyler.

**Opsiyonel alanlar** (`max_depth`, `dive_type`, `site`, `notes`) bilgisayardan/log defterinden gelir. Kişi sonradan kendisi doldurur. Giriş formunda **sorulmaz**, karacıyı yavaşlatmaz.

**Tüp: hacim + malzeme + twin.** Malzeme önemli çünkü alüminyum boşken pozitif yüzerlikli, çelik negatif — aynı hacimde bile ağırlık ~2 kg değişiyor. `suggested_weight()` fonksiyonu, kişinin aynı tüp kurulumuyla yaptığı son dalışın ağırlığını döner; giriş formunda default olarak kullanılır.

**Soft delete** (`deleted_at`). Defterin özü kayıt tutmak, silme geri alınabilir olmalı. Tüm sorgular `deleted_at is null` filtreler.

**`created_by_name`** serbest metin, yetki değil sadece iz. Defterin altına isim yazmak gibi.

**Üye kayıtları kulübün genel üye listesinden geliyor** (`members.sql`).
Numarası olmayan üyeler alınmıyor. `sat_no` düz sayı olarak saklanıyor,
`SAT-` öneki sadece ekranda ekleniyor — veritabanı kulübün yayımladığı
biçimle birebir kalsın.

---

## Karacılık bir rol DEĞİL

Bu en çok yanlış anlaşılan nokta. Karacılık, o an kim yapıyorsa onun yaptığı ayaküstü bir görev. Sabit bir kişi yok, sürekli el değiştiriyor, kimseye "atanmıyor".

Sonuç:
- `karaci` diye bir rol yok, olmayacak
- Dalış girmek için özel yetki gerekmiyor
- Roller sadece `member` ve `admin` (auth eklendiğinde)

Defter gibi düşün: eline alan yazar.

---

## Auth

**v1'de auth yok.** Kimse giriş yapmıyor, herkes her şeyi girebiliyor.

Gerekçe: kötüye kullanımın gerçek zararı düşük (geri alınabilir, motivasyonu olan yok, fark edilir) ve auth eklemek giriş hızını düşürüyor. Önce çıksın, gerçekten sorun oluyor mu görülsün.

Auth eklendiğinde:
- **`account` ve `member` ayrı şeyler.** Üye kaydı hesap olmadan var olur ve varlığını sürdürür. Hesaplar tamamen silinse veritabanı olduğu gibi durur. `dive` her zaman `member_id`'ye bağlanır, asla `account_id`'ye.
- Bir hesap hiçbir üyeye bağlı olmayabilir (sadece bakıyor), bir üyenin hesabı hiç olmayabilir.
- **Tek ortak davet kodu**, süresi dolunca yenisi üretilir. Kişi başı link üretme.
- Kayıt: kod gir → listeden kendi ismini seç → bağlan. Bir üye kaydı bir kez seçilebilir.

---

## Cihaz ve offline

Herkes kendi telefonundan giriyor. Ortak tablet/cihaz **yok**, hiç olmadı. Bazen ödünç alınmış rastgele bir cihazdan da girilebilir.

Pratikte aynı anda tek kişi kullanıyor, çakışma neredeyse imkânsız. Edge case'ler için ağır çözüm kurma — `exit_time` dolu bir dalışı kapatmaya çalışana "bu dalış zaten kapatılmış" göstermek yeterli.

**Offline: sadece outbox.** Kayıt IndexedDB'ye düşer, gönderilemezse ekranda "gönderilmedi" durumu görünür, bağlantı gelince gönderilir. Service worker / PWA / background sync katmanı v1'de yok — pratikte insanlar internetleri gelince siteyi zaten açıyor.

---

## Ekran akışı

**Ana ekran**
- Aktif kamp (birden fazlaysa cihaz bir kez seçer)
- Suda kim var: kart listesi, geçen süre sayacı, süreye göre renk
- "Dalış Başlat" butonu

**Dalış başlat**
1. İsim yazarak ara → üye seç
2. Tüp (son kullanılan seçili gelir), ağırlık (`suggested_weight()` ile dolu gelir), giriş havası
3. Giriş saati: şimdi, düzenlenebilir
4. Eş ve lider: opsiyonel, arayarak

Hedef: eller ıslak, güneş var, aynı anda birkaç kişi suya giriyor. Mümkün olduğunca az dokunuş.

**Dalış kapat**
Suda kim var listesinden kişiye dokun → çıkış havası + saat (şimdi, düzenlenebilir) → kaydet. İki alan, başka bir şey sorma.

**Üye profili**
- Dijital log defteri
- Hava tüketim grafiği (`bar_per_min`; derinlik girilmişse `sac_rate`)
- Ağırlık trendi
- En derin / en uzun — sadece opsiyonel alanlar doluysa
- Kendi dalışlarının opsiyonel alanlarını doldurma ekranı

**Kamp özeti**
Toplam dalış, toplam dalış süresi, en aktif dalgıç.

---

## v1 kapsamı

- CRUD: kamp, üye, dalış
- Hızlı giriş/çıkış akışı
- Suda kim var
- Aktif kamp
- Üye profili + grafikler
- Kamp özeti
- Opsiyonel log doldurma
- Outbox seviyesinde offline

## v2

- Buddy graph (force-directed, kim kimle dalmış)
- Milestone'lar (50. dalış, ilk gece dalışı)
- Kamp Wrapped (paylaşılabilir özet kartı)
- Auth + davet kodu
- PWA / service worker

## Yapılmayacaklar

Bunlar tartışıldı ve elendi. Tekrar önerme:

- Brevet derecesi, derinlik limiti kontrolü, güvenlik uyarıları — bu bir kontrol sistemi değil, defter
- Acil durum kişisi / telefon — kamp formunda zaten var
- Tahmini çıkış saati, yüzey aralığı, uçuş uyarısı — kapsam dışı
- Aktivite heatmap, kohort analizi
- Ayrı `katilim` tablosu
- `karaci` rolü

---

## Devir

Bu proje kulübe devredilecek, senden sonra da yaşayacak.

- Supabase, Vercel/Cloudflare hesapları **kulüp hesabı** altında, kişisel hesap altında değil
- Env değişkenlerinin nerede tutulduğu README'de yazılı olmalı
- Karmaşık soyutlamalardan kaçın. Devralan kişi muhtemelen daha az deneyimli bir öğrenci olacak — elle yazılmış anlaşılır kod, akıllı ama opak bir çözümden iyidir
