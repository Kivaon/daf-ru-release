import { getChatGPTUser, safeReturnPath } from "../chatgpt-auth";

// На Sites этот путь обслуживает платформа. Вне Sites он должен быть закрыт политикой Cloudflare Access:
// после входа Access пропускает сюда, и мы возвращаем пользователя на страницу.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getChatGPTUser();
  if (!user) return new Response("Вход не выполнен: путь должен быть защищён Cloudflare Access.", { status: 401 });
  const target = safeReturnPath(url.searchParams.get("return_to") || "/");
  return Response.redirect(new URL(target, url.origin).toString(), 302);
}
