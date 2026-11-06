"use client";

import { useId, useState } from "react";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, passwordStrength } from "@/lib/auth";

const meterColors = ["", "bg-[var(--danger)]", "bg-[var(--warning)]", "bg-[var(--success)]", "bg-[var(--success)]"];

// New-password and confirmation inputs with live guidance. The server re-checks everything
// (newPasswordProblem); this only helps people choose a strong password before they submit.
export function PasswordFields({
  label = "Password",
  confirmLabel = "Confirm password",
  readOnly = false,
}: {
  label?: string;
  confirmLabel?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const strength = passwordStrength(password);
  const tooLong = new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES;
  const mismatch = confirmation.length > 0 && confirmation !== password;

  return (
    <>
      <label className="label">
        {label}
        <span id={`${id}-rule`} className="text-[11px] font-normal leading-4 text-[#65716d]">
          At least {PASSWORD_MIN_LENGTH} characters. Three or four unrelated words make a strong passphrase. Use one you don&apos;t use on any other site.
        </span>
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_BYTES}
          aria-describedby={`${id}-rule ${id}-strength`}
          readOnly={readOnly}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <div id={`${id}-strength`} aria-live="polite" className="-mt-2 grid gap-1.5">
        {password && (
          <>
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((step) => (
                <span key={step} className={`h-1.5 flex-1 rounded-full ${strength.level >= step ? meterColors[strength.level] : "bg-[#e5eae7]"}`} />
              ))}
            </div>
            <p className="text-xs text-[#53605c]">
              <span className="font-semibold">Strength: {strength.label}.</span>
              {strength.tips.length > 0 && <> {strength.tips.join(" ")}</>}
            </p>
            {tooLong && <p className="text-xs text-[var(--danger)]">That password is too long. Use {PASSWORD_MAX_BYTES} characters or fewer.</p>}
          </>
        )}
      </div>
      <label className="label">
        {confirmLabel}
        <input
          className="field"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_BYTES}
          aria-invalid={mismatch || undefined}
          aria-describedby={mismatch ? `${id}-match` : undefined}
          readOnly={readOnly}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      {mismatch && <p id={`${id}-match`} className="-mt-2 text-xs text-[var(--danger)]">The two passwords do not match.</p>}
    </>
  );
}
