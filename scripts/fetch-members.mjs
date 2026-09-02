// Üretir: members.sql -- kulübün gerçek üye listesi.
//
//   npm run members:gen
//
// Kaynak: https://odtusat.com.tr/uye-listesi/ · sayfadaki tablo
// #community-member-list, kolonları "Üye No | Ad, Soyad | Yıl".
//
// KURAL: üye numarası boş olan satırlar ALINMAZ. Numarası olmayan bir
// üye kaydını tanımlayamıyoruz; listede 55 tane böyle satır var.
//
// sat_no veritabanına kulübün yayımladığı düz haliyle yazılır ("1105").
// "SAT-" öneki sunuma ait, ekranda ekleniyor (lib/member.ts).
//
// Üye id'si sat_no'dan türetiliyor (uuid5), böylece dosya yeniden
// çalıştırılabilir: aynı üye her seferinde aynı id'yi alır ve
// "on conflict do update" kopya satır üretmez.

import { createHash } from "node:crypto";

const URL_UYE_LISTESI = "https://odtusat.com.tr/uye-listesi/";

// Sabit namespace. DEĞİŞTİRME: değişirse bütün üye id'leri değişir ve
// mevcut dalış kayıtlarının bağlandığı üyeler kaybolur.
const NAMESPACE = "6f1d0c9e-3a4b-5c6d-8e9f-0a1b2c3d4e5f";

/** RFC 4122 uuid5 (SHA-1). Python'daki uuid.uuid5 ile aynı sonucu verir. */
function uuid5(namespace, name) {
  const nsBytes = Buffer.from(namespace.replaceAll("-", ""), "hex");
  const hash = createHash("sha1")
    .update(Buffer.concat([nsBytes, Buffer.from(name, "utf8")]))
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // sürüm 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 varyantı

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&nbsp;", " ");
}

/** SQL tek tırnak kaçışı. */
function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const response = await fetch(URL_UYE_LISTESI, {
  headers: { "user-agent": "odtusat-karaci-db/1.0 (uye listesi senkronu)" },
});
if (!response.ok) {
  throw new Error(`Üye listesi çekilemedi: HTTP ${response.status}`);
}
const html = await response.text();

const table = html.match(/<table id="community-member-list".*?<\/table>/s);
if (!table) {
  throw new Error(
    'Sayfada #community-member-list tablosu bulunamadı. Site yapısı değişmiş olabilir.',
  );
}
const tbody = table[0].match(/<tbody>(.*)<\/tbody>/s);
if (!tbody) throw new Error("Tabloda tbody bulunamadı.");

const all = [];
for (const [, tr] of tbody[1].matchAll(/<tr>(.*?)<\/tr>/gs)) {
  const cells = [...tr.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(([, cell]) =>
    decodeEntities(cell.replace(/<[^>]+>/g, "")).trim(),
  );
  if (cells.length >= 3) all.push({ no: cells[0], name: cells[1], year: cells[2] });
}

const members = all.filter((m) => m.no !== "");
const skipped = all.length - members.length;

// Sayfa sırası yıla göre; id'ler sat_no'dan geldiği için sıralamayı
// numaraya çeviriyoruz: diff okunaklı olsun.
members.sort((a, b) => Number(a.no) - Number(b.no));

// Site değişirse sessizce bozuk dosya üretmesin diye kaba denetimler.
for (const m of members) {
  if (!/^\d+$/.test(m.no)) throw new Error(`Üye no sayı değil: ${m.no} (${m.name})`);
  if (m.name === "") throw new Error(`İsimsiz üye: no ${m.no}`);
  if (!/^\d{4}$/.test(m.year)) throw new Error(`Yıl dört haneli değil: ${m.year} (${m.name})`);
}
if (members.length < 500) {
  throw new Error(`Sadece ${members.length} üye ayrıştırıldı, bu beklenenden az.`);
}

const width = (values) => Math.max(...values.map((v) => v.length));
const wName = width(members.map((m) => quote(m.name)));
const wNo = width(members.map((m) => quote(m.no)));

const values = members
  .map((m, i) => {
    const id = quote(uuid5(NAMESPACE, `odtusat-member-${m.no}`));
    const end = i < members.length - 1 ? "," : "";
    return `  (${id.padEnd(38)}, ${quote(m.name).padEnd(wName)}, ${quote(m.no).padStart(wNo)}, ${m.year})${end}`;
  })
  .join("\n");

const today = new Date().toISOString().slice(0, 10);

process.stdout.write(`-- ODTU-SAT dive log -- REAL member records
--
-- GENERATED FILE. Do not edit by hand:
--
--   npm run members:gen
--
-- Source: ${URL_UYE_LISTESI} (the club's public member
-- list), fetched ${today}. The page had ${all.length} rows; the ${skipped} rows with no
-- member number are deliberately NOT imported -- a member record without
-- a number is not something we can identify.
--
-- This is real reference data, not test data: run it in production too.
-- Test camps and dives live in seed.sql, which you must NOT run in
-- production.
--
-- sat_no stores the BARE number as the club publishes it ('1105'). The
-- "SAT-" prefix is presentation only and is added on screen
-- (formatSatNo in lib/member.ts), never stored.
--
-- Re-runnable: each id is derived from sat_no (uuid5 of a fixed
-- namespace), so re-running updates the existing row instead of adding a
-- duplicate.
--
-- deleted_at is deliberately NOT reset on conflict: if someone soft
-- deleted a member in the app, re-running this file must not resurrect
-- them.
--
-- ${members.length} members.

insert into member (id, name, sat_no, joined_year) values
${values}
on conflict (id) do update set
  name        = excluded.name,
  sat_no      = excluded.sat_no,
  joined_year = excluded.joined_year;
`);
