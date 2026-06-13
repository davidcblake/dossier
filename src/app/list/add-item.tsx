"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddItem() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("2");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          deadline: deadline || null,
          priority: Number(priority),
        }),
      });
      if (!res.ok) throw new Error();
      setTitle("");
      setDeadline("");
      setPriority("2");
      setOpen(false);
      router.refresh();
    } catch {
      // keep the form open so the user can retry
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-(--color-gold-soft) px-4 py-2 text-sm font-medium transition hover:bg-(--color-gold-soft)"
      >
        + Add item
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-(--color-gold-soft) bg-white/60 p-4"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        className="w-full rounded-lg border border-(--color-gold-soft) bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-3">
        <label className="flex-1 text-xs text-(--color-ink-soft)">
          Deadline
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-gold-soft) bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-(--color-ink-soft)">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 block rounded-lg border border-(--color-gold-soft) bg-white px-3 py-2 text-sm"
          >
            <option value="1">Urgent</option>
            <option value="2">Normal</option>
            <option value="3">Low</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-(--color-ink) px-4 py-2 text-sm font-medium text-(--color-paper) transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-(--color-ink-soft)"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
