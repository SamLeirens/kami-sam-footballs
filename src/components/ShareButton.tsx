"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Opens the phone's share sheet (pick Messenger → the group chat) with a message.
 * Where sharing isn't supported (most desktops) it copies the message instead.
 * `{url}` in the template becomes the full link to `path`.
 */
export function ShareButton({
  template,
  path,
  what,
  className = "btn",
}: {
  template: string;
  path: string;
  /** e.g. "invite" → "Share invite" on phones, "Copy invite" elsewhere */
  what: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  async function share() {
    const text = template.replaceAll("{url}", `${window.location.origin}${path}`);
    if (canShare) {
      try {
        // Link inside the text: some apps (Messenger on iOS) drop `text` when `url` is also given.
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // closed the share sheet
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className={className} onClick={share}>
      {copied ? "Copied ✓ paste in chat" : `${canShare ? "Share" : "Copy"} ${what}`}
    </button>
  );
}
