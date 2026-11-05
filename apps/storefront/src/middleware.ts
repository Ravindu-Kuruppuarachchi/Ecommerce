import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Legacy ?store= links redirect to the canonical route and keep search filters. */
export function middleware(req: NextRequest) {
  const store = req.nextUrl.searchParams.get("store");
  if (!store) return NextResponse.next();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store) || store.length > 60) {
    return NextResponse.json({ error: "Invalid store address" }, { status: 400 });
  }
  const url = req.nextUrl.clone();
  url.searchParams.delete("store");
  if (url.pathname !== `/${store}` && !url.pathname.startsWith(`/${store}/`)) url.pathname = `/${store}${url.pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|template-assets|template-preview).*)"] };
