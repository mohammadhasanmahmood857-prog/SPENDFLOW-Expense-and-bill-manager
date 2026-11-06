import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const body = z.object({ accessToken: z.string().min(20).max(8192), refreshToken: z.string().min(1).max(512) });
const noStore = { "Cache-Control": "private, no-store" };

// Turns the recovery session from a reset link into the usual Supabase session cookies.
// Same-origin only, so another site can't sign a visitor into an account it controls.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });

  const supabase = await createClient();
  // setSession checks the access token with Supabase Auth before storing it.
  const { data, error } = await supabase.auth.setSession({
    access_token: parsed.data.accessToken,
    refresh_token: parsed.data.refreshToken,
  });
  if (error || !data.user) return NextResponse.json({ error: "expired" }, { status: 401, headers: noStore });
  return new NextResponse(null, { status: 204, headers: noStore });
}
