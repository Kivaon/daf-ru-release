/**
 * Снимок текста Sefaria (Wikisource Talmud Bavli, CC BY-SA): по файлу на сторону листа в public/text/<Трактат>/<сторона>.json.
 * Отдаётся с нашего же сервера, поэтому первый показ листа не зависит от задержек Sefaria. Если файла нет или он повреждён,
 * приложение берёт текст у Sefaria, как раньше. Тексты Davidson (CC BY-NC) в снимок не входят: из них взяты только четыре
 * признака «реплика продолжается через границу листа» (см. boundaryFlags).
 */
export const SNAPSHOT_VERSION = 1;

export const clean = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
export const sentenceEnds = (value: string) => /[.!?׃։][\s"'׳״’”)]*$/.test(clean(value));
export const beginsLowercase = (value: string) => /^[^A-Za-z]*[a-z]/.test(clean(value));

/** [первая реплика есть на обоих языках, английский с маленькой буквы, последняя реплика есть на обоих языках, предложение не закончено] */
export type BoundaryFlags = { firstOk: boolean; firstLower: boolean; lastOk: boolean; lastOpen: boolean };

export function boundaryFlags(he: string[], en: string[]): BoundaryFlags {
  const firstHe = he[0] || "", firstEn = en[0] || "", lastHe = he.at(-1) || "", lastEn = en.at(-1) || "";
  return {
    firstOk: Boolean(firstHe && firstEn), firstLower: beginsLowercase(firstEn),
    lastOk: Boolean(lastHe && lastEn), lastOpen: !sentenceEnds(lastHe) && !sentenceEnds(lastEn),
  };
}

/** Реплика слева продолжается справа (то же условие, что раньше проверялось по текстам Davidson). */
export function flagsContinue(left: BoundaryFlags, right: BoundaryFlags) {
  return left.lastOk && right.firstOk && left.lastOpen && right.firstLower;
}

export type SideSnapshot = { v: number; segs: string[]; f: [0 | 1, 0 | 1, 0 | 1, 0 | 1] };

export const snapshotPath = (sefaria: string, key: string) => `/text/${sefaria.replace(/ /g, "_")}/${key}.json`;

export function snapshotFromTexts(wikisource: string[], davidsonHe: string[], davidsonEn: string[]): SideSnapshot {
  const flags = boundaryFlags(davidsonHe, davidsonEn);
  return { v: SNAPSHOT_VERSION, segs: wikisource.map(clean), f: [Number(flags.firstOk) as 0 | 1, Number(flags.firstLower) as 0 | 1, Number(flags.lastOk) as 0 | 1, Number(flags.lastOpen) as 0 | 1] };
}

export function isSideSnapshot(value: unknown): value is SideSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SideSnapshot>;
  return item.v === SNAPSHOT_VERSION && Array.isArray(item.segs) && item.segs.every((part) => typeof part === "string")
    && Array.isArray(item.f) && item.f.length === 4 && item.f.every((flag) => flag === 0 || flag === 1);
}

export function flagsOf(snapshot: SideSnapshot): BoundaryFlags {
  return { firstOk: snapshot.f[0] === 1, firstLower: snapshot.f[1] === 1, lastOk: snapshot.f[2] === 1, lastOpen: snapshot.f[3] === 1 };
}

/** Файл стороны из снимка; null — файла нет или он непригоден (тогда текст берут у Sefaria). */
export async function fetchSideSnapshot(sefaria: string, key: string, fetcher: typeof fetch = fetch, timeoutMs = 4000): Promise<SideSnapshot | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(snapshotPath(sefaria, key), { signal: controller.signal });
      if (!response.ok) return null;
      const data = await response.json();
      return isSideSnapshot(data) ? data : null;
    } finally { clearTimeout(timer); }
  } catch { return null; }
}
