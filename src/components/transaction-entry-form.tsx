"use client";

import { useState } from "react";
import { saveTransaction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIES } from "@/lib/finance";
import { createClient } from "@/lib/supabase/browser";

const receiptExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function TransactionEntryForm({ defaultDate }: { defaultDate: string }) {
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");

  async function readReceipt() {
    if (!receipt || !receipt.type.startsWith("image/")) {
      setOcrStatus("Text recognition is available for receipt images.");
      return;
    }
    setOcrStatus("Reading receipt text…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const result = await worker.recognize(receipt);
        setOcrText(result.data.text.trim().slice(0, 20_000));
        setOcrStatus(result.data.text.trim() ? "Receipt text is ready to review." : "No readable text was found.");
      } finally {
        await worker.terminate();
      }
    } catch (reason) {
      setOcrStatus(reason instanceof Error ? `Could not read receipt: ${reason.message}` : "Could not read receipt text.");
    }
  }

  async function submit(formData: FormData) {
    setError("");
    if (receipt) {
      const extension = receiptExtensions[receipt.type];
      if (!extension || receipt.size > 5 * 1024 * 1024) {
        setError("Choose a JPG, PNG, WebP, or PDF file under 5 MB.");
        return;
      }
      let path: string;
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Your session expired. Sign in again before uploading a receipt.");
            return;
        }
        path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receipt, {
          contentType: receipt.type,
          upsert: false,
        });
        if (uploadError) {
          setError(`Receipt upload failed: ${uploadError.message}`);
            return;
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not upload this receipt.");
        return;
      }
      formData.delete("receipt");
      formData.set("receipt_path", path);
    }
    await saveTransaction(formData);
  }

  return (
    <form action={submit} className="grid gap-4 border-t border-[var(--line)] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
      <label className="label">Amount<input className="field" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required /></label>
      <label className="label">Type<select className="field" name="type" defaultValue="expense"><option value="expense">Expense</option><option value="income">Income</option></select></label>
      <label className="label">Category<select className="field" name="category" defaultValue="Food">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="label">Date<input className="field" name="transaction_date" type="date" defaultValue={defaultDate} required /></label>
      <label className="label sm:col-span-2">Description<input className="field" name="description" maxLength={160} placeholder="What was this for?" /></label>
      <div className="grid gap-2 lg:col-span-2">
        <label className="label">Receipt <span className="text-xs font-normal text-[var(--muted)]">Optional · image or PDF, up to 5 MB</span><input className="field py-2" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { setReceipt(event.target.files?.[0] || null); setOcrText(""); setOcrStatus(""); }} /></label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="min-h-10 text-sm font-medium underline underline-offset-2" type="button" disabled={!receipt || ocrStatus === "Reading receipt text…"} onClick={readReceipt}>Read receipt text</button>
          <span className="text-sm text-[var(--muted)]" aria-live="polite">{ocrStatus}</span>
        </div>
        {ocrText && <details className="text-sm"><summary className="cursor-pointer">Review recognized text</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--surface-muted)] p-3 font-sans text-xs">{ocrText}</pre></details>}
        {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}
      </div>
      <div className="flex items-end"><SubmitButton className="w-full" pendingLabel="Saving…">Save transaction</SubmitButton></div>
    </form>
  );
}
