import { createServerClient } from "@supabase/ssr";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  // No-store headers sent with refreshed auth cookies, so a CDN never serves one user's session to another.
  let cacheHeaders: Record<string, string> = {};
  const supabase = createServerClient<Database, "public">(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        cacheHeaders = { ...cacheHeaders, ...headers };
        Object.entries(cacheHeaders).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  // A signed-out visitor simply has no session; only real failures are worth logging.
  if (error && !isAuthSessionMissingError(error)) console.error("Could not refresh Supabase session:", error.message);
  // Redirects carry whatever setAll wrote (refreshed or cleared session cookies) and its no-store headers.
  function redirectWithSession(url: URL) {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(cacheHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
    return redirect;
  }
  const { pathname } = request.nextUrl;
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithSession(url);
  }
  // Signed-in visitors skip the sign-in pages. Done here so those pages ship no Supabase browser client.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return redirectWithSession(new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url));
  }
  return response;
}
