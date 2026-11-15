/**
 * Настройки показа статьи (только экран). Ничего не пишется в базу: набор хранится
 * в браузере читателя, как и позиция в трактате. Любой повреждённый или неполный
 * набор молча заменяется значениями по умолчанию.
 */
export type ViewMode = "reply" | "page";
export type ViewSettings = {
  /** reply — одна статья выбранной реплики; page — перевод всего листа сплошным текстом. */
  mode: ViewMode;
  original: boolean;
  /** Огласовки оригинала: включено — показывать, если есть данные; выключено — снимать. */
  niqqud: boolean;
  title: boolean;
  translation: boolean;
  explanation: boolean;
  rashi: boolean;
  tosafot: boolean;
};
export type ViewFlag = Exclude<keyof ViewSettings, "mode">;

export const VIEW_KEY = "daf-ru-view-v1";
export const VIEW_FLAGS: readonly ViewFlag[] = ["original", "niqqud", "title", "translation", "explanation", "rashi", "tosafot"];
export const DEFAULT_VIEW: ViewSettings = { mode: "reply", original: true, niqqud: true, title: true, translation: true, explanation: true, rashi: true, tosafot: true };

export function normalizeView(raw: unknown): ViewSettings {
  const view: ViewSettings = { ...DEFAULT_VIEW };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return view;
  const input = raw as Record<string, unknown>;
  for (const flag of VIEW_FLAGS) if (typeof input[flag] === "boolean") view[flag] = input[flag] as boolean;
  if (input.mode === "reply" || input.mode === "page") view.mode = input.mode;
  return view;
}

type ReadableStorage = Pick<Storage, "getItem"> | null | undefined;
type WritableStorage = Pick<Storage, "setItem"> | null | undefined;

export function loadView(storage: ReadableStorage): ViewSettings {
  try { return normalizeView(JSON.parse(storage?.getItem(VIEW_KEY) ?? "null")); } catch { return { ...DEFAULT_VIEW }; }
}

export function saveView(storage: WritableStorage, view: ViewSettings): void {
  try { storage?.setItem(VIEW_KEY, JSON.stringify(normalizeView(view))); } catch { /* приватный режим или полное хранилище: настройки просто не запомнятся */ }
}

/** Готовые виды меняют только блоки; режим и огласовки остаются как выбрал читатель. */
export const VIEW_PRESETS: readonly { id: string; label: string; blocks: Partial<Record<ViewFlag, boolean>> }[] = [
  { id: "all", label: "Всё", blocks: { original: true, title: true, translation: true, explanation: true, rashi: true, tosafot: true } },
  { id: "translation", label: "Только перевод", blocks: { original: false, title: false, translation: true, explanation: false, rashi: false, tosafot: false } },
  { id: "original-translation", label: "Оригинал и перевод", blocks: { original: true, title: false, translation: true, explanation: false, rashi: false, tosafot: false } },
  { id: "no-commentary", label: "Без Раши и Тосафот", blocks: { original: true, title: true, translation: true, explanation: true, rashi: false, tosafot: false } },
];

export function applyPreset(view: ViewSettings, id: string): ViewSettings {
  const preset = VIEW_PRESETS.find((item) => item.id === id);
  return preset ? normalizeView({ ...view, ...preset.blocks }) : view;
}

export function presetOf(view: ViewSettings): string | null {
  return VIEW_PRESETS.find((preset) => Object.entries(preset.blocks).every(([flag, value]) => view[flag as ViewFlag] === value))?.id ?? null;
}

const NIQQUD = /[֑-ׇ]/g;
/** Снимает огласовки и знаки кантилляции; буквы не затрагиваются. */
export function stripNiqqud(text: string): string {
  return text.replace(NIQQUD, "");
}

/**
 * Текст оригинала для показа. Огласованный вариант (когда появятся данные) подставляется
 * только при включённой настройке; иначе показывается исходный текст без изменений.
 */
export function originalText(plain: string, view: Pick<ViewSettings, "niqqud">, vocalized?: string | null): string {
  if (!view.niqqud) return stripNiqqud(plain);
  return vocalized ?? plain;
}
