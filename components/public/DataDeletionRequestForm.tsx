"use client";

import { useState } from "react";

export function DataDeletionRequestForm() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/data-deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          email: email.trim(),
          note: note.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMsg({ tone: "err", text: data?.error || "Request failed. Please try again." });
        return;
      }
      setMsg({
        tone: "ok",
        text: "Request received. We will process account and data deletion as per our policy and applicable law.",
      });
      setPhone("");
      setEmail("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <label htmlFor="del-phone" className="block text-sm font-bold text-ink">
          Registered mobile number <span className="text-rose-600">*</span>
        </label>
        <p className="mt-0.5 text-xs font-medium text-stone-500">Same number you use to log in to the app.</p>
        <input
          id="del-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          minLength={8}
          maxLength={24}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="ui-input mt-2 w-full max-w-md"
          placeholder="e.g. 9876543210"
        />
      </div>
      <div>
        <label htmlFor="del-email" className="block text-sm font-bold text-ink">
          Email (optional)
        </label>
        <input
          id="del-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ui-input mt-2 w-full max-w-md"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="del-note" className="block text-sm font-bold text-ink">
          Additional details (optional)
        </label>
        <textarea
          id="del-note"
          name="note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="ui-input mt-2 w-full max-w-2xl resize-y"
          placeholder="Anything that helps us verify your account (do not send passwords)."
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit deletion request"}
      </button>
      {msg ? (
        <p
          role="status"
          className={
            msg.tone === "ok"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
              : "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900"
          }
        >
          {msg.text}
        </p>
      ) : null}
    </form>
  );
}
