export async function GET(request: Request) {
  const url = new URL(request.url);
  const masechta = url.searchParams.get("masechta") ?? "";
  const daf = url.searchParams.get("daf") ?? "";
  const amud = url.searchParams.get("amud") ?? "a";
  if (!/^[a-z-]+$/.test(masechta) || !/^\d{1,3}$/.test(daf) || !/^[ab]$/.test(amud)) return new Response("Invalid daf", { status: 400 });
  const source = `https://www.shas.org/daf-pdf/api/?masechta=${masechta}&daf=${daf}&amud=${amud}`;
  // the sheet server sometimes drops a connection; one more try usually succeeds
  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 2 && !upstream; attempt++) {
    upstream = await fetch(source, { signal: AbortSignal.timeout(15000), cf: { cacheEverything: true, cacheTtl: 86400 } } as RequestInit).catch(() => null);
    if (!upstream && attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (!upstream) return new Response("PDF source did not respond", { status: 504 });
  if (!upstream.ok) return new Response("PDF not found", { status: upstream.status });
  return new Response(upstream.body, { headers: { "content-type": "application/pdf", "cache-control": "public, max-age=86400" } });
}
