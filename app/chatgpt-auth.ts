import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { fetchAccessKeys, readCookie, verifyAccessJwt } from "./cfAccess";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!userId || !email) return getCloudflareAccessUser(requestHeaders);

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

/**
 * Запасной вход вне Sites: личность из JWT Cloudflare Access (заголовок или cookie CF_Authorization).
 * Включается переменными CF_ACCESS_TEAM_DOMAIN и CF_ACCESS_AUD; без них возвращает null.
 * userId = "cf:" + email, чтобы идентификатор не зависел от поставщика входа.
 */
async function getCloudflareAccessUser(requestHeaders: Headers): Promise<ChatGPTUser | null> {
  const vars = env as unknown as Record<string, unknown>;
  const teamDomain = String(vars.CF_ACCESS_TEAM_DOMAIN || "");
  const audience = String(vars.CF_ACCESS_AUD || "");
  if (!teamDomain || !audience) return null;

  const token =
    requestHeaders.get("cf-access-jwt-assertion") ||
    readCookie(requestHeaders.get("cookie"), "CF_Authorization");
  if (!token) return null;

  const identity = await verifyAccessJwt(token, { teamDomain, audience }, fetchAccessKeys);
  if (!identity) return null;
  return {
    userId: `cf:${identity.email}`,
    displayName: identity.name ?? identity.email,
    email: identity.email,
    fullName: identity.name,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function safeReturnPath(value: string): string {
  return safeRelativeReturnPath(value);
}
