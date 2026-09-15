import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const source = Source_Sans_3({ variable: "--font-source", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem Laporan Praktikum - Universitas Ahmad Dahlan",
  description:
    "Sistem Pembuatan Laporan Praktikum Otomatis Universitas Ahmad Dahlan (UAD) - Fakultas Teknologi Industri, Program Studi Informatika.",
  icons: {
    icon: "/uad_logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fraunces.variable} ${source.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-slate-100/70 text-slate-900 antialiased selection:bg-amber-100 selection:text-blue-950">
        {children}
      </body>
    </html>
  );
}
