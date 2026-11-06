import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RecoveryHandler } from "@/components/recovery-handler";

export const metadata: Metadata = {
  title: "Opening your reset link",
  robots: { index: false, follow: false },
};

// Password-reset emails land here. The recovery session arrives in the URL fragment, which only the
// browser can read; RecoveryHandler hands it to the server and then opens the new-password form.
export default function RecoveryPage() {
  return (
    <AuthShell
      title="A fresh start."
      tagline="Choose a new password and you're back in."
      footnote="SpendFlow keeps your personal finances private."
    >
      <h2 className="display text-3xl">Choose a new password</h2>
      <RecoveryHandler />
    </AuthShell>
  );
}
