import type { Metadata } from "next";
import "./globals.css";
import DebugPanel from "./DebugPanel";
import { debugBootScript } from "./debugBoot";
import { DICTA_URL } from "./vocalized";

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
    <html lang="ru"><body><script dangerouslySetInnerHTML={{ __html: debugBootScript }} />{children}<DebugPanel /><footer className="siteFooter" aria-label="Информация о сайте"><p>Daf-Ru — проект Pitronot Group, 2026</p><p>Версия 81 · Опубликовано <time dateTime="2026-10-12">12.10.2026</time></p><p className="siteFooterSources">Использованы материалы <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer">Sefaria</a></p><p>Огласовки: <a href={DICTA_URL} target="_blank" rel="noopener noreferrer">Dicta</a> — Израильский центр анализа текстов, лицензия CC BY-SA</p></footer></body></html>
  );
}
