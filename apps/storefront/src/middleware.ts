import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // 1. Check if there is a "?store=slug" query parameter
  const storeParam = url.searchParams.get("store");

  if (storeParam) {
    // Rewrite the request to route into the /[store] dynamic folder
    return NextResponse.rewrite(new URL(`/${storeParam}${url.pathname}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
