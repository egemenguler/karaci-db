import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="ODTÜ-SAT"
            width={128}
            height={128}
            className="size-9"
            priority
          />
          <span className="font-semibold tracking-tight text-brand-800">
            Karacı
          </span>
        </Link>
      </div>
    </header>
  );
}
