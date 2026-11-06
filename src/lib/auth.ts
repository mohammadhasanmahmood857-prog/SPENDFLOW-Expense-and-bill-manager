const fallbackOrigin = "https://spendflow.local";
const configuredOrigin = (() => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin;
    return new URL(siteUrl).origin;
  } catch {
    return new URL(fallbackOrigin).origin;
  }
})();
const allowedLocalHosts = new Set([
  "spendflow.local",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

function normalizeSafePath(pathname: string) {
  if (!pathname || pathname.startsWith("//") || pathname.includes("\\")) return "/dashboard";
  return pathname;
}

// Must match Supabase Dashboard → Authentication → Providers → Email → Minimum password length.
export const PASSWORD_MIN_LENGTH = 12;
// Supabase hashes passwords with bcrypt, which only reads the first 72 bytes and rejects longer input.
export const PASSWORD_MAX_BYTES = 72;

/** Returns a user-facing problem with a new password, or null when it is acceptable. Never trims. */
export function newPasswordProblem(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Use a password with at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "That password is too long. Use 72 characters or fewer (fewer if it has emoji or accented letters).";
  }
  if (confirmation !== password) return "The two passwords do not match.";
  return null;
}

export type PasswordStrength = { level: 0 | 1 | 2 | 3 | 4; label: string; tips: string[] };

const strengthLabels = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;
const commonFragments = ["password", "passw0rd", "spendflow", "qwerty", "letmein", "welcome", "admin", "iloveyou", "123456", "abc123", "111111"];

/** Guidance only (the server rule is newPasswordProblem). Rewards length first, then variety; penalises obvious patterns. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { level: 0, label: "", tips: [] };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { level: 0, label: strengthLabels[0], tips: [`Use at least ${PASSWORD_MIN_LENGTH} characters.`] };
  }
  const lower = password.toLowerCase();
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const obvious = commonFragments.some((fragment) => lower.includes(fragment))
    || /(.)\1{3,}/.test(password)
    || /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|asdf|zxcv)/i.test(password);
  let level = 1 + (password.length >= 16 ? 1 : 0) + (password.length >= 20 ? 1 : 0) + (variety >= 3 ? 1 : 0);
  const tips: string[] = [];
  if (obvious) {
    level = 1;
    tips.push("Avoid common words, repeated characters and keyboard or number runs.");
  }
  if (level < 3) tips.push("Longer is stronger: three or four unrelated words make a good passphrase.");
  const clamped = Math.min(level, 4) as PasswordStrength["level"];
  return { level: clamped, label: strengthLabels[clamped], tips };
}

// A new password may only be set from a session that an emailed link created in the last 15 minutes,
// so a stolen or unattended signed-in session can't change it. Supabase records how a session was
// created in the signed access token's `amr` claim: "otp" for token_hash links (reset and
// confirmation), "recovery" for PKCE reset links, "password" for an ordinary sign-in.
export const PASSWORD_CHANGE_WINDOW_SECONDS = 15 * 60;
const emailLinkMethods = new Set(["otp", "recovery"]);

export function canChangePasswordFrom(amr: unknown, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return typeof method === "string" && emailLinkMethods.has(method)
      && typeof timestamp === "number"
      && timestamp <= nowSeconds + 60
      && nowSeconds - timestamp <= PASSWORD_CHANGE_WINDOW_SECONDS;
  });
}

type AuthErrorLike = { code?: string; message?: string } | null | undefined;

/** Turns a Supabase Auth error into a message safe to show; never includes passwords or tokens. */
export function authErrorMessage(error: AuthErrorLike, fallback: string) {
  const message = error?.message?.trim() || "";
  const lower = message.toLowerCase();

  if (
    error?.code === "over_email_send_rate_limit"
    || (lower.includes("rate limit") && lower.includes("email"))
  ) {
    return "Too many email attempts. Please wait a moment and try again.";
  }
  if (error?.code === "over_request_rate_limit" || lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (error?.code === "weak_password") {
    return `That password is too weak. Use at least ${PASSWORD_MIN_LENGTH} characters and avoid common words or patterns.`;
  }
  if (error?.code === "same_password") {
    return "Choose a password that is different from your current one.";
  }
  return message || fallback;
}

/** Sign-in errors stay generic so the form never reveals whether an email has an account. */
export function signInErrorMessage(error: AuthErrorLike) {
  const unverified = error?.code === "email_not_confirmed"
    || Boolean(error?.message?.toLowerCase().includes("email not confirmed"));
  if (unverified) return { message: "Please verify your email before logging in.", unverified };
  if (error?.code === "invalid_credentials") return { message: "Incorrect email or password.", unverified };
  // Rate limits get their wait message; any other raw Auth detail stays out of the sign-in form.
  const mapped = authErrorMessage(error, "");
  return { message: mapped.startsWith("Too many") ? mapped : "Check your email and password.", unverified };
}

export function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/dashboard";
  const candidate = value.trim();
  if (!candidate) return "/dashboard";

  if (candidate.startsWith("/")) {
    try {
      const url = new URL(candidate, configuredOrigin);
      if (url.origin !== configuredOrigin) return "/dashboard";
      return normalizeSafePath(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return "/dashboard";
    }
  }

  if (!/^https?:\/\//i.test(candidate)) return "/dashboard";

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isConfiguredOrigin = url.origin === configuredOrigin;
    const isLocal = allowedLocalHosts.has(hostname) || hostname.endsWith(".localhost");
    if (!isConfiguredOrigin && !isLocal) return "/dashboard";
    return normalizeSafePath(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return "/dashboard";
  }
}
