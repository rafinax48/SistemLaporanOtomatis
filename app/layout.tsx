import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"]
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"]
});

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
    <html lang="id" className={`${jakarta.variable} ${jetbrains.variable} scroll-smooth`}>
      <body className="min-h-screen font-sans bg-slate-50 text-slate-900 antialiased selection:bg-amber-200 selection:text-[#002b66] relative overflow-x-hidden">
        {/* Subtle Ambient Mesh Glow Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-blue-200/40 via-indigo-100/30 to-transparent blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-100/35 via-orange-50/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-40 right-1/4 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tl from-sky-100/40 via-blue-50/20 to-transparent blur-3xl" />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
