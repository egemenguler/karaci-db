// Geçici sayfa. Adım 3'te "suda kim var" ekranıyla değiştirilecek.
// Şu anki tek işi: tema değişkenlerinin Tailwind sınıflarına
// doğru bağlandığını gözle doğrulamak.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const diveColors = [
  { name: "dive-fresh", label: "0–20 dk", className: "bg-dive-fresh" },
  { name: "dive-mid", label: "20–35 dk", className: "bg-dive-mid" },
  { name: "dive-long", label: "35–50 dk", className: "bg-dive-long" },
  { name: "dive-deep", label: "50+ dk", className: "bg-dive-deep" },
];

const brandSteps = [
  "bg-brand-100",
  "bg-brand-300",
  "bg-brand-500",
  "bg-brand-700",
  "bg-brand-900",
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tema kontrolü</h1>
        <p className="text-sm text-muted-foreground">
          Adım 1 iskeleti. Buraya adım 3&apos;te &quot;suda kim var&quot; gelecek.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dalış süresi renkleri</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {diveColors.map((c) => (
            <div key={c.name} className="space-y-1.5">
              <div className={`h-16 rounded-lg border ${c.className}`} />
              <div className="text-xs font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand skalası</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {brandSteps.map((c) => (
              <div key={c} className={`h-10 flex-1 rounded-md border ${c}`} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Dalış Başlat</Button>
            <Button variant="secondary">İkincil</Button>
            <Button variant="outline">Anahat</Button>
            <span className="text-brand-800 text-sm font-medium">
              text-brand-800
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
