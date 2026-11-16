/** Адреса PDF следующей и предыдущей сторон листа (по адресу текущей); неверный адрес даёт пустой список. */
export function neighbourPdfs(url: string): string[] {
  let parsed: URL;
  try { parsed = new URL(url, "http://x"); } catch { return []; }
  const masechta = parsed.searchParams.get("masechta"), daf = Number(parsed.searchParams.get("daf")), amud = parsed.searchParams.get("amud");
  if (!masechta || !Number.isInteger(daf) || daf < 2 || (amud !== "a" && amud !== "b")) return [];
  const address = (d: number, a: string) => `${parsed.pathname}?masechta=${masechta}&daf=${d}&amud=${a}`;
  const result = [amud === "a" ? address(daf, "b") : address(daf + 1, "a")];
  if (amud === "b") result.push(address(daf, "a"));
  else if (daf > 2) result.push(address(daf - 1, "b"));
  return result;
}
