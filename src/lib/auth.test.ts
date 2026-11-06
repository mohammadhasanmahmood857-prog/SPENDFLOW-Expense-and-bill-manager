import { describe, expect, it } from "vitest";
import {
  PASSWORD_CHANGE_WINDOW_SECONDS,
  PASSWORD_MIN_LENGTH,
  authErrorMessage,
  canChangePasswordFrom,
  newPasswordProblem,
  passwordStrength,
  safeNextPath,
  signInErrorMessage,
} from "@/lib/auth";

// Signup and password reset share this rule; it must match the Supabase dashboard minimum (12).
describe("newPasswordProblem", () => {
  const good = "correct horse battery";

  it("requires the dashboard minimum of 12 characters", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(newPasswordProblem("a".repeat(11), "a".repeat(11))).toMatch(/at least 12/);
    expect(newPasswordProblem("a".repeat(12), "a".repeat(12))).toBeNull();
  });

  it("rejects a mismatched confirmation", () => {
    expect(newPasswordProblem(good, `${good}!`)).toBe("The two passwords do not match.");
    expect(newPasswordProblem(good, null)).toBe("The two passwords do not match.");
  });

  it("does not trim, so spaces count and must match exactly", () => {
    expect(newPasswordProblem(`  ${good}`, good)).toBe("The two passwords do not match.");
    expect(newPasswordProblem("     short  ", "     short  ")).toBeNull();
  });

  it("rejects passwords longer than bcrypt's 72-byte limit, counting bytes not characters", () => {
    expect(newPasswordProblem("a".repeat(72), "a".repeat(72))).toBeNull();
    expect(newPasswordProblem("a".repeat(73), "a".repeat(73))).toMatch(/too long/);
    const accented = "é".repeat(37); // 37 characters, 74 bytes in UTF-8
    expect(newPasswordProblem(accented, accented)).toMatch(/too long/);
  });

  it("rejects non-string form values", () => {
    expect(newPasswordProblem(null, null)).toMatch(/at least 12/);
    expect(newPasswordProblem(undefined, undefined)).toMatch(/at least 12/);
  });
});

describe("authErrorMessage", () => {
  it("explains a weak password using the configured minimum", () => {
    expect(authErrorMessage({ code: "weak_password", message: "Password is known to be weak" }, "x"))
      .toMatch(/too weak.*12 characters/);
  });

  it("maps rate limits to a wait message", () => {
    expect(authErrorMessage({ code: "over_email_send_rate_limit" }, "x")).toMatch(/Too many email attempts/);
    expect(authErrorMessage({ code: "over_request_rate_limit" }, "x")).toMatch(/^Too many attempts/);
    expect(authErrorMessage({ message: "Request rate limit reached" }, "x")).toMatch(/^Too many attempts/);
  });

  it("asks for a different password when it is unchanged", () => {
    expect(authErrorMessage({ code: "same_password" }, "x")).toMatch(/different from your current/);
  });

  it("uses the fallback when Supabase gives no message", () => {
    expect(authErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(authErrorMessage({ message: "   " }, "Fallback")).toBe("Fallback");
  });
});

describe("signInErrorMessage", () => {
  it("gives one generic message for a wrong password or an unknown email", () => {
    expect(signInErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }))
      .toEqual({ message: "Incorrect email or password.", unverified: false });
  });

  it("flags an unconfirmed email so the resend option appears", () => {
    expect(signInErrorMessage({ code: "email_not_confirmed" }).unverified).toBe(true);
    expect(signInErrorMessage({ message: "Email not confirmed" }).unverified).toBe(true);
  });

  it("maps rate limits without exposing raw details", () => {
    expect(signInErrorMessage({ code: "over_request_rate_limit" }))
      .toEqual({ message: "Too many attempts. Please wait a moment and try again.", unverified: false });
  });

  it("never shows raw Auth details for unknown errors", () => {
    expect(signInErrorMessage({ code: "unexpected_failure", message: "Database error querying schema" }))
      .toEqual({ message: "Check your email and password.", unverified: false });
  });
});

// Only a session an emailed link created in the last 15 minutes may set a new password.
describe("canChangePasswordFrom", () => {
  const now = 1_800_000_000;

  it.each([
    ["a token_hash reset link (otp)", [{ method: "otp", timestamp: now - 60 }]],
    ["a PKCE reset link (recovery)", [{ method: "recovery", timestamp: now - 60 }]],
    ["a link at the edge of the window", [{ method: "otp", timestamp: now - PASSWORD_CHANGE_WINDOW_SECONDS }]],
    ["a link among other methods", [{ method: "password", timestamp: now - 9_000 }, { method: "recovery", timestamp: now - 30 }]],
  ])("allows %s", (_label, amr) => {
    expect(canChangePasswordFrom(amr, now)).toBe(true);
  });

  it.each([
    ["an ordinary password sign-in", [{ method: "password", timestamp: now - 60 }]],
    ["a reset link older than 15 minutes", [{ method: "otp", timestamp: now - PASSWORD_CHANGE_WINDOW_SECONDS - 1 }]],
    ["a timestamp in the future", [{ method: "otp", timestamp: now + 3_600 }]],
    ["string-only amr without timestamps", ["otp"]],
    ["a missing claim", undefined],
    ["a malformed claim", [{ method: "otp" }]],
  ])("refuses %s", (_label, amr) => {
    expect(canChangePasswordFrom(amr, now)).toBe(false);
  });
});

describe("passwordStrength", () => {
  it("says nothing for an empty field and asks for 12 characters below the minimum", () => {
    expect(passwordStrength("").label).toBe("");
    expect(passwordStrength("short-pass1")).toMatchObject({ level: 0, label: "Too short" });
  });

  it("rates obvious patterns as weak even when long", () => {
    expect(passwordStrength("Password12345678").label).toBe("Weak");
    expect(passwordStrength("aaaaaaaaaaaaaaaa").label).toBe("Weak");
    expect(passwordStrength("qwertyuiopasdfgh").label).toBe("Weak");
  });

  it("rewards length and variety", () => {
    expect(passwordStrength("violet-harbor-17").level).toBeGreaterThanOrEqual(2);
    expect(passwordStrength("Violet harbor tractor 17!").label).toBe("Strong");
  });

  it("never claims a breach check", () => {
    for (const sample of ["", "short", "Password12345678", "Violet harbor tractor 17!"]) {
      expect(JSON.stringify(passwordStrength(sample))).not.toMatch(/breach|pwned|leak/i);
    }
  });
});

// safeNextPath decides where sign-in and the proxy redirect to, so it must never leave the site.
describe("safeNextPath", () => {
  it.each([
    ["/dashboard/bills", "/dashboard/bills"],
    ["/dashboard/transactions?page=2", "/dashboard/transactions?page=2"],
    ["/reset-password", "/reset-password"],
  ])("keeps the in-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "//evil.example",
    "//evil.example/dashboard",
    "/\\evil.example",
    "https://evil.example/x",
    "http://evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    "   ",
  ])("rejects %j and falls back to /dashboard", (input) => {
    expect(safeNextPath(input)).toBe("/dashboard");
  });

  it("falls back for non-string values from form data", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath(42)).toBe("/dashboard");
  });

  it("keeps only the path from an allowed local absolute URL", () => {
    expect(safeNextPath("http://localhost:3000/dashboard/budgets")).toBe("/dashboard/budgets");
  });
});
