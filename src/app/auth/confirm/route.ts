import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>(["signup", "email", "invite", "magiclink", "recovery", "email_change"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeNextPath(params.get("next"));
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);

  const supabase = await createClient();
  let error: { message: string; code?: string } | null = null;
  if (tokenHash && type && otpTypes.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    loginUrl.searchParams.set("error", "The confirmation link is invalid or has expired. Request a new one.");
    loginUrl.searchParams.set("unverified", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (error) {
    // A PKCE code opened in a different browser than the one used to sign up cannot start a
    // session here, but Supabase has already confirmed the address by this point.
    if (code && /code verifier|code_verifier|flow state/i.test(`${error.code} ${error.message}`)) {
      loginUrl.searchParams.set("notice", "If you opened this link in a different browser, your email is confirmed. Sign in to continue.");
    } else {
      loginUrl.searchParams.set("error", "The confirmation link is invalid or has expired. Request a new one.");
      loginUrl.searchParams.set("unverified", "1");
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
