import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import AuthHeaderButton from "@/components/jr/auth-header-button";

export const metadata: Metadata = {
  title: "JeRegime",
  description: "Accompagnement diététique personnalisé",
};

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
        JR
      </span>
      <span className="font-semibold tracking-tight">JeRegime</span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <Brand />
              <nav className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/blog" className="hover:text-foreground">Blog</Link>
                <Link href="/livre-blanc" className="hover:text-foreground">Livre blanc</Link>
                <Link href="/reunions-information" className="hover:text-foreground">Réunions</Link>
                <Link href="/contact" className="hover:text-foreground">Contact</Link>
                <AuthHeaderButton />
              </nav>
            </div>
          </header>

          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
            {children}
          </main>

          <footer className="border-t text-sm text-muted-foreground">
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-wrap gap-4">
              <a href="/mentions-legales">Mentions légales</a>
              <a href="/cgu">CGU</a>
              <a href="/confidentialite">Confidentialité</a>
              <a href="/rgpd">RGPD</a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
