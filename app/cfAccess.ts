// Проверка JWT Cloudflare Access (RS256) без внешних зависимостей. Чистые функции — без cloudflare:workers,
// чтобы их можно было тестировать в node.

export type AccessConfig = { teamDomain: string; audience: string };
export type AccessIdentity = { email: string; name: string | null };
export type Jwk = JsonWebKey & { kid?: string };
export type FetchKeys = (certsUrl: string) => Promise<Jwk[]>;

const decoder = new TextDecoder();

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseJson(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const value = JSON.parse(decoder.decode(bytes));
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function normalizeTeamDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}

/** Достаёт значение cookie из заголовка Cookie. */
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

/**
 * Проверяет подпись, срок действия, issuer и audience. Возвращает личность или null.
 * Любая ошибка (в том числе недоступность ключей) означает «не авторизован».
 */
export async function verifyAccessJwt(
  token: string,
  config: AccessConfig,
  fetchKeys: FetchKeys,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<AccessIdentity | null> {
  const team = normalizeTeamDomain(config.teamDomain);
  if (!team || !config.audience) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = parseJson(base64UrlToBytes(parts[0]));
  const payload = parseJson(base64UrlToBytes(parts[1]));
  if (!header || !payload || header.alg !== "RS256" || typeof header.kid !== "string") return null;

  if (payload.iss !== `https://${team}`) return null;
  const audience = payload.aud;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.includes(config.audience)) return null;
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
  if (typeof payload.nbf === "number" && payload.nbf > nowSeconds + 60) return null;

  let keys: Jwk[];
  try {
    keys = await fetchKeys(`https://${team}/cdn-cgi/access/certs`);
  } catch {
    return null;
  }
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) return null;
  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null;
  return { email, name };
}

let cachedKeys: { url: string; keys: Jwk[]; expires: number } | null = null;

/** Загрузка ключей Access с кэшем на час в памяти изолята. */
export const fetchAccessKeys: FetchKeys = async (url) => {
  const now = Date.now();
  if (cachedKeys && cachedKeys.url === url && cachedKeys.expires > now) return cachedKeys.keys;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`certs ${response.status}`);
  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  cachedKeys = { url, keys, expires: now + 60 * 60 * 1000 };
  return keys;
};
