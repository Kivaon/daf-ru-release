// Вне Sites выход выполняет Cloudflare Access.
export async function GET(request: Request) {
  return Response.redirect(new URL("/cdn-cgi/access/logout", request.url).toString(), 302);
}
