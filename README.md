# ODTÜ-SAT Karacı Veritabanı

Kulübün kağıt karacı defterinin yerini alan web uygulaması.

Proje kararları ve kapsam: [CLAUDE.md](CLAUDE.md)
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
Production'da aynı iki değişken Vercel/Cloudflare proje ayarlarına girilir.

Supabase, Vercel/Cloudflare hesapları **kulüp hesabı** altındadır; kişisel
hesap altında değil.

## Veritabanı kurulumu

Supabase SQL editor'de sırayla:

1. `schema.sql`
2. `seed.sql` — sadece geliştirme/test verisi, production'da çalıştırma

`seed.sql` tekrar çalıştırılabilir: sabit UUID'lerle upsert eder ve test
durumunu sıfırlar.

## Tipler

Şema değiştiğinde:

```bash
npm run types:gen
```

Üretilen `lib/database.types.ts` repoya commit edilir.
