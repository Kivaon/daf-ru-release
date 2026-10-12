import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://daf-ru.mffkk78khq.chatgpt.site"),
  title: "Daf-Ru — Бехорот 2а",
  description: "Учимся читать оригинальный лист: Гемара, русский перевод и Раши.",
  openGraph: {
    title: "Daf-Ru — Бехорот 2а",
    description: "Учимся читать оригинальный лист: Гемара, русский перевод и Раши.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daf-Ru — Бехорот 2а",
    description: "Учимся читать оригинальный лист: Гемара, русский перевод и Раши.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru"><body>{children}<footer className="siteFooter" aria-label="Информация о сайте"><span>© 2026 Pitronot Group</span><span>Версия 80 · Опубликовано <time dateTime="2026-10-12">12.10.2026</time></span></footer></body></html>
  );
}
