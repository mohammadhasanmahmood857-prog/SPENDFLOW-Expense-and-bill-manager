import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // /reset-password is left out on purpose: a recovery link signs the user in, and they must still see the form.
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
  ],
};
